import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const base = process.argv[2] ?? 'http://127.0.0.1:3002'
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) {
  throw new Error('Este teste só pode ser executado contra um servidor local.')
}

async function pedir(caminho, opcoes = {}) {
  return fetch(new URL(caminho, base), {
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
    ...opcoes,
  })
}

async function main() {
  assert.equal((await pedir('/api/admin/usuarios')).status, 401, 'API administrativa sem sessão')
  assert.equal((await pedir('/api/documentos/busca')).status, 401, 'busca sem sessão')
  assert.equal((await pedir('/api/admin/usuarios', {
    headers: { Cookie: 'colaborador_token=token-forjado' },
  })).status, 401, 'cookie de sessão forjado')

  const corpo = JSON.stringify({})
  assert.equal((await pedir('/api/recuperar-senha', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo,
  })).status, 403, 'escrita sem Origin')
  assert.equal((await pedir('/api/recuperar-senha', {
    method: 'POST', headers: { Origin: 'https://exemplo.invalid', 'Content-Type': 'application/json' }, body: corpo,
  })).status, 403, 'escrita com Origin externo')
  assert.equal((await pedir('/api/assistente')).status, 404, 'assistente desativado')

  const codigos = []
  for (let tentativa = 0; tentativa < 7; tentativa++) {
    const resposta = await pedir('/api/recuperar-senha', {
      method: 'POST',
      headers: {
        Origin: base,
        'Content-Type': 'application/json',
        'X-Real-IP': `198.51.100.${tentativa + 1}`,
        'X-Forwarded-For': `203.0.113.${tentativa + 1}`,
      },
      body: corpo,
    })
    codigos.push(resposta.status)
  }
  assert.deepEqual(codigos, [400, 400, 400, 400, 400, 429, 429], 'troca de IP falso não contorna o limite')

  const email = `auditoria-${randomUUID()}@example.invalid`
  const tentativasLogin = []
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const resposta = await pedir('/api/login', {
      method: 'POST',
      headers: {
        Origin: base,
        'Content-Type': 'application/json',
        'X-Real-IP': `198.51.100.${tentativa + 20}`,
      },
      body: JSON.stringify({ email, senha: 'senha-invalida' }),
    })
    tentativasLogin.push(resposta.status)
  }
  assert.deepEqual(tentativasLogin, [401, 401, 401, 401, 429, 429], 'tentativas de senha com IP falso permanecem bloqueadas por e-mail')
  console.log('OK: sessão, origem, módulo pausado, IP forjado e tentativas de senha bloqueados por HTTP local.')
}

main().catch((erro) => { console.error(erro); process.exitCode = 1 })
