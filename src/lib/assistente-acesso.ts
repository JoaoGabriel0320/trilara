const EMAIL_ADMIN_HUB = process.env.NEXT_PUBLIC_ASSISTENTE_ADMIN_EMAIL?.trim().toLowerCase()

export function podeVerConsumoAssistente(email: string): boolean {
  return Boolean(EMAIL_ADMIN_HUB && email.trim().toLowerCase() === EMAIL_ADMIN_HUB)
}
