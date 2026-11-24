// Uma aba visível renova a presença a cada minuto. A margem de dois minutos
// cobre atrasos de rede sem manter um usuário online por muito tempo após sair.
export const INTERVALO_PRESENCA_MS = 60_000
export const JANELA_ONLINE_MS = 120_000

export function desdePresencaOnline() {
  return new Date(Date.now() - JANELA_ONLINE_MS)
}
