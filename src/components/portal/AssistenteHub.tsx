'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, LayoutGrid, Sparkles } from 'lucide-react'
import type { FonteAssistente, RespostaAssistente } from '@/lib/assistente-hub'
import { Selecao } from '@/components/ui/Selecao'
import { TextoRespostaAssistente } from '@/components/portal/TextoRespostaAssistente'
import { ConsumoAssistenteUsuario } from '@/components/portal/ConsumoAssistenteUsuario'
import { EntradaAssistente } from '@/components/portal/EntradaAssistente'
import { FormatoFonte } from '@/components/portal/FormatoFonte'

type ConversaInicial = {
  id: string
  sistemaSlug: string | null
  consultas: { pergunta: string; resposta: string; fontes: FonteAssistente[]; aviso: string | null }[]
}

type Mensagem = {
  id: number
  papel: 'usuario' | 'assistente'
  texto: string
  fontes?: FonteAssistente[]
  aviso?: string
}

const SUGESTOES = [
  'Onde encontro o guia de primeiros passos?',
  'Quais sistemas estão disponíveis?',
  'Como encontro um procedimento?',
]

export function AssistenteHub({ sistemas, sistemaInicial = null, conversaInicial = null }: {
  sistemas: { slug: string; nome: string }[]
  sistemaInicial?: string | null
  conversaInicial?: ConversaInicial | null
}) {
  const router = useRouter()
  const [sistema, setSistema] = useState<string | null>(conversaInicial ? conversaInicial.sistemaSlug ?? '' : sistemaInicial)
  const [conversaId, setConversaId] = useState<string | null>(conversaInicial?.id ?? null)
  const [sistemaPendente, setSistemaPendente] = useState('')
  const [pergunta, setPergunta] = useState('')
  const [mensagens, setMensagens] = useState<Mensagem[]>(conversaInicial
    ? conversaInicial.consultas.flatMap((consulta, indice): Mensagem[] => [
      { id: indice * 2 + 1, papel: 'usuario', texto: consulta.pergunta },
      { id: indice * 2 + 2, papel: 'assistente', texto: consulta.resposta, fontes: consulta.fontes, aviso: consulta.aviso ?? undefined },
    ])
    : [])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const sequencia = useRef(conversaInicial ? conversaInicial.consultas.length * 2 : 0)
  const fim = useRef<HTMLDivElement>(null)
  const nomeSistema = sistema === '' ? 'Todos os sistemas' : sistemas.find((item) => item.slug === sistema)?.nome ?? ''

  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [mensagens, enviando])

  async function enviar(texto: string) {
    const valor = texto.trim()
    if (sistema === null || enviando || valor.length < 5 || valor.length > 500) return
    setErro('')
    setPergunta('')
    setEnviando(true)
    const idPergunta = ++sequencia.current
    setMensagens((atual) => [...atual, { id: idPergunta, papel: 'usuario', texto: valor }])
    try {
      const resposta = await fetch('/api/assistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: valor, sistema, conversaId }),
      })
      const dados = await resposta.json() as RespostaAssistente & { error?: string; historicoSalvo?: boolean; conversaId?: string | null }
      if (!resposta.ok) throw new Error(dados.error || 'Não foi possível consultar os manuais.')
      setMensagens((atual) => [...atual, {
        id: ++sequencia.current,
        papel: 'assistente',
        texto: dados.resposta,
        fontes: dados.fontes,
        aviso: dados.aviso,
      }])
      window.dispatchEvent(new Event('assistente:consumo-atualizado'))
      if (dados.historicoSalvo && dados.conversaId) {
        setConversaId(dados.conversaId)
        if (conversaId) router.refresh()
        else router.replace(`/assistente?conversa=${dados.conversaId}`)
      } else setErro('Resposta exibida, mas não foi salva no histórico.')
    } catch (falha) {
      setMensagens((atual) => atual.filter((mensagem) => mensagem.id !== idPergunta))
      setErro(falha instanceof Error ? falha.message : 'Não foi possível consultar os manuais.')
      setPergunta(valor)
    } finally {
      setEnviando(false)
    }
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    void enviar(pergunta)
  }

  function trocarSistema() {
    if (enviando) return
    setSistema(null)
    setConversaId(null)
    setSistemaPendente('')
    setMensagens([])
    setPergunta('')
    setErro('')
    router.replace('/assistente')
  }

  if (sistema === null) {
    return (
      <section aria-label="Escolha o assunto do assistente" className="rounded-2xl border border-ink-200 bg-white shadow-sm dark:border-ink-700 dark:bg-ink-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-4 py-4 dark:border-ink-700 sm:px-6">
          <div><h2 className="text-sm font-semibold text-ink-900 dark:text-ink-50">Antes de começar</h2>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Escolha onde o assistente deve procurar a resposta.</p></div>
          <ConsumoAssistenteUsuario abaixo />
        </div>
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><BookOpen size={23} aria-hidden="true" /></span>
          <h3 className="mt-4 text-center text-xl font-semibold text-ink-900 dark:text-ink-50">Sobre o que você quer conversar?</h3>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm leading-relaxed text-ink-500 dark:text-ink-400">Você pode buscar em todos os manuais ou focar a conversa em um sistema. É possível trocar depois.</p>
          <button type="button" onClick={() => setSistema('')} className="mt-8 flex w-full items-center gap-4 rounded-xl border border-ink-200 p-4 text-left transition hover:border-brand-400 hover:bg-brand-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 dark:border-ink-700 dark:hover:bg-ink-700/50">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><LayoutGrid size={20} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm text-ink-900 dark:text-ink-50">Todos os sistemas</strong><span className="mt-1 block text-xs text-ink-500 dark:text-ink-400">Para descobrir em qual sistema está a resposta. Se houver mais de um, pedirei que escolha um.</span></span>
            <ArrowRight size={18} className="shrink-0 text-ink-400" aria-hidden="true" />
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-ink-400"><span className="h-px flex-1 bg-ink-200 dark:bg-ink-700" /><span>ou escolha um sistema</span><span className="h-px flex-1 bg-ink-200 dark:bg-ink-700" /></div>
          <p id="rotulo-sistema-assistente" className="text-sm font-medium text-ink-800 dark:text-ink-100">Sistema</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Selecao rotuloId="rotulo-sistema-assistente" valor={sistemaPendente} onChange={setSistemaPendente} placeholder="Selecione um sistema" opcoes={sistemas.map((item) => ({ value: item.slug, label: item.nome }))} buscavel={sistemas.length > 6} tamanho="grande" />
            </div>
            <button type="button" disabled={!sistemaPendente} onClick={() => setSistema(sistemaPendente)} className="min-h-12 rounded-xl bg-brand-600 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">Começar conversa</button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Conversa com o assistente" className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm dark:border-ink-700 dark:bg-ink-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-4 py-4 dark:border-ink-700 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Sparkles size={20} aria-hidden="true" /></span>
          <div>
            <h2 className="text-sm font-semibold text-ink-900 dark:text-ink-50">Pergunte aos manuais</h2>
            <p className="text-xs text-ink-500 dark:text-ink-400">Respostas com fontes</p>
          </div>
        </div>
        <button type="button" disabled={enviando} onClick={trocarSistema} className="rounded-lg border border-ink-200 px-3 py-2 text-left text-xs text-ink-600 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-50 dark:border-ink-700 dark:text-ink-300 dark:hover:text-brand-300" title="Trocar sistema e iniciar uma nova conversa">
          <span className="block font-medium text-ink-900 dark:text-ink-100">{nomeSistema}</span>
          <span className="mt-0.5 block">Trocar · nova conversa</span>
        </button>
      </div>

      <div aria-live="polite" className="max-h-[60dvh] min-h-[320px] space-y-5 overflow-y-auto px-4 py-6 sm:min-h-[400px] sm:px-6">
        {mensagens.length === 0 && (
          <div className="mx-auto max-w-lg py-10 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-xl bg-ink-50 text-brand-600 dark:bg-ink-900 dark:text-brand-300"><BookOpen size={24} aria-hidden="true" /></span>
            <h3 className="mt-4 text-lg font-semibold text-ink-900 dark:text-ink-50">{sistema ? `O que você quer saber sobre ${nomeSistema}?` : 'O que você quer descobrir?'}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">Pergunte sobre um sistema ou procedimento documentado. As respostas usam apenas os manuais publicados; assuntos fora deles não são respondidos.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGESTOES.map((sugestao) => <button key={sugestao} type="button" onClick={() => void enviar(sugestao)} className="rounded-full border border-ink-200 px-3 py-2 text-xs text-ink-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-ink-700 dark:text-ink-200">{sugestao}</button>)}
            </div>
          </div>
        )}
        {mensagens.map((mensagem) => (
          <div key={mensagem.id} className={`flex ${mensagem.papel === 'usuario' ? 'justify-end' : 'justify-start'}`}>
            <div className={`min-w-0 max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[85%] ${mensagem.papel === 'usuario' ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-800 dark:bg-ink-900 dark:text-ink-100'}`}>
              {mensagem.papel === 'assistente' ? <TextoRespostaAssistente texto={mensagem.texto} /> : <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{mensagem.texto}</p>}
              {mensagem.fontes && mensagem.fontes.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-ink-200 pt-3 dark:border-ink-700">
                  <p className="text-xs font-semibold text-ink-600 dark:text-ink-300">Fontes encontradas</p>
                  {mensagem.fontes.map((fonte) => (
                    <Link key={fonte.id} href={fonte.href} className="group block rounded-xl border border-ink-200 bg-white p-3 transition hover:border-brand-300 dark:border-ink-700 dark:bg-ink-800">
                      <span className="flex items-center justify-between gap-3 font-medium text-ink-900 group-hover:text-brand-700 dark:text-ink-50 dark:group-hover:text-brand-300"><span>{fonte.titulo}</span><ArrowRight size={16} className="shrink-0" aria-hidden="true" /></span>
                      <span className="mt-1 flex items-center gap-1 text-xs text-ink-500 dark:text-ink-400"><span>{fonte.sistema}</span><span aria-hidden="true">·</span><FormatoFonte tipo={fonte.tipo} /></span>
                      {fonte.trecho && <span className="mt-2 block line-clamp-4 whitespace-pre-wrap text-xs text-ink-700 [overflow-wrap:anywhere] dark:text-ink-200">{fonte.trecho}</span>}
                    </Link>
                  ))}
                </div>
              )}
              {mensagem.aviso && <p className="mt-3 text-xs text-ink-500 dark:text-ink-400">{mensagem.aviso}</p>}
            </div>
          </div>
        ))}
        {enviando && <p role="status" className="text-sm text-ink-500 dark:text-ink-400">Procurando nos manuais...</p>}
        <div ref={fim} />
      </div>

      <form onSubmit={aoEnviar} className="border-t border-ink-200 p-4 dark:border-ink-700 sm:p-5">
        {erro && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{erro}</p>}
        <EntradaAssistente id="pergunta-assistente" valor={pergunta} aoAlterar={setPergunta} aoEnviar={() => void enviar(pergunta)} enviando={enviando} placeholder="Pergunte sobre um sistema ou procedimento..." />
        <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">As perguntas seguem nesta conversa, mas cada resposta consulta os manuais de forma independente. Conversas ficam disponíveis por 90 dias. Confira o documento original antes de executar um procedimento.</p>
      </form>
    </section>
  )
}
