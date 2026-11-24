// src/lib/sistemas.ts
//
// Catálogo compartilhado pelo site e pelo portal. Os sistemas originais vêm
// de src/data/systems.ts; alterações e novos cadastros vêm do banco.

import { cache } from 'react'
import { INTERNAL_SYSTEMS, EXTERNAL_SYSTEMS } from '@/data/systems'
import { prisma } from '@/lib/prisma'
import type { System } from '@/types'

const sistemasOriginais: System[] = [...INTERNAL_SYSTEMS, ...EXTERNAL_SYSTEMS]

export const listarSistemasAdmin = cache(async () => {
  const alteracoes = await prisma.sistemaCadastro.findMany()
  const porSlug = new Map(alteracoes.map((item) => [item.slug, item]))
  const originais = sistemasOriginais.map((sistema) => {
    const alteracao = porSlug.get(sistema.slug)
    return { sistema: alteracao ? alteracao.dados as unknown as System : sistema, ativo: alteracao?.ativo ?? true }
  })
  const novos = alteracoes
    .filter((item) => !sistemasOriginais.some((sistema) => sistema.slug === item.slug))
    .map((item) => ({ sistema: item.dados as unknown as System, ativo: item.ativo }))
  return [...originais, ...novos]
})

export const listarSistemas = cache(async (): Promise<System[]> =>
  (await listarSistemasAdmin()).filter((item) => item.ativo).map((item) => item.sistema)
)

export async function getSistema(slug: string): Promise<System | undefined> {
  return (await listarSistemas()).find((sistema) => sistema.slug === slug)
}

/** Valide o slug antes de gravar: sem isso um documento vira órfão silencioso. */
export async function slugDeSistemaValido(slug: string): Promise<boolean> {
  return Boolean(await getSistema(slug))
}

/** Classes Tailwind por cor do sistema — precisam ser literais para o JIT não descartar. */
export const CORES_SISTEMA: Record<System['color'], { chip: string; borda: string; texto: string }> = {
  brand: { chip: 'bg-brand-50 dark:bg-brand-900/20', borda: 'border-brand-200 dark:border-brand-800', texto: 'text-brand-600 dark:text-brand-400' },
  blue:  { chip: 'bg-blue-50 dark:bg-blue-900/20',   borda: 'border-blue-200 dark:border-blue-800',   texto: 'text-blue-600 dark:text-blue-400' },
  green: { chip: 'bg-green-50 dark:bg-green-900/20', borda: 'border-green-200 dark:border-green-800', texto: 'text-green-600 dark:text-green-400' },
  amber: { chip: 'bg-amber-50 dark:bg-amber-900/20', borda: 'border-amber-200 dark:border-amber-800', texto: 'text-amber-600 dark:text-amber-400' },
  teal:  { chip: 'bg-teal-50 dark:bg-teal-900/20',   borda: 'border-teal-200 dark:border-teal-800',   texto: 'text-teal-600 dark:text-teal-400' },
  rose:  { chip: 'bg-rose-50 dark:bg-rose-900/20',   borda: 'border-rose-200 dark:border-rose-800',   texto: 'text-rose-600 dark:text-rose-400' },
}
