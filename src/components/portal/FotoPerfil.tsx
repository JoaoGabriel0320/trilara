'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Pencil } from 'lucide-react'
import { AvatarColaborador } from './AvatarColaborador'
import { ModalRecorteFoto } from './ModalRecorteFoto'

const LIMITE_FOTO_BYTES = 5 * 1024 * 1024
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']

export function FotoPerfil({ nome, email, fotoInicial }: { nome: string; email: string; fotoInicial: string | null }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fotoKey, setFotoKey] = useState(fotoInicial)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [recorteSrc, setRecorteSrc] = useState<string | null>(null)

  useEffect(() => () => { if (recorteSrc) URL.revokeObjectURL(recorteSrc) }, [recorteSrc])

  function escolherFoto(arquivo: File | undefined) {
    if (!arquivo) return
    setErro(null)
    setAviso(null)
    if (!TIPOS_FOTO.includes(arquivo.type)) {
      setErro('Escolha uma foto JPG, PNG ou WebP.')
      return
    }
    if (arquivo.size > LIMITE_FOTO_BYTES) {
      setErro('A foto pode ter no máximo 5 MB.')
      return
    }

    setRecorteSrc(URL.createObjectURL(arquivo))
  }

  async function enviarFoto(arquivo: File) {
    setEnviando(true)
    try {
      const form = new FormData()
      form.set('foto', arquivo)
      const resposta = await fetch('/api/conta/foto', { method: 'PUT', body: form })
      const dados = await resposta.json().catch(() => ({}))
      if (!resposta.ok) throw new Error(dados.error ?? 'Não foi possível salvar a foto.')
      setFotoKey(dados.fotoKey)
      setAviso('Foto atualizada.')
      setRecorteSrc(null)
      router.refresh()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar a foto.')
      throw falha
    } finally {
      setEnviando(false)
    }
  }

  async function removerFoto() {
    setEnviando(true)
    setErro(null)
    setAviso(null)
    try {
      const resposta = await fetch('/api/conta/foto', { method: 'DELETE' })
      const dados = await resposta.json().catch(() => ({}))
      if (!resposta.ok) throw new Error(dados.error ?? 'Não foi possível remover a foto.')
      setFotoKey(null)
      setAviso('Foto removida.')
      router.refresh()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível remover a foto.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="rounded-xl bg-ink-50 p-4 dark:bg-ink-900">
      <div className="flex min-w-0 items-center gap-4">
        <div className="relative shrink-0">
          <AvatarColaborador nome={nome} fotoKey={fotoKey} className="h-14 w-14 rounded-xl text-[18px]" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            aria-label={fotoKey ? 'Alterar foto do perfil' : 'Adicionar foto ao perfil'}
            title={fotoKey ? 'Alterar foto' : 'Adicionar foto'}
            className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-full border-2 border-ink-50 bg-brand-500 text-white shadow-sm transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-wait disabled:opacity-70 dark:border-ink-900"
          >
            {enviando ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Pencil size={15} aria-hidden="true" />}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            tabIndex={-1}
            disabled={enviando}
            onChange={(evento) => {
              escolherFoto(evento.target.files?.[0])
              evento.target.value = ''
            }}
            className="sr-only"
          />
        </div>
        <div className="min-w-0">
          <p className="break-words text-[16px] font-semibold text-ink-900 dark:text-ink-50">{nome}</p>
          <p className="mt-1 break-all text-[13px] text-ink-500 dark:text-ink-400">{email}</p>
          {fotoKey && (
            <button type="button" onClick={removerFoto} disabled={enviando} className="mt-1.5 text-[12px] font-medium text-brand-600 underline-offset-2 hover:underline disabled:opacity-50 dark:text-brand-400">
              Remover foto
            </button>
          )}
        </div>
      </div>
      {erro && <p role="alert" className="mt-4 text-[12px] text-rose-600 dark:text-rose-400">{erro}</p>}
      {aviso && <p role="status" className="mt-4 text-[12px] text-emerald-700 dark:text-emerald-400">{aviso}</p>}
      {recorteSrc && <ModalRecorteFoto src={recorteSrc} salvando={enviando} aoFechar={() => setRecorteSrc(null)} aoSalvar={enviarFoto} />}
    </div>
  )
}
