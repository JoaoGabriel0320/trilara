import { BlocoRecolhivel } from '@/components/kb/BlocoRecolhivel'

export function RegrasDoProcesso({ regras }: { regras: { numero: number; tituloPasso: string; texto: string }[] }) {
  return <BlocoRecolhivel id="regras-guia" rotulo="Regras deste processo" resumo={`${regras.length} ${regras.length === 1 ? 'regra' : 'regras'}`}>
    <div className="mt-3 rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-700 dark:bg-ink-800 xl:mt-2">
      <ul className="space-y-4">
        {regras.map((regra) => <li key={regra.numero} className="border-l-4 border-amber-500 pl-3">
          <a href={`#passo-${regra.numero}`} className="text-[12px] font-semibold text-ink-900 hover:text-brand-700 dark:text-ink-100 dark:hover:text-brand-300">Passo {regra.numero} · {regra.tituloPasso}</a>
          <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-ink-500 dark:text-ink-400">{regra.texto}</p>
        </li>)}
      </ul>
    </div>
  </BlocoRecolhivel>
}
