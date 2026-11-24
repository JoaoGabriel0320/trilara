import { CopiarLinkPasso } from '@/components/kb/CopiarLinkPasso'
import { DestaquePasso } from '@/components/kb/DestaquePasso'
import { IndiceGuia } from '@/components/kb/IndiceGuia'
import { RegrasDoProcesso } from '@/components/kb/RegrasDoProcesso'
import { RelatarProblema } from '@/components/kb/RelatarProblema'
import { VisualizadorPrint } from '@/components/kb/VisualizadorPrint'
import type { TipoDestaque } from '@/lib/passos-documento'

export type PassoGuia = {
  numero: number
  titulo: string
  html: string | null
  caminhoAcesso: string | null
  print: { url: string } | null
  printAcesso: { url: string } | null
  destaque: { tipo: TipoDestaque; texto: string } | null
}

export function GuiaPassoAPasso({ documentoId, passos }: { documentoId: string; passos: PassoGuia[] }) {
  const regras = passos.flatMap((passo) => passo.destaque?.tipo === 'REGRA'
    ? [{ numero: passo.numero, tituloPasso: passo.titulo, texto: passo.destaque.texto }]
    : [])

  return <div className="grid items-start gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
    <aside className="space-y-4 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto">
      <IndiceGuia passos={passos.map(({ numero, titulo }) => ({ numero, titulo }))} />
      {regras.length > 0 && <RegrasDoProcesso regras={regras} />}
    </aside>
    <div className="min-w-0 space-y-6">
      {passos.map((passo) => <section
        key={passo.numero}
        id={`passo-${passo.numero}`}
        aria-labelledby={`titulo-passo-${passo.numero}`}
        className={`guia-passo scroll-mt-[calc(5rem+env(safe-area-inset-top))] rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-800 sm:p-7 lg:scroll-mt-6 ${passo.destaque ? 'guia-passo-com-destaque' : ''}`}
      >
        <header className="flex items-start gap-4">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-[14px] font-bold text-white">{passo.numero}</span>
          <div className="min-w-0">
            <p className="rotulo text-brand-600 dark:text-brand-400">Passo {passo.numero} de {passos.length}</p>
            <h2 id={`titulo-passo-${passo.numero}`} className="mt-1 text-[20px] font-semibold leading-tight text-ink-900 dark:text-ink-50">
              <span className="sr-only">Passo {passo.numero} de {passos.length}: </span>{passo.titulo}
            </h2>
          </div>
        </header>
        {passo.html && <div className="mt-5 min-w-0 [overflow-wrap:anywhere] text-[15px] leading-relaxed text-ink-700 dark:text-ink-300" dangerouslySetInnerHTML={{ __html: passo.html }} />}
        {(passo.caminhoAcesso || passo.printAcesso || passo.print) && <div className={passo.print && (passo.caminhoAcesso || passo.printAcesso) ? 'mt-5 grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]' : passo.print ? '' : 'mt-5'}>
          {(passo.caminhoAcesso || passo.printAcesso) && <div className="min-w-0 rounded-xl border border-brand-200 bg-brand-50/60 p-3 dark:border-brand-500/30 dark:bg-brand-500/10">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Onde acessar</p>
            {passo.caminhoAcesso && <p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere] text-[14px] font-medium text-ink-800 dark:text-ink-100">{passo.caminhoAcesso}</p>}
            {passo.printAcesso && <VisualizadorPrint numero={passo.numero} tituloPasso={passo.titulo} url={passo.printAcesso.url} variante="acesso" />}
          </div>}
          {passo.print && <div className={passo.caminhoAcesso || passo.printAcesso ? 'guia-conjunto-print min-w-0 lg:max-w-[680px]' : 'guia-conjunto-print min-w-0'}>
            {(passo.caminhoAcesso || passo.printAcesso) && <p className="text-[13px] font-semibold text-ink-700 dark:text-ink-200">Tela da operação</p>}
            <VisualizadorPrint numero={passo.numero} tituloPasso={passo.titulo} url={passo.print.url} variante="operacao" />
          </div>}
        </div>}
        {passo.destaque && <DestaquePasso tipo={passo.destaque.tipo} texto={passo.destaque.texto} />}
        <footer className="mt-5 flex flex-col gap-2 border-t border-ink-100 pt-3 dark:border-ink-700 sm:flex-row sm:items-center sm:justify-between print:!hidden">
          <RelatarProblema documentoId={documentoId} passo={{ numero: passo.numero, titulo: passo.titulo }} />
          <CopiarLinkPasso numero={passo.numero} />
        </footer>
      </section>)}
      <div className="print:!hidden"><RelatarProblema documentoId={documentoId} /></div>
    </div>
  </div>
}
