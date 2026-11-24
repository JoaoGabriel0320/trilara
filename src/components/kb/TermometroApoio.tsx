// src/components/kb/TermometroApoio.tsx
//
// Assinatura visual da Trilara Lab: em vez de um coração+contador genérico de
// blog, uma barra que enche proporcionalmente ao apoio da ideia mais votada
// da lista. Isso ranqueia visualmente o mural inteiro sem precisar de uma aba
// "em alta" separada — olhar a página já mostra onde está o consenso.
// Puramente apresentacional (sem estado, sem 'use client').

export function TermometroApoio({
  total,
  maximo,
  tamanho = 'sm',
}: {
  total: number
  maximo: number
  tamanho?: 'sm' | 'lg'
}) {
  const percentual = maximo > 0 ? Math.max(total > 0 ? 8 : 0, Math.round((total / maximo) * 100)) : 0
  const largura = tamanho === 'lg' ? 'w-28' : 'w-14'

  return (
    <div className="flex shrink-0 items-center gap-2" title={`${total} ${total === 1 ? 'apoio' : 'apoios'}`}>
      <div className={`${largura} h-1.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700`}>
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-300"
          style={{ width: `${percentual}%` }}
        />
      </div>
      <span className="rotulo tabular-nums text-ink-500 dark:text-ink-400">{total}</span>
    </div>
  )
}
