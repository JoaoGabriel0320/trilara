'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Selecao } from '@/components/ui/Selecao'

export type IdeiaForm = {
  id: string
  titulo: string
  resumo: string
  conteudo: string
  sistemaSlug: string | null
}

const campo =
  'mt-1.5 w-full rounded-xl border border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-900 px-3.5 py-2.5 text-[14px] text-ink-900 dark:text-ink-50 placeholder:text-ink-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition'

const rotulo = 'text-[13px] font-medium text-ink-700 dark:text-ink-300'

export function FormIdeia({
  sistemas,
  ideia,
}: {
  sistemas: { slug: string; name: string }[]
  ideia?: IdeiaForm
}) {
  const router = useRouter()
  const editando = Boolean(ideia)

  const [titulo, setTitulo] = useState(ideia?.titulo ?? '')
  const [resumo, setResumo] = useState(ideia?.resumo ?? '')
  const [conteudo, setConteudo] = useState(ideia?.conteudo ?? '')
  const [sistemaSlug, setSistemaSlug] = useState(ideia?.sistemaSlug ?? '')

  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)

    try {
      const res = await fetch(editando ? `/api/lab/${ideia!.id}` : '/api/lab', {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, resumo, conteudo, sistemaSlug }),
      })
      const dados = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErro(dados.error ?? 'Não foi possível salvar.')
        setEnviando(false)
        return
      }

      router.push(editando ? `/lab/${ideia!.id}` : `/lab/${dados.id}`)
      router.refresh()
    } catch {
      setErro('Falha de conexão. Tente novamente.')
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <label className="block">
        <span className={rotulo}>Título</span>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
          placeholder="Ex.: Alerta automático quando uma janela fica ociosa"
          className={campo}
        />
      </label>

      <label className="block">
        <span className={rotulo}>Resumo em uma linha</span>
        <input
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
          required
          placeholder="O que muda pra quem usa o sistema, em uma frase"
          className={campo}
        />
      </label>

      <div>
        <span className={rotulo}>Sistema relacionado (opcional)</span>
        <Selecao
          valor={sistemaSlug}
          onChange={setSistemaSlug}
          placeholder="Ideia geral, sem sistema específico"
          opcoes={[
            { value: '', label: 'Geral — nenhum sistema específico' },
            ...sistemas.map((s) => ({ value: s.slug, label: s.name })),
          ]}
        />
      </div>

      <label className="block">
        <span className={rotulo}>Descreva a ideia</span>
        <textarea
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          required
          rows={12}
          placeholder={'O que você percebeu no dia a dia, o que essa mudança resolveria e como imagina que funcionaria.\n\nSuporta títulos (#), negrito (**), listas (-) e links.'}
          className={campo + ' font-mono text-[13px] leading-relaxed'}
        />
      </label>

      {erro && (
        <p role="alert" className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2.5 text-[13px] text-rose-700 dark:text-rose-300">
          {erro}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {enviando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Publicar ideia'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[14px] font-medium text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
