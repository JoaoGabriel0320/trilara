import assert from 'node:assert/strict'
import { acertosTermos } from '../src/lib/assistente-correspondencia'

const termos = ['finalizo', 'pedido']
assert.equal(acertosTermos('Como finalizar um pedido', termos), 2)
assert.equal(acertosTermos('Pedido finalizado.', termos), 2)
assert.equal(acertosTermos('Como consultar um pedido', termos), 1)
assert.equal(acertosTermos('Como finalizar uma nota', termos), 1)
assert.equal(acertosTermos('Como fazer um pedido', termos), 1)

console.log('Correspondência do assistente: flexões de finalizar e termos distintos verificados.')
