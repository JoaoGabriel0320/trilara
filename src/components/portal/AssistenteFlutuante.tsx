'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Bot, X } from 'lucide-react'
import { Selecao } from '@/components/ui/Selecao'
import type { FonteAssistente, RespostaAssistente } from '@/lib/assistente-hub'
import { TextoRespostaAssistente } from '@/components/portal/TextoRespostaAssistente'
import { EntradaAssistente } from '@/components/portal/EntradaAssistente'
import { FormatoFonte } from '@/components/portal/FormatoFonte'

type Mensagem = {
  id: number
  papel: 'usuario' | 'assistente'
  texto: string
  fontes?: FonteAssistente[]
  aviso?: string
}

export function AssistenteFlutuante({ sistemas }: { sistemas: { slug: string; nome: string }[] }) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const [sistema, setSistema] = useState('')
  const [conversaId, setConversaId] = useState<string | null>(null)
  const [pergunta, setPergunta] = useState('')
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const entrada = useRef<HTMLTextAreaElement>(null)
  const lista = useRef<HTMLDivElement>(null)
  const sequencia = useRef(0)

  useEffect(() => { setAberto(false) }, [pathname])
  useEffect(() => {
    if (!aberto) return
    entrada.current?.focus()
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        setAberto(false)
        botao.current?.focus()
      }
    }
    function aoClicarFora(evento: MouseEvent) {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false)
    }
    document.addEventListener('keydown', aoTeclar)
    document.addEventListener('mousedown', aoClicarFora)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.removeEventListener('mousedown', aoClicarFora)
    }
  }, [aberto])
  useEffect(() => { if (lista.current) lista.current.scrollTop = lista.current.scrollHeight }, [mensagens, enviando])
  useEffect(() => {
    function aoPerguntar(evento: Event) {
      const detalhe = (evento as CustomEvent<{ sistema?: string; pergunta?: string }>).detail ?? {}
      const sistemaInformado = sistemas.some((item) => item.slug === detalhe.sistema) ? detalhe.sistema! : ''
      const texto = typeof detalhe.pergunta === 'string' ? detalhe.pergunta.trim().slice(0, 500) : ''
      const mudouSistema = sistemaInformado !== sistema
      if (mudouSistema) {
        setSistema(sistemaInformado)
        setConversaId(null)
        setMensagens([])
        setErro('')
      }
      setAberto(true)
      if (texto.length >= 5 && !enviando) void enviar(texto, sistemaInformado, mudouSistema ? null : conversaId)
      else {
        setPergunta(texto)
        window.setTimeout(() => entrada.current?.focus(), 0)
      }
    }
    window.addEventListener('assistente:perguntar', aoPerguntar)
    return () => window.removeEventListener('assistente:perguntar', aoPerguntar)
  }, [conversaId, enviando, sistema, sistemas])

  if (pathname === '/assistente') return null

  function abrirChat() {
    if (!aberto && mensagens.length === 0) {
      const slugDaPagina = pathname.match(/^\/documentacao\/([^/]+)/)?.[1]
      setSistema(sistemas.some((item) => item.slug === slugDaPagina) ? slugDaPagina! : '')
    }
    setAberto(!aberto)
  }

  function escolherSistema(valor: string) {
    if (valor === sistema) return
    setSistema(valor)
    setConversaId(null)
    setMensagens([])
    setErro('')
  }

  async function enviar(textoInformado?: string, sistemaInformado?: string, conversaInformada?: string | null) {
    const texto = (textoInformado ?? pergunta).trim()
    const sistemaDaPergunta = sistemaInformado ?? sistema
    const conversaDaPergunta = conversaInformada === undefined ? conversaId : conversaInformada
    if (enviando || texto.length < 5 || texto.length > 500) return
    setPergunta('')
    setErro('')
    setEnviando(true)
    setMensagens((atual) => [...atual, { id: ++sequencia.current, papel: 'usuario', texto }])
    try {
      const resposta = await fetch('/api/assistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: texto, sistema: sistemaDaPergunta, conversaId: conversaDaPergunta }),
      })
      const dados = await resposta.json() as RespostaAssistente & { error?: string; historicoSalvo?: boolean; conversaId?: string | null }
      if (!resposta.ok) throw new Error(dados.error || 'Não consegui consultar os manuais.')
      setMensagens((atual) => [...atual, {
        id: ++sequencia.current,
        papel: 'assistente',
        texto: dados.resposta,
        fontes: dados.fontes,
        aviso: dados.aviso,
      }])
      window.dispatchEvent(new Event('assistente:consumo-atualizado'))
      if (dados.historicoSalvo && dados.conversaId) setConversaId(dados.conversaId)
      else setErro('Resposta exibida, mas não foi salva no histórico.')
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não consegui consultar os manuais.')
      setPergunta(texto)
    } finally {
      setEnviando(false)
    }
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    void enviar()
  }

  return (
    <div ref={raiz} className="assistente-flutuante fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-50 lg:bottom-6 lg:right-6">
      {aberto && (
        <section id="mini-chat-hub" role="dialog" aria-label="Assistente dos manuais" className="fixed bottom-[calc(148px+env(safe-area-inset-bottom))] right-3 flex h-[min(520px,calc(100dvh-178px))] w-[calc(100vw-24px)] flex-col rounded-2xl border border-ink-200 bg-white shadow-2xl dark:border-ink-700 dark:bg-ink-800 sm:right-4 sm:w-[390px] lg:bottom-24 lg:right-6 lg:h-[min(580px,calc(100dvh-120px))]">
          <header className="flex items-center gap-3 rounded-t-2xl border-b border-ink-200 px-4 py-3 dark:border-ink-700">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Bot size={20} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-ink-900 dark:text-ink-50">Assistente dos manuais</h2><p className="text-xs text-ink-500 dark:text-ink-400">Respostas com fontes</p></div>
            <button type="button" onClick={() => { setAberto(false); botao.current?.focus() }} aria-label="Fechar assistente" className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-700"><X size={18} aria-hidden="true" /></button>
          </header>
          <div className="relative border-b border-ink-200 px-4 pb-3 dark:border-ink-700">
            <p id="mini-chat-sistema" className="sr-only">Buscar em</p>
            <Selecao rotuloId="mini-chat-sistema" valor={sistema} onChange={escolherSistema} opcoes={[{ value: '', label: 'Todos os sistemas' }, ...sistemas.map((item) => ({ value: item.slug, label: item.nome }))]} buscavel={sistemas.length > 6} disabled={enviando} />
          </div>
          <div ref={lista} aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
            {mensagens.length === 0 && <div className="pt-7 text-center"><Bot size={28} className="mx-auto text-brand-500" aria-hidden="true" /><p className="mt-3 font-medium text-ink-900 dark:text-ink-50">Como posso ajudar?</p><p className="mt-2 text-xs leading-relaxed text-ink-500 dark:text-ink-400">Pergunte sobre um procedimento documentado. Se encontrar o assunto em vários sistemas, pedirei que escolha um.</p></div>}
            {mensagens.map((mensagem) => (
              <div key={mensagem.id} className={`flex ${mensagem.papel === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                <div className={`min-w-0 max-w-[95%] rounded-xl px-3 py-2.5 leading-relaxed [overflow-wrap:anywhere] ${mensagem.papel === 'usuario' ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-800 dark:bg-ink-900 dark:text-ink-100'}`}>
                  {mensagem.papel === 'assistente' ? <TextoRespostaAssistente texto={mensagem.texto} /> : <p className="whitespace-pre-wrap">{mensagem.texto}</p>}
                  {mensagem.fontes && mensagem.fontes.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-ink-200 pt-2 dark:border-ink-700">
                      <p className="text-xs font-medium">Fontes</p>
                      {mensagem.fontes.map((fonte) => (
                        <Link key={fonte.id} href={fonte.href} onClick={() => setAberto(false)} className="block rounded-lg border border-ink-200 bg-white p-2 text-xs text-ink-800 hover:border-brand-300 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100">
                          <span className="font-medium">{fonte.titulo}</span>
                          <span className="mt-1 flex items-center gap-1 text-ink-500 dark:text-ink-400"><span>{fonte.sistema}</span><span aria-hidden="true">·</span><FormatoFonte tipo={fonte.tipo} /></span>
                          {fonte.trecho && <span className="mt-1 block line-clamp-3 text-ink-600 dark:text-ink-300">{fonte.trecho}</span>}
                        </Link>
                      ))}
                    </div>
                  )}
                  {mensagem.aviso && <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">{mensagem.aviso}</p>}
                </div>
              </div>
            ))}
            {enviando && <p role="status" className="text-xs text-ink-500 dark:text-ink-400">Procurando nos manuais...</p>}
          </div>
          <form onSubmit={aoEnviar} className="rounded-b-2xl border-t border-ink-200 p-3 dark:border-ink-700">
            {erro && <p role="alert" className="mb-2 text-xs text-rose-600 dark:text-rose-300">{erro}</p>}
            <EntradaAssistente id="mini-chat-pergunta" valor={pergunta} aoAlterar={setPergunta} aoEnviar={() => void enviar()} enviando={enviando} placeholder="Digite sua pergunta..." referencia={entrada} compacto />
            <Link href={conversaId ? `/assistente?conversa=${conversaId}` : sistema ? `/assistente?sistema=${encodeURIComponent(sistema)}` : '/assistente'} onClick={() => setAberto(false)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline dark:text-brand-300">Abrir página completa <ArrowUpRight size={13} aria-hidden="true" /></Link>
          </form>
        </section>
      )}
      <button ref={botao} type="button" onClick={abrirChat} aria-label={aberto ? 'Fechar assistente' : 'Abrir assistente dos manuais'} aria-expanded={aberto} aria-controls="mini-chat-hub" className="grid size-14 place-items-center rounded-full bg-brand-600 text-white shadow-xl shadow-ink-900/20 transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><Bot size={26} aria-hidden="true" /></button>
    </div>
  )
}
