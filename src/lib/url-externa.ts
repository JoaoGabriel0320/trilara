/** Aceita apenas endereços HTTP(S) completos, sem credenciais ou caracteres de controle. */
export function urlExternaValida(valor: unknown, maximo = 2048): valor is string {
  if (typeof valor !== 'string' || !valor || valor.length > maximo || /[\u0000-\u001f\u007f\\]/.test(valor)) return false
  try {
    const url = new URL(valor)
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}
