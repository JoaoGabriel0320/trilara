import { loadEnvConfig } from '@next/env'
import { PrismaClient } from '@prisma/client'
import { SignJWT } from 'jose'
import { createHmac, randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { podeCriarDocumento, podeEditarDocumento } from '../src/lib/auth/permissoes'

loadEnvConfig(process.cwd(), true)
const base = process.argv[2] ?? 'http://127.0.0.1:3002'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Servidor deve ser local.')
if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error('Banco deve ser local.')
const prisma = new PrismaClient()
const prefixo = `teste-permissoes-${randomUUID()}`
const ids: string[] = []
const docIds: string[] = []
let checks = 0
function verificar(condicao: unknown, nome: string) { assert.ok(condicao, nome); checks++; console.log(`OK ${nome}`) }
async function usuario(papel: 'COLABORADOR' | 'EDITOR' | 'ADMIN', sufixo: string) {
  const c = await prisma.colaborador.create({ data: { nome: `${prefixo}-${sufixo}`, email: `${prefixo}-${sufixo}@example.invalid`, senhaHash: randomUUID(), papel } })
  ids.push(c.id)
  const s = await prisma.sessaoColaborador.create({ data: { colaboradorId: c.id, expiraEm: new Date(Date.now() + 600000) } })
  const token = await new SignJWT({ id: c.id, sessaoId: s.id, nome: c.nome, email: c.email, papel, mustChangePassword: false, credencial: createHmac('sha256', process.env.SESSION_SECRET!).update(c.senhaHash).digest('hex') }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('10m').sign(new TextEncoder().encode(process.env.SESSION_SECRET))
  return { id: c.id, nome: c.nome, cookie: `colaborador_token=${token}` }
}
async function request(rota: string, cookie?: string, method = 'GET', body?: BodyInit) {
  return fetch(new URL(rota, base), { method, body, redirect: 'manual', signal: AbortSignal.timeout(90000), headers: { Origin: base, ...(cookie ? { Cookie: cookie } : {}), ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}) } })
}
function form(campos: Record<string, string>) { const f = new FormData(); for (const [k, v] of Object.entries(campos)) f.set(k, v); return f }
async function bloqueada(rota: string, cookie: string, method = 'GET', body?: BodyInit) {
  const r = await request(rota, cookie, method, body)
  const texto = await r.text()
  return [307, 308, 403, 404].includes(r.status) || (r.status === 200 && texto.includes('NEXT_REDIRECT'))
}

async function main() {
  verificar(!podeCriarDocumento('COLABORADOR') && podeCriarDocumento('EDITOR') && podeCriarDocumento('ADMIN'), 'matriz de criação por perfil')
  verificar(!podeEditarDocumento({ id: 'a', papel: 'COLABORADOR' }, 'a') && !podeEditarDocumento({ id: 'a', papel: 'EDITOR' }, null) && podeEditarDocumento({ id: 'a', papel: 'ADMIN' }, null), 'documentos sem autor são editáveis apenas pelo administrador')
  const c = await usuario('COLABORADOR', 'colaborador')
  const g = await usuario('EDITOR', 'gestor')
  const outro = await usuario('EDITOR', 'outro-gestor')
  const a = await usuario('ADMIN', 'administrador')
  const semSessao = await request('/meus-documentos')
  verificar(semSessao.status === 307, 'área própria exige sessão')
  const dados = { sistemaSlug: 'portal-de-clientes', titulo: `${prefixo}-documento`, tipo: 'LINK', urlExterna: 'https://example.invalid/manual' }
  verificar((await request('/api/admin/documentos', c.cookie, 'POST', form(dados))).status === 403, 'colaborador não cria documentos')
  verificar(await bloqueada('/meus-documentos', c.cookie), 'colaborador não acessa gestão')
  const criado = await request('/api/admin/documentos', g.cookie, 'POST', form({ ...dados, ativo: 'false', ordem: '99' }))
  verificar(criado.status === 201, 'gestor cria documento')
  const { id } = await criado.json()
  docIds.push(id)
  const registro = await prisma.documento.findUniqueOrThrow({ where: { id } })
  verificar(registro.autorId === g.id && registro.ativo && registro.ordem === 0, 'autoria definida pelo servidor e opções administrativas ignoradas na criação')
  const terceiro = await prisma.documento.create({ data: { titulo: `${prefixo}-alheio`, slug: `${prefixo}-alheio`, sistemaSlug: 'portal-de-clientes', tipo: 'LINK', urlExterna: 'https://example.invalid/manual', autorId: outro.id } })
  docIds.push(terceiro.id)
  verificar((await request(`/api/admin/documentos/${terceiro.id}`, g.cookie, 'PATCH', form({ titulo: 'alteração indevida' }))).status === 403, 'gestor não edita documento alheio via API')
  verificar((await request(`/api/admin/documentos/${id}`, g.cookie, 'DELETE')).status === 403, 'gestor não exclui nem o próprio documento')
  verificar((await request(`/api/admin/documentos/${id}`, g.cookie, 'PATCH', form({ ativo: 'false' }))).status === 403, 'gestor não altera publicação')
  verificar((await request('/api/admin/categorias', g.cookie, 'POST', JSON.stringify({ nome: 'indevida', sistemaSlug: 'portal-de-clientes' }))).status === 403, 'gestor não administra seções')
  const editado = await request(`/api/admin/documentos/${id}`, g.cookie, 'PATCH', form({ titulo: `${prefixo}-editado`, urlExterna: 'https://example.invalid/atualizado' }))
  verificar(editado.status === 200, 'gestor edita o próprio documento')
  verificar((await prisma.documento.findUniqueOrThrow({ where: { id } })).autorId === g.id, 'edição preserva autoria')
  verificar((await request(`/api/documentos/${id}/relatos`, c.cookie, 'POST', JSON.stringify({ mensagem: 'O conteúdo deste documento precisa de correção.' }))).status === 201, 'colaborador envia relato para a TI')
  const relato = await prisma.relatoDocumento.findFirstOrThrow({ where: { documentoId: id, autorId: c.id } })
  verificar((await request(`/api/admin/relatos/${relato.id}`, g.cookie, 'PATCH', JSON.stringify({ status: 'RESOLVIDO' }))).status === 403, 'gestor não resolve relato da TI')
  verificar((await request(`/api/admin/relatos/${relato.id}`, a.cookie, 'PATCH', JSON.stringify({ status: 'RESOLVIDO' }))).status === 200, 'administrador resolve relato')
  const lista = await request('/meus-documentos', g.cookie)
  const html = await lista.text()
  verificar(lista.status === 200 && html.includes(`${prefixo}-editado`) && !html.includes(`${prefixo}-alheio`), 'lista do gestor mostra somente os próprios documentos')
  verificar(html.includes('Criado por') && html.includes(g.nome), 'lista apresenta autor e data de criação')
  verificar(await bloqueada(`/meus-documentos/${terceiro.id}`, g.cookie), 'gestor não abre formulário de documento alheio')
  for (const rota of ['/admin', '/admin/secoes', '/admin/usuarios', '/admin/sistemas', '/admin/avaliacoes', '/admin/logs', '/admin/relatos']) verificar(await bloqueada(rota, g.cookie), `gestor bloqueado em ${rota}`)
  const retorno = await fetch(new URL('/admin', base), { headers: { Cookie: g.cookie }, signal: AbortSignal.timeout(90000) })
  const retornoHtml = await retorno.text()
  verificar(!retornoHtml.includes('NEXT_REDIRECT;replace;/admin;'), 'bloqueio administrativo não redireciona para a própria rota')
  const gestorForm = await request(`/meus-documentos/${id}`, g.cookie)
  const formulario = await gestorForm.text()
  verificar(gestorForm.status === 200 && !formulario.includes('Criar nova seção') && !formulario.includes('Ordem na listagem'), 'formulário próprio não apresenta controles administrativos')
  verificar((await request(`/api/admin/documentos/${terceiro.id}`, a.cookie, 'PATCH', form({ titulo: `${prefixo}-admin-editou`, urlExterna: 'https://example.invalid/admin' }))).status === 200, 'administrador edita documento de qualquer autor')
  verificar((await request(`/api/admin/documentos/${id}`, a.cookie, 'PATCH', form({ ativo: 'false' }))).status === 200, 'administrador mantém controle de publicação')
  verificar((await request(`/api/admin/documentos/${id}`, a.cookie, 'DELETE')).status === 200, 'administrador exclui documento')
  const logs = await prisma.auditLog.findMany({ where: { entidade: 'Documento', entidadeId: id }, orderBy: { criadoEm: 'asc' } })
  verificar(JSON.stringify(logs.map(l => l.acao)) === JSON.stringify(['criar', 'editar', 'despublicar', 'excluir']), 'histórico preserva criação, edição, despublicação e exclusão na ordem')
  verificar(logs.every(l => l.actorNome && l.criadoEm instanceof Date) && logs[0].actorId === g.id && logs.at(-1)?.actorId === a.id, 'histórico registra responsável e data, mesmo após exclusão')
  const historico = await request('/admin/logs?acao=excluir', a.cookie)
  verificar(historico.status === 200 && (await historico.text()).includes(`${prefixo}-editado`), 'administrador consulta histórico com filtro')
  await prisma.colaborador.update({ where: { id: g.id }, data: { papel: 'COLABORADOR' } })
  verificar((await request('/api/admin/documentos', g.cookie, 'POST', form(dados))).status === 403, 'mudança de papel no banco revoga permissão de token antigo')
  console.log(`${checks} verificações passaram.`)
}

main().catch(e => { console.error(e.message); process.exitCode = 1 }).finally(async () => {
  // Limpeza restrita aos IDs de fixtures desta execução.
  await prisma.relatoDocumento.deleteMany({ where: { autorId: { in: ids } } })
  await prisma.documento.deleteMany({ where: { OR: [{ id: { in: docIds } }, { autorId: { in: ids } }] } })
  await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } })
  await prisma.colaborador.deleteMany({ where: { id: { in: ids } } })
  await prisma.$disconnect()
})
