import { Lightbulb, Scale, TriangleAlert } from 'lucide-react'
import { ROTULO_DESTAQUE, type TipoDestaque } from '@/lib/passos-documento'

const ESTILO = {
  REGRA: { Icone: Scale, classe: 'border-amber-300 border-l-amber-500 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100' },
  ATENCAO: { Icone: TriangleAlert, classe: 'border-rose-300 border-l-rose-500 bg-rose-50 text-rose-950 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100' },
  DICA: { Icone: Lightbulb, classe: 'border-blue-300 border-l-blue-500 bg-blue-50 text-blue-950 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100' },
} as const

export function DestaquePasso({ tipo, texto }: { tipo: TipoDestaque; texto: string }) {
  const { Icone, classe } = ESTILO[tipo]
  return <div role="note" aria-label={ROTULO_DESTAQUE[tipo]} className={`destaque-passo mt-5 rounded-xl border border-l-4 p-4 ${classe}`}>
    <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider"><Icone size={17} aria-hidden="true" /> {ROTULO_DESTAQUE[tipo]}</p>
    <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed">{texto}</p>
  </div>
}
