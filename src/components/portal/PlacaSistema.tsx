// src/components/portal/PlacaSistema.tsx
//
// Identidade visual discreta dos sistemas no portal. Cada sistema tem um
// pictograma ligado à sua função, usado na navegação e na documentação.

import { AppWindow, CalendarClock, Network, PanelsTopLeft, Route, Warehouse, type LucideIcon } from 'lucide-react'

const ICONES_SISTEMA: Record<string, LucideIcon> = {
  'portal-de-clientes': Network,
  'agenda-de-operacoes': CalendarClock,
  'gestao-financeira': PanelsTopLeft,
  'controle-de-estoque': Warehouse,
  'painel-de-entregas': Route,
}

export function iconeDoSistema(slug: string): LucideIcon {
  return ICONES_SISTEMA[slug] ?? AppWindow
}

const TAMANHOS = {
  sm: { caixa: 'size-7 rounded-lg', icone: 15 },
  md: { caixa: 'size-10 rounded-xl', icone: 20 },
  lg: { caixa: 'size-14 rounded-xl', icone: 26 },
} as const

export function PlacaSistema({ slug, size = 'md' }: { slug: string; size?: keyof typeof TAMANHOS }) {
  const Icone = iconeDoSistema(slug)
  const tamanho = TAMANHOS[size]
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center border border-ink-200 bg-ink-50 text-ink-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 ${tamanho.caixa}`}>
      <Icone size={tamanho.icone} strokeWidth={1.7} />
    </span>
  )
}

// Marcador simples usado nas listas compactas da Trilara Lab.
export function PontoSistema() {
  return (
    <span aria-hidden="true" className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400 dark:bg-ink-500" />
  )
}
