import { publicoValido, sistemaExterno } from '@/lib/publico'
// src/app/api/admin/documentos/route.ts — criação de documento (multipart)

import { randomUUID } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { Prisma, TipoDocumento } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { souAdmin } from '@/lib/auth/jwt'
import { exigirEditorApi } from '@/lib/auth/api'
import { slugDeSistemaValido } from '@/lib/sistemas'
import { gerarSlug } from '@/lib/slug'
import { gifValido, pdfValido, removerArquivo, salvarGif, salvarPdf, TAMANHO_MAXIMO_BYTES, ImagemInvalidaError } from '@/lib/storage'
import { lerImagensDoForm, salvarImagens, type ImagemSalva } from '@/lib/documento-imagens'
import { registrarAuditoria } from '@/lib/audit'
import { TAG_CONTAGEM_DOCUMENTOS } from '@/lib/portal-cache'
import { lerFormularioLimitado } from '@/lib/json-limitado'
import { urlExternaValida } from '@/lib/url-externa'
import { camposDocumentoDentroDosLimites, lerBooleanoDoForm } from '@/lib/campos-documento'
import { verificarPdfAntesDeSalvar } from '@/lib/pdf-antivirus'
import {
  complementoAuditoria,
  interpretarPassos,
  LIMITE_ENVIO_PRINTS_BYTES,
  MAX_PASSOS_DOCUMENTO,
  mensagemLimiteEnvioPrints,
  PassosInvalidosError,
  type PassoValidado,
} from '@/lib/passos-documento'

export const runtime = 'nodejs'

const TIPOS = ['PDF', 'ARTIGO', 'PASSO_A_PASSO', 'LINK', 'GIF'] as const

function erro400(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const { sessao, erro } = await exigirEditorApi()
  if (erro) return erro

  const form = await lerFormularioLimitado(req, 70 * 1024 * 1024)
  if (!form) return NextResponse.json({ error: 'Envio inválido ou maior que 70 MB.' }, { status: 413 })
  if (!camposDocumentoDentroDosLimites(form)) return erro400('Um dos campos excede o tamanho permitido.')

  const texto = (campo: string) => {
    const valor = form.get(campo)
    return typeof valor === 'string' && valor.trim() ? valor.trim() : null
  }

  const publico = form.get('publico') ?? 'INTERNO'
  if (!publicoValido(publico)) return erro400('Público inválido.')
  const sistemaSlug = texto('sistemaSlug')
  if (publico === 'EXTERNO' && (!sistemaSlug || !sistemaExterno(sistemaSlug))) return erro400('Materiais externos devem pertencer aos sistemas disponíveis para convidados.')
  const titulo = texto('titulo')
  const tipo = texto('tipo') as (typeof TIPOS)[number] | null

  if (!sistemaSlug || !(await slugDeSistemaValido(sistemaSlug))) return erro400('Selecione um sistema válido.')
  if (!titulo) return erro400('Informe o título do documento.')
  if (!tipo || !TIPOS.includes(tipo)) return erro400('Tipo de documento inválido.')

  const comecePorAquiLido = lerBooleanoDoForm(form, 'comecePorAqui')
  if (comecePorAquiLido === null) return erro400('Valor inválido para “Comece por aqui”.')
  const comecePorAqui = comecePorAquiLido ?? false

  let imagens: File[] = []
  let printsNovos: File[] = []
  let passosValidados: PassoValidado[] = []
  try {
    imagens = lerImagensDoForm(form)
    if (tipo !== 'ARTIGO' && imagens.length) return erro400('Imagens são permitidas apenas em artigos sem PDF.')

    if (tipo === 'PASSO_A_PASSO') {
      printsNovos = lerImagensDoForm(form, {
        campo: 'printsPassos',
        limite: MAX_PASSOS_DOCUMENTO * 2,
        mensagemLimite: 'Um guia pode ter no máximo 80 prints (dois por passo).',
      })
      const totalPrints = printsNovos.reduce((soma, arquivo) => soma + arquivo.size, 0)
      if (totalPrints > LIMITE_ENVIO_PRINTS_BYTES) return erro400(mensagemLimiteEnvioPrints(totalPrints))
      passosValidados = interpretarPassos(form.get('passos'), {
        imagensDoDocumento: new Set(),
        quantidadePrintsNovos: printsNovos.length,
      })
    } else if (form.getAll('printsPassos').length) {
      return erro400('Prints de passos são aceitos apenas no formato Passo a passo.')
    }
  } catch (falha) {
    if (falha instanceof ImagemInvalidaError || falha instanceof PassosInvalidosError) return erro400(falha.message)
    throw falha
  }

  const slug = gerarSlug(texto('slug') ?? titulo)
  if (!slug) return erro400('O título não gera um endereço válido.')

  let arquivoKey: string | null = null
  let arquivoNome: string | null = null
  let arquivoBytes: number | null = null
  let conteudo: string | null = null
  let urlExterna: string | null = null

  if (tipo === 'PDF') {
    const arquivo = form.get('arquivo')
    if (!(arquivo instanceof File) || arquivo.size === 0) return erro400('Anexe o arquivo PDF.')
    if (arquivo.type !== 'application/pdf') return erro400('O arquivo precisa ser um PDF.')
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      return NextResponse.json({ error: `O PDF passa do limite de ${Math.round(TAMANHO_MAXIMO_BYTES / 1024 / 1024)} MB.` }, { status: 413 })
    }
    const bytes = Buffer.from(await arquivo.arrayBuffer())
    if (!pdfValido(bytes)) return erro400('O arquivo enviado não é um PDF válido.')
    const analise = await verificarPdfAntesDeSalvar(bytes)
    if (analise === 'infectado') return erro400('O PDF foi bloqueado pela verificação de segurança.')
    if (analise === 'indisponivel') return NextResponse.json({ error: 'A verificação de segurança está indisponível. Tente novamente mais tarde.' }, { status: 503 })
    const salvo = await salvarPdf(sistemaSlug, bytes)
    arquivoKey = salvo.chave
    arquivoBytes = salvo.tamanho
    arquivoNome = arquivo.name
  } else if (tipo === 'GIF') {
    const arquivo = form.get('arquivo')
    if (!(arquivo instanceof File) || arquivo.size === 0) return erro400('Anexe o arquivo GIF.')
    if (arquivo.type !== 'image/gif') return erro400('O arquivo precisa ser um GIF.')
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      return NextResponse.json({ error: `O GIF passa do limite de ${Math.round(TAMANHO_MAXIMO_BYTES / 1024 / 1024)} MB.` }, { status: 413 })
    }
    const bytes = Buffer.from(await arquivo.arrayBuffer())
    if (!gifValido(bytes)) return erro400('O arquivo enviado não é um GIF válido.')
    const salvo = await salvarGif(sistemaSlug, bytes)
    arquivoKey = salvo.chave
    arquivoBytes = salvo.tamanho
    arquivoNome = arquivo.name
  } else if (tipo === 'ARTIGO') {
    conteudo = texto('conteudo')
    if (!conteudo && imagens.length === 0) return erro400('Escreva o conteúdo do artigo ou adicione uma imagem.')
  } else if (tipo === 'LINK') {
    urlExterna = texto('urlExterna')
    if (!urlExterna || !urlExternaValida(urlExterna)) return erro400('Informe uma URL começando com http:// ou https://.')
  }

  let imagensSalvas: ImagemSalva[] = []
  let printsSalvos: (ImagemSalva & { id: string })[] = []
  try {
    if (imagens.length) imagensSalvas = await salvarImagens(sistemaSlug, imagens)
    if (printsNovos.length) {
      const salvos = await salvarImagens(sistemaSlug, printsNovos)
      printsSalvos = salvos.map((print, indice) => ({
        ...print,
        id: randomUUID(),
        ordem: passosValidados.find((passo) =>
          (passo.print && 'novo' in passo.print && passo.print.novo === indice) ||
          (passo.printAcesso && 'novo' in passo.printAcesso && passo.printAcesso.novo === indice)
        )?.ordem ?? indice,
      }))
    }

    const documento = await prisma.$transaction(async (tx) => {
      const criado = await tx.documento.create({
        data: {
          sistemaSlug,
          publico,
          slug,
          titulo,
          descricao: texto('descricao'),
          palavrasChave: texto('palavrasChave'),
          tipo: tipo as TipoDocumento,
          arquivoKey,
          arquivoNome,
          arquivoBytes,
          conteudo,
          urlExterna,
          comecePorAqui,
          categoriaId: texto('categoriaId'),
          ordem: souAdmin(sessao.papel) ? Number(texto('ordem') ?? 0) || 0 : 0,
          ativo: souAdmin(sessao.papel) ? form.get('ativo') !== 'false' : true,
          autorId: sessao.id,
          imagens: imagensSalvas.length ? { create: imagensSalvas } : undefined,
        },
      })

      if (printsSalvos.length) {
        await tx.documentoImagem.createMany({
          data: printsSalvos.map(({ id, ...print }) => ({ id, documentoId: criado.id, ...print })),
        })
      }
      if (passosValidados.length) {
        await tx.passoDocumento.createMany({
          data: passosValidados.map((passo) => ({
            documentoId: criado.id,
            ordem: passo.ordem,
            titulo: passo.titulo,
            texto: passo.texto,
            caminhoAcesso: passo.caminhoAcesso,
            destaqueTipo: passo.destaqueTipo,
            destaqueTexto: passo.destaqueTexto,
            imagemId: passo.print && 'novo' in passo.print ? printsSalvos[passo.print.novo].id : null,
            imagemAcessoId: passo.printAcesso && 'novo' in passo.printAcesso ? printsSalvos[passo.printAcesso.novo].id : null,
          })),
        })
      }

      await registrarAuditoria({
        ator: sessao,
        acao: 'criar',
        entidade: 'Documento',
        entidadeId: criado.id,
        descricao: `Criou "${criado.titulo}" em ${sistemaSlug}${complementoAuditoria({
          tipoAnterior: null,
          tipoNovo: tipo,
          totalPassos: passosValidados.length,
          passosDescartados: 0,
          comeceAntes: null,
          comeceDepois: comecePorAqui,
        })}`,
      }, tx)
      return criado
    })

    revalidateTag(TAG_CONTAGEM_DOCUMENTOS, { expire: 0 })
    return NextResponse.json({ ok: true, id: documento.id, slug: documento.slug }, { status: 201 })
  } catch (falha) {
    if (arquivoKey) await removerArquivo(arquivoKey)
    await Promise.all([...imagensSalvas, ...printsSalvos].map((imagem) => removerArquivo(imagem.arquivoKey)))
    if (falha instanceof ImagemInvalidaError) return erro400(falha.message)
    if (falha instanceof Prisma.PrismaClientKnownRequestError && falha.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe um documento com este endereço neste sistema.' }, { status: 409 })
    }
    console.error('[admin/documentos] falha ao criar', falha)
    return NextResponse.json({ error: 'Não foi possível salvar o documento.' }, { status: 500 })
  }
}
