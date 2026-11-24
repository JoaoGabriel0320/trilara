import type { Prisma } from '@prisma/client'

export type Publico = 'INTERNO' | 'EXTERNO'
export type ContextoAcesso = { tipoAcesso?: Publico; papel: string }
export const SISTEMAS_EXTERNOS = ['portal-de-clientes', 'agenda-de-operacoes'] as const

export function publicoValido(valor: unknown): valor is Publico {
  return valor === 'INTERNO' || valor === 'EXTERNO'
}

export function sistemaExterno(slug: string): boolean {
  return SISTEMAS_EXTERNOS.some((sistema) => sistema === slug)
}

export function podeAcessarSistema(sessao: ContextoAcesso, slug: string): boolean {
  return sessao.tipoAcesso === 'INTERNO' || (sessao.tipoAcesso === 'EXTERNO' && sistemaExterno(slug))
}

/** Falha fechada se a sessão não trouxer o público validado pelo banco. */
export function documentosDoPublico(publico: Publico): Prisma.DocumentoWhereInput {
  if (publico === 'INTERNO') return { ativo: true, publico: 'INTERNO' }
  if (publico === 'EXTERNO') return { ativo: true, publico: 'EXTERNO', sistemaSlug: { in: [...SISTEMAS_EXTERNOS] } }
  return { id: { in: [] } }
}

export function documentosVisiveis(sessao: ContextoAcesso): Prisma.DocumentoWhereInput {
  return documentosDoPublico(sessao.tipoAcesso as Publico)
}

export function podeLerDocumento(sessao: ContextoAcesso, documento: { ativo: boolean; publico: Publico; sistemaSlug: string }): boolean {
  if (!documento.ativo || !podeAcessarSistema(sessao, documento.sistemaSlug)) return false
  if (sessao.tipoAcesso === documento.publico) return true
  // Equipe editorial pode abrir uma publicação externa para revisão por link.
  return sessao.tipoAcesso === 'INTERNO' && ['ADMIN', 'EDITOR'].includes(sessao.papel)
}

export function emailValido(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const email = valor.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}
