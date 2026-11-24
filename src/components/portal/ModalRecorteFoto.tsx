'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { LoaderCircle, RotateCcw, X } from 'lucide-react'

const LADO = 256
const SAIDA = 512

export function ModalRecorteFoto({ src, salvando, aoFechar, aoSalvar }: {
  src: string
  salvando: boolean
  aoFechar: () => void
  aoSalvar: (arquivo: File) => Promise<void>
}) {
  const imagemRef = useRef<HTMLImageElement | null>(null)
  const arrastoRef = useRef<{ x: number; y: number; inicioX: number; inicioY: number } | null>(null)
  const [dimensoes, setDimensoes] = useState<{ largura: number; altura: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [posicao, setPosicao] = useState({ x: 0, y: 0 })
  const [erro, setErro] = useState('')

  useEffect(() => {
    const imagem = new Image()
    imagem.src = src
    imagem.onload = () => {
      imagemRef.current = imagem
      setDimensoes({ largura: imagem.naturalWidth, altura: imagem.naturalHeight })
    }
    imagem.onerror = () => setErro('Não foi possível abrir esta imagem. Escolha outra foto.')
    return () => { imagem.onload = null; imagem.onerror = null; imagemRef.current = null }
  }, [src])

  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !salvando) aoFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => { document.body.style.overflow = anterior; window.removeEventListener('keydown', aoTeclar) }
  }, [aoFechar, salvando])

  const escalaBase = dimensoes ? Math.max(LADO / dimensoes.largura, LADO / dimensoes.altura) : 1
  const largura = dimensoes ? dimensoes.largura * escalaBase * zoom : LADO
  const altura = dimensoes ? dimensoes.altura * escalaBase * zoom : LADO
  const limiteX = Math.max(0, (largura - LADO) / 2)
  const limiteY = Math.max(0, (altura - LADO) / 2)
  const limitar = (x: number, y: number) => ({
    x: Math.max(-limiteX, Math.min(limiteX, x)),
    y: Math.max(-limiteY, Math.min(limiteY, y)),
  })

  function iniciarArrasto(evento: PointerEvent<HTMLDivElement>) {
    if (!dimensoes) return
    evento.currentTarget.setPointerCapture(evento.pointerId)
    arrastoRef.current = { x: evento.clientX, y: evento.clientY, inicioX: posicao.x, inicioY: posicao.y }
  }

  function mover(evento: PointerEvent<HTMLDivElement>) {
    if (!arrastoRef.current) return
    setPosicao(limitar(
      arrastoRef.current.inicioX + evento.clientX - arrastoRef.current.x,
      arrastoRef.current.inicioY + evento.clientY - arrastoRef.current.y,
    ))
  }

  async function salvar() {
    const imagem = imagemRef.current
    if (!imagem || !dimensoes || salvando) return
    setErro('')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = SAIDA
      canvas.height = SAIDA
      const contexto = canvas.getContext('2d')
      if (!contexto) throw new Error('Não foi possível preparar o recorte.')
      const ladoOriginal = LADO / (escalaBase * zoom)
      const xOriginal = (dimensoes.largura - ladoOriginal) / 2 - posicao.x / (escalaBase * zoom)
      const yOriginal = (dimensoes.altura - ladoOriginal) / 2 - posicao.y / (escalaBase * zoom)
      contexto.drawImage(imagem, xOriginal, yOriginal, ladoOriginal, ladoOriginal, 0, 0, SAIDA, SAIDA)
      const blob = await new Promise<Blob | null>((resolver) => canvas.toBlob(resolver, 'image/jpeg', 0.9))
      if (!blob) throw new Error('Não foi possível gerar a foto recortada.')
      await aoSalvar(new File([blob], 'foto-perfil.jpg', { type: 'image/jpeg' }))
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar o recorte.')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur-sm" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !salvando) aoFechar() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-recorte" className="mobile-modal w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl dark:bg-ink-800 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="titulo-recorte" className="text-lg font-semibold text-ink-900 dark:text-ink-50">Ajustar foto do perfil</h2>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Arraste para enquadrar e use o zoom.</p>
          </div>
          <button type="button" onClick={aoFechar} disabled={salvando} aria-label="Fechar" className="grid size-11 sm:size-9 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 disabled:opacity-50 dark:hover:bg-ink-700"><X size={19} /></button>
        </div>

        <div
          className="relative mx-auto mt-6 size-64 touch-none cursor-grab select-none overflow-hidden rounded-xl bg-ink-100 active:cursor-grabbing dark:bg-ink-900"
          onPointerDown={iniciarArrasto}
          onPointerMove={mover}
          onPointerUp={() => { arrastoRef.current = null }}
          onPointerCancel={() => { arrastoRef.current = null }}
          aria-label="Prévia da foto recortada"
        >
          {/* URL temporária local: o recorte precisa ler os pixels originais no canvas. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {dimensoes && <img src={src} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ width: largura, height: altura, left: (LADO - largura) / 2 + posicao.x, top: (LADO - altura) / 2 + posicao.y }} />}
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle, transparent 69%, rgba(0,0,0,0.48) 71%)' }} />
          <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/90" />
          {!dimensoes && !erro && <div className="absolute inset-0 grid place-items-center"><LoaderCircle className="animate-spin text-brand-500" /></div>}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <label htmlFor="zoom-foto" className="shrink-0 text-sm font-medium text-ink-700 dark:text-ink-200">Zoom</label>
          <input id="zoom-foto" type="range" min="1" max="3" step="0.01" value={zoom} disabled={!dimensoes || salvando} onChange={(evento) => {
            const novoZoom = Number(evento.target.value)
            const proporcao = novoZoom / zoom
            const novaLargura = dimensoes ? dimensoes.largura * escalaBase * novoZoom : LADO
            const novaAltura = dimensoes ? dimensoes.altura * escalaBase * novoZoom : LADO
            const maxX = Math.max(0, (novaLargura - LADO) / 2)
            const maxY = Math.max(0, (novaAltura - LADO) / 2)
            setPosicao({
              x: Math.max(-maxX, Math.min(maxX, posicao.x * proporcao)),
              y: Math.max(-maxY, Math.min(maxY, posicao.y * proporcao)),
            })
            setZoom(novoZoom)
          }} className="min-w-0 flex-1 accent-brand-500" />
          <button type="button" onClick={() => { setZoom(1); setPosicao({ x: 0, y: 0 }) }} disabled={salvando} aria-label="Redefinir enquadramento" title="Redefinir enquadramento" className="grid size-11 sm:size-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-700"><RotateCcw size={17} /></button>
        </div>

        {erro && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{erro}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={aoFechar} disabled={salvando} className="min-h-11 rounded-xl border border-ink-200 px-5 text-sm font-medium text-ink-700 disabled:opacity-50 dark:border-ink-700 dark:text-ink-200">Cancelar</button>
          <button type="button" onClick={() => void salvar()} disabled={!dimensoes || salvando} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
            {salvando && <LoaderCircle size={16} className="animate-spin" />} {salvando ? 'Salvando...' : 'Salvar foto'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
