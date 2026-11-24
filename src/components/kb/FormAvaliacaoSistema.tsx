'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock3, LockKeyhole, Star, X } from 'lucide-react'
import { INTERVALO_AVALIACAO_MS } from '@/lib/avaliacoes'

type Avaliacao = {
  criadoEm: string
} | null

const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })
const DIA_MS = 24 * 60 * 60 * 1000

function formatarTempoRestante(milissegundos: number) {
  const dias = Math.ceil(milissegundos / DIA_MS)
  return `${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

export function FormAvaliacaoSistema({ sistemaSlug, avaliacao, agoraInicial }: { sistemaSlug: string; avaliacao: Avaliacao; agoraInicial: number }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [agora, setAgora] = useState(agoraInicial)
  const [nota, setNota] = useState(0)
  const [gosta, setGosta] = useState('')
  const [melhorar, setMelhorar] = useState('')
  const [gostaria, setGostaria] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [ultimaData, setUltimaData] = useState(avaliacao?.criadoEm ?? null)
  const modalRef = useRef<HTMLDivElement>(null)
  const botaoFecharRef = useRef<HTMLButtonElement>(null)
  const salvandoRef = useRef(false)

  const proximaEm = ultimaData ? new Date(new Date(ultimaData).getTime() + INTERVALO_AVALIACAO_MS) : null
  const restanteMs = proximaEm ? proximaEm.getTime() - agora : 0
  const aguardando = restanteMs > 0

  useEffect(() => {
    let temporizador: number | undefined
    const liberacao = ultimaData ? new Date(ultimaData).getTime() + INTERVALO_AVALIACAO_MS : 0
    function atualizar() {
      window.clearTimeout(temporizador)
      const instante = Date.now()
      setAgora(instante)
      const restante = liberacao - instante
      // Atualiza apenas quando muda o número de dias ou quando o prazo termina.
      if (restante > 0) {
        temporizador = window.setTimeout(atualizar, (restante % DIA_MS || DIA_MS) + 50)
      }
    }
    atualizar()
    document.addEventListener('visibilitychange', atualizar)
    return () => {
      window.clearTimeout(temporizador)
      document.removeEventListener('visibilitychange', atualizar)
    }
  }, [ultimaData])

  useEffect(() => {
    if (!aberto) return
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    botaoFecharRef.current?.focus()

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !salvandoRef.current) {
        evento.preventDefault()
        setAberto(false)
      }
      if (evento.key !== 'Tab') return
      const focaveis = modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled)')
      if (!focaveis?.length) return
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus() }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus() }
    }

    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.body.style.overflow = overflowAnterior
      document.removeEventListener('keydown', aoTeclar)
      focoAnterior?.focus()
    }
  }, [aberto])

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!nota || salvando || aguardando) return
    setSalvando(true)
    salvandoRef.current = true
    setErro('')
    try {
      const resposta = await fetch('/api/avaliacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sistemaSlug, nota, gosta, melhorar, gostaria }),
      })
      const dados = await resposta.json()
      if (!resposta.ok) {
        if (resposta.status === 429 && typeof dados.proximaEm === 'string') {
          setUltimaData(new Date(new Date(dados.proximaEm).getTime() - INTERVALO_AVALIACAO_MS).toISOString())
          setAgora(Date.now())
          setAberto(false)
          return
        }
        throw new Error(dados.error || 'Não foi possível salvar a avaliação.')
      }
      setUltimaData(dados.criadoEm)
      setAgora(Date.now())
      setAberto(false)
      router.refresh()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar a avaliação.')
    } finally {
      setSalvando(false)
      salvandoRef.current = false
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5 shadow-sm dark:border-brand-900/60 dark:bg-ink-800" aria-label="Avaliação do sistema">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300"><Star size={20} aria-hidden="true" /></span>
        <h2 className="mt-4 text-lg font-semibold text-ink-900 dark:text-ink-50">Avalie este sistema</h2>
        {aguardando ? (
          <>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={16} aria-hidden="true" /> Avaliação enviada</p>
            <div className="mt-5 rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-700 dark:bg-ink-900/60">
              <p className="flex items-center gap-2 text-xs font-medium text-ink-500 dark:text-ink-400"><Clock3 size={15} aria-hidden="true" /> Próxima avaliação em</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-900 dark:text-ink-50">{formatarTempoRestante(restanteMs)}</p>
              <time dateTime={proximaEm!.toISOString()} className="mt-1 block text-xs text-ink-500 dark:text-ink-400">Disponível em {formatoData.format(proximaEm!)}</time>
            </div>
            <button type="button" disabled className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-200 px-4 text-sm font-semibold text-ink-500 dark:bg-ink-700 dark:text-ink-400"><LockKeyhole size={16} aria-hidden="true" /> Avaliar novamente</button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">Sua opinião ajuda a melhorar a documentação e o sistema.</p>
            <button type="button" onClick={() => { setAberto(true); setErro('') }} className="mt-5 min-h-11 w-full rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white transition hover:bg-brand-600">Avaliar sistema</button>
            <p className="mt-3 text-center text-xs text-ink-500 dark:text-ink-400">Uma avaliação a cada 30 dias.</p>
          </>
        )}
      </section>

      {aberto && !aguardando && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur-sm" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !salvandoRef.current) setAberto(false) }}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="titulo-modal-avaliacao" aria-describedby="descricao-modal-avaliacao" className="mobile-modal max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-ink-200 bg-white shadow-2xl dark:border-ink-700 dark:bg-ink-800">
            <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4 dark:border-ink-700 sm:px-6">
              <div><h2 id="titulo-modal-avaliacao" className="text-lg font-semibold text-ink-900 dark:text-ink-50">Avaliar sistema</h2><p id="descricao-modal-avaliacao" className="mt-1 text-sm text-ink-500 dark:text-ink-400">Conte como foi sua experiência. Você poderá avaliar novamente em 30 dias.</p></div>
              <button ref={botaoFecharRef} type="button" onClick={() => setAberto(false)} disabled={salvando} aria-label="Fechar avaliação" className="rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-50 dark:hover:bg-ink-700"><X size={20} aria-hidden="true" /></button>
            </div>
            <form onSubmit={enviar} className="p-5 sm:p-6">
              <fieldset>
                <legend className="text-sm font-semibold text-ink-800 dark:text-ink-100">Sua nota <span className="text-red-500">*</span></legend>
                <div className="mt-2 flex gap-1" aria-label="Escolha de 1 a 5 estrelas">
                  {[1, 2, 3, 4, 5].map((valor) => (
                    <button key={valor} type="button" onClick={() => setNota(valor)} aria-label={`${valor} ${valor === 1 ? 'estrela' : 'estrelas'}`} aria-pressed={nota === valor} className="rounded-lg p-2 transition hover:bg-ink-100 focus-visible:outline-2 focus-visible:outline-brand-500 dark:hover:bg-ink-700">
                      <Star size={28} fill={valor <= nota ? 'currentColor' : 'none'} className={valor <= nota ? 'text-amber-500' : 'text-ink-300 dark:text-ink-600'} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="mt-5 space-y-4">
                {([
                  ['gosta', 'O que você gosta?', gosta, setGosta],
                  ['melhorar', 'O que poderia melhorar?', melhorar, setMelhorar],
                  ['gostaria', 'O que gostaria que tivesse?', gostaria, setGostaria],
                ] as const).map(([id, rotulo, valor, alterar]) => (
                  <label key={id} htmlFor={id} className="block text-sm font-medium text-ink-800 dark:text-ink-100">
                    {rotulo} <span className="font-normal text-ink-400">(opcional)</span>
                    <textarea id={id} value={valor} onChange={(evento) => alterar(evento.target.value)} maxLength={500} rows={3} className="mt-2 block w-full resize-y rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50" />
                    <span className="mt-1 block text-right text-xs font-normal text-ink-400">{valor.length}/500</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">Suas respostas e seu nome ficam visíveis para a equipe administradora.</p>
              {erro && <p role="alert" className="mt-3 text-sm text-red-600">{erro}</p>}
              <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-ink-200 pt-5 dark:border-ink-700">
                <button type="button" onClick={() => setAberto(false)} disabled={salvando} className="min-h-11 rounded-xl border border-ink-200 px-5 text-sm font-medium text-ink-600 disabled:opacity-50 dark:border-ink-700 dark:text-ink-300">Cancelar</button>
                <button type="submit" disabled={!nota || salvando} className="min-h-11 rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">{salvando ? 'Salvando...' : 'Enviar avaliação'}</button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}
    </>
  )
}
