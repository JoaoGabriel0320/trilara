import { emailValido } from '@/lib/publico'

/** Mantém o nome da função para os fluxos existentes; contas pessoais aceitam qualquer domínio válido. */
export function emailCorporativo(valor: unknown): string | null {
  return emailValido(valor)
}
