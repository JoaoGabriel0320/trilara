// src/lib/senha.ts

import { randomInt } from 'node:crypto'

// Sem caracteres ambíguos (0/O, 1/l/I) — a senha é lida em voz alta ou digitada
// por outra pessoa ao entregar o acesso, então precisa ser inequívoca.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

/** Gera uma senha temporária legível. O colaborador troca no primeiro login. */
export function gerarSenhaTemporaria(tamanho = 10): string {
  let senha = ''
  for (let i = 0; i < tamanho; i++) {
    senha += ALFABETO[randomInt(ALFABETO.length)]
  }
  return senha
}
