'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Selecao, type OpcaoSelecao } from '@/components/ui/Selecao'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function isoLocal(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

function dataLocal(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

function rotuloData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(dataLocal(iso))
}

export function FiltrosAvaliacoes({ sistemaInicial, filialInicial, deInicial, ateInicial, sistemas, filiais }: {
  sistemaInicial: string
  filialInicial: string
  deInicial: string
  ateInicial: string
  sistemas: OpcaoSelecao[]
  filiais: OpcaoSelecao[]
}) {
  const router = useRouter()
  const [sistema, setSistema] = useState(sistemaInicial)
  const [filial, setFilial] = useState(filialInicial)
  const [aberto, setAberto] = useState(false)
  const [de, setDe] = useState(deInicial)
  const [ate, setAte] = useState(ateInicial)
  const [etapa, setEtapa] = useState<'inicio' | 'fim'>('inicio')
  const [mesVisivel, setMesVisivel] = useState(() => {
    const base = deInicial ? dataLocal(deInicial) : new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => { setSistema(sistemaInicial); setFilial(filialInicial); setDe(deInicial); setAte(ateInicial) }, [sistemaInicial, filialInicial, deInicial, ateInicial])
  useEffect(() => {
    if (!aberto) return
    function fecharFora(evento: MouseEvent) {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false)
    }
    function fecharEsc(evento: KeyboardEvent) { if (evento.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fecharFora)
    document.addEventListener('keydown', fecharEsc)
    return () => { document.removeEventListener('mousedown', fecharFora); document.removeEventListener('keydown', fecharEsc) }
  }, [aberto])

  function navegar(sistemaSelecionado: string, filialSelecionada: string, inicio: string, fim: string) {
    const parametros = new URLSearchParams()
    if (sistemaSelecionado) parametros.set('sistema', sistemaSelecionado)
    if (filialSelecionada) parametros.set('filial', filialSelecionada)
    if (inicio && fim) { parametros.set('de', inicio); parametros.set('ate', fim) }
    router.push(`/admin/avaliacoes${parametros.size ? `?${parametros}` : ''}`)
  }

  function escolherDia(dia: string) {
    if (etapa === 'inicio' || !de) {
      setDe(dia)
      setAte('')
      setEtapa('fim')
    } else if (dia < de) {
      setDe(dia)
    } else {
      setAte(dia)
      setEtapa('inicio')
    }
  }

  const primeiroDia = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth(), 1).getDay()
  const anoMinimo = Math.min(2019, mesVisivel.getFullYear() - 5)
  const anoMaximo = Math.max(new Date().getFullYear() + 2, mesVisivel.getFullYear() + 5)
  const celulas = Array.from({ length: 42 }, (_, indice) => {
    const data = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth(), indice - primeiroDia + 1)
    return { iso: isoLocal(data), dia: data.getDate(), noMes: data.getMonth() === mesVisivel.getMonth() }
  })

  return (
    <div className="mb-7 flex flex-wrap items-end gap-4 rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-800">
      <div className="min-w-[210px] flex-1 sm:max-w-[280px]">
        <p id="rotulo-filtro-sistema" className="text-sm font-medium text-ink-700 dark:text-ink-200">Sistema</p>
        <Selecao
          rotuloId="rotulo-filtro-sistema"
          valor={sistema}
          onChange={(valor) => { setSistema(valor); navegar(valor, filial, deInicial, ateInicial) }}
          opcoes={[{ value: '', label: 'Todos os sistemas' }, ...sistemas]}
          buscavel={sistemas.length > 6}
        />
      </div>

      <div className="min-w-[210px] flex-1 sm:max-w-[280px]">
        <p id="rotulo-filtro-filial" className="text-sm font-medium text-ink-700 dark:text-ink-200">Filial</p>
        <Selecao
          rotuloId="rotulo-filtro-filial"
          valor={filial}
          onChange={(valor) => { setFilial(valor); navegar(sistema, valor, deInicial, ateInicial) }}
          opcoes={[{ value: '', label: 'Todas as filiais' }, ...filiais]}
          buscavel={filiais.length > 6}
        />
      </div>

      <div ref={raiz} className="relative min-w-[235px] flex-1 sm:max-w-[320px]">
        <p id="rotulo-filtro-periodo" className="text-sm font-medium text-ink-700 dark:text-ink-200">Período</p>
        <button type="button" aria-labelledby="rotulo-filtro-periodo" aria-expanded={aberto} aria-haspopup="dialog" onClick={() => { setDe(deInicial); setAte(ateInicial); setEtapa('inicio'); if (!aberto) { const base = deInicial ? dataLocal(deInicial) : new Date(); setMesVisivel(new Date(base.getFullYear(), base.getMonth(), 1)) } setAberto(!aberto) }} className={'mt-1.5 flex min-h-11 w-full items-center gap-2 rounded-xl border bg-ink-50 px-3.5 text-left text-sm outline-none transition dark:bg-ink-900 ' + (aberto ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-ink-200 hover:border-ink-300 dark:border-ink-700 dark:hover:border-ink-600')}>
          <CalendarDays size={17} aria-hidden="true" className="shrink-0 text-ink-500" />
          <span className={'min-w-0 truncate ' + (deInicial && ateInicial ? 'text-ink-900 dark:text-ink-50' : 'text-ink-400')}>
            {deInicial && ateInicial ? `${rotuloData(deInicial)} – ${rotuloData(ateInicial)}` : 'Selecione o período'}
          </span>
        </button>

        {aberto && (
          <div role="dialog" aria-label="Selecionar período" className="portal-in absolute left-0 top-[calc(100%+6px)] z-40 w-[min(352px,calc(100vw-40px))] rounded-xl border border-ink-200 bg-white p-3 shadow-xl dark:border-ink-700 dark:bg-ink-800">
            <div className="grid grid-cols-2 gap-2 border-b border-ink-200 pb-3 dark:border-ink-700">
              <button type="button" onClick={() => setEtapa('inicio')} className={'min-h-11 rounded-lg border px-2 text-center text-xs font-medium ' + (etapa === 'inicio' ? 'border-brand-500 text-brand-700 dark:text-brand-300' : 'border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300')}>{de ? rotuloData(de) : 'Data inicial'}</button>
              <button type="button" onClick={() => setEtapa('fim')} className={'min-h-11 rounded-lg border px-2 text-center text-xs font-medium ' + (etapa === 'fim' ? 'border-brand-500 text-brand-700 dark:text-brand-300' : 'border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300')}>{ate ? rotuloData(ate) : 'Data final'}</button>
            </div>

            <div className="flex items-center justify-between gap-1 py-3 sm:gap-2">
              <button type="button" onClick={() => setMesVisivel(new Date(mesVisivel.getFullYear(), mesVisivel.getMonth() - 1, 1))} aria-label="Mês anterior" className="grid size-11 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-600 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-300 sm:size-8"><ChevronLeft size={17} /></button>
              <div className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-2">
                <div className="w-[90px] sm:w-[118px]">
                  <span id="rotulo-mes-avaliacoes" className="sr-only">Mês</span>
                  <Selecao rotuloId="rotulo-mes-avaliacoes" valor={String(mesVisivel.getMonth())} onChange={(valor) => setMesVisivel(new Date(mesVisivel.getFullYear(), Number(valor), 1))} opcoes={MESES.map((mes, indice) => ({ value: String(indice), label: mes }))} />
                </div>
                <div className="w-[70px] sm:w-[82px]">
                  <span id="rotulo-ano-avaliacoes" className="sr-only">Ano</span>
                  <Selecao rotuloId="rotulo-ano-avaliacoes" valor={String(mesVisivel.getFullYear())} onChange={(valor) => setMesVisivel(new Date(Number(valor), mesVisivel.getMonth(), 1))} opcoes={Array.from({ length: anoMaximo - anoMinimo + 1 }, (_, indice) => ({ value: String(anoMinimo + indice), label: String(anoMinimo + indice) }))} buscavel />
                </div>
              </div>
              <button type="button" onClick={() => setMesVisivel(new Date(mesVisivel.getFullYear(), mesVisivel.getMonth() + 1, 1))} aria-label="Próximo mês" className="grid size-11 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-600 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-300 sm:size-8"><ChevronRight size={17} /></button>
            </div>

            <div className="grid grid-cols-7 text-center text-xs text-ink-400">{DIAS.map((dia) => <span key={dia} className="py-2">{dia}</span>)}</div>
            <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
              {celulas.map((celula) => {
                const ponta = celula.iso === de || celula.iso === ate
                const noIntervalo = de && ate && celula.iso > de && celula.iso < ate
                return <button key={celula.iso} type="button" onClick={() => escolherDia(celula.iso)} aria-label={new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(dataLocal(celula.iso))} aria-pressed={Boolean(ponta)} className={'grid h-9 place-items-center rounded-full transition ' + (ponta ? 'bg-brand-600 font-semibold text-white' : noIntervalo ? 'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-200' : celula.noMes ? 'text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-700' : 'text-ink-300 hover:bg-ink-100 dark:text-ink-600 dark:hover:bg-ink-700')}>{celula.dia}</button>
              })}
            </div>

            <div className="mt-3 flex justify-end gap-2 border-t border-ink-200 pt-3 dark:border-ink-700">
              <button type="button" onClick={() => { setDe(''); setAte(''); setEtapa('inicio'); setAberto(false); navegar(sistema, filial, '', '') }} className="min-h-9 rounded-lg bg-ink-50 px-3 text-sm text-ink-700 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-200">Limpar</button>
              <button type="button" disabled={!de || !ate} onClick={() => { setAberto(false); navegar(sistema, filial, de, ate) }} className="min-h-9 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">Aplicar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
