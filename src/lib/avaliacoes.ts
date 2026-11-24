export const INTERVALO_AVALIACAO_MS = 30 * 24 * 60 * 60 * 1000

export function proximaAvaliacao(criadoEm: Date): Date {
  return new Date(criadoEm.getTime() + INTERVALO_AVALIACAO_MS)
}
