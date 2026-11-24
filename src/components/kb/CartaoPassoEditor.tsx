'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, ImagePlus, Trash2, UploadCloud, X } from 'lucide-react'
import { BarraMarkdown } from '@/components/kb/BarraMarkdown'
import { PreviaImagemLocal } from '@/components/kb/PreviaImagemLocal'
import type { CampoPasso, PassoEditor } from '@/components/kb/EditorPassos'
import { LIMITE_CAMINHO_ACESSO } from '@/lib/passos-documento'

const campo = 'min-h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[14px] text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50'
const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp']
const TAMANHO_MAXIMO_IMAGEM = 8 * 1024 * 1024

export function validarArquivoPrint(arquivo: File): string | null {
  if (!TIPOS_IMAGEM.includes(arquivo.type)) return 'Use prints em JPG, PNG ou WebP.'
  if (!arquivo.size || arquivo.size > TAMANHO_MAXIMO_IMAGEM) return 'Cada print pode ter no máximo 8 MB.'
  return null
}

export function CartaoPassoEditor({
  passo,
  numero,
  total,
  documentoId,
  desabilitado,
  aberto,
  aoAlternarAberto,
  focarCampo,
  aoFocarCampo,
  arrasto,
  aoArrastar,
  aoAlterar,
  aoMover,
  aoRemover,
  aoErroArquivo,
}: {
  passo: PassoEditor
  numero: number
  total: number
  documentoId: string | null
  desabilitado: boolean
  aberto: boolean
  aoAlternarAberto: () => void
  focarCampo: CampoPasso | null
  aoFocarCampo: () => void
  arrasto: { arrastando: boolean; indicador: 'antes' | 'depois' | null }
  aoArrastar: {
    iniciar: (evento: React.DragEvent) => void
    sobre: (evento: React.DragEvent) => void
    soltar: (evento: React.DragEvent) => void
    terminar: () => void
  }
  aoAlterar: (proximo: PassoEditor) => void
  aoMover: (delta: -1 | 1) => void
  aoRemover: () => void
  aoErroArquivo: (mensagem: string) => void
}) {
  const titulo = useRef<HTMLInputElement>(null)
  const caminhoAcesso = useRef<HTMLInputElement>(null)
  const texto = useRef<HTMLTextAreaElement>(null)
  const destaque = useRef<HTMLTextAreaElement>(null)
  const arquivo = useRef<HTMLInputElement>(null)
  const arquivoAcesso = useRef<HTMLInputElement>(null)
  const [sobrePrint, setSobrePrint] = useState(false)

  useEffect(() => {
    if (!aberto || !focarCampo) return
    const alvo = focarCampo === 'titulo' ? titulo.current : focarCampo === 'caminhoAcesso' ? caminhoAcesso.current : focarCampo === 'texto' ? texto.current : focarCampo === 'destaque' ? destaque.current : arquivo.current
    alvo?.focus()
    aoFocarCampo()
  }, [aberto, focarCampo, aoFocarCampo])

  function selecionar(arquivos: FileList | File[]) {
    const lista = Array.from(arquivos)
    if (!lista.length) return
    const erro = validarArquivoPrint(lista[0])
    if (erro) return aoErroArquivo(erro)
    if (lista.length > 1) aoErroArquivo('Cada passo tem um print; usei o primeiro.')
    aoAlterar({ ...passo, print: { origem: 'novo', arquivo: lista[0] } })
  }

  function selecionarPrintAcesso(arquivos: FileList | File[]) {
    const primeiro = Array.from(arquivos)[0]
    if (!primeiro) return
    const erro = validarArquivoPrint(primeiro)
    if (erro) return aoErroArquivo(erro)
    aoAlterar({ ...passo, printAcesso: { origem: 'novo', arquivo: primeiro } })
  }

  const idCorpo = `passo-editor-${passo.chave}`
  const imagemAtual = passo.print?.origem === 'atual' && documentoId
    ? `/api/documentos/${documentoId}/imagens/${passo.print.imagemId}`
    : null
  const imagemAcessoAtual = passo.printAcesso?.origem === 'atual' && documentoId
    ? `/api/documentos/${documentoId}/imagens/${passo.printAcesso.imagemId}`
    : null

  return <li
    data-passo-chave={passo.chave}
    onDragOver={aoArrastar.sobre}
    onDrop={aoArrastar.soltar}
    className={`relative rounded-xl border bg-white transition dark:bg-ink-800 ${aberto ? 'border-brand-400 shadow-sm dark:border-brand-500' : 'border-ink-200 dark:border-ink-700'} ${arrasto.arrastando ? 'opacity-50' : ''}`}
  >
    {arrasto.indicador && <span aria-hidden="true" className={`absolute inset-x-2 z-10 h-0.5 rounded bg-brand-500 ${arrasto.indicador === 'antes' ? '-top-1' : '-bottom-1'}`} />}
    <div className="flex min-h-14 items-center gap-2 p-2 sm:gap-3 sm:px-3">
      <button
        type="button"
        draggable={!desabilitado}
        onDragStart={aoArrastar.iniciar}
        onDragEnd={aoArrastar.terminar}
        title="Arraste para reordenar"
        aria-label={`Arrastar passo ${numero} para reordenar`}
        className="hidden cursor-grab rounded-lg p-2 text-ink-400 hover:bg-ink-100 active:cursor-grabbing dark:hover:bg-ink-700 sm:block"
      ><GripVertical size={19} aria-hidden="true" /></button>
      <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-bold ${aberto ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'}`}>{numero}</span>
      <p className={`min-w-0 flex-1 truncate text-[14px] font-semibold ${passo.titulo ? 'text-ink-900 dark:text-ink-50' : 'italic text-ink-400'}`}>{passo.titulo || 'Sem título'}</p>
      <button type="button" onClick={() => arquivo.current?.click()} disabled={desabilitado} aria-label={`Selecionar print do passo ${numero}`} className="hidden h-9 w-14 shrink-0 overflow-hidden rounded border border-dashed border-ink-300 bg-ink-50 sm:block dark:border-ink-600 dark:bg-ink-900">
        {passo.print?.origem === 'novo' ? <PreviaImagemLocal arquivo={passo.print.arquivo} className="h-full w-full" /> : imagemAtual ? <img src={imagemAtual} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] text-ink-400">+ print</span>}
      </button>
      <button type="button" onClick={aoAlternarAberto} aria-expanded={aberto} aria-controls={idCorpo} aria-label={aberto ? `Recolher passo ${numero}` : `Editar passo ${numero}`} className="grid size-11 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-700 md:size-9"><ChevronDown size={18} className={aberto ? 'rotate-180 transition' : 'transition'} aria-hidden="true" /></button>
      <button type="button" data-mover="cima" onClick={() => aoMover(-1)} disabled={desabilitado || numero === 1} aria-label={`Mover passo ${numero} para cima`} className="grid size-11 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-700 md:size-9"><ArrowUp size={17} aria-hidden="true" /></button>
      <button type="button" data-mover="baixo" onClick={() => aoMover(1)} disabled={desabilitado || numero === total} aria-label={`Mover passo ${numero} para baixo`} className="grid size-11 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-700 md:size-9"><ArrowDown size={17} aria-hidden="true" /></button>
      <button type="button" onClick={aoRemover} disabled={desabilitado || total === 1} aria-label={`Remover passo ${numero}`} className="grid size-11 place-items-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30 dark:text-rose-400 dark:hover:bg-rose-500/10 md:size-9"><Trash2 size={17} aria-hidden="true" /></button>
    </div>

    <input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={desabilitado} onChange={(evento) => { if (evento.target.files) selecionar(evento.target.files); evento.target.value = '' }} />

    {aberto && <div id={idCorpo} className="border-t border-ink-200 p-4 dark:border-ink-700 sm:p-5">
      <label className="block">
        <span className="text-[13px] font-medium text-ink-700 dark:text-ink-300">Título do passo</span>
        <input ref={titulo} id={`passo-${passo.chave}-titulo`} value={passo.titulo} maxLength={200} required onChange={(evento) => aoAlterar({ ...passo, titulo: evento.target.value })} placeholder="Ex.: Localizar a nota pela chave de acesso" className={`mt-2 ${campo}`} />
      </label>

      <section aria-labelledby={`passo-${passo.chave}-acesso`} className="mt-5 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-500/30 dark:bg-brand-500/5">
        <h4 id={`passo-${passo.chave}-acesso`} className="text-[13px] font-semibold text-ink-800 dark:text-ink-100">Onde acessar no sistema</h4>
        <p className="mt-1 text-[12px] text-ink-500 dark:text-ink-400">Ajude quem ainda não conhece o menu. Ex.: Portal → Documentos → Solicitações.</p>
        <label htmlFor={`passo-${passo.chave}-caminho`} className="mt-4 block text-[12px] font-medium text-ink-700 dark:text-ink-300">Caminho de acesso</label>
        <input ref={caminhoAcesso} id={`passo-${passo.chave}-caminho`} value={passo.caminhoAcesso} maxLength={LIMITE_CAMINHO_ACESSO} disabled={desabilitado} onChange={(evento) => aoAlterar({ ...passo, caminhoAcesso: evento.target.value })} placeholder="Portal → Documentos → Solicitações" className={`mt-2 ${campo}`} />
        <input ref={arquivoAcesso} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={desabilitado} onChange={(evento) => { if (evento.target.files) selecionarPrintAcesso(evento.target.files); evento.target.value = '' }} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" disabled={desabilitado} onClick={() => arquivoAcesso.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 text-[12px] font-semibold text-brand-600 disabled:opacity-50 dark:border-ink-700 dark:bg-ink-800 dark:text-brand-400"><ImagePlus size={16} aria-hidden="true" /> {passo.printAcesso ? 'Trocar print do menu' : 'Adicionar print do menu'}</button>
          {passo.printAcesso && <button type="button" disabled={desabilitado} onClick={() => aoAlterar({ ...passo, printAcesso: null })} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-rose-600 disabled:opacity-50 dark:text-rose-400"><X size={15} aria-hidden="true" /> Remover print</button>}
        </div>
        {passo.printAcesso && <div className="mt-3 max-w-md overflow-hidden rounded-lg border border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-800">
          {passo.printAcesso.origem === 'novo' ? <PreviaImagemLocal arquivo={passo.printAcesso.arquivo} className="aspect-video w-full" /> : imagemAcessoAtual ? <img src={imagemAcessoAtual} alt={`Print do menu do passo ${numero}`} className="aspect-video w-full object-contain" /> : null}
        </div>}
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={`passo-${passo.chave}-texto`} className="text-[13px] font-medium text-ink-700 dark:text-ink-300">Texto do passo</label>
          <div className="mt-2">
            <BarraMarkdown numeroPasso={numero} alvo={texto} desabilitado={desabilitado} aoAplicar={(resultado) => aoAlterar({ ...passo, texto: resultado.valor })} />
            <textarea ref={texto} id={`passo-${passo.chave}-texto`} value={passo.texto} maxLength={10_000} rows={6} onChange={(evento) => aoAlterar({ ...passo, texto: evento.target.value })} placeholder="Explique o que a pessoa deve fazer neste passo." className={`${campo} rounded-t-none resize-y font-mono leading-relaxed`} />
          </div>
          <p className="mt-2 text-[12px] text-ink-500 dark:text-ink-400">Suporta títulos (#), negrito (**), itálico (*), código (`), listas (-), citação (&gt;) e links.</p>
        </div>

        <section aria-labelledby={`passo-${passo.chave}-print`} className="min-w-0">
          <h4 id={`passo-${passo.chave}-print`} className="text-[13px] font-medium text-ink-700 dark:text-ink-300">Print do passo</h4>
          <div
            onDragEnter={(evento) => { if (evento.dataTransfer.types.includes('Files')) { evento.preventDefault(); setSobrePrint(true) } }}
            onDragOver={(evento) => { if (evento.dataTransfer.types.includes('Files')) { evento.preventDefault(); evento.stopPropagation(); evento.dataTransfer.dropEffect = 'copy' } }}
            onDragLeave={() => setSobrePrint(false)}
            onDrop={(evento) => { if (!evento.dataTransfer.types.includes('Files')) return; evento.preventDefault(); evento.stopPropagation(); setSobrePrint(false); selecionar(evento.dataTransfer.files) }}
            className={`mt-2 overflow-hidden rounded-xl border border-dashed p-3 transition ${sobrePrint ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-ink-300 bg-ink-50 dark:border-ink-600 dark:bg-ink-900'}`}
          >
            {passo.print ? <>
              <div className="overflow-hidden rounded-lg bg-white dark:bg-ink-800">
                {passo.print.origem === 'novo' ? <PreviaImagemLocal arquivo={passo.print.arquivo} className="aspect-[16/9] w-full" /> : imagemAtual ? <img src={imagemAtual} alt={`Print atual do passo ${numero}`} className="aspect-[16/9] w-full object-contain" /> : null}
              </div>
              <p className="mt-2 truncate text-[12px] text-ink-500 dark:text-ink-400">{passo.print.origem === 'novo' ? passo.print.arquivo.name : passo.print.arquivoNome}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => arquivo.current?.click()} disabled={desabilitado} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 text-[12px] font-semibold text-brand-600 dark:border-ink-700 dark:bg-ink-800 dark:text-brand-400"><UploadCloud size={15} aria-hidden="true" /> Trocar imagem</button>
                <button type="button" onClick={() => aoAlterar({ ...passo, print: null })} disabled={desabilitado} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-[12px] font-semibold text-rose-600 dark:text-rose-400"><X size={15} aria-hidden="true" /> Remover print</button>
              </div>
              <p className="mt-2 text-[11px] text-ink-400">ou cole com Ctrl+V</p>
            </> : <div className="flex min-h-44 flex-col items-center justify-center px-4 text-center">
              <ImagePlus size={25} className="text-brand-500" aria-hidden="true" />
              <p className="mt-3 text-[13px] font-medium text-ink-700 dark:text-ink-200">Arraste uma imagem, cole com Ctrl+V ou</p>
              <button type="button" onClick={() => arquivo.current?.click()} disabled={desabilitado} className="mt-3 min-h-10 rounded-lg bg-brand-600 px-4 text-[12px] font-semibold text-white disabled:opacity-50">Escolher imagem</button>
              <p className="mt-2 text-[11px] text-ink-400">JPG, PNG ou WebP, até 8 MB</p>
            </div>}
          </div>
        </section>

        <fieldset className="min-w-0 md:col-span-2">
          <legend className="text-[13px] font-medium text-ink-700 dark:text-ink-300">Destaque do passo {numero}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {([['', 'Nenhum'], ['REGRA', 'Regra'], ['ATENCAO', 'Atenção'], ['DICA', 'Dica']] as const).map(([valor, rotulo]) => <label key={valor || 'nenhum'} className="cursor-pointer">
              <input type="radio" value={valor} className="peer sr-only" name={`destaque-${passo.chave}`} checked={passo.destaqueTipo === valor} onChange={() => aoAlterar({ ...passo, destaqueTipo: valor })} />
              <span className="inline-flex min-h-10 items-center rounded-full border border-ink-200 px-4 text-[12px] font-semibold text-ink-600 peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 dark:border-ink-700 dark:text-ink-300 dark:peer-checked:bg-brand-500/10 dark:peer-checked:text-brand-300">{rotulo}</span>
            </label>)}
          </div>
          {passo.destaqueTipo && <textarea
            ref={destaque}
            value={passo.destaqueTexto}
            maxLength={1000}
            rows={2}
            required
            onChange={(evento) => aoAlterar({ ...passo, destaqueTexto: evento.target.value })}
            placeholder={passo.destaqueTipo === 'REGRA' ? 'Ex.: A nota só entra com pedido de compra aprovado.' : passo.destaqueTipo === 'ATENCAO' ? 'Ex.: Confira a filial antes de confirmar.' : 'Ex.: Use o leitor de código de barras para preencher a chave.'}
            className={`mt-3 ${campo} resize-y ${passo.destaqueTipo === 'REGRA' ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10' : passo.destaqueTipo === 'ATENCAO' ? 'border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10' : 'border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10'}`}
          />}
        </fieldset>
      </div>
    </div>}
  </li>
}
