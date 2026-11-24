// Modelos de texto disponíveis no plano Free da Groq em outubro de 2026.
// Revise a lista ao alterar os limites ou quando a Groq descontinuar um modelo.
export const MODELOS_GROQ = [
  { id: 'openai/gpt-oss-20b', nome: 'GPT-OSS 20B', fase: 'Produção' },
  { id: 'openai/gpt-oss-120b', nome: 'GPT-OSS 120B', fase: 'Produção' },
  { id: 'qwen/qwen3.8-27b', nome: 'Qwen 3.8 27B', fase: 'Prévia' },
] as const

export const GROQ_FREE_REQ_DIA_REFERENCIA = 1_000
export const GROQ_FREE_TOKENS_DIA_REFERENCIA = 200_000
