'use client'

import Link from 'next/link'
import { sistemaExterno, type Publico } from '@/lib/publico'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { FilePlus2, FileText, Film, FolderTree, Globe, ImagePlus, Images, Link2, ListOrdered, Plus, Save, Trash2, UploadCloud } from 'lucide-react'
import { gerarSlug } from '@/lib/slug'
import { Selecao } from '@/components/ui/Selecao'
import { useConfirmacao } from '@/components/ui/useConfirmacao'
import { EditorPassos, criarPassoEditor, validarPassosEditor, type CampoPasso, type PassoEditor } from '@/components/kb/EditorPassos'
import { PreviaImagemLocal } from '@/components/kb/PreviaImagemLocal'
import { LIMITE_ENVIO_PRINTS_BYTES, mensagemLimiteEnvioPrints } from '@/lib/passos-documento'

type Tipo = 'PDF' | 'ARTIGO' | 'PASSO_A_PASSO' | 'LINK' | 'GIF'

export type DocumentoForm = {
  id: string
  sistemaSlug: string
  publico: Publico
  slug: string
  titulo: string
  descricao: string | null
  palavrasChave: string | null
  tipo: Tipo
  conteudo: string | null
  urlExterna: string | null
  arquivoNome: string | null
  imagens: { id: string; arquivoNome: string }[]
  passos: {
    id: string
    titulo: string
    texto: string | null
    caminhoAcesso: string | null
    destaqueTipo: 'REGRA' | 'ATENCAO' | 'DICA' | null
    destaqueTexto: string | null
    imagem: { id: string; arquivoNome: string } | null
    imagemAcesso: { id: string; arquivoNome: string } | null
  }[]
  comecePorAqui: boolean
  categoriaId: string | null
  ordem: number
  ativo: boolean
}

const campo =
  'mt-2 min-h-12 w-full rounded-xl border border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-900 px-4 py-3 text-[15px] text-ink-900 dark:text-ink-50 placeholder:text-ink-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition'

const rotulo = 'text-[14px] font-medium text-ink-700 dark:text-ink-300'
const painel = 'min-w-0 rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-800'
const cabecalhoPainel = 'flex items-center gap-3 border-b border-ink-200 px-4 py-4 sm:py-5 dark:border-ink-700 sm:px-6'
const iconePainel = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'

const FORMATOS = [
  { value: 'PDF', label: 'PDF', descricao: 'Envie um arquivo', icone: UploadCloud },
  { value: 'ARTIGO', label: 'Página', descricao: 'Texto e prints, sem PDF', icone: Images },
  { value: 'PASSO_A_PASSO', label: 'Passo a passo', descricao: 'Passos numerados com print', icone: ListOrdered, novo: true },
  { value: 'LINK', label: 'Link externo', descricao: 'Indique um endereço', icone: Link2 },
  { value: 'GIF', label: 'GIF', descricao: 'Envie uma animação', icone: Film },
] satisfies { value: Tipo; label: string; descricao: string; icone: typeof FileText; novo?: boolean }[]

const LIMITE_IMAGENS = 20
const TAMANHO_MAXIMO_IMAGEM = 8 * 1024 * 1024
const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp']
const TAMANHO_MAXIMO_GIF = 25 * 1024 * 1024

export function FormDocumento({
  sistemas,
  categorias: categoriasIniciais,
  documento,
  administrador = true,
  destino = "/admin",
}: {
  sistemas: { slug: string; name: string }[]
  categorias: { id: string; nome: string; sistemaSlug: string }[]
  administrador?: boolean
  destino?: string
  documento?: DocumentoForm
}) {
  const router = useRouter()
  const editando = Boolean(documento)

  const [publico, setPublico] = useState<Publico>(documento?.publico ?? 'INTERNO')
  const [sistemaSlug, setSistemaSlug] = useState(documento?.sistemaSlug ?? sistemas[0]?.slug ?? '')
  const [titulo, setTitulo] = useState(documento?.titulo ?? '')
  const [slugManual, setSlugManual] = useState(documento?.slug ?? '')
  const [slugEditado, setSlugEditado] = useState(editando)
  const [descricao, setDescricao] = useState(documento?.descricao ?? '')
  const [palavrasChave, setPalavrasChave] = useState(documento?.palavrasChave ?? '')
  const [tipo, setTipo] = useState<Tipo>(documento?.tipo ?? 'PDF')
  const [conteudo, setConteudo] = useState(documento?.conteudo ?? '')
  const [urlExterna, setUrlExterna] = useState(documento?.urlExterna ?? '')
  const [categoriaId, setCategoriaId] = useState(documento?.categoriaId ?? '')
  const [ordem, setOrdem] = useState(String(documento?.ordem ?? 0))
  const [ativo, setAtivo] = useState(documento?.ativo ?? true)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [imagens, setImagens] = useState<File[]>([])
  const [imagensRemover, setImagensRemover] = useState<string[]>([])
  const [comecePorAqui, setComecePorAqui] = useState(documento?.comecePorAqui ?? false)
  const [passos, setPassos] = useState<PassoEditor[]>(() => (documento?.passos ?? []).map((passo) => ({
    chave: passo.id,
    titulo: passo.titulo,
    texto: passo.texto ?? '',
    caminhoAcesso: passo.caminhoAcesso ?? '',
    destaqueTipo: passo.destaqueTipo ?? '',
    destaqueTexto: passo.destaqueTexto ?? '',
    print: passo.imagem ? { origem: 'atual' as const, imagemId: passo.imagem.id, arquivoNome: passo.imagem.arquivoNome } : null,
    printAcesso: passo.imagemAcesso ? { origem: 'atual' as const, imagemId: passo.imagemAcesso.id, arquivoNome: passo.imagemAcesso.arquivoNome } : null,
  })))
  const [passoComErro, setPassoComErro] = useState<{ chave: string; campo: CampoPasso } | null>(null)

  const [categorias, setCategorias] = useState(categoriasIniciais)
  const [novaSecao, setNovaSecao] = useState('')
  const [criandoSecao, setCriandoSecao] = useState(false)

  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const { confirmar, modal } = useConfirmacao()

  const slug = slugEditado ? gerarSlug(slugManual) : gerarSlug(titulo)
  // O arquivo atual só vale para o formato em que o documento foi salvo.
  const arquivoAtualPdf = documento?.tipo === 'PDF' ? documento.arquivoNome : null
  const arquivoAtualGif = documento?.tipo === 'GIF' ? documento.arquivoNome : null
  const imagensAtuais = (documento?.tipo === 'ARTIGO' ? documento.imagens : []).filter((imagem) => !imagensRemover.includes(imagem.id))

  const categoriasDoSistema = useMemo(
    () => categorias.filter((c) => c.sistemaSlug === sistemaSlug),
    [categorias, sistemaSlug]
  )

  async function criarSecao() {
    const nome = novaSecao.trim()
    if (!nome) return
    setCriandoSecao(true)
    setErro(null)
    try {
      const res = await fetch('/api/admin/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sistemaSlug, nome }),
      })
      const dados = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErro(dados.error ?? 'Não foi possível criar a seção.')
        return
      }
      setCategorias((atual) => [...atual, { id: dados.id, nome: dados.nome, sistemaSlug }])
      setCategoriaId(dados.id)
      setNovaSecao('')
    } catch {
      setErro('Falha de conexão ao criar a seção. Tente novamente.')
    } finally {
      setCriandoSecao(false)
    }
  }

  function adicionarImagens(arquivos: FileList | null) {
    if (!arquivos?.length) return
    const novas = Array.from(arquivos)
    if (novas.some((imagem) => !TIPOS_IMAGEM.includes(imagem.type))) {
      setErro('Use prints em JPG, PNG ou WebP.')
      return
    }
    if (novas.some((imagem) => imagem.size > TAMANHO_MAXIMO_IMAGEM)) {
      setErro('Cada print pode ter no máximo 8 MB.')
      return
    }

    const adicionadas = novas.filter((imagem) => !imagens.some((atual) =>
      atual.name === imagem.name && atual.size === imagem.size && atual.lastModified === imagem.lastModified
    ))
    if (imagensAtuais.length + imagens.length + adicionadas.length > LIMITE_IMAGENS) {
      setErro(`Você pode adicionar até ${LIMITE_IMAGENS} prints por página.`)
      return
    }
    setImagens((atual) => [...atual, ...adicionadas])
    setErro(null)
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    if (tipo === 'ARTIGO' && !conteudo.trim() && imagens.length + imagensAtuais.length === 0) {
      setErro('Escreva o conteúdo ou adicione ao menos um print para publicar esta página.')
      return
    }

    if (tipo === 'PASSO_A_PASSO') {
      const validacao = validarPassosEditor(passos)
      if (validacao) {
        setErro(validacao.mensagem)
        if (validacao.chave) setPassoComErro({ chave: validacao.chave, campo: validacao.campo })
        return
      }
      const totalPrintsNovos = passos.reduce((total, passo) => total + [passo.print, passo.printAcesso].reduce((soma, print) => soma + (print?.origem === 'novo' ? print.arquivo.size : 0), 0), 0)
      if (totalPrintsNovos > LIMITE_ENVIO_PRINTS_BYTES) {
        setErro(mensagemLimiteEnvioPrints(totalPrintsNovos))
        return
      }
    }

    let confirmouTroca = false
    if (documento && tipo !== documento.tipo && (tipo === 'PASSO_A_PASSO' || documento.tipo === 'PASSO_A_PASSO')) {
      const totalAnterior = documento.passos.length
      const mensagem = documento.tipo === 'PASSO_A_PASSO'
        ? `Ao salvar como ${FORMATOS.find((formato) => formato.value === tipo)?.label}, os ${totalAnterior} ${totalAnterior === 1 ? 'passo e o print' : 'passos e os prints'} deste guia serão apagados. Deseja continuar?`
        : documento.tipo === 'ARTIGO'
          ? 'Ao salvar como Passo a passo, o texto e os prints desta página serão apagados. Deseja continuar?'
          : documento.tipo === 'LINK'
            ? 'Ao salvar como Passo a passo, o link externo será removido. Deseja continuar?'
            : `Ao salvar como Passo a passo, o arquivo atual${documento.arquivoNome ? ` (${documento.arquivoNome})` : ''} será apagado. Deseja continuar?`
      confirmouTroca = await confirmar({ titulo: 'Alterar tipo do documento?', mensagem, acao: 'Continuar e salvar', perigo: true })
      if (!confirmouTroca) return
    }

    if (tipo === 'GIF') {
      if (!arquivo && !arquivoAtualGif) {
        setErro('Anexe o arquivo GIF.')
        return
      }
      if (arquivo && arquivo.type !== 'image/gif') {
        setErro('O arquivo precisa ser um GIF.')
        return
      }
      if (arquivo && arquivo.size > TAMANHO_MAXIMO_GIF) {
        setErro('O GIF pode ter no máximo 25 MB.')
        return
      }
    }

    setEnviando(true)

    const form = new FormData()
    form.set('sistemaSlug', sistemaSlug)
    form.set('publico', publico)
    form.set('titulo', titulo)
    form.set('slug', slug)
    form.set('descricao', descricao)
    form.set('palavrasChave', palavrasChave)
    form.set('tipo', tipo)
    form.set('categoriaId', categoriaId)
    form.set('comecePorAqui', String(comecePorAqui))
    if (confirmouTroca) form.set('descartarPassos', '1')
    if (administrador) {
      form.set('ordem', ordem)
      form.set('ativo', String(ativo))
    }
    if (tipo === 'PASSO_A_PASSO') {
      const printsNovos: File[] = []
      const passosParaEnvio = passos.map((passo) => {
        function serializarPrint(valor: typeof passo.print): { imagemId: string } | { novo: number } | null {
          if (!valor) return null
          if (valor.origem === 'atual') return { imagemId: valor.imagemId }
          const novo = printsNovos.length
          printsNovos.push(valor.arquivo)
          return { novo }
        }
        const print = serializarPrint(passo.print)
        const printAcesso = serializarPrint(passo.printAcesso)
        return {
          titulo: passo.titulo,
          texto: passo.texto || null,
          caminhoAcesso: passo.caminhoAcesso || null,
          destaque: passo.destaqueTipo ? { tipo: passo.destaqueTipo, texto: passo.destaqueTexto } : null,
          print,
          printAcesso,
        }
      })
      form.set('passos', JSON.stringify(passosParaEnvio))
      printsNovos.forEach((print) => form.append('printsPassos', print))
    }
    if (tipo === 'ARTIGO') {
      form.set('conteudo', conteudo)
      imagens.forEach((imagem) => form.append('imagens', imagem))
      if (editando) form.set('imagensRemover', JSON.stringify(imagensRemover))
    }
    if (tipo === 'LINK') form.set('urlExterna', urlExterna)
    if ((tipo === 'PDF' || tipo === 'GIF') && arquivo) form.set('arquivo', arquivo)

    try {
      const res = await fetch(
        editando ? `/api/admin/documentos/${documento!.id}` : '/api/admin/documentos',
        { method: editando ? 'PATCH' : 'POST', body: form }
      )
      const dados = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErro(dados.error ?? 'Não foi possível salvar.')
        setEnviando(false)
        return
      }

      router.push(destino)
      router.refresh()
    } catch {
      setErro('Falha de conexão ao enviar. Se o arquivo for grande, verifique o limite do servidor.')
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} aria-busy={enviando} className="space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
        <section aria-labelledby="dados-documento" className={painel}>
          <div className={cabecalhoPainel}>
            <span className={iconePainel}><FileText size={21} aria-hidden="true" /></span>
            <div>
              <h2 id="dados-documento" className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">Dados do documento</h2>
              <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Identifique o material e adicione seu conteúdo.</p>
            </div>
          </div>

          <div className="space-y-6 p-4 sm:p-7">
            <label className="block">
              <span className={rotulo}>Título</span>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required placeholder="Como agendar uma janela de descarga" className={campo} />
            </label>

            <label className="block">
              <span className={rotulo}>Endereço (URL)</span>
              <input
                value={slugEditado ? slugManual : slug}
                onChange={(e) => {
                  setSlugEditado(true)
                  setSlugManual(e.target.value)
                }}
                placeholder="como-agendar-uma-janela"
                aria-describedby="endereco-documento"
                className={campo}
              />
              <span id="endereco-documento" className="mt-2 block break-all text-[12px] text-ink-500 dark:text-ink-400">
                /documentacao/{sistemaSlug}/{slug || '…'}
              </span>
            </label>

            <label className="block">
              <span className={rotulo}>Descrição curta <span className="font-normal text-ink-500 dark:text-ink-400">(opcional)</span></span>
              <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} placeholder="Explique brevemente para que serve este documento" className={campo + ' resize-y'} />
            </label>

            <label className="block">
              <span className={rotulo}>Palavras-chave <span className="font-normal text-ink-500 dark:text-ink-400">(opcional)</span></span>
              <input
                value={palavrasChave}
                onChange={(e) => setPalavrasChave(e.target.value)}
                placeholder="cte sumiu, canhoto reprovado, nota não aparece"
                className={campo}
              />
              <span className="mt-2 block text-[12px] text-ink-500 dark:text-ink-400">
                Termos que o colaborador digita na busca mesmo sem usar as palavras do título. Separe por vírgula.
              </span>
            </label>

            <fieldset className="min-w-0 border-t border-ink-200 pt-5 dark:border-ink-700">
              <legend className={rotulo + ' pr-3'}>Formato do conteúdo</legend>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {FORMATOS.map(({ value, label, descricao: ajuda, icone: Icone, novo }) => (
                  <label key={value} className="min-w-0 cursor-pointer">
                    <input type="radio" name="tipo" value={value} checked={tipo === value} onChange={() => {
                      if (value !== tipo) setArquivo(null)
                      if (value === 'PASSO_A_PASSO' && passos.length === 0) setPassos([criarPassoEditor()])
                      setTipo(value)
                    }} className="peer sr-only" />
                    <span className="flex h-full flex-col gap-2 rounded-xl border border-ink-200 p-4 transition hover:border-brand-300 peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 dark:border-ink-700 dark:peer-checked:border-brand-400 dark:peer-checked:bg-brand-500/10 dark:peer-focus-visible:ring-offset-ink-800">
                      <span className="flex items-center justify-between gap-2">
                        <Icone size={20} aria-hidden="true" className={tipo === value ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400'} />
                        <span aria-hidden="true" className={'flex h-4 w-4 items-center justify-center rounded-full border ' + (tipo === value ? 'border-brand-500 bg-brand-500' : 'border-ink-300 dark:border-ink-600')}>
                          {tipo === value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink-900 dark:text-ink-50">{label}{novo && <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">Novo</span>}</span>
                      <span className="text-[12px] text-ink-500 dark:text-ink-400">{ajuda}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {tipo === 'PASSO_A_PASSO' && <div className="rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-3 text-[13px] leading-relaxed text-ink-600 dark:border-brand-500/20 dark:bg-brand-500/5 dark:text-ink-300">
              Cada passo tem título, texto e print. Use para procedimentos, como dar entrada em uma nota.{' '}
              <a href="#passos-documento" className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300">Editar os passos</a>
            </div>}

            {documento && tipo !== documento.tipo && (tipo === 'PASSO_A_PASSO' || documento.tipo === 'PASSO_A_PASSO') && <p role="note" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              A troca de formato descartará o conteúdo específico do formato atual e pedirá confirmação ao salvar.
            </p>}

            {tipo === 'PDF' && (
              <div className="rounded-xl border border-dashed border-ink-300 bg-ink-50 p-5 dark:border-ink-600 dark:bg-ink-900 sm:p-6">
                <div className="mb-4 flex items-start gap-3">
                  <UploadCloud size={23} aria-hidden="true" className="shrink-0 text-brand-500" />
                  <div className="min-w-0">
                    <label htmlFor="arquivo-documento" className={rotulo}>Arquivo PDF</label>
                    <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">
                      {arquivoAtualPdf ? 'Selecione outro arquivo para substituir o atual.' : 'Escolha o PDF que ficará disponível para consulta.'}
                    </p>
                  </div>
                </div>
                <input
                  id="arquivo-documento"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                  className="block w-full min-w-0 text-[13px] text-ink-600 dark:text-ink-400 file:mr-3 file:min-h-12 file:cursor-pointer file:rounded-xl file:border-0 file:bg-brand-500 file:px-5 file:py-3 file:text-[14px] file:font-medium file:text-white hover:file:bg-brand-600"
                />
                {(arquivo || arquivoAtualPdf) && (
                  <p aria-live="polite" className="mt-3 break-all text-[13px] text-ink-500 dark:text-ink-400">
                    {arquivo ? `Selecionado: ${arquivo.name}` : `Atual: ${arquivoAtualPdf}`}
                  </p>
                )}
              </div>
            )}

            {tipo === 'GIF' && (
              <div className="rounded-xl border border-dashed border-ink-300 bg-ink-50 p-5 dark:border-ink-600 dark:bg-ink-900 sm:p-6">
                <div className="mb-4 flex items-start gap-3">
                  <Film size={23} aria-hidden="true" className="shrink-0 text-brand-500" />
                  <div className="min-w-0">
                    <label htmlFor="arquivo-gif" className={rotulo}>Arquivo GIF</label>
                    <p id="ajuda-arquivo-gif" className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">
                      {arquivoAtualGif ? 'Selecione outro arquivo para substituir o atual.' : 'Escolha o GIF que ficará disponível para consulta.'}
                      {' '}Somente .gif, até 25 MB.
                    </p>
                  </div>
                </div>
                <input
                  id="arquivo-gif"
                  type="file"
                  accept="image/gif"
                  aria-describedby="ajuda-arquivo-gif"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                  className="block w-full min-w-0 text-[13px] text-ink-600 dark:text-ink-400 file:mr-3 file:min-h-12 file:cursor-pointer file:rounded-xl file:border-0 file:bg-brand-500 file:px-5 file:py-3 file:text-[14px] file:font-medium file:text-white hover:file:bg-brand-600"
                />
                {(arquivo || arquivoAtualGif) && (
                  <p aria-live="polite" className="mt-3 break-all text-[13px] text-ink-500 dark:text-ink-400">
                    {arquivo ? `Selecionado: ${arquivo.name}` : `Atual: ${arquivoAtualGif}`}
                  </p>
                )}
                {arquivo ? (
                  <div className="mt-4 overflow-hidden rounded-lg">
                    <PreviaImagemLocal arquivo={arquivo} />
                  </div>
                ) : arquivoAtualGif && documento ? (
                  <div className="mt-4 overflow-hidden rounded-lg">
                    {/* <img> simples para preservar a animação do GIF (o otimizador do Next não anima). */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/documentos/${documento.id}/arquivo`} alt="GIF atual do documento" className="aspect-video w-full bg-ink-50 object-contain dark:bg-ink-900" />
                  </div>
                ) : null}
              </div>
            )}

            {tipo === 'ARTIGO' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-3 text-[13px] leading-relaxed text-ink-600 dark:border-brand-500/20 dark:bg-brand-500/5 dark:text-ink-300">
                  Crie uma documentação sem PDF com instruções, prints ou ambos. Preencha pelo menos uma das opções.
                </div>
                <label className="block">
                  <span className={rotulo}>Instruções <span className="font-normal text-ink-500 dark:text-ink-400">(opcional se adicionar prints)</span></span>
                  <textarea
                    value={conteudo}
                    onChange={(e) => setConteudo(e.target.value)}
                    rows={12}
                    placeholder={'## Passo 1\n\nAcesse o menu **Agendamentos**.\n\n- item\n- outro item'}
                    className={campo + ' resize-y font-mono leading-relaxed'}
                  />
                  <span className="mt-2 block text-[12px] text-ink-500 dark:text-ink-400">
                    Suporta títulos (#), negrito (**), itálico (*), código (`), listas (-), citação (&gt;) e links.
                  </span>
                </label>

                <section aria-labelledby="prints-documento" className="rounded-xl border border-ink-200 bg-ink-50/50 p-4 dark:border-ink-700 dark:bg-ink-900/50 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><ImagePlus size={20} aria-hidden="true" /></span>
                    <div>
                      <h3 id="prints-documento" className="text-[14px] font-semibold text-ink-900 dark:text-ink-50">Prints do módulo</h3>
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-500 dark:text-ink-400">Envie até {LIMITE_IMAGENS} imagens JPG, PNG ou WebP, com no máximo 8 MB cada. O limite por salvamento é 70 MB; para mais, adicione em etapas. Elas aparecerão na ordem em que forem adicionadas.</p>
                    </div>
                  </div>
                  <label className="mt-5 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-white px-4 py-5 text-center transition hover:border-brand-400 hover:bg-brand-50/40 dark:border-ink-600 dark:bg-ink-800 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/5">
                    <UploadCloud size={23} aria-hidden="true" className="text-brand-500" />
                    <span className="text-[13px] font-semibold text-ink-700 dark:text-ink-200">Selecionar prints</span>
                    <span className="text-[12px] text-ink-500 dark:text-ink-400">{imagensAtuais.length + imagens.length} de {LIMITE_IMAGENS} imagens</span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      disabled={enviando || imagensAtuais.length + imagens.length >= LIMITE_IMAGENS}
                      onChange={(e) => { adicionarImagens(e.target.files); e.target.value = '' }}
                      className="sr-only"
                    />
                  </label>

                  {(imagensAtuais.length > 0 || imagens.length > 0) && (
                    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                      {imagensAtuais.map((imagem, indice) => (
                        <li key={imagem.id} className="min-w-0 overflow-hidden rounded-xl border border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/api/documentos/${documento!.id}/imagens/${imagem.id}`} alt="" loading="lazy" decoding="async" className="aspect-video w-full bg-ink-50 object-contain dark:bg-ink-900" />
                          <div className="flex items-center justify-between gap-2 p-3">
                            <p className="min-w-0 truncate text-[12px] text-ink-600 dark:text-ink-300">{indice + 1}. {imagem.arquivoNome}</p>
                            <button type="button" onClick={() => setImagensRemover((atual) => [...atual, imagem.id])} disabled={enviando} aria-label={`Remover ${imagem.arquivoNome}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-500/10"><Trash2 size={16} aria-hidden="true" /></button>
                          </div>
                        </li>
                      ))}
                      {imagens.map((imagem, indice) => (
                        <li key={`${imagem.name}-${imagem.size}-${imagem.lastModified}`} className="min-w-0 overflow-hidden rounded-xl border border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-800">
                          <PreviaImagemLocal arquivo={imagem} />
                          <div className="flex items-center justify-between gap-2 p-3">
                            <p className="min-w-0 truncate text-[12px] text-ink-600 dark:text-ink-300">{imagensAtuais.length + indice + 1}. {imagem.name}</p>
                            <button type="button" onClick={() => setImagens((atual) => atual.filter((arquivo) => arquivo !== imagem))} disabled={enviando} aria-label={`Remover ${imagem.name}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-500/10"><Trash2 size={16} aria-hidden="true" /></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {imagensRemover.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                      <span>{imagensRemover.length} {imagensRemover.length === 1 ? 'print será removido' : 'prints serão removidos'} ao salvar.</span>
                      <button type="button" onClick={() => setImagensRemover([])} disabled={enviando} className="font-semibold underline underline-offset-2 hover:text-rose-900 disabled:opacity-50 dark:hover:text-rose-100">Desfazer</button>
                    </div>
                  )}
                </section>
              </div>
            )}

            {tipo === 'LINK' && (
              <label className="block">
                <span className={rotulo}>URL externa</span>
                <input type="url" value={urlExterna} onChange={(e) => setUrlExterna(e.target.value)} placeholder="https://..." className={campo} />
                <span className="mt-2 block text-[12px] text-ink-500 dark:text-ink-400">Informe o endereço completo do conteúdo.</span>
              </label>
            )}
          </div>
        </section>

        <div className="min-w-0 space-y-6">
          <section aria-labelledby="organizacao-documento" className={painel}>
            <div className={cabecalhoPainel}>
              <span className={iconePainel}><FolderTree size={21} aria-hidden="true" /></span>
              <div>
                <h2 id="organizacao-documento" className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">Organização</h2>
                <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Defina onde encontrar este documento.</p>
              </div>
            </div>
            <div className="space-y-5 p-4 sm:p-6">
              <div>
                <span id="publico-documento" className={rotulo}>Público do material</span>
                <Selecao
                  rotuloId="publico-documento"
                  tamanho="grande"
                  valor={publico}
                  disabled={enviando}
                  onChange={(valor) => {
                    setPublico(valor as Publico)
                    if (valor === 'EXTERNO' && !sistemaExterno(sistemaSlug)) {
                      setSistemaSlug('portal-de-clientes')
                      setCategoriaId('')
                    }
                  }}
                  opcoes={[
                    { value: 'INTERNO', label: 'Equipe' },
                    { value: 'EXTERNO', label: 'Externo — clientes e transportadoras' },
                  ]}
                />
                <span className="mt-2 block text-xs text-ink-500">{publico === 'EXTERNO' ? 'Material comum a todos os clientes e transportadoras.' : 'Este material não aparece para clientes.'}</span>
              </div>
              <div>
                <span id="sistema-documento" className={rotulo}>Sistema</span>
                <Selecao
                  rotuloId="sistema-documento"
                  tamanho="grande"
                  disabled={criandoSecao || enviando}
                  valor={sistemaSlug}
                  onChange={(v) => {
                    setSistemaSlug(v)
                    setCategoriaId('')
                  }}
                  placeholder="Selecione o sistema…"
                  buscavel={sistemas.length > 7}
                  opcoes={sistemas.filter(s => publico === 'INTERNO' || sistemaExterno(s.slug)).map((s) => ({ value: s.slug, label: s.name }))}
                />
              </div>
              <div>
                <span id="secao-documento" className={rotulo}>Seção (opcional)</span>
                <Selecao
                  rotuloId="secao-documento"
                  tamanho="grande"
                  disabled={criandoSecao || enviando}
                  valor={categoriaId}
                  onChange={setCategoriaId}
                  placeholder="Geral"
                  opcoes={[
                    { value: '', label: 'Geral' },
                    ...categoriasDoSistema.map((c) => ({ value: c.id, label: c.nome })),
                  ]}
                />
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 p-4 dark:border-ink-700">
                <input type="checkbox" checked={comecePorAqui} onChange={(evento) => setComecePorAqui(evento.target.checked)} disabled={enviando} className="mt-0.5 size-5 shrink-0 accent-brand-500" />
                <span>
                  <span className="block text-[14px] font-semibold text-ink-900 dark:text-ink-50">Mostrar em “Comece por aqui”</span>
                  <span className="mt-1 block text-[12px] leading-relaxed text-ink-500 dark:text-ink-400">Destaca este material no topo da página do sistema. Use para páginas de base, como Como funciona, Regras e Glossário.</span>
                </span>
              </label>
              {administrador && <div className="rounded-xl bg-ink-50 p-4 dark:bg-ink-900">
                <label className="block">
                  <span className={rotulo}>Criar nova seção</span>
                  <input value={novaSecao} onChange={(e) => setNovaSecao(e.target.value)} disabled={criandoSecao || enviando} placeholder="Ex.: Primeiros passos" className={campo} />
                </label>
                <button
                  type="button"
                  onClick={criarSecao}
                  disabled={criandoSecao || enviando || !novaSecao.trim() || !sistemaSlug}
                  className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-[14px] font-medium text-ink-600 transition hover:border-brand-400 hover:text-brand-600 disabled:opacity-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300"
                >
                  <Plus size={18} aria-hidden="true" />
                  {criandoSecao ? 'Criando…' : 'Adicionar seção'}
                </button>
                <Link
                  href="/admin/secoes"
                  target="_blank"
                  className="mt-2 block text-center text-[12.5px] text-ink-500 underline-offset-2 hover:text-brand-600 hover:underline dark:text-ink-400 dark:hover:text-brand-400"
                >
                  Renomear ou excluir uma seção existente
                </Link>
              </div>}
            </div>
          </section>

          {administrador && <section aria-labelledby="publicacao-documento" className={painel}>
            <div className={cabecalhoPainel}>
              <span className={iconePainel}><Globe size={21} aria-hidden="true" /></span>
              <div>
                <h2 id="publicacao-documento" className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">Publicação</h2>
                <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Controle a visibilidade e a posição na lista.</p>
              </div>
            </div>
            <div className="space-y-5 p-4 sm:p-6">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 p-4 dark:border-ink-700">
                <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500" />
                <span>
                  <span className="block text-[14px] font-semibold text-ink-900 dark:text-ink-50">Publicado</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">
                    {ativo ? 'Visível para o público selecionado após salvar.' : 'Oculto após salvar.'}
                  </span>
                </span>
              </label>
              <label className="block">
                <span className={rotulo}>Ordem na listagem</span>
                <input type="number" value={ordem} onChange={(e) => setOrdem(e.target.value)} className={campo} />
              </label>
            </div>
          </section>}
        </div>
      </div>

      {tipo === 'PASSO_A_PASSO' && <EditorPassos
        documentoId={documento?.id ?? null}
        passos={passos}
        aoAlterar={setPassos}
        desabilitado={enviando}
        passoComErro={passoComErro}
        aoTratarErro={() => setPassoComErro(null)}
        aoErroArquivo={setErro}
      />}

      {erro && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2.5 text-[13px] text-rose-700 dark:text-rose-300"
        >
          {erro}
        </p>
      )}

      <div className="flex flex-col gap-4 rounded-2xl border border-ink-200 bg-white p-4 sm:p-5 dark:border-ink-800 dark:bg-ink-800 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="text-[13px] text-ink-500 dark:text-ink-400">Confira o conteúdo e as opções de publicação antes de salvar.</p>
        <div className="flex shrink-0 flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            disabled={enviando || criandoSecao}
            onClick={() => router.push(destino)}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ink-200 px-6 py-3 text-[15px] font-medium text-ink-600 transition hover:bg-ink-100 disabled:opacity-60 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando || criandoSecao}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-500 px-7 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
          >
            {editando ? <Save size={19} aria-hidden="true" /> : <FilePlus2 size={19} aria-hidden="true" />}
            {enviando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar documento'}
          </button>
        </div>
      </div>
      {modal}
    </form>
  )
}
