/** Aceita apenas caminhos internos após o login, inclusive com query string. */
export function destinoAposLogin(valor: unknown): string {
  if (typeof valor !== 'string' || !valor.startsWith('/') || valor.includes('\\') || /[\u0000-\u001f\u007f]/.test(valor)) return '/inicio'
  try {
    const destino = new URL(valor, 'https://hub.invalid')
    return destino.origin === 'https://hub.invalid' ? valor : '/inicio'
  } catch {
    return '/inicio'
  }
}
