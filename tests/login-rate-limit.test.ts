import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { bloqueioLogin, iniciarTentativaLogin, registrarFalhaLogin, limparTentativasLogin } from '../src/lib/rateLimit'

test('login advances through one minute, five minutes, one hour and one day', () => {
  const conta = `login:${randomUUID()}`
  const ip = `ip:${randomUUID()}`
  const originalNow = Date.now
  let now = 1_000_000
  Date.now = () => now
  try {
    for (const duration of [60, 300, 3_600, 86_400]) {
      for (let attempt = 1; attempt <= 5; attempt++) {
        assert.equal(iniciarTentativaLogin(conta).bloqueado, false)
      }
      assert.equal(bloqueioLogin(conta).esperarSegundos, duration)
      assert.equal(iniciarTentativaLogin(conta).bloqueado, true)
      now += duration * 1_000
    }
    limparTentativasLogin(conta)
    for (let attempt = 1; attempt <= 5; attempt++) iniciarTentativaLogin(conta)
    assert.equal(bloqueioLogin(conta).esperarSegundos, 60)

    for (let attempt = 1; attempt <= 30; attempt++) registrarFalhaLogin(ip, 30)
    assert.equal(bloqueioLogin(ip).esperarSegundos, 60)
  } finally {
    Date.now = originalNow
    limparTentativasLogin(conta)
    limparTentativasLogin(ip)
  }
})
