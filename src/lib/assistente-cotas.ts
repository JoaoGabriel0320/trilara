type DadosChaveOpenRouter = { data?: { is_free_tier?: unknown; free_model_daily_requests?: { used?: unknown; limit?: unknown; remaining?: unknown } } }

export type CotaOpenRouter = { planoFree: boolean | null; usado: number | null; limite: number | null; restante: number | null } | null

export async function cotaOpenRouter(): Promise<CotaOpenRouter> {
  const chave = process.env.OPENROUTER_API_KEY
  if (!chave) return null

  try {
    const resposta = await fetch('https://openrouter.ai/api/v1/key', {
      headers: { Authorization: `Bearer ${chave}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    })
    if (!resposta.ok) return null
    const dados = await resposta.json() as DadosChaveOpenRouter
    const cota = dados.data?.free_model_daily_requests
    const planoFree = typeof dados.data?.is_free_tier === 'boolean' ? dados.data.is_free_tier : null
    if (typeof cota?.used === 'number' && typeof cota.limit === 'number' && typeof cota.remaining === 'number'
      && [cota.used, cota.limit, cota.remaining].every((valor) => Number.isFinite(valor) && valor >= 0)) {
      return { planoFree, usado: cota.used, limite: cota.limit, restante: cota.remaining }
    }
    return { planoFree, usado: null, limite: null, restante: null }
  } catch {
    return null
  }
}

// Modelos disponíveis no Workers Free e tarifas de referência em Neurons por milhão de tokens.
// O limite diário de 10.000 Neurons pertence à conta e é compartilhado entre os modelos.
export const MODELOS_CLOUDFLARE = [
  { id: '@cf/meta/llama-3.1-8b-instruct-fp8', nome: 'Llama 3.1 8B', entrada: 13_778, saida: 26_128 },
  { id: '@cf/google/gemma-4-26b-a4b-it', nome: 'Gemma 4 26B', entrada: 9_091, saida: 27_273 },
  { id: '@cf/zai-org/glm-4.7-flash', nome: 'GLM 4.7 Flash', entrada: 5_500, saida: 36_400 },
] as const

// A estimativa cobre somente chamadas registradas pelo Hub, não a conta inteira.
export function estimarNeuronsCloudflare(modelo: string, entrada: number, saida: number): number {
  const tarifa = MODELOS_CLOUDFLARE.find((item) => item.id === modelo)
  if (!tarifa) return 0
  return (entrada * tarifa.entrada + saida * tarifa.saida) / 1_000_000
}

type RespostaAnalytics = {
  data?: { viewer?: { accounts?: { aiInferenceAdaptiveGroups?: { sum?: { totalNeurons?: unknown } }[] }[] } }
  errors?: unknown[]
}

export async function neuronsContaCloudflare(inicioHojeUtc: Date): Promise<number | null> {
  const chave = process.env.CLOUDFLARE_ANALYTICS_TOKEN
  const conta = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!chave || !conta || !/^[a-f0-9]{32}$/i.test(conta)) return null

  try {
    const resposta = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'query($accountTag: string!, $since: Time!) { viewer { accounts(filter: { accountTag: $accountTag }) { aiInferenceAdaptiveGroups(limit: 1, filter: { datetimeHour_geq: $since }) { sum { totalNeurons } } } } }',
        variables: { accountTag: conta, since: inicioHojeUtc.toISOString() },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    })
    if (!resposta.ok) return null
    const dados = await resposta.json() as RespostaAnalytics
    if (dados.errors?.length) return null
    const grupos = dados.data?.viewer?.accounts?.[0]?.aiInferenceAdaptiveGroups
    if (!grupos) return null
    const valor = grupos.length ? grupos[0]?.sum?.totalNeurons : 0
    return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 ? valor : null
  } catch {
    return null
  }
}
