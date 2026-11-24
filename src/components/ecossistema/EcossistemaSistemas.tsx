'use client'

import Link from 'next/link'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowDownUp, ArrowRight, ArrowUpRight, BookOpen, Building2, Check, ChevronRight, Compass, GitBranch, Layers3, List, Maximize2, Minus, MousePointer2, Network, Plus, Search, SlidersHorizontal, Users, X } from 'lucide-react'
import { iconeDoSistema } from '@/components/portal/PlacaSistema'
import { Selecao } from '@/components/ui/Selecao'
import { ALTURA_NO, LARGURA_NO, TIPOS_VINCULO, conexoesDoEcossistema, correspondeBuscaEcossistema, organizarMapa, perfilDoSistema, type ConexaoEcossistema, type PosicaoNo, type SistemaEcossistema } from '@/lib/ecossistema'
import { urlExternaValida } from '@/lib/url-externa'
import { ExploradorSistemas } from './ExploradorSistemas'

type Selecao = { tipo: 'sistema'; id: string } | { tipo: 'conexao'; id: string } | null
const controle = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-medium transition focus-visible:outline-brand-500'
const cores: Record<string, string> = { brand: '#8b5cf6', blue: '#3b82f6', amber: '#d97706', rose: '#e11d48', green: '#16a34a', teal: '#0d9488' }

function Marca({ sistema, pequena = false }: { sistema: SistemaEcossistema; pequena?: boolean }) {
  const Icone = iconeDoSistema(sistema.slug)
  return <span aria-hidden className={`grid shrink-0 place-items-center rounded-xl border border-current/10 ${pequena ? 'size-9' : 'size-12'}`} style={{ color: cores[sistema.color], backgroundColor: `${cores[sistema.color] ?? '#8b5cf6'}12` }}><Icone size={pequena ? 18 : 25} strokeWidth={1.7} /></span>
}

function caminhoEntreNos(origem: PosicaoNo, destino: PosicaoNo, deslocamento: number) {
  const horizontal = Math.abs(origem.x - destino.x) > LARGURA_NO
  const sinal = horizontal ? (destino.x > origem.x ? 1 : -1) : (destino.y > origem.y ? 1 : -1)
  const x1 = origem.x + (horizontal ? sinal > 0 ? LARGURA_NO : 0 : LARGURA_NO / 2 + deslocamento)
  const y1 = origem.y + (horizontal ? ALTURA_NO / 2 + deslocamento : sinal > 0 ? ALTURA_NO : 0)
  const x2 = destino.x + (horizontal ? sinal > 0 ? 0 : LARGURA_NO : LARGURA_NO / 2 + deslocamento)
  const y2 = destino.y + (horizontal ? ALTURA_NO / 2 + deslocamento : sinal > 0 ? 0 : ALTURA_NO)
  const curva = horizontal ? Math.max(50, Math.abs(x2 - x1) / 2) : Math.max(32, Math.abs(y2 - y1) / 2)
  if (horizontal && Math.abs(origem.x - destino.x) > 500 && Math.abs(origem.y - destino.y) < ALTURA_NO) {
    const canal = Math.min(origem.y, destino.y) - 24 - Math.abs(deslocamento)
    return { d: `M ${x1} ${y1} C ${x1 + sinal * 25} ${y1}, ${x1 + sinal * 25} ${canal}, ${x1 + sinal * 50} ${canal} L ${x2 - sinal * 50} ${canal} C ${x2 - sinal * 25} ${canal}, ${x2 - sinal * 25} ${y2}, ${x2} ${y2}`, x: (x1 + x2) / 2, y: canal }
  }
  return {
    d: horizontal ? `M ${x1} ${y1} C ${x1 + sinal * curva} ${y1}, ${x2 - sinal * curva} ${y2}, ${x2} ${y2}` : `M ${x1} ${y1} C ${x1} ${y1 + sinal * curva}, ${x2} ${y2 - sinal * curva}, ${x2} ${y2}`,
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2,
  }
}

export function EcossistemaSistemas({ sistemas, admin }: { sistemas: SistemaEcossistema[]; admin: boolean }) {
  const [busca, setBusca] = useState('')
  const [area, setArea] = useState('')
  const [origem, setOrigem] = useState('')
  const [tipoVinculo, setTipoVinculo] = useState('')
  const [somenteConectados, setSomenteConectados] = useState(false)
  const [modo, setModo] = useState<'explorar' | 'mapa' | 'lista'>('explorar')
  const [selecao, setSelecao] = useState<Selecao>(null)
  const painel = useRef<HTMLElement>(null)
  const conexoes = useMemo(() => conexoesDoEcossistema(sistemas), [sistemas])
  const areas = useMemo(() => [...new Set(sistemas.map(s => perfilDoSistema(s).area))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [sistemas])
  const conexoesDoTipo = conexoes.filter(c => !tipoVinculo || c.tipo === tipoVinculo)
  const conectados = new Set(conexoesDoTipo.flatMap(c => [c.origemSlug, c.destinoSlug]))
  const visiveis = sistemas.filter(s => correspondeBuscaEcossistema(s, busca) && (!area || perfilDoSistema(s).area === area) && (!origem || s.kind === origem) && (!(somenteConectados || tipoVinculo) || conectados.has(s.slug)))
  const slugsVisiveis = new Set(visiveis.map(s => s.slug))
  const conexoesVisiveis = conexoesDoTipo.filter(c => slugsVisiveis.has(c.origemSlug) && slugsVisiveis.has(c.destinoSlug))
  const sistemaSelecionado = selecao?.tipo === 'sistema' ? visiveis.find(s => s.slug === selecao.id) : undefined
  const conexaoSelecionada = selecao?.tipo === 'conexao' ? conexoesVisiveis.find(c => c.id === selecao.id) : undefined
  const selecaoVisivel: Selecao = sistemaSelecionado ? { tipo: 'sistema', id: sistemaSelecionado.slug } : conexaoSelecionada ? { tipo: 'conexao', id: conexaoSelecionada.id } : null
  const temFiltros = Boolean(busca || area || origem || tipoVinculo || somenteConectados)
  const filtros = [
    { id: 'filtro-area-ecossistema', label: 'Área de atuação', valor: area, mudar: setArea, buscavel: areas.length > 6, opcoes: [{ value: '', label: 'Todas as áreas' }, ...areas.map(nome => ({ value: nome, label: nome }))] },
    { id: 'filtro-origem-ecossistema', label: 'Origem do sistema', valor: origem, mudar: setOrigem, buscavel: false, opcoes: [{ value: '', label: 'Todas as origens' }, { value: 'internal', label: 'Interno' }, { value: 'external', label: 'Terceiros' }] },
    { id: 'filtro-vinculo-ecossistema', label: 'Tipo de vínculo', valor: tipoVinculo, mudar: setTipoVinculo, buscavel: false, opcoes: [{ value: '', label: 'Todos os vínculos' }, ...Object.entries(TIPOS_VINCULO).map(([value, tipo]) => ({ value, label: tipo.nome }))] },
  ]

  function selecionar(proxima: Selecao) {
    setSelecao(proxima)
    if (proxima && window.innerWidth < 1536) requestAnimationFrame(() => {
      painel.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
      painel.current?.focus({ preventScroll: true })
    })
  }

  function limparFiltros() { setBusca(''); setArea(''); setOrigem(''); setTipoVinculo(''); setSomenteConectados(false); setSelecao(null) }

  function abrirRelacionado(slug: string) {
    limparFiltros()
    selecionar({ tipo: 'sistema', id: slug })
  }

  return <div className="space-y-5">
    {modo !== 'explorar' && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { nome: 'Sistemas no ecossistema', valor: sistemas.length, icone: Network },
        { nome: 'Sistemas internos', valor: sistemas.filter(s => s.kind !== 'external').length, icone: Building2 },
        { nome: 'Áreas de atuação', valor: areas.length, icone: Layers3 },
        { nome: 'Vínculos cadastrados', valor: conexoes.length, icone: GitBranch },
      ].map(({ nome, valor, icone: Icone }) => <div key={nome} className="flex flex-col justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-800 sm:p-5"><div className="flex items-center justify-between gap-3"><span className="text-[12px] leading-snug text-ink-500 dark:text-ink-400">{nome}</span><Icone size={17} className="shrink-0 text-brand-500" aria-hidden /></div><span className="text-[28px] font-semibold leading-none tracking-tight text-ink-900 dark:text-ink-50">{valor}</span></div>)}
    </div>}

    <section aria-label="Explorar sistemas" className="rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-800">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[200px] flex-1"><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-ink-400" aria-hidden /><span className="sr-only">Buscar sistema ou tarefa</span><input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Busque um sistema ou uma tarefa…" className="h-11 w-full rounded-xl border border-ink-200 bg-ink-50 pl-10 pr-3 text-sm text-ink-900 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white" /></label>
        <div className="flex rounded-xl bg-ink-100 p-1 dark:bg-ink-900" aria-label="Visualização">
          <button type="button" aria-pressed={modo === 'explorar'} onClick={() => setModo('explorar')} className={`${controle} ${modo === 'explorar' ? 'bg-white text-brand-600 shadow-sm dark:bg-ink-700 dark:text-brand-300' : 'text-ink-500 dark:text-ink-400'}`}><Compass size={16} aria-hidden />Explorar</button>
          <button type="button" aria-pressed={modo === 'mapa'} onClick={() => setModo('mapa')} className={`${controle} ${modo === 'mapa' ? 'bg-white text-brand-600 shadow-sm dark:bg-ink-700 dark:text-brand-300' : 'text-ink-500 dark:text-ink-400'}`}><Network size={16} aria-hidden />Mapa</button>
          <button type="button" aria-pressed={modo === 'lista'} onClick={() => setModo('lista')} className={`${controle} ${modo === 'lista' ? 'bg-white text-brand-600 shadow-sm dark:bg-ink-700 dark:text-brand-300' : 'text-ink-500 dark:text-ink-400'}`}><List size={16} aria-hidden />Lista</button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={15} className="mr-1 hidden text-ink-400 sm:block" aria-hidden />
        {filtros.map(filtro => <div key={filtro.id} className="-mt-1.5 min-w-0 flex-[1_1_170px] sm:w-[180px] sm:flex-none"><span id={filtro.id} className="sr-only">{filtro.label}</span><Selecao rotuloId={filtro.id} valor={filtro.valor} onChange={filtro.mudar} opcoes={filtro.opcoes} buscavel={filtro.buscavel} /></div>)}
        <label className="flex min-h-10 cursor-pointer items-center gap-2 px-1 text-[12px] text-ink-600 dark:text-ink-300"><input type="checkbox" checked={somenteConectados} onChange={e => setSomenteConectados(e.target.checked)} className="accent-brand-500" />Com vínculos</label>
        {temFiltros && <button type="button" onClick={limparFiltros} className={`${controle} text-brand-600 dark:text-brand-400`}><X size={14} aria-hidden />Limpar</button>}
      </div>
    </section>

    {modo === 'explorar' ? <ExploradorSistemas sistemas={visiveis} conexoes={conexoesVisiveis} totalSistemas={sistemas.length} selecionado={sistemaSelecionado?.slug} selecionar={slug => setSelecao({ tipo: 'sistema', id: slug })} limparFiltros={limparFiltros} temFiltros={temFiltros} admin={admin} /> : <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 overflow-hidden rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-800">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-200 px-5 py-4 dark:border-ink-700"><h2 className="text-sm font-semibold text-ink-800 dark:text-ink-100">{modo === 'mapa' ? 'Mapa do ecossistema' : 'Catálogo de sistemas'}</h2><p aria-live="polite" className="text-xs text-ink-500 dark:text-ink-400">{visiveis.length} de {sistemas.length} sistemas · {conexoesVisiveis.length} vínculos</p></div>
        {visiveis.length === 0 ? <div className="px-6 py-20 text-center"><Search size={30} className="mx-auto text-ink-300" aria-hidden /><h3 className="mt-4 font-semibold text-ink-800 dark:text-ink-100">{sistemas.length ? 'Nenhum sistema encontrado' : 'O ecossistema está em preparação'}</h3><p className="mt-2 text-sm text-ink-500 dark:text-ink-400">{sistemas.length ? 'Experimente outro termo ou remova os filtros.' : 'Os sistemas aparecerão aqui quando forem cadastrados.'}</p>{temFiltros && <button type="button" onClick={limparFiltros} className={`${controle} mt-4 text-brand-600 dark:text-brand-400`}>Limpar filtros</button>}</div>
          : modo === 'mapa' ? <Mapa sistemas={visiveis} conexoes={conexoesVisiveis} selecao={selecaoVisivel} selecionar={selecionar} />
            : <div className="grid gap-3 p-4 sm:grid-cols-2">{visiveis.map(s => <button type="button" key={s.slug} aria-pressed={sistemaSelecionado?.slug === s.slug} onClick={() => selecionar({ tipo: 'sistema', id: s.slug })} className={`group rounded-xl border p-4 text-left transition hover:border-brand-400 ${sistemaSelecionado?.slug === s.slug ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/10' : 'border-ink-200 dark:border-ink-700'}`}><div className="flex items-center gap-3"><Marca sistema={s} pequena /><div className="min-w-0"><h3 className="break-words text-sm font-semibold text-ink-900 dark:text-ink-50">{s.name}</h3><p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{perfilDoSistema(s).area}</p></div><ChevronRight size={16} className="ml-auto shrink-0 text-ink-400 group-hover:text-brand-500" aria-hidden /></div><p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">{s.description}</p><p className="mt-4 text-[11px] text-ink-400">{s.kind === 'external' ? 'Terceiros' : 'equipe'} · {conexoes.filter(c => c.origemSlug === s.slug || c.destinoSlug === s.slug).length} vínculos</p></button>)}</div>}
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-ink-200 px-5 py-3 dark:border-ink-700" aria-label="Legenda dos vínculos">{Object.entries(TIPOS_VINCULO).map(([tipo, dados]) => <span key={tipo} title={dados.explicacao} className="inline-flex items-center gap-2 text-[11px] text-ink-500 dark:text-ink-400"><span className="w-5 border-t-2" style={{ borderColor: dados.cor, borderStyle: tipo === 'PROCESSO' ? 'dashed' : 'solid' }} aria-hidden />{dados.nome}</span>)}</div>
      </div>

      <aside ref={painel} tabIndex={-1} aria-label="Detalhes do ecossistema" className="min-w-0 scroll-mt-20 rounded-2xl border border-ink-200 bg-white p-5 outline-none dark:border-ink-800 dark:bg-ink-800 2xl:sticky 2xl:top-6">
        {(sistemaSelecionado || conexaoSelecionada) && <button type="button" onClick={() => setSelecao(null)} className="mb-5 flex min-h-9 items-center gap-2 text-xs text-ink-500 hover:text-brand-600 dark:text-ink-400"><X size={14} aria-hidden />Fechar detalhes</button>}
        {sistemaSelecionado ? <DetalhesSistema sistema={sistemaSelecionado} sistemas={sistemas} conexoes={conexoes} abrirRelacionado={abrirRelacionado} selecionarConexao={id => { setTipoVinculo(''); setArea(''); setOrigem(''); setBusca(''); selecionar({ tipo: 'conexao', id }) }} admin={admin} />
          : conexaoSelecionada ? <DetalhesConexao conexao={conexaoSelecionada} sistemas={sistemas} selecionar={abrirRelacionado} />
            : <><div className="mb-5 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><MousePointer2 size={24} aria-hidden /></div><h2 className="text-lg font-semibold text-ink-900 dark:text-ink-50">Explore os sistemas</h2><p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">Selecione um sistema para conhecer suas funções, consultar os manuais e descobrir seus vínculos.</p><div className="mt-6 space-y-4">{[{ icone: Search, texto: 'Busque pelo nome ou pela tarefa que precisa fazer.' }, { icone: Network, texto: 'Selecione uma linha para entender a relação entre dois sistemas.' }, { icone: BookOpen, texto: 'Acesse os manuais pelo painel de cada sistema.' }].map(({ icone: Icone, texto }) => <div key={texto} className="flex gap-3"><Icone size={17} className="mt-0.5 shrink-0 text-brand-500" aria-hidden /><p className="text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">{texto}</p></div>)}</div>{conexoes.length === 0 && <div className="mt-6 rounded-xl bg-ink-50 p-4 dark:bg-ink-900"><p className="text-[13px] font-medium text-ink-700 dark:text-ink-200">Vínculos ainda não cadastrados</p><p className="mt-1.5 text-xs leading-relaxed text-ink-500 dark:text-ink-400">Os sistemas já podem ser explorados. As conexões aparecerão quando forem cadastradas pela equipe responsável.</p>{admin && <Link href="/admin/sistemas" className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400">Cadastrar vínculos <ArrowUpRight size={14} aria-hidden /></Link>}</div>}</>}
      </aside>
    </div>}
  </div>
}

function Mapa({ sistemas, conexoes, selecao, selecionar }: { sistemas: SistemaEcossistema[]; conexoes: ConexaoEcossistema[]; selecao: Selecao; selecionar: (valor: Selecao) => void }) {
  const assinatura = sistemas.map(s => `${s.slug}:${perfilDoSistema(s).area}`).join('|')
  const mapa = useMemo(() => organizarMapa(sistemas), [sistemas])
  const container = useRef<HTMLDivElement>(null)
  const [tamanho, setTamanho] = useState({ largura: 900, altura: 520 })
  const [vista, setVista] = useState({ zoom: 1, x: 0, y: 0 })
  const [arrastando, setArrastando] = useState(false)
  const arrasto = useRef<{ pointerId: number; x: number; y: number; inicioX: number; inicioY: number } | null>(null)
  const id = useId().replace(/:/g, '')
  const zoomAjustado = Math.min((tamanho.largura - 24) / mapa.largura, (tamanho.altura - 30) / mapa.altura, 1.15)
  const ajuste = { zoom: zoomAjustado, x: (tamanho.largura - mapa.largura * zoomAjustado) / 2, y: (tamanho.altura - mapa.altura * zoomAjustado) / 2 }

  useEffect(() => {
    const elemento = container.current
    if (!elemento) return
    const observer = new ResizeObserver(([entrada]) => setTamanho({ largura: entrada.contentRect.width, altura: entrada.contentRect.height }))
    observer.observe(elemento)
    return () => observer.disconnect()
  }, [])

  useEffect(() => { setVista(ajuste) }, [assinatura, tamanho.largura, tamanho.altura]) // eslint-disable-line react-hooks/exhaustive-deps

  function mudarZoom(fator: number) {
    setVista(atual => {
      const zoom = Math.min(2, Math.max(0.2, atual.zoom * fator))
      return { zoom, x: tamanho.largura / 2 - (tamanho.largura / 2 - atual.x) * zoom / atual.zoom, y: tamanho.altura / 2 - (tamanho.altura / 2 - atual.y) * zoom / atual.zoom }
    })
  }

  const vizinhos = new Set<string>()
  if (selecao?.tipo === 'sistema') {
    vizinhos.add(selecao.id)
    conexoes.filter(c => c.origemSlug === selecao.id || c.destinoSlug === selecao.id).forEach(c => { vizinhos.add(c.origemSlug); vizinhos.add(c.destinoSlug) })
  } else if (selecao?.tipo === 'conexao') {
    const conexao = conexoes.find(c => c.id === selecao.id)
    if (conexao) { vizinhos.add(conexao.origemSlug); vizinhos.add(conexao.destinoSlug) }
  }

  const dica = <p className="text-[11px] leading-relaxed text-ink-500 dark:text-ink-400">Arraste o fundo para mover. Use + e − para ampliar.</p>
  return <>
    <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-2 dark:border-ink-700/60">{dica}<div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => mudarZoom(1 / 1.2)} aria-label="Reduzir mapa" className="grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-700"><Minus size={16} /></button><span className="w-10 text-center text-[11px] tabular-nums text-ink-400">{Math.round(vista.zoom * 100)}%</span><button type="button" onClick={() => mudarZoom(1.2)} aria-label="Ampliar mapa" className="grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-700"><Plus size={16} /></button><button type="button" onClick={() => setVista(ajuste)} aria-label="Ajustar mapa à tela" className="grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-700"><Maximize2 size={16} /></button></div></div>
    <div ref={container} role="group" aria-label="Mapa interativo dos sistemas. Selecione um sistema ou vínculo para abrir seus detalhes." className={`dot-grid relative h-[520px] overflow-hidden bg-ink-50/70 dark:bg-ink-900/40 ${arrastando ? 'cursor-grabbing' : 'cursor-grab'}`} style={{ touchAction: 'none' }}
      onPointerDown={e => { if (e.button !== 0 || arrasto.current || (e.target as Element).closest('button, [role="button"]')) return; arrasto.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, inicioX: vista.x, inicioY: vista.y }; e.currentTarget.setPointerCapture(e.pointerId); setArrastando(true) }}
      onPointerMove={e => { const inicio = arrasto.current; if (inicio && inicio.pointerId === e.pointerId) setVista(v => ({ ...v, x: inicio.inicioX + e.clientX - inicio.x, y: inicio.inicioY + e.clientY - inicio.y })) }}
      onPointerUp={e => { if (arrasto.current?.pointerId !== e.pointerId) return; arrasto.current = null; setArrastando(false); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) }}
      onPointerCancel={() => { arrasto.current = null; setArrastando(false) }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: mapa.largura, height: mapa.altura, transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.zoom})` }}>
        {mapa.areas.map(area => <div key={area.nome} className="pointer-events-none absolute rounded-2xl border border-ink-200/70 bg-white/50 dark:border-ink-700/60 dark:bg-ink-800/30" style={{ left: area.x, top: area.y, width: 276, height: area.altura }}><p className="truncate px-4 pt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">{area.nome}</p></div>)}
        <svg width={mapa.largura} height={mapa.altura} className="pointer-events-none absolute inset-0 overflow-visible" aria-label="Vínculos entre sistemas">
          <defs>{Object.entries(TIPOS_VINCULO).map(([tipo, dados]) => <marker key={tipo} id={`${id}-${tipo}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={dados.cor} /></marker>)}</defs>
          {conexoes.map(c => {
            const inicio = mapa.posicoes.get(c.origemSlug)
            const fim = mapa.posicoes.get(c.destinoSlug)
            if (!inicio || !fim) return null
            const pares = conexoes.filter(outro => [outro.origemSlug, outro.destinoSlug].sort().join(':') === [c.origemSlug, c.destinoSlug].sort().join(':'))
            const caminho = caminhoEntreNos(inicio, fim, (pares.findIndex(p => p.id === c.id) - (pares.length - 1) / 2) * 22)
            const ativo = selecao?.tipo === 'conexao' ? selecao.id === c.id : selecao?.tipo === 'sistema' ? c.origemSlug === selecao.id || c.destinoSlug === selecao.id : true
            const nomeOrigem = sistemas.find(s => s.slug === c.origemSlug)?.name
            const nomeDestino = sistemas.find(s => s.slug === c.destinoSlug)?.name
            return <g key={c.id} className="vinculo-mapa pointer-events-auto cursor-pointer" role="button" tabIndex={0} aria-pressed={selecao?.tipo === 'conexao' && selecao.id === c.id} aria-label={`${TIPOS_VINCULO[c.tipo].nome}: ${nomeOrigem} ${c.direcao === 'AMBOS' ? 'e' : 'para'} ${nomeDestino}. ${c.descricao}`} onClick={() => selecionar({ tipo: 'conexao', id: c.id })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selecionar({ tipo: 'conexao', id: c.id }) } }}>
              <path d={caminho.d} fill="none" stroke="transparent" strokeWidth={20} />
              <path d={caminho.d} fill="none" stroke={TIPOS_VINCULO[c.tipo].cor} strokeWidth={ativo ? 2.5 : 1.5} opacity={ativo ? 1 : 0.2} strokeDasharray={c.tipo === 'PROCESSO' ? '6 5' : undefined} markerEnd={`url(#${id}-${c.tipo})`} markerStart={c.direcao === 'AMBOS' ? `url(#${id}-${c.tipo})` : undefined} />
              <circle cx={caminho.x} cy={caminho.y} r={11} fill={TIPOS_VINCULO[c.tipo].cor} opacity={ativo ? 1 : 0.3} /><text x={caminho.x} y={caminho.y + 4} textAnchor="middle" fontSize="13" fill="white" aria-hidden>i</text>
              <title>{`${TIPOS_VINCULO[c.tipo].nome}: ${c.descricao}`}</title>
            </g>
          })}
        </svg>
        {sistemas.map(s => {
          const posicao = mapa.posicoes.get(s.slug)!
          const selecionado = selecao?.tipo === 'sistema' && selecao.id === s.slug
          const apagado = vizinhos.size > 0 && !vizinhos.has(s.slug)
          const total = conexoes.filter(c => c.origemSlug === s.slug || c.destinoSlug === s.slug).length
          return <button type="button" key={s.slug} aria-pressed={selecionado} onClick={() => selecionar({ tipo: 'sistema', id: s.slug })} onFocus={() => { if (!container.current) return; const esquerda = vista.x + posicao.x * vista.zoom; const topo = vista.y + posicao.y * vista.zoom; if (esquerda < 0 || topo < 0 || esquerda + LARGURA_NO * vista.zoom > tamanho.largura || topo + ALTURA_NO * vista.zoom > tamanho.altura) setVista(v => ({ ...v, x: tamanho.largura / 2 - (posicao.x + LARGURA_NO / 2) * v.zoom, y: tamanho.altura / 2 - (posicao.y + ALTURA_NO / 2) * v.zoom })) }} className={`absolute cursor-pointer rounded-xl border bg-white p-3.5 text-left shadow-sm transition-[opacity,box-shadow,border-color] hover:border-brand-400 hover:shadow-md dark:bg-ink-800 ${selecionado ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-ink-200 dark:border-ink-600'} ${apagado ? 'opacity-40 hover:opacity-100 focus:opacity-100' : ''}`} style={{ left: posicao.x, top: posicao.y, width: LARGURA_NO, height: ALTURA_NO }}>
            <span className="flex items-center gap-3"><Marca sistema={s} pequena /><span className="min-w-0"><span className="block truncate text-[14px] font-semibold text-ink-900 dark:text-ink-50">{s.name}</span><span className="mt-1 block text-[10px] text-ink-500 dark:text-ink-400">{s.kind === 'external' ? 'Sistema de terceiros' : 'Sistema interno'}</span></span></span>
            <span className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2.5 text-[10px] dark:border-ink-700"><span className="flex items-center gap-1 text-ink-400"><GitBranch size={12} aria-hidden />{total} {total === 1 ? 'vínculo' : 'vínculos'}</span><span className="inline-flex items-center gap-1 font-medium text-brand-600 dark:text-brand-400">Explorar <ArrowUpRight size={12} aria-hidden /></span></span>
          </button>
        })}
      </div>
    </div>
    <p className="border-t border-ink-100 px-4 py-3 text-[11px] text-ink-400 dark:border-ink-700/60">No celular, use a visualização em lista para explorar com mais espaço.</p>
  </>
}

function DetalhesSistema({ sistema, sistemas, conexoes, abrirRelacionado, selecionarConexao, admin }: { sistema: SistemaEcossistema; sistemas: SistemaEcossistema[]; conexoes: ConexaoEcossistema[]; abrirRelacionado: (slug: string) => void; selecionarConexao: (id: string) => void; admin: boolean }) {
  const perfil = perfilDoSistema(sistema)
  const relacionados = conexoes.filter(c => c.origemSlug === sistema.slug || c.destinoSlug === sistema.slug)
  return <>
    <div className="flex items-center gap-3"><Marca sistema={sistema} /><div className="min-w-0"><p className="text-[11px] text-brand-600 dark:text-brand-400">{perfil.area}</p><h2 className="mt-1 break-words text-lg font-semibold leading-snug text-ink-900 dark:text-ink-50">{sistema.name}</h2></div></div>
    <p className="mt-4 text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">{sistema.longDescription || sistema.description}</p>
    <div className="mt-4 flex flex-wrap gap-1.5"><span className="rounded-md bg-ink-100 px-2 py-1 text-[10px] text-ink-600 dark:bg-ink-700 dark:text-ink-300">{sistema.kind === 'external' ? 'Sistema de terceiros' : 'Sistema interno'}</span>{sistema.tags.map(tag => <span key={tag} className="rounded-md bg-brand-50 px-2 py-1 text-[10px] text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{tag}</span>)}</div>
    {perfil.funcionalidades.length > 0 && <section className="mt-6"><h3 className="text-[13px] font-semibold text-ink-800 dark:text-ink-100">O que você pode fazer</h3><ul className="mt-3 space-y-2.5">{perfil.funcionalidades.map((funcao, i) => <li key={`${i}-${funcao}`} className="flex gap-2 text-[13px] leading-relaxed text-ink-500 dark:text-ink-400"><Check size={15} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />{funcao}</li>)}</ul></section>}
    {(perfil.quemUsa || perfil.responsavel) && <dl className="mt-5 space-y-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-900">{perfil.quemUsa && <div><dt className="flex items-center gap-1.5 text-[11px] text-ink-400"><Users size={13} aria-hidden />Quem usa</dt><dd className="mt-1 text-[13px] text-ink-700 dark:text-ink-200">{perfil.quemUsa}</dd></div>}{perfil.responsavel && <div><dt className="text-[11px] text-ink-400">Equipe responsável</dt><dd className="mt-1 text-[13px] text-ink-700 dark:text-ink-200">{perfil.responsavel}</dd></div>}</dl>}
    <div className="mt-6 grid gap-2">{urlExternaValida(sistema.url) && <a href={sistema.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 px-3 text-sm font-semibold text-white transition hover:bg-brand-600">Acessar sistema <ArrowUpRight size={16} aria-hidden /><span className="sr-only">(abre em nova aba)</span></a>}<Link href={`/documentacao/${sistema.slug}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 px-3 text-[13px] font-medium text-ink-700 transition hover:border-brand-400 dark:border-ink-700 dark:text-ink-200"><BookOpen size={16} aria-hidden />Ver manuais <span className="text-xs text-ink-400">({sistema.totalManuais})</span></Link></div>
    <section className="mt-6 border-t border-ink-200 pt-5 dark:border-ink-700"><h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink-800 dark:text-ink-100"><GitBranch size={16} aria-hidden />Vínculos com outros sistemas</h3>{relacionados.length ? <div className="mt-3 space-y-3">{relacionados.map(c => {
      const outro = sistemas.find(s => s.slug === (c.origemSlug === sistema.slug ? c.destinoSlug : c.origemSlug))!
      return <div key={c.id} className="rounded-xl border border-ink-200 p-3 dark:border-ink-700"><button type="button" onClick={() => abrirRelacionado(outro.slug)} className="flex min-h-8 w-full items-center justify-between gap-2 text-left text-[13px] font-semibold text-ink-800 hover:text-brand-600 dark:text-ink-100">{outro.name}<ArrowUpRight size={14} className="shrink-0" aria-hidden /></button><p className="mt-1 text-[10px]" style={{ color: TIPOS_VINCULO[c.tipo].cor }}>{TIPOS_VINCULO[c.tipo].nome} · {c.direcao === 'AMBOS' ? 'Nos dois sentidos' : c.origemSlug === sistema.slug ? c.tipo === 'DEPENDENCIA' ? 'Este sistema depende do outro' : 'Deste sistema para o outro' : c.tipo === 'DEPENDENCIA' ? 'O outro sistema depende deste' : 'Do outro sistema para este'}</p><p className="mt-2 text-xs leading-relaxed text-ink-500 dark:text-ink-400">{c.descricao}</p><button type="button" onClick={() => selecionarConexao(c.id)} className="mt-2 min-h-9 text-xs font-medium text-brand-600 dark:text-brand-400">Explorar vínculo</button></div>
    })}</div> : <p className="mt-2 text-xs leading-relaxed text-ink-500 dark:text-ink-400">Nenhum vínculo cadastrado para este sistema.</p>}</section>
    {admin && <Link href="/admin/sistemas" className="mt-4 inline-flex min-h-10 items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">Editar informações e vínculos <ArrowUpRight size={14} aria-hidden /></Link>}
  </>
}

function DetalhesConexao({ conexao, sistemas, selecionar }: { conexao: ConexaoEcossistema; sistemas: SistemaEcossistema[]; selecionar: (slug: string) => void }) {
  const origem = sistemas.find(s => s.slug === conexao.origemSlug)!
  const destino = sistemas.find(s => s.slug === conexao.destinoSlug)!
  const tipo = TIPOS_VINCULO[conexao.tipo]
  return <><div className="grid size-12 place-items-center rounded-2xl" style={{ color: tipo.cor, backgroundColor: `${tipo.cor}15` }}><GitBranch size={24} aria-hidden /></div><p className="mt-4 text-xs font-medium" style={{ color: tipo.cor }}>{tipo.nome}</p><h2 className="mt-2 text-lg font-semibold text-ink-900 dark:text-ink-50">Como os sistemas se relacionam</h2><div className="mt-5 space-y-2"><button type="button" onClick={() => selecionar(origem.slug)} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-ink-200 p-3 text-left text-sm font-semibold text-ink-800 hover:border-brand-400 dark:border-ink-700 dark:text-ink-100"><Marca sistema={origem} pequena />{origem.name}<ArrowUpRight size={14} className="ml-auto shrink-0" aria-hidden /></button><div className="flex items-center justify-center gap-2 py-1 text-[11px] text-ink-400">{conexao.direcao === 'AMBOS' ? <ArrowDownUp size={15} aria-hidden /> : <ArrowRight size={15} className="rotate-90" aria-hidden />}{conexao.direcao === 'AMBOS' ? 'Nos dois sentidos' : conexao.tipo === 'DEPENDENCIA' ? 'Depende de' : 'Origem → destino'}</div><button type="button" onClick={() => selecionar(destino.slug)} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-ink-200 p-3 text-left text-sm font-semibold text-ink-800 hover:border-brand-400 dark:border-ink-700 dark:text-ink-100"><Marca sistema={destino} pequena />{destino.name}<ArrowUpRight size={14} className="ml-auto shrink-0" aria-hidden /></button></div><h3 className="mt-6 text-[13px] font-semibold text-ink-800 dark:text-ink-100">O que este vínculo representa</h3><p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">{conexao.descricao}</p><p className="mt-5 rounded-xl bg-ink-50 p-3 text-xs leading-relaxed text-ink-500 dark:bg-ink-900 dark:text-ink-400">{tipo.explicacao}</p></>
}
