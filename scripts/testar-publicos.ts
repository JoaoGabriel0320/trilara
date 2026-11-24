import { loadEnvConfig } from '@next/env'
import { PrismaClient } from '@prisma/client'
import { SignJWT } from 'jose'
import { createHmac, randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { removerArquivo, salvarGif, salvarImagem } from '../src/lib/storage'

loadEnvConfig(process.cwd(), true)
const base = process.argv[2] ?? 'http://127.0.0.1:3002'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Servidor de teste deve ser local.')
if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error('Banco de teste deve ser local.')

const prisma = new PrismaClient()
const prefixo = `teste-publicos-${randomUUID()}`
const usuarios: string[] = []
const documentos: string[] = []
const chaves: string[] = []
let verificacoes = 0

function verificar(condicao: unknown, descricao: string) {
  assert.ok(condicao, descricao)
  verificacoes++
  console.log(`OK ${descricao}`)
}

async function usuario(tipoAcesso: 'INTERNO' | 'EXTERNO', papel: 'COLABORADOR' | 'ADMIN', empresaNome?: string) {
  const colaborador = await prisma.colaborador.create({ data: {
    nome: `${prefixo}-${tipoAcesso}-${usuarios.length}`,
    email: `${prefixo}-${usuarios.length}@example.invalid`,
    senhaHash: randomUUID(), tipoAcesso, papel, empresaNome,
  } })
  usuarios.push(colaborador.id)
  const sessao = await prisma.sessaoColaborador.create({ data: { colaboradorId: colaborador.id, expiraEm: new Date(Date.now() + 600_000) } })
  const credencial = createHmac('sha256', process.env.SESSION_SECRET!).update(colaborador.senhaHash).digest('hex')
  const token = await new SignJWT({ id: colaborador.id, sessaoId: sessao.id, nome: colaborador.nome, email: colaborador.email, papel,
    tipoAcesso, mustChangePassword: false, credencial,
  }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('10m').sign(new TextEncoder().encode(process.env.SESSION_SECRET))
  return { id: colaborador.id, cookie: `colaborador_token=${token}` }
}

async function pedir(caminho: string, cookie: string, method = 'GET', body?: FormData | string) {
  return fetch(new URL(caminho, base), { method, body, redirect: 'manual', signal: AbortSignal.timeout(30_000),
    headers: { Origin: base, Cookie: cookie, ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}) },
  })
}

async function buscaComTitulo(cookie: string, titulo: string) {
  let corpo = ''
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    corpo = JSON.stringify(await (await pedir('/api/documentos/busca', cookie)).json())
    if (corpo.includes(titulo)) return corpo
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return corpo
}

function formulario(campos: Record<string, string>) {
  const form = new FormData()
  for (const [chave, valor] of Object.entries(campos)) form.set(chave, valor)
  return form
}

async function executar() {
  const interno = await usuario('INTERNO', 'COLABORADOR')
  const admin = await usuario('INTERNO', 'ADMIN')
  const clienteA = await usuario('EXTERNO', 'COLABORADOR', 'Empresa A')
  const clienteB = await usuario('EXTERNO', 'COLABORADOR', 'Empresa B')
  const internoDoc = await prisma.documento.create({ data: { sistemaSlug: 'portal-de-clientes', slug: `${prefixo}-interno`, titulo: `${prefixo}-interno`,
    tipo: 'ARTIGO', conteudo: 'Segredo interno do teste', publico: 'INTERNO' } })
  documentos.push(internoDoc.id)
  const externoDoc = await prisma.documento.create({ data: { sistemaSlug: 'portal-de-clientes', slug: `${prefixo}-externo`, titulo: `${prefixo}-externo`,
    tipo: 'ARTIGO', conteudo: 'Manual externo do teste', publico: 'EXTERNO' } })
  documentos.push(externoDoc.id)
  const terceiroDoc = await prisma.documento.create({ data: { sistemaSlug: 'gestao-financeira', slug: `${prefixo}-terceiro`, titulo: `${prefixo}-terceiro`,
    tipo: 'ARTIGO', conteudo: 'Outro sistema interno', publico: 'INTERNO' } })
  documentos.push(terceiroDoc.id)
  const gif = Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64')
  const gifExterno = await salvarGif('portal-de-clientes', gif)
  chaves.push(gifExterno.chave)
  const arquivoExterno = await prisma.documento.create({ data: { sistemaSlug: 'portal-de-clientes', slug: `${prefixo}-gif-externo`, titulo: `${prefixo}-gif-externo`,
    tipo: 'GIF', publico: 'EXTERNO', arquivoKey: gifExterno.chave, arquivoNome: 'externo.gif', arquivoBytes: gifExterno.tamanho } })
  documentos.push(arquivoExterno.id)
  const gifInterno = await salvarGif('portal-de-clientes', gif)
  chaves.push(gifInterno.chave)
  const arquivoInterno = await prisma.documento.create({ data: { sistemaSlug: 'portal-de-clientes', slug: `${prefixo}-gif-interno`, titulo: `${prefixo}-gif-interno`,
    tipo: 'GIF', publico: 'INTERNO', arquivoKey: gifInterno.chave, arquivoNome: 'interno.gif', arquivoBytes: gifInterno.tamanho } })
  documentos.push(arquivoInterno.id)
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  const imagemInterna = await salvarImagem('portal-de-clientes', png, 'image/png')
  chaves.push(imagemInterna.chave)
  const registroImagem = await prisma.documentoImagem.create({ data: { documentoId: internoDoc.id, arquivoKey: imagemInterna.chave,
    arquivoNome: 'interno.png', arquivoBytes: imagemInterna.tamanho, mimeType: imagemInterna.mimeType } })

  const buscaAquecida = await buscaComTitulo(interno.cookie, internoDoc.titulo)
  verificar(buscaAquecida.includes(internoDoc.titulo) && !buscaAquecida.includes(externoDoc.titulo), 'cache de busca interna aquecido sem material externo')

  for (const cliente of [clienteA, clienteB]) {
    const indice = await pedir('/api/documentos/busca', cliente.cookie)
    verificar(indice.status === 200, 'busca externa disponível')
    const corpo = await buscaComTitulo(cliente.cookie, externoDoc.titulo)
    verificar(corpo.includes(externoDoc.titulo) && !corpo.includes(internoDoc.titulo) && !corpo.includes(terceiroDoc.titulo), 'busca contém apenas material externo')
    const pagina = await pedir('/documentacao/portal-de-clientes', cliente.cookie)
    const html = await pagina.text()
    verificar(pagina.status === 200 && html.includes(externoDoc.titulo) && !html.includes(internoDoc.titulo), 'portal de clientes mostra somente manuais externos')
    verificar((await pedir(`/documentacao/portal-de-clientes/${internoDoc.slug}`, cliente.cookie)).status === 404, 'URL de manual interno bloqueada')
    verificar((await pedir(`/api/documentos/${arquivoInterno.id}/arquivo`, cliente.cookie)).status === 404, 'arquivo interno bloqueado por ID')
    verificar((await pedir(`/api/documentos/${internoDoc.id}/imagens/${registroImagem.id}`, cliente.cookie)).status === 404, 'print interno bloqueado por ID')
    verificar((await pedir(`/api/documentos/${arquivoExterno.id}/arquivo`, cliente.cookie)).status === 200, 'arquivo externo liberado')
    verificar((await pedir('/documentacao/gestao-financeira', cliente.cookie)).status === 404, 'sistema interno bloqueado')
    verificar((await pedir(`/api/documentos/${internoDoc.id}/favorito`, cliente.cookie, 'POST')).status === 404, 'favorito de manual interno bloqueado')
    verificar((await pedir(`/api/documentos/${internoDoc.id}/relatos`, cliente.cookie, 'POST', JSON.stringify({ mensagem: 'Relato indevido de teste.' }))).status === 404, 'relato em manual interno bloqueado')
    verificar((await pedir('/api/assistente', cliente.cookie, 'POST', JSON.stringify({ pergunta: 'teste' }))).status === 404, 'Assistente desativado')
    verificar((await pedir('/admin/usuarios', cliente.cookie)).status !== 200, 'administração bloqueada')
    verificar((await pedir('/api/admin/usuarios', cliente.cookie, 'POST', JSON.stringify({}))).status === 403, 'API administrativa bloqueada')
    const favoritos = await pedir('/favoritos', cliente.cookie)
    verificar(favoritos.status === 200 && !(await favoritos.text()).includes(internoDoc.titulo), 'favoritos não mostram título interno')
  }

  const buscaInterna = JSON.stringify(await (await pedir('/api/documentos/busca', interno.cookie)).json())
  verificar(buscaInterna.includes(internoDoc.titulo) && !buscaInterna.includes(externoDoc.titulo), 'busca interna não mistura manuais externos')
  verificar((await pedir(`/documentacao/portal-de-clientes/${externoDoc.slug}`, clienteA.cookie)).status === 200, 'cliente abre manual externo por URL')
  verificar((await pedir(`/documentacao/portal-de-clientes/${externoDoc.slug}`, interno.cookie)).status === 404, 'leitor interno não recebe manual externo')
  verificar((await pedir(`/documentacao/portal-de-clientes/${externoDoc.slug}`, admin.cookie)).status === 200, 'administrador pode revisar manual externo por URL')

  const invalido = await pedir('/api/admin/documentos', admin.cookie, 'POST', formulario({ sistemaSlug: 'gestao-financeira', tipo: 'LINK',
    titulo: `${prefixo}-invalido`, urlExterna: 'https://example.invalid/', publico: 'EXTERNO' }))
  verificar(invalido.status === 400, 'material externo em sistema interno recusado')
  const criado = await pedir('/api/admin/documentos', admin.cookie, 'POST', formulario({ sistemaSlug: 'agenda-de-operacoes', tipo: 'LINK',
    titulo: `${prefixo}-agenda-de-operacoes`, urlExterna: 'https://example.invalid/', publico: 'EXTERNO' }))
  verificar(criado.status === 201, 'administrador cadastra material externo na agenda de operações')
  const criadoDados = await criado.json()
  documentos.push(criadoDados.id)
  verificar((await prisma.documento.findUniqueOrThrow({ where: { id: criadoDados.id } })).publico === 'EXTERNO', 'público externo foi persistido')
  const buscaAposPublicacao = JSON.stringify(await (await pedir('/api/documentos/busca', clienteA.cookie)).json())
  verificar(buscaAposPublicacao.includes(`${prefixo}-agenda-de-operacoes`), 'busca externa atualizada após publicação')

  const usuarioInvalido = await pedir('/api/admin/usuarios', admin.cookie, 'POST', JSON.stringify({ nome: 'Teste',
    email: 'teste@example.invalid', tipoAcesso: 'EXTERNO', empresaNome: 'Empresa', papel: 'ADMIN' }))
  verificar(usuarioInvalido.status === 400, 'administrador externo recusado')
  const usuarioCriado = await pedir('/api/admin/usuarios', admin.cookie, 'POST', JSON.stringify({ nome: 'Cliente de teste',
    email: `${prefixo}-novo@example.invalid`, tipoAcesso: 'EXTERNO', empresaNome: 'Empresa de teste', papel: 'COLABORADOR' }))
  verificar(usuarioCriado.status === 201, 'administrador cadastra cliente com e-mail externo')
  const dadosUsuario = await usuarioCriado.json()
  usuarios.push(dadosUsuario.id)
  const clienteCadastrado = await prisma.colaborador.findUniqueOrThrow({ where: { id: dadosUsuario.id } })
  verificar(clienteCadastrado.tipoAcesso === 'EXTERNO' && clienteCadastrado.empresaNome === 'Empresa de teste', 'tipo e empresa do cliente persistidos')

  const cadastroInterno = await prisma.colaborador.findUniqueOrThrow({ where: { id: interno.id } })
  const alterarPublico = await pedir(`/api/admin/usuarios/${interno.id}`, admin.cookie, 'PATCH', JSON.stringify({
    nome: cadastroInterno.nome, email: cadastroInterno.email, tipoAcesso: 'EXTERNO', empresaNome: 'Empresa de teste',
    papel: 'COLABORADOR', departamento: '', filialNome: '',
  }))
  verificar(alterarPublico.status === 200, 'administrador altera conta para cliente')
  verificar((await pedir('/api/documentos/busca', interno.cookie)).status === 401, 'sessão antiga revogada na troca de público')
}

executar().then(() => console.log(`${verificacoes} verificações passaram`)).catch((erro) => { console.error(erro); process.exitCode = 1 }).finally(async () => {
  try {
    if (documentos.length) {
      await prisma.favoritoDocumento.deleteMany({ where: { documentoId: { in: documentos } } })
      await prisma.relatoDocumento.deleteMany({ where: { documentoId: { in: documentos } } })
      await prisma.documento.deleteMany({ where: { id: { in: documentos } } })
    }
    if (usuarios.length) await prisma.colaborador.deleteMany({ where: { id: { in: usuarios } } })
    for (const chave of chaves) await removerArquivo(chave)
  } finally {
    await prisma.$disconnect()
  }
})
