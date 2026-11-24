import { loadEnvConfig } from '@next/env'
import { PrismaClient } from '@prisma/client'
import { SignJWT } from 'jose'
import { createHmac, randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { existeArquivo, removerArquivo } from '../src/lib/storage'

loadEnvConfig(process.cwd(), true)
const base = process.argv[2] ?? 'http://127.0.0.1:3002'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Servidor deve ser local.')
if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error('Banco deve ser local.')

const prisma = new PrismaClient()
const prefixo = `teste-guia-${randomUUID()}`
const usuarios: string[] = []
const documentos: string[] = []
const chaves: string[] = []
let checks = 0

function verificar(condicao: unknown, nome: string) {
  assert.ok(condicao, nome)
  checks++
  console.log(`OK ${nome}`)
}

async function usuario(papel: 'COLABORADOR' | 'EDITOR' | 'ADMIN', sufixo: string) {
  const colaborador = await prisma.colaborador.create({ data: { nome: `${prefixo}-${sufixo}`, email: `${prefixo}-${sufixo}@example.invalid`, senhaHash: randomUUID(), papel } })
  usuarios.push(colaborador.id)
  const sessao = await prisma.sessaoColaborador.create({ data: { colaboradorId: colaborador.id, expiraEm: new Date(Date.now() + 30 * 60_000) } })
  const token = await new SignJWT({
    id: colaborador.id,
    sessaoId: sessao.id,
    nome: colaborador.nome,
    email: colaborador.email,
    papel,
    mustChangePassword: false,
    credencial: createHmac('sha256', process.env.SESSION_SECRET!).update(colaborador.senhaHash).digest('hex'),
  }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30m').sign(new TextEncoder().encode(process.env.SESSION_SECRET))
  return { id: colaborador.id, cookie: `colaborador_token=${token}` }
}

async function request(rota: string, cookie: string, method: string, body?: BodyInit) {
  return fetch(new URL(rota, base), {
    method,
    body,
    redirect: 'manual',
    signal: AbortSignal.timeout(120_000),
    headers: { Origin: base, Cookie: cookie, ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}) },
  })
}

const pngPequeno = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
function arquivoPng(nome: string, bytes = pngPequeno) { return new File([bytes], nome, { type: 'image/png' }) }
function formulario(campos: Record<string, string>) { const form = new FormData(); for (const [chave, valor] of Object.entries(campos)) form.set(chave, valor); return form }
function passosJson(passos: unknown[]) { return JSON.stringify(passos) }

async function carregarAssistente() {
  // Fora do Next não há escopo de requisição; o cache do React vira passagem direta.
  const React = require('react') as { cache?: <T>(fn: T) => T }
  React.cache ??= (fn) => fn
  return import('../src/lib/assistente-hub')
}

async function main() {
  const colaborador = await usuario('COLABORADOR', 'colaborador')
  const editor = await usuario('EDITOR', 'editor')
  const outroEditor = await usuario('EDITOR', 'outro-editor')
  const admin = await usuario('ADMIN', 'admin')

  const passosIniciais = [
    { titulo: 'Abrir o recebimento', texto: 'Acesse o menu **Recebimento**.', destaque: { tipo: 'DICA', texto: 'Use o atalho do menu lateral.' }, print: null },
    { titulo: 'Localizar a nota', texto: 'Informe a chave da DANFE.', destaque: { tipo: 'REGRA', texto: 'O pedido precisa estar aprovado.' }, print: { novo: 0 } },
    { titulo: 'Conferir zebrafinal', texto: 'Compare o marcador unicostock com os itens recebidos.', destaque: { tipo: 'ATENCAO', texto: 'Confira a filial antes de confirmar.' }, print: null },
  ]
  const formGuia = formulario({ sistemaSlug: 'portal-de-clientes', titulo: `${prefixo} guia`, slug: `${prefixo}-guia`, tipo: 'PASSO_A_PASSO', descricao: 'Guia criado pelo teste de integração.', palavrasChave: 'solicitações', comecePorAqui: 'true', passos: passosJson(passosIniciais) })
  formGuia.append('printsPassos', arquivoPng('passo-2.png'))

  verificar((await request('/api/admin/documentos', colaborador.cookie, 'POST', formGuia)).status === 403, 'COLABORADOR não cria guia')
  const criado = await request('/api/admin/documentos', editor.cookie, 'POST', formGuia)
  const criadoDados = await criado.json()
  verificar(criado.status === 201, 'EDITOR cria guia com print')
  documentos.push(criadoDados.id)
  let guia = await prisma.documento.findUniqueOrThrow({ where: { id: criadoDados.id }, include: { passos: { orderBy: { ordem: 'asc' } }, imagens: true } })
  chaves.push(...guia.imagens.map((imagem) => imagem.arquivoKey))
  verificar(guia.passos.length === 3 && guia.passos.every((passo, indice) => passo.ordem === indice), 'passos persistem em ordem contínua')
  verificar(guia.comecePorAqui && guia.imagens.length === 1 && guia.passos[1].imagemId === guia.imagens[0].id, 'Comece por aqui e print persistem')
  verificar(Boolean(await prisma.auditLog.findFirst({ where: { entidade: 'Documento', entidadeId: guia.id, acao: 'criar', descricao: { contains: '3 passos' } } })), 'auditoria registra formato e número de passos')
  verificar((await request(`/api/admin/documentos/${guia.id}`, outroEditor.cookie, 'PATCH', formulario({ titulo: 'indevido' }))).status === 403, 'EDITOR não edita guia de outro autor')
  verificar((await request(`/api/documentos/${guia.id}/imagens/${guia.imagens[0].id}`, colaborador.cookie, 'GET')).status === 200, 'print publicado é servido por rota autenticada')

  const imagemAntiga = guia.imagens[0]
  const passosReordenados = [
    { titulo: 'Conferir zebrafinal', texto: 'Compare o marcador unicostock com os itens recebidos.', destaque: { tipo: 'ATENCAO', texto: 'Confira a filial antes de confirmar.' }, print: null },
    { titulo: 'Abrir o recebimento', texto: 'Acesse o menu Recebimento.', destaque: { tipo: 'DICA', texto: 'Use o atalho do menu lateral.' }, print: { novo: 0 } },
    { titulo: 'Localizar a nota', texto: 'Informe a chave da DANFE.', destaque: { tipo: 'REGRA', texto: 'O pedido precisa estar aprovado.' }, print: null },
  ]
  const editar = formulario({ sistemaSlug: 'portal-de-clientes', titulo: guia.titulo, slug: guia.slug, tipo: 'PASSO_A_PASSO', descricao: guia.descricao ?? '', categoriaId: '', comecePorAqui: 'true', passos: passosJson(passosReordenados) })
  editar.append('printsPassos', arquivoPng('novo-passo-2.png'))
  const editado = await request(`/api/admin/documentos/${guia.id}`, editor.cookie, 'PATCH', editar)
  verificar(editado.status === 200, 'PATCH reordena passos e troca print')
  guia = await prisma.documento.findUniqueOrThrow({ where: { id: guia.id }, include: { passos: { orderBy: { ordem: 'asc' } }, imagens: true } })
  chaves.push(...guia.imagens.map((imagem) => imagem.arquivoKey))
  verificar(guia.passos[0].titulo === 'Conferir zebrafinal' && guia.passos[1].imagemId === guia.imagens[0].id, 'nova ordem e novo print ficam ligados ao passo correto')
  verificar(!await prisma.documentoImagem.findUnique({ where: { id: imagemAntiga.id } }) && !await existeArquivo(imagemAntiga.arquivoKey), 'print substituído sai do banco e do storage')

  const manter = formulario({ sistemaSlug: 'portal-de-clientes', titulo: guia.titulo, slug: guia.slug, tipo: 'PASSO_A_PASSO', descricao: guia.descricao ?? '', comecePorAqui: 'true', passos: passosJson(guia.passos.map((passo) => ({ titulo: passo.titulo, texto: passo.texto, destaque: passo.destaqueTipo ? { tipo: passo.destaqueTipo, texto: passo.destaqueTexto } : null, print: passo.imagemId ? { imagemId: passo.imagemId } : null }))) })
  verificar((await request(`/api/admin/documentos/${guia.id}`, editor.cookie, 'PATCH', manter)).status === 200, 'salvar guia sem mudar mantém prints')
  verificar((await prisma.documentoImagem.count({ where: { documentoId: guia.id } })) === 1, 'salvar sem mudança não duplica nem apaga print')

  verificar((await request(`/api/documentos/${guia.id}/relatos`, colaborador.cookie, 'POST', JSON.stringify({ mensagem: 'Este passo precisa de uma atualização visual.', passo: 2, tituloPasso: 'título antigo' }))).status === 409, 'relato recusa título de passo desatualizado')
  const relato = await request(`/api/documentos/${guia.id}/relatos`, colaborador.cookie, 'POST', JSON.stringify({ mensagem: 'Este passo precisa de uma atualização visual.', passo: 2, tituloPasso: 'Abrir o recebimento' }))
  verificar(relato.status === 201, 'relato por passo é criado')
  verificar(Boolean(await prisma.relatoDocumento.findFirst({ where: { documentoId: guia.id, passoNumero: 2, passoTitulo: 'Abrir o recebimento' } })), 'relato grava número e título do passo')

  const { responderComDocumentos } = await carregarAssistente()
  let resposta = await responderComDocumentos('Onde uso zebrafinal unicostock?', 'portal-de-clientes')
  verificar(resposta.fontes.some((fonte) => fonte.tipo === 'PASSO_A_PASSO' && fonte.href.endsWith('#passo-1') && fonte.trecho?.startsWith('Passo 1 · Conferir zebrafinal')), 'Assistente aponta para a âncora do passo')
  const atualizarTexto = formulario({ sistemaSlug: 'portal-de-clientes', titulo: guia.titulo, slug: guia.slug, tipo: 'PASSO_A_PASSO', comecePorAqui: 'true', passos: passosJson(guia.passos.map((passo, indice) => ({ titulo: passo.titulo, texto: indice === 0 ? 'Agora o marcador novostock aparece na conferência final.' : passo.texto, destaque: passo.destaqueTipo ? { tipo: passo.destaqueTipo, texto: passo.destaqueTexto } : null, print: passo.imagemId ? { imagemId: passo.imagemId } : null }))) })
  verificar((await request(`/api/admin/documentos/${guia.id}`, editor.cookie, 'PATCH', atualizarTexto)).status === 200, 'texto de passo é editado')
  resposta = await responderComDocumentos('Onde aparece novostock conferência?', 'portal-de-clientes')
  verificar(resposta.fontes.some((fonte) => fonte.trecho?.includes('novostock')), 'Assistente usa texto editado na chamada seguinte')
  resposta = await responderComDocumentos('Onde aparece novostock conferência no Portal de clientes?')
  verificar(resposta.fontes.some((fonte) => fonte.href.includes('/documentacao/portal-de-clientes/') && fonte.tipo === 'PASSO_A_PASSO'), 'menção ao Portal de clientes pesquisa o guia correto')

  const artigo = formulario({ sistemaSlug: 'portal-de-clientes', titulo: `${prefixo} página`, slug: `${prefixo}-pagina`, tipo: 'ARTIGO', conteudo: 'Página para regressão de imagens.', comecePorAqui: 'false' })
  artigo.append('imagens', arquivoPng('uma.png')); artigo.append('imagens', arquivoPng('duas.png'))
  const artigoCriado = await request('/api/admin/documentos', admin.cookie, 'POST', artigo)
  const artigoDados = await artigoCriado.json(); documentos.push(artigoDados.id)
  let pagina = await prisma.documento.findUniqueOrThrow({ where: { id: artigoDados.id }, include: { imagens: { orderBy: { ordem: 'asc' } } } })
  chaves.push(...pagina.imagens.map((imagem) => imagem.arquivoKey))
  const removerUma = formulario({ sistemaSlug: 'portal-de-clientes', titulo: pagina.titulo, slug: pagina.slug, tipo: 'ARTIGO', conteudo: pagina.conteudo!, comecePorAqui: 'false', imagensRemover: JSON.stringify([pagina.imagens[0].id]), ativo: 'true', ordem: '0' })
  verificar((await request(`/api/admin/documentos/${pagina.id}`, admin.cookie, 'PATCH', removerUma)).status === 200, 'PATCH de Página remove somente imagem indicada')
  pagina = await prisma.documento.findUniqueOrThrow({ where: { id: pagina.id }, include: { imagens: true } })
  verificar(pagina.imagens.length === 1 && await existeArquivo(pagina.imagens[0].arquivoKey), 'outra imagem da Página permanece no banco e storage')
  const manterPagina = formulario({ sistemaSlug: 'portal-de-clientes', titulo: pagina.titulo, slug: pagina.slug, tipo: 'ARTIGO', conteudo: pagina.conteudo!, comecePorAqui: 'false', ativo: 'true', ordem: '0' })
  verificar((await request(`/api/admin/documentos/${pagina.id}`, admin.cookie, 'PATCH', manterPagina)).status === 200 && (await prisma.documentoImagem.count({ where: { documentoId: pagina.id } })) === 1, 'PATCH seguinte sem imagensRemover preserva imagem restante')

  const grande = Buffer.alloc(6 * 1024 * 1024); pngPequeno.copy(grande)
  const formGrande = formulario({ sistemaSlug: 'portal-de-clientes', titulo: `${prefixo} grande`, slug: `${prefixo}-grande`, tipo: 'PASSO_A_PASSO', comecePorAqui: 'false', passos: passosJson([{ ...passosIniciais[0], print: { novo: 0 } }, { ...passosIniciais[1], print: { novo: 1 } }]) })
  formGrande.append('printsPassos', arquivoPng('grande-1.png', grande)); formGrande.append('printsPassos', arquivoPng('grande-2.png', grande))
  const grandeCriado = await request('/api/admin/documentos', admin.cookie, 'POST', formGrande)
  const grandeDados = await grandeCriado.json().catch(() => ({}))
  verificar(grandeCriado.status === 201, 'multipart acima de 10 MB chega completo à rota')
  documentos.push(grandeDados.id)

  const semConfirmar = formulario({ sistemaSlug: 'portal-de-clientes', titulo: guia.titulo, slug: guia.slug, tipo: 'ARTIGO', conteudo: 'Conteúdo convertido.', comecePorAqui: 'false' })
  const conflito = await request(`/api/admin/documentos/${guia.id}`, editor.cookie, 'PATCH', semConfirmar)
  verificar(conflito.status === 409 && (await conflito.json()).codigo === 'CONFIRMAR_DESCARTE_PASSOS', 'troca de guia exige confirmação explícita')
  semConfirmar.set('descartarPassos', '1')
  verificar((await request(`/api/admin/documentos/${guia.id}`, editor.cookie, 'PATCH', semConfirmar)).status === 200, 'troca confirmada conclui e descarta passos')
  verificar((await prisma.passoDocumento.count({ where: { documentoId: guia.id } })) === 0 && (await prisma.documentoImagem.count({ where: { documentoId: guia.id } })) === 0, 'troca confirmada remove passos e prints')

  const estoque = await responderComDocumentos('Consulta no Controle de estoque?')
  verificar(!estoque.fontes.some((fonte) => fonte.href.includes('/documentacao/portal-de-clientes/')), 'menção ao Controle de estoque não inclui materiais de outro sistema')

  console.log(`${checks} verificações de integração do Passo a passo passaram.`)
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : erro)
  process.exitCode = 1
}).finally(async () => {
  const registros = await prisma.documentoImagem.findMany({ where: { documentoId: { in: documentos } }, select: { arquivoKey: true } })
  await prisma.relatoDocumento.deleteMany({ where: { OR: [{ autorId: { in: usuarios } }, { documentoId: { in: documentos } }] } })
  await prisma.documento.deleteMany({ where: { OR: [{ id: { in: documentos } }, { autorId: { in: usuarios } }] } })
  await Promise.allSettled([...new Set([...chaves, ...registros.map((registro) => registro.arquivoKey)])].map(removerArquivo))
  await prisma.auditLog.deleteMany({ where: { actorId: { in: usuarios } } })
  await prisma.colaborador.deleteMany({ where: { id: { in: usuarios } } })
  await prisma.$disconnect()
  try { (await import('../src/lib/prisma')).prisma.$disconnect() } catch { /* módulo não carregado */ }
})
