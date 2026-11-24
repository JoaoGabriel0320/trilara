export const RETENCAO_CONSULTAS_DIAS = 90

export function limiteConsultas(agora = new Date()): Date {
  return new Date(agora.getTime() - RETENCAO_CONSULTAS_DIAS * 24 * 60 * 60 * 1000)
}
