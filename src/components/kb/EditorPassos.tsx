'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, Plus } from 'lucide-react'
import { CartaoPassoEditor, validarArquivoPrint } from '@/components/kb/CartaoPassoEditor'
import { useConfirmacao } from '@/components/ui/useConfirmacao'
import {
  LIMITE_DESTAQUE_PASSO,
  LIMITE_CAMINHO_ACESSO,
  LIMITE_TEXTO_PASSO,
  LIMITE_TITULO_PASSO,
  MAX_PASSOS_DOCUMENTO,
} from '@/lib/passos-documento'

export type PrintPassoEditor =
  | { origem: 'atual'; imagemId: string; arquivoNome: string }
  | { origem: 'novo'; arquivo: File }

export type PassoEditor = {
  chave: string
  titulo: string
  texto: string
  caminhoAcesso: string
  destaqueTipo: '' | 'REGRA' | 'ATENCAO' | 'DICA'
  destaqueTexto: string
  print: PrintPassoEditor | null
  printAcesso: PrintPassoEditor | null
}

export type CampoPasso = 'titulo' | 'texto' | 'caminhoAcesso' | 'destaque' | 'print'

let contadorPassos = 0
export function criarPassoEditor(print: PrintPassoEditor | null = null): PassoEditor {
  return { chave: `p-${++contadorPassos}`, titulo: '', texto: '', caminhoAcesso: '', destaqueTipo: '', destaqueTexto: '', print, printAcesso: null }
}

export function validarPassosEditor(passos: PassoEditor[]): { mensagem: string; chave: string; campo: CampoPasso } | null {
  if (!passos.length) return { mensagem: 'Adicione pelo menos um passo.', chave: '', campo: 'titulo' }
  if (passos.length > MAX_PASSOS_DOCUMENTO) return { mensagem: 'Um guia pode ter no máximo 40 passos.', chave: passos[MAX_PASSOS_DOCUMENTO].chave, campo: 'titulo' }
  for (const [indice, passo] of passos.entries()) {
    const numero = indice + 1
    if (!passo.titulo.trim()) return { mensagem: `Informe o título do passo ${numero}.`, chave: passo.chave, campo: 'titulo' }
    if (passo.titulo.trim().length > LIMITE_TITULO_PASSO) return { mensagem: `O título do passo ${numero} pode ter no máximo 200 caracteres.`, chave: passo.chave, campo: 'titulo' }
    if (passo.texto.trim().length > LIMITE_TEXTO_PASSO) return { mensagem: `O texto do passo ${numero} pode ter no máximo 10.000 caracteres.`, chave: passo.chave, campo: 'texto' }
    if (passo.caminhoAcesso.trim().length > LIMITE_CAMINHO_ACESSO) return { mensagem: `O caminho de acesso do passo ${numero} pode ter no máximo 300 caracteres.`, chave: passo.chave, campo: 'caminhoAcesso' }
    if (passo.destaqueTipo && !passo.destaqueTexto.trim()) return { mensagem: `Escreva o texto do destaque do passo ${numero}.`, chave: passo.chave, campo: 'destaque' }
    if (passo.destaqueTexto.trim().length > LIMITE_DESTAQUE_PASSO) return { mensagem: `O destaque do passo ${numero} pode ter no máximo 1.000 caracteres.`, chave: passo.chave, campo: 'destaque' }
  }
  return null
}

export function EditorPassos({
  documentoId,
  passos,
  aoAlterar,
  desabilitado,
  passoComErro,
  aoTratarErro,
  aoErroArquivo,
}: {
  documentoId: string | null
  passos: PassoEditor[]
  aoAlterar: (proximos: PassoEditor[]) => void
  desabilitado: boolean
  passoComErro: { chave: string; campo: CampoPasso } | null
  aoTratarErro: () => void
  aoErroArquivo: (mensagem: string) => void
}) {
  const raiz = useRef<HTMLElement>(null)
  const [abertos, setAbertos] = useState(() => new Set(passos.filter((passo) => passo.chave.startsWith('p-')).map((passo) => passo.chave)))
  const [foco, setFoco] = useState<{ chave: string; campo: CampoPasso } | null>(null)
  const [anuncio, setAnuncio] = useState('')
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [destino, setDestino] = useState<{ chave: string; indicador: 'antes' | 'depois' } | null>(null)
  const { confirmar, modal } = useConfirmacao()

  useEffect(() => {
    if (!passoComErro?.chave) return
    setAbertos((atual) => new Set(atual).add(passoComErro.chave))
    setFoco(passoComErro)
  }, [passoComErro])

  const adicionar = useCallback((print: PrintPassoEditor | null = null) => {
    if (passos.length >= MAX_PASSOS_DOCUMENTO) return
    const novo = criarPassoEditor(print)
    aoAlterar([...passos, novo])
    setAbertos((atual) => new Set(atual).add(novo.chave))
    setFoco({ chave: novo.chave, campo: 'titulo' })
    setAnuncio(print ? `Novo passo ${passos.length + 1} criado com o print colado.` : `Passo ${passos.length + 1} adicionado.`)
  }, [aoAlterar, passos])

  useEffect(() => {
    function bloquearArquivo(evento: DragEvent) {
      if (!evento.dataTransfer?.types.includes('Files')) return
      const alvo = evento.target as Element | null
      if (alvo?.closest('[data-area-print="true"]')) return
      evento.preventDefault()
    }
    function colar(evento: ClipboardEvent) {
      const formulario = raiz.current?.closest('form')
      const alvo = evento.target as Element | null
      if (alvo !== document.body && alvo && !formulario?.contains(alvo)) return
      const arquivosDiretos = Array.from(evento.clipboardData?.files ?? []).filter((arquivo) => arquivo.type.startsWith('image/'))
      const arquivos = arquivosDiretos.length ? arquivosDiretos : Array.from(evento.clipboardData?.items ?? [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((arquivo): arquivo is File => Boolean(arquivo?.type.startsWith('image/')))
      if (!arquivos.length) return
      if (alvo?.matches('input, textarea, [contenteditable="true"]') && evento.clipboardData?.getData('text/plain').trim()) return
      const erro = validarArquivoPrint(arquivos[0])
      if (erro) return aoErroArquivo(erro)
      const cartao = alvo?.closest<HTMLElement>('[data-passo-chave]')
      evento.preventDefault()
      if (cartao) {
        const indice = passos.findIndex((passo) => passo.chave === cartao.dataset.passoChave)
        if (indice >= 0) {
          const proximos = [...passos]
          proximos[indice] = { ...proximos[indice], print: { origem: 'novo', arquivo: arquivos[0] } }
          aoAlterar(proximos)
          setAnuncio(`Print colado no passo ${indice + 1}.`)
        }
      } else adicionar({ origem: 'novo', arquivo: arquivos[0] })
    }
    window.addEventListener('dragover', bloquearArquivo)
    window.addEventListener('drop', bloquearArquivo)
    document.addEventListener('paste', colar)
    return () => {
      window.removeEventListener('dragover', bloquearArquivo)
      window.removeEventListener('drop', bloquearArquivo)
      document.removeEventListener('paste', colar)
    }
  }, [adicionar, aoAlterar, aoErroArquivo, passos])

  function mover(indice: number, delta: -1 | 1) {
    const destinoIndice = indice + delta
    if (destinoIndice < 0 || destinoIndice >= passos.length) return
    const proximos = [...passos]
    const [movido] = proximos.splice(indice, 1)
    proximos.splice(destinoIndice, 0, movido)
    aoAlterar(proximos)
    setAnuncio(`Passo movido para a posição ${destinoIndice + 1} de ${passos.length}.`)
    requestAnimationFrame(() => {
      const preferido = delta < 0 && destinoIndice === 0 ? 'baixo' : delta > 0 && destinoIndice === passos.length - 1 ? 'cima' : delta < 0 ? 'cima' : 'baixo'
      raiz.current?.querySelector<HTMLButtonElement>(`[data-passo-chave="${movido.chave}"] [data-mover="${preferido}"]`)?.focus()
    })
  }

  async function remover(indice: number) {
    const passo = passos[indice]
    if (passos.length === 1) return
    if ((passo.titulo.trim() || passo.texto.trim() || passo.print || passo.printAcesso || passo.caminhoAcesso.trim()) && !await confirmar({ titulo: `Remover passo ${indice + 1}?`, mensagem: 'O texto, o caminho de acesso e os prints deste passo serão descartados ao salvar.', acao: 'Remover passo', perigo: true })) return
    aoAlterar(passos.filter((_, atual) => atual !== indice))
    setAnuncio(`Passo ${indice + 1} removido.`)
  }

  function soltarReordenacao(evento: React.DragEvent, chaveAlvo: string) {
    if (!evento.dataTransfer.types.includes('application/x-trilara-passo')) return
    evento.preventDefault()
    const origem = passos.findIndex((passo) => passo.chave === arrastando)
    const alvo = passos.findIndex((passo) => passo.chave === chaveAlvo)
    if (origem < 0 || alvo < 0) return
    let indiceDestino = destino?.chave === chaveAlvo && destino.indicador === 'depois' ? alvo + 1 : alvo
    if (origem < indiceDestino) indiceDestino--
    const proximos = [...passos]
    const [movido] = proximos.splice(origem, 1)
    proximos.splice(indiceDestino, 0, movido)
    if (origem !== indiceDestino) {
      aoAlterar(proximos)
      setAnuncio(`Passo movido para a posição ${indiceDestino + 1} de ${passos.length}.`)
    }
    setArrastando(null)
    setDestino(null)
  }

  return <section ref={raiz} id="passos-documento" aria-labelledby="passos-documento-titulo" className="rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-800 sm:p-6">
    {modal}
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <h2 id="passos-documento-titulo" className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">Passos</h2>
      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{passos.length}</span>
      <p className="ml-auto hidden text-[12px] text-ink-500 dark:text-ink-400 sm:block">Arraste pela alça ou use as setas para mudar a ordem</p>
      <p className="w-full text-[12px] text-ink-500 dark:text-ink-400 sm:hidden">Use as setas para mudar a ordem.</p>
    </div>
    <ol className="space-y-3">
      {passos.map((passo, indice) => <CartaoPassoEditor
        key={passo.chave}
        passo={passo}
        numero={indice + 1}
        total={passos.length}
        documentoId={documentoId}
        desabilitado={desabilitado}
        aberto={abertos.has(passo.chave)}
        aoAlternarAberto={() => setAbertos((atual) => { const proximo = new Set(atual); if (proximo.has(passo.chave)) proximo.delete(passo.chave); else proximo.add(passo.chave); return proximo })}
        focarCampo={foco?.chave === passo.chave ? foco.campo : null}
        aoFocarCampo={() => { setFoco(null); aoTratarErro() }}
        arrasto={{ arrastando: arrastando === passo.chave, indicador: destino?.chave === passo.chave ? destino.indicador : null }}
        aoArrastar={{
          iniciar: (evento) => { evento.dataTransfer.setData('application/x-trilara-passo', passo.chave); evento.dataTransfer.effectAllowed = 'move'; setArrastando(passo.chave) },
          sobre: (evento) => { if (!evento.dataTransfer.types.includes('application/x-trilara-passo')) return; evento.preventDefault(); const caixa = evento.currentTarget.getBoundingClientRect(); setDestino({ chave: passo.chave, indicador: evento.clientY < caixa.top + caixa.height / 2 ? 'antes' : 'depois' }) },
          soltar: (evento) => soltarReordenacao(evento, passo.chave),
          terminar: () => { setArrastando(null); setDestino(null) },
        }}
        aoAlterar={(proximo) => aoAlterar(passos.map((item) => item.chave === passo.chave ? proximo : item))}
        aoMover={(delta) => mover(indice, delta)}
        aoRemover={() => remover(indice)}
        aoErroArquivo={aoErroArquivo}
      />)}
    </ol>
    <button
      type="button"
      data-area-print="true"
      disabled={desabilitado || passos.length >= MAX_PASSOS_DOCUMENTO}
      onClick={() => adicionar()}
      onDragOver={(evento) => { if (evento.dataTransfer.types.includes('Files')) { evento.preventDefault(); evento.dataTransfer.dropEffect = 'copy' } }}
      onDrop={(evento) => {
        if (!evento.dataTransfer.types.includes('Files')) return
        evento.preventDefault()
        const arquivos = Array.from(evento.dataTransfer.files).slice(0, MAX_PASSOS_DOCUMENTO - passos.length)
        const validos: File[] = []
        for (const arquivo of arquivos) {
          const erro = validarArquivoPrint(arquivo)
          if (erro) { aoErroArquivo(erro); continue }
          validos.push(arquivo)
        }
        if (!validos.length) return
        const novos = validos.map((arquivo) => criarPassoEditor({ origem: 'novo', arquivo }))
        aoAlterar([...passos, ...novos])
        setAbertos((atual) => { const proximo = new Set(atual); novos.forEach((passo) => proximo.add(passo.chave)); return proximo })
        setFoco({ chave: novos[0].chave, campo: 'titulo' })
        setAnuncio(`${novos.length} ${novos.length === 1 ? 'passo criado' : 'passos criados'} com os prints soltos.`)
      }}
      className="mt-4 flex min-h-14 w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50/40 px-4 text-center text-[13px] text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500/40 dark:bg-brand-500/5 dark:text-brand-300"
    >
      {passos.length >= MAX_PASSOS_DOCUMENTO ? <><ImagePlus size={18} aria-hidden="true" /> Limite de 40 passos</> : <><Plus size={18} aria-hidden="true" /><strong>Adicionar passo</strong><span className="text-ink-500 dark:text-ink-400">· ou cole um print (Ctrl+V) para criar um passo já com a imagem</span></>}
    </button>
    <p aria-live="polite" className="sr-only">{anuncio}</p>
  </section>
}
