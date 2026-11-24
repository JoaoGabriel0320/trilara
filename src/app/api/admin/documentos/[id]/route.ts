import { publicoValido, sistemaExterno } from '@/lib/publico'
// src/app/api/admin/documentos/[id]/route.ts — edição e exclusão

import { randomUUID } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { Prisma, TipoDocumento } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { souAdmin } from '@/lib/auth/jwt'
import { podeEditarDocumento } from '@/lib/auth/permissoes'
import { exigirEditorApi, exigirAdminApi } from '@/lib/auth/api'
import { slugDeSistemaValido } from '@/lib/sistemas'
import { gerarSlug } from '@/lib/slug'
import { gifValido, ImagemInvalidaError, MAX_IMAGENS_DOCUMENTO, pdfValido, removerArquivo, salvarGif, salvarPdf, TAMANHO_MAXIMO_BYTES } from '@/lib/storage'
import { lerImagensDoForm, lerImagensRemover, salvarImagens, type ImagemSalva } from '@/lib/documento-imagens'
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
  ROTULO_FORMATO,
  type PassoValidado,
} from '@/lib/passos-documento'

export const runtime = 'nodejs'

const TIPOS = ['PDF', 'ARTIGO', 'PASSO_A_PASSO', 'LINK', 'GIF'] as const

function erro400(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, erro } = await exigirEditorApi()
  if (erro) return erro

  const { id } = await params
  const atual = await prisma.documento.findUnique({
    where: { id },
    include: { imagens: true, _count: { select: { passos: true } } },
  })
  if (!atual) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
  if (!podeEditarDocumento(sessao, atual.autorId)) return NextResponse.json({ error: 'Você pode editar apenas os documentos que criou.' }, { status: 403 })

  const form = await lerFormularioLimitado(req, 70 * 1024 * 1024)
  if (!form) return NextResponse.json({ error: 'Envio inválido ou maior que 70 MB.' }, { status: 413 })
  if (!camposDocumentoDentroDosLimites(form)) return erro400('Um dos campos excede o tamanho permitido.')

  const texto = (campo: string) => {
    const valor = form.get(campo)
    return typeof valor === 'string' && valor.trim() ? valor.trim() : null
  }

  if (!souAdmin(sessao.papel) && (form.has('ativo') || form.has('ordem'))) {
    return NextResponse.json({ error: 'Somente administradores alteram publicação e ordem.' }, { status: 403 })
  }

  // Alternar publicação é um PATCH só com `ativo`, usado pela listagem.
  if (form.has('ativo') && Array.from(form.keys()).length === 1) {
    const ativo = form.get('ativo') !== 'false'
    await prisma.$transaction(async (tx) => {
      await tx.documento.update({ where: { id }, data: { ativo } })
      await registrarAuditoria({
        ator: sessao,
        acao: ativo ? 'publicar' : 'despublicar',
        entidade: 'Documento',
        entidadeId: id,
        descricao: `${ativo ? 'Publicou' : 'Despublicou'} "${atual.titulo}"`,
      }, tx)
    })
    revalidateTag(TAG_CONTAGEM_DOCUMENTOS, { expire: 0 })
    return NextResponse.json({ ok: true, ativo })
  }

  const publico = form.get('publico') ?? atual.publico
  if (!publicoValido(publico)) return erro400('Público inválido.')
  const sistemaSlug = texto('sistemaSlug') ?? atual.sistemaSlug
  if (!(await slugDeSistemaValido(sistemaSlug))) return erro400('Selecione um sistema válido.')
  if (publico === 'EXTERNO' && (!sistemaSlug || !sistemaExterno(sistemaSlug))) return erro400('Materiais externos devem pertencer aos sistemas disponíveis para convidados.')
  const titulo = texto('titulo') ?? atual.titulo
  const tipoBruto = texto('tipo') ?? atual.tipo
  if (!TIPOS.includes(tipoBruto as (typeof TIPOS)[number])) return erro400('Tipo de documento inválido.')
  const tipo = tipoBruto as TipoDocumento

  const comeceLido = lerBooleanoDoForm(form, 'comecePorAqui')
  if (comeceLido === null) return erro400('Valor inválido para “Comece por aqui”.')
  const comecePorAqui = comeceLido ?? atual.comecePorAqui

  let imagensNovas: File[] = []
  let idsRemover: string[] = []
  let printsNovos: File[] = []
  let passosValidados: PassoValidado[] = []
  try {
    imagensNovas = lerImagensDoForm(form)
    idsRemover = lerImagensRemover(form)
    if (tipo !== 'ARTIGO' && imagensNovas.length) return erro400('Imagens são permitidas apenas em artigos sem PDF.')

    const idsAtuais = new Set(atual.imagens.map((imagem) => imagem.id))
    if (idsRemover.some((imagemId) => !idsAtuais.has(imagemId))) return erro400('Uma das imagens selecionadas não pertence a este documento.')

    if (tipo === 'PASSO_A_PASSO') {
      printsNovos = lerImagensDoForm(form, {
        campo: 'printsPassos',
        limite: MAX_PASSOS_DOCUMENTO * 2,
        mensagemLimite: 'Um guia pode ter no máximo 80 prints (dois por passo).',
      })
      const totalPrints = printsNovos.reduce((soma, arquivo) => soma + arquivo.size, 0)
      if (totalPrints > LIMITE_ENVIO_PRINTS_BYTES) return erro400(mensagemLimiteEnvioPrints(totalPrints))
      passosValidados = interpretarPassos(form.get('passos'), {
        imagensDoDocumento: atual.tipo === 'PASSO_A_PASSO' ? idsAtuais : new Set(),
        quantidadePrintsNovos: printsNovos.length,
      })
    } else if (form.getAll('printsPassos').length) {
      return erro400('Prints de passos são aceitos apenas no formato Passo a passo.')
    }
  } catch (falha) {
    if (falha instanceof ImagemInvalidaError || falha instanceof PassosInvalidosError) return erro400(falha.message)
    throw falha
  }

  const trocouEnvolvendoGuia = tipo !== atual.tipo && (tipo === 'PASSO_A_PASSO' || atual.tipo === 'PASSO_A_PASSO')
  const passosDescartados = atual.tipo === 'PASSO_A_PASSO' && tipo !== 'PASSO_A_PASSO' ? atual._count.passos : 0
  if (trocouEnvolvendoGuia && form.get('descartarPassos') !== '1') {
    const mensagem = passosDescartados
      ? `Trocar o formato apaga ${passosDescartados === 1 ? 'o passo' : `os ${passosDescartados} passos`} deste guia. Confirme a troca para continuar.`
      : `Trocar para ${ROTULO_FORMATO.PASSO_A_PASSO} descarta o conteúdo do formato atual. Confirme a troca para continuar.`
    return NextResponse.json({ error: mensagem, codigo: 'CONFIRMAR_DESCARTE_PASSOS' }, { status: 409 })
  }

  const idsReferenciados = new Set(passosValidados.flatMap((passo) =>
    [passo.print, passo.printAcesso].flatMap((print) => print && 'existente' in print ? [print.existente] : [])
  ))
  const imagensParaRemover = tipo === 'PASSO_A_PASSO'
    ? atual.imagens.filter((imagem) => !idsReferenciados.has(imagem.id))
    : atual.tipo === 'PASSO_A_PASSO'
      ? atual.imagens
      : tipo === 'ARTIGO'
        ? atual.imagens.filter((imagem) => idsRemover.includes(imagem.id))
        : atual.imagens
  const idsParaRemover = imagensParaRemover.map((imagem) => imagem.id)
  const imagensRestantes = atual.imagens.length - imagensParaRemover.length
  if (tipo === 'ARTIGO' && imagensRestantes + imagensNovas.length > MAX_IMAGENS_DOCUMENTO) {
    return erro400(`Adicione no máximo ${MAX_IMAGENS_DOCUMENTO} imagens por documento.`)
  }

  const slug = gerarSlug(texto('slug') ?? titulo)
  if (!slug) return erro400('Endereço inválido.')
  const categoriaId = texto('categoriaId')
  const dados: Prisma.DocumentoUpdateInput = {
    sistemaSlug,
    publico,
    slug,
    titulo,
    descricao: texto('descricao'),
    palavrasChave: texto('palavrasChave'),
    tipo,
    comecePorAqui,
    ordem: souAdmin(sessao.papel) ? Number(texto('ordem') ?? atual.ordem) || 0 : atual.ordem,
    ativo: souAdmin(sessao.papel) && form.has('ativo') ? form.get('ativo') !== 'false' : atual.ativo,
    categoria: categoriaId ? { connect: { id: categoriaId } } : { disconnect: true },
  }

  let chaveAntigaParaApagar: string | null = null
  let chaveNovaSeFalhar: string | null = null

  if (tipo === 'PDF') {
    const arquivo = form.get('arquivo')
    if (arquivo instanceof File && arquivo.size > 0) {
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
      dados.arquivoKey = salvo.chave
      dados.arquivoBytes = salvo.tamanho
      dados.arquivoNome = arquivo.name
      chaveNovaSeFalhar = salvo.chave
      chaveAntigaParaApagar = atual.arquivoKey
    } else if (!atual.arquivoKey || atual.tipo !== 'PDF') return erro400('Anexe o arquivo PDF.')
    dados.conteudo = null
    dados.urlExterna = null
  } else if (tipo === 'GIF') {
    const arquivo = form.get('arquivo')
    if (arquivo instanceof File && arquivo.size > 0) {
      if (arquivo.type !== 'image/gif') return erro400('O arquivo precisa ser um GIF.')
      if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
        return NextResponse.json({ error: `O GIF passa do limite de ${Math.round(TAMANHO_MAXIMO_BYTES / 1024 / 1024)} MB.` }, { status: 413 })
      }
      const bytes = Buffer.from(await arquivo.arrayBuffer())
      if (!gifValido(bytes)) return erro400('O arquivo enviado não é um GIF válido.')
      const salvo = await salvarGif(sistemaSlug, bytes)
      dados.arquivoKey = salvo.chave
      dados.arquivoBytes = salvo.tamanho
      dados.arquivoNome = arquivo.name
      chaveNovaSeFalhar = salvo.chave
      chaveAntigaParaApagar = atual.arquivoKey
    } else if (!atual.arquivoKey || atual.tipo !== 'GIF') return erro400('Anexe o arquivo GIF.')
    dados.conteudo = null
    dados.urlExterna = null
  } else if (tipo === 'ARTIGO') {
    const conteudo = texto('conteudo')
    if (!conteudo && imagensRestantes + imagensNovas.length === 0) return erro400('Escreva o conteúdo do artigo ou adicione uma imagem.')
    dados.conteudo = conteudo
    dados.urlExterna = null
    if (atual.arquivoKey) {
      chaveAntigaParaApagar = atual.arquivoKey
      dados.arquivoKey = null
      dados.arquivoNome = null
      dados.arquivoBytes = null
    }
  } else if (tipo === 'LINK') {
    const urlExterna = texto('urlExterna')
    if (!urlExterna || !urlExternaValida(urlExterna)) return erro400('Informe uma URL começando com http:// ou https://.')
    dados.urlExterna = urlExterna
    dados.conteudo = null
    if (atual.arquivoKey) {
      chaveAntigaParaApagar = atual.arquivoKey
      dados.arquivoKey = null
      dados.arquivoNome = null
      dados.arquivoBytes = null
    }
  } else {
    dados.conteudo = null
    dados.urlExterna = null
    if (atual.arquivoKey) {
      chaveAntigaParaApagar = atual.arquivoKey
      dados.arquivoKey = null
      dados.arquivoNome = null
      dados.arquivoBytes = null
    }
  }

  let imagensNovasSalvas: ImagemSalva[] = []
  let printsSalvos: (ImagemSalva & { id: string })[] = []
  try {
    if (imagensNovas.length) {
      const proximaOrdem = Math.max(-1, ...atual.imagens.map((imagem) => imagem.ordem)) + 1
      imagensNovasSalvas = await salvarImagens(sistemaSlug, imagensNovas, proximaOrdem)
    }
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

    await prisma.$transaction(async (tx) => {
      if (tipo === 'PASSO_A_PASSO' || atual.tipo === 'PASSO_A_PASSO') {
        await tx.passoDocumento.deleteMany({ where: { documentoId: id } })
        if (idsParaRemover.length) {
          await tx.documentoImagem.deleteMany({ where: { id: { in: idsParaRemover }, documentoId: id } })
        }
        await tx.documento.update({ where: { id }, data: dados })
        if (imagensNovasSalvas.length) {
          await tx.documentoImagem.createMany({ data: imagensNovasSalvas.map((imagem) => ({ ...imagem, documentoId: id })) })
        }
        if (printsSalvos.length) {
          await tx.documentoImagem.createMany({ data: printsSalvos.map(({ id: imagemId, ...print }) => ({ id: imagemId, documentoId: id, ...print })) })
        }
        if (passosValidados.length) {
          await tx.passoDocumento.createMany({
            data: passosValidados.map((passo) => ({
              documentoId: id,
              ordem: passo.ordem,
              titulo: passo.titulo,
              texto: passo.texto,
              caminhoAcesso: passo.caminhoAcesso,
              destaqueTipo: passo.destaqueTipo,
              destaqueTexto: passo.destaqueTexto,
              imagemId: passo.print === null
                ? null
                : 'existente' in passo.print
                  ? passo.print.existente
                  : printsSalvos[passo.print.novo].id,
              imagemAcessoId: passo.printAcesso === null
                ? null
                : 'existente' in passo.printAcesso
                  ? passo.printAcesso.existente
                  : printsSalvos[passo.printAcesso.novo].id,
            })),
          })
        }
      } else {
        if (imagensParaRemover.length || imagensNovasSalvas.length) {
          dados.imagens = {
            ...(imagensParaRemover.length ? { deleteMany: { id: { in: idsParaRemover } } } : {}),
            ...(imagensNovasSalvas.length ? { create: imagensNovasSalvas } : {}),
          }
        }
        await tx.documento.update({ where: { id }, data: dados })
      }
      await registrarAuditoria({
        ator: sessao,
        acao: 'editar',
        entidade: 'Documento',
        entidadeId: id,
        descricao: `Editou "${titulo}" em ${sistemaSlug}${complementoAuditoria({
          tipoAnterior: atual.tipo,
          tipoNovo: tipo,
          totalPassos: passosValidados.length,
          passosDescartados,
          comeceAntes: atual.comecePorAqui,
          comeceDepois: comecePorAqui,
        })}`,
      }, tx)
    })
  } catch (falha) {
    if (chaveNovaSeFalhar) await removerArquivo(chaveNovaSeFalhar)
    await Promise.all([...imagensNovasSalvas, ...printsSalvos].map((imagem) => removerArquivo(imagem.arquivoKey)))
    if (falha instanceof ImagemInvalidaError) return erro400(falha.message)
    if (falha instanceof Prisma.PrismaClientKnownRequestError && falha.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe um documento com este endereço neste sistema.' }, { status: 409 })
    }
    console.error('[admin/documentos] falha ao editar', falha)
    return NextResponse.json({ error: 'Não foi possível salvar as alterações.' }, { status: 500 })
  }

  // O banco já foi confirmado. Uma falha de limpeza não transforma um PATCH
  // bem-sucedido em erro, pois o cliente não poderia desfazer a transação.
  const chavesAntigas = [chaveAntigaParaApagar, ...imagensParaRemover.map((imagem) => imagem.arquivoKey)]
    .filter((chave): chave is string => Boolean(chave))
  const resultados = await Promise.allSettled(chavesAntigas.map((chave) => removerArquivo(chave)))
  resultados.forEach((resultado, indice) => {
    if (resultado.status === 'rejected') console.error('[admin/documentos] arquivo antigo não removido', chavesAntigas[indice], resultado.reason)
  })

  revalidateTag(TAG_CONTAGEM_DOCUMENTOS, { expire: 0 })
  return NextResponse.json({ ok: true, id, slug })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro

  const { id } = await params
  const atual = await prisma.documento.findUnique({ where: { id }, include: { imagens: true } })
  if (!atual) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.documento.delete({ where: { id } })
    await registrarAuditoria({
      ator: sessao,
      acao: 'excluir',
      entidade: 'Documento',
      entidadeId: id,
      descricao: `Excluiu "${atual.titulo}" de ${atual.sistemaSlug}`,
    }, tx)
  })
  if (atual.arquivoKey) await removerArquivo(atual.arquivoKey)
  await Promise.all(atual.imagens.map((imagem) => removerArquivo(imagem.arquivoKey)))

  revalidateTag(TAG_CONTAGEM_DOCUMENTOS, { expire: 0 })
  return NextResponse.json({ ok: true })
}
