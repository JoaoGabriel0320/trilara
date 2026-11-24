import { loadEnvConfig } from '@next/env'
import { PrismaClient } from '@prisma/client'
import { SignJWT } from 'jose'
import { createHmac } from 'node:crypto'
import os from 'node:os'
import { writeFile } from 'node:fs/promises'

// Somente leituras. Cookies, hashes, nomes e segredos nunca vão para o relatório.
loadEnvConfig(process.cwd(), true)
const prisma = new PrismaClient()
const base = process.argv[2] ?? 'http://127.0.0.1:3002'
const destino = process.argv[3]
const url = new URL(base)
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
  throw new Error('Este diagnóstico aceita somente um servidor local.')
}
const resultados: object[] = []
const resumir = (valores: number[]) => {
  const ordenados = [...valores].sort((a, b) => a - b)
  return {
    amostras: valores.length,
    medianaMs: Math.round(ordenados[Math.floor(ordenados.length / 2)]),
    p95Ms: Math.round(ordenados[Math.ceil(ordenados.length * 0.95) - 1]),
  }
}

async function medirRota(rota: string, cookie?: string, rsc = false) {
  const tempos: number[] = []
  const ttfb: number[] = []
  let primeiraMs = 0
  let bytes = 0
  const statuses: Record<number, number> = {}
  for (let i = 0; i < 11; i++) {
    const inicio = performance.now()
    const resposta = await fetch(new URL(rota, base), {
      redirect: 'manual',
      signal: AbortSignal.timeout(60_000),
      headers: { ...(cookie ? { Cookie: cookie } : {}), ...(rsc ? { RSC: '1' } : {}) },
    })
    const cabecalhosMs = performance.now() - inicio
    bytes = (await resposta.arrayBuffer()).byteLength
    const tempo = performance.now() - inicio
    statuses[resposta.status] = (statuses[resposta.status] ?? 0) + 1
    if (i === 0) primeiraMs = Math.round(tempo)
    else { tempos.push(tempo); ttfb.push(cabecalhosMs) }
  }
  const resultado = { rota, formato: rsc ? 'RSC' : 'HTML/JSON', primeiraMs, ...resumir(tempos), ttfb: resumir(ttfb), bytes, statuses }
  resultados.push(resultado)
  console.log(JSON.stringify(resultado))
}

async function main() {
  const maquina = { cpu: os.cpus()[0]?.model, threads: os.cpus().length, ramGB: +(os.totalmem() / 2 ** 30).toFixed(2), ramLivreGB: +(os.freemem() / 2 ** 30).toFixed(2) }
  console.log(JSON.stringify(maquina))
  const latencias: number[] = []
  for (let i = 0; i < 11; i++) {
    const inicio = performance.now()
    await prisma.$queryRaw`SELECT 1`
    if (i > 0) latencias.push(performance.now() - inicio)
  }
  const banco = { ...resumir(latencias), documentosAtivos: await prisma.documento.count({ where: { ativo: true } }) }
  console.log(JSON.stringify({ banco }))
  // Reutiliza uma sessão local vigente sem criar conta, login ou sessão no banco.
  const sessao = await prisma.sessaoColaborador.findFirst({
    where: { expiraEm: { gt: new Date() }, colaborador: { ativo: true, mustChangePassword: false } },
    orderBy: { criadaEm: 'desc' }, include: { colaborador: true },
  })
  let cookie: string | undefined
  if (sessao && process.env.SESSION_SECRET) {
    const c = sessao.colaborador
    const token = await new SignJWT({ id: c.id, sessaoId: sessao.id, nome: c.nome, email: c.email, papel: c.papel, mustChangePassword: false, credencial: createHmac('sha256', process.env.SESSION_SECRET).update(c.senhaHash).digest('hex') })
      .setProtectedHeader({ alg: 'HS256' }).setIssuedAt()
      .setExpirationTime(Math.min(Math.floor(sessao.expiraEm.getTime() / 1000), Math.floor(Date.now() / 1000) + 600))
      .sign(new TextEncoder().encode(process.env.SESSION_SECRET))
    cookie = `colaborador_token=${token}`
  }
  for (const rota of ['/login', '/']) await medirRota(rota)
  if (cookie) {
    for (const rota of ['/inicio', '/documentacao', '/lab', '/conta']) {
      await medirRota(rota, cookie)
      await medirRota(rota, cookie, true)
    }
    await medirRota('/api/documentos/busca', cookie)
  } else console.log('Sem sessão vigente: páginas autenticadas não foram medidas.')
  if (destino) await writeFile(destino, JSON.stringify({ data: new Date().toISOString(), base, maquina, banco, autenticado: !!cookie, resultados }, null, 2) + '\n')
}

main().catch(() => { console.error('Diagnóstico falhou; verifique o servidor e a conexão local com o banco.'); process.exitCode = 1 }).finally(() => prisma.$disconnect())
