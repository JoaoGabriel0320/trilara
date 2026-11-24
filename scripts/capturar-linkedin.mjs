import { createHmac, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import nextEnv from '@next/env'
import { PrismaClient } from '@prisma/client'
import { SignJWT } from 'jose'

nextEnv.loadEnvConfig(process.cwd(), false)

const base = 'http://127.0.0.1:3002'
const port = 9227
const output = 'materiais/linkedin'
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const db = new URL(process.env.DATABASE_URL ?? '')
if (!['localhost', '127.0.0.1'].includes(db.hostname) || db.port !== '5435' || db.pathname !== '/trilara') {
  throw new Error('Captura restrita ao banco pessoal local.')
}

const prisma = new PrismaClient()
let chrome
let ws
let nextId = 0
const pending = new Map()

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function cd(method, params = {}) {
  const id = ++nextId
  const result = new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
  ws.send(JSON.stringify({ id, method, params }))
  return result
}

async function evaluate(expression) {
  const response = await cd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text)
  return response.result.value
}

async function navigate(path) {
  await cd('Page.navigate', { url: new URL(path, base).href })
  for (let attempt = 0; attempt < 60; attempt++) {
    await delay(200)
    const ready = await evaluate('document.readyState')
    if (ready === 'complete') break
  }
  await delay(900)
  const title = await evaluate('document.title')
  console.log(`Página: ${path} — ${title}`)
}

async function capture(name, expression) {
  if (expression) await evaluate(expression)
  await delay(450)
  const { data } = await cd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true })
  await writeFile(`${output}/${name}.png`, Buffer.from(data, 'base64'))
  console.log(`Imagem: ${name}.png`)
}

async function main() {
  await mkdir(output, { recursive: true })
  const usuario = await prisma.colaborador.create({ data: {
    nome: 'Demonstração Trilara', email: `demo-imagens-${randomUUID()}@example.invalid`, senhaHash: randomUUID(), papel: 'ADMIN',
  } })
  try {
    const sessao = await prisma.sessaoColaborador.create({ data: { colaboradorId: usuario.id, expiraEm: new Date(Date.now() + 10 * 60_000) } })
    const segredo = process.env.SESSION_SECRET
    if (!segredo) throw new Error('SESSION_SECRET ausente')
    const credencial = createHmac('sha256', segredo).update(usuario.senhaHash).digest('hex')
    const token = await new SignJWT({
      id: usuario.id, sessaoId: sessao.id, nome: usuario.nome, email: usuario.email,
      papel: 'ADMIN', tipoAcesso: 'INTERNO', mustChangePassword: false, credencial,
    }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('10m')
      .sign(new TextEncoder().encode(segredo))

    chrome = spawn(chromePath, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--no-first-run',
      '--no-default-browser-check', `--remote-debugging-port=${port}`,
      `--user-data-dir=${process.cwd()}\\.local-data\\chrome-linkedin`,
      '--window-size=1440,900', 'about:blank',
    ], { stdio: 'ignore', windowsHide: true })

    let target
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1000) })
        target = (await response.json()).find(item => item.type === 'page')
        if (target) break
      } catch { /* Chrome ainda iniciando */ }
      await delay(250)
    }
    if (!target) throw new Error('Chrome não iniciou o protocolo de captura')
    ws = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
    ws.onmessage = event => {
      const message = JSON.parse(event.data)
      if (!message.id) return
      const task = pending.get(message.id)
      if (!task) return
      pending.delete(message.id)
      if (message.error) task.reject(new Error(message.error.message))
      else task.resolve(message.result)
    }
    await cd('Page.enable')
    await cd('Runtime.enable')
    await cd('Network.enable')
    await cd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1.5, mobile: false })
    await cd('Network.setCookie', { name: 'colaborador_token', value: token, url: base, httpOnly: true, sameSite: 'Lax' })

    await navigate('/')
    await capture('01-apresentacao')
    await capture('02-previa-interativa', "document.querySelector('#explorar').scrollIntoView({block:'start'})")
    await capture('03-documentacao-interativa', "document.querySelector('#aba-biblioteca').click(); document.querySelector('#explorar').scrollIntoView({block:'start'})")
    await capture('04-passo-a-passo-interativo', "document.querySelector('#aba-guia').click(); document.querySelector('#explorar').scrollIntoView({block:'start'})")
    await capture('05-gestao-e-permissoes', "document.querySelector('#gestao-titulo').closest('section').scrollIntoView({block:'start'})")

    await navigate('/inicio')
    await capture('06-painel-do-sistema')
    await navigate('/documentacao/portal-de-clientes')
    await capture('07-biblioteca-de-manuais')
    await navigate('/documentacao/portal-de-clientes/demo-acompanhar-solicitacao')
    await capture('08-guia-real')
    await navigate('/admin/sistemas')
    await capture('09-gestao-de-sistemas')
  } finally {
    ws?.close()
    chrome?.kill()
    await prisma.colaborador.delete({ where: { id: usuario.id } })
    await prisma.$disconnect()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
