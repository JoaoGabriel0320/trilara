// src/lib/ideias.ts
//
// Rótulos e cores do status de uma ideia na Trilara Lab. Arquivo puro (sem
// 'use client'), então serve tanto páginas de servidor quanto componentes de
// cliente sem duplicar o mapa em dois lugares.

export type StatusIdeia = 'NOVA' | 'EM_ANALISE' | 'APROVADA' | 'ARQUIVADA'

export const ROTULO_STATUS: Record<StatusIdeia, string> = {
  NOVA: 'Nova',
  EM_ANALISE: 'Em análise',
  APROVADA: 'Aprovada',
  ARQUIVADA: 'Arquivada',
}

export const COR_STATUS: Record<StatusIdeia, string> = {
  NOVA: 'bg-blue-50 text-blue-700 dark:bg-blue-900/25 dark:text-blue-300',
  EM_ANALISE: 'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300',
  APROVADA: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300',
  ARQUIVADA: 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
}

export const ORDEM_STATUS: StatusIdeia[] = ['NOVA', 'EM_ANALISE', 'APROVADA', 'ARQUIVADA']

/** "há 3 dias", "hoje" — mesmo critério usado na home do portal. */
export function formatarQuando(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}
