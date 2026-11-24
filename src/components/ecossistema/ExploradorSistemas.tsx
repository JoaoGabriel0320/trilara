'use client'

import Link from 'next/link'
import { useId, useRef, useState, type CSSProperties } from 'react'
import { ArrowLeftRight, ArrowRight, ArrowUpRight, BookOpen, Building2, Check, ChevronLeft, ChevronRight, Compass, GitBranch, Layers3, Network, Search, Users } from 'lucide-react'
import { iconeDoSistema } from '@/components/portal/PlacaSistema'
import { TIPOS_VINCULO, perfilDoSistema, type ConexaoEcossistema, type SistemaEcossistema } from '@/lib/ecossistema'
import { urlExternaValida } from '@/lib/url-externa'
import styles from './ExploradorSistemas.module.css'

const CORES: Record<string, string> = { brand: '#7c3aff', blue: '#2563eb', amber: '#c46b08', rose: '#dc3c69', green: '#168649', teal: '#0d9488' }

function identidade(sistema: SistemaEcossistema): CSSProperties {
  return { '--sistema-cor': CORES[sistema.color] ?? CORES.brand } as CSSProperties
}

function Simbolo({ sistema, grande = false }: { sistema: SistemaEcossistema; grande?: boolean }) {
  const Icone = iconeDoSistema(sistema.slug)
  return <span className={`${styles.simbolo} ${grande ? styles.simboloGrande : ''}`} style={identidade(sistema)} aria-hidden="true"><Icone size={grande ? 36 : 23} strokeWidth={1.6} /></span>
}

type Props = {
  sistemas: SistemaEcossistema[]
  conexoes: ConexaoEcossistema[]
  totalSistemas: number
  selecionado?: string
  selecionar: (slug: string) => void
  limparFiltros: () => void
  temFiltros: boolean
  admin: boolean
}

export function ExploradorSistemas({ sistemas, conexoes, totalSistemas, selecionado, selecionar, limparFiltros, temFiltros, admin }: Props) {
  const titulo = useRef<HTMLHeadingElement>(null)
  const ativo = sistemas.find(s => s.slug === selecionado) ?? sistemas[0]

  function explorar(slug: string) {
    selecionar(slug)
    requestAnimationFrame(() => titulo.current?.focus({ preventScroll: true }))
  }

  if (!ativo) return <section className={styles.vazio} aria-live="polite">
    <Search size={32} aria-hidden="true" />
    <h2>{totalSistemas ? 'Nenhum sistema encontrado' : 'O ecossistema está em preparação'}</h2>
    <p>{totalSistemas ? 'Experimente outra tarefa ou remova os filtros para explorar a operação.' : 'Os sistemas aparecerão aqui quando forem cadastrados.'}</p>
    {temFiltros && <button type="button" className={styles.acaoSecundaria} onClick={limparFiltros}>Limpar filtros</button>}
    {!totalSistemas && admin && <Link className={styles.acaoSecundaria} href="/admin/sistemas">Cadastrar sistemas <ArrowUpRight size={15} aria-hidden="true" /></Link>}
  </section>

  const perfil = perfilDoSistema(ativo)
  const relacionados = conexoes.filter(c => c.origemSlug === ativo.slug || c.destinoSlug === ativo.slug)
  const areas = new Set(sistemas.map(s => perfilDoSistema(s).area)).size
  const internos = sistemas.filter(s => s.kind !== 'external').length

  return <div className={styles.explorador}>
    <div className={styles.resumo} aria-live="polite">
      <span><Network size={15} aria-hidden="true" /><strong>{sistemas.length}</strong> {temFiltros ? `de ${totalSistemas} sistemas` : 'sistemas para explorar'}</span>
      <span><Building2 size={15} aria-hidden="true" /><strong>{internos}</strong> internos</span>
      <span><Layers3 size={15} aria-hidden="true" /><strong>{areas}</strong> {areas === 1 ? 'área' : 'áreas'}</span>
      <span><GitBranch size={15} aria-hidden="true" /><strong>{conexoes.length}</strong> {conexoes.length === 1 ? 'vínculo cadastrado' : 'vínculos cadastrados'}</span>
    </div>

    <section className={styles.palco} style={identidade(ativo)} aria-label="Exploração visual dos sistemas">
      <div className={styles.apresentacao}>
        <p className={styles.rotulo}><Compass size={14} aria-hidden="true" /> Explore a operação</p>
        <div key={ativo.slug} className={styles.entrada}>
          <Simbolo sistema={ativo} grande />
          <p className={styles.area}>{perfil.area}</p>
          <h2 ref={titulo} tabIndex={-1} className={styles.nome}>{ativo.name}</h2>
          <p className={styles.descricao}>{ativo.description}</p>
          <span className={styles.origem}><Building2 size={13} aria-hidden="true" />{ativo.kind === 'external' ? 'Sistema de terceiros' : 'Sistema interno'}</span>
          <div className={styles.acoes}>
            {urlExternaValida(ativo.url) && <a href={ativo.url} target="_blank" rel="noopener noreferrer" className={styles.acaoPrimaria}>Acessar sistema <ArrowUpRight size={17} aria-hidden="true" /><span className="sr-only">(abre em nova aba)</span></a>}
            <Link href={`/documentacao/${ativo.slug}`} className={styles.acaoSecundaria}><BookOpen size={16} aria-hidden="true" />Ver manuais <span className={styles.contagem}>{ativo.totalManuais}</span></Link>
          </div>
        </div>
        <p className={styles.dica}>Escolha um sistema ao lado para conhecer seu papel na operação.</p>
      </div>

      <Orbita key={`${ativo.slug}:${sistemas.map(s => s.slug).join(',')}`} ativo={ativo} sistemas={sistemas} conexoes={relacionados} selecionar={explorar} />
    </section>

    <div className={styles.informacoes}>
      <section className={styles.funcionalidades} aria-labelledby="funcoes-explorador">
        <div className={styles.cabecalhoSecao}><div><p className={styles.rotulo}>No dia a dia</p><h3 id="funcoes-explorador">O que você pode fazer</h3></div><span className={styles.etiqueta} style={identidade(ativo)}>{ativo.name}</span></div>
        {perfil.funcionalidades.length ? <ul className={styles.listaFuncoes}>{perfil.funcionalidades.map((funcao, i) => <li key={`${ativo.slug}:${i}`} style={identidade(ativo)}><span className={styles.numero}>{String(i + 1).padStart(2, '0')}</span><span>{funcao}</span><Check size={16} className={styles.check} aria-hidden="true" /></li>)}</ul> : <p className={styles.textoVazio}>As funcionalidades deste sistema ainda não foram detalhadas.</p>}
        {(perfil.quemUsa || perfil.responsavel) && <dl className={styles.pessoas}>{perfil.quemUsa && <div><dt><Users size={14} aria-hidden="true" />Quem usa</dt><dd>{perfil.quemUsa}</dd></div>}{perfil.responsavel && <div><dt><Building2 size={14} aria-hidden="true" />Equipe responsável</dt><dd>{perfil.responsavel}</dd></div>}</dl>}
        {admin && <Link href="/admin/sistemas" className={styles.editar}>Editar informações do sistema <ArrowUpRight size={14} aria-hidden="true" /></Link>}
      </section>

      <section className={styles.relacoes} aria-labelledby="conexoes-explorador">
        <div className={styles.cabecalhoSecao}><div><p className={styles.rotulo}>Trabalham em conjunto</p><h3 id="conexoes-explorador">Conexões de {ativo.name}</h3></div><span className={styles.totalRelacoes}>{relacionados.length}</span></div>
        {relacionados.length ? <div className={styles.listaRelacoes}>{relacionados.map(c => <Relacao key={c.id} conexao={c} sistemas={sistemas} ativo={ativo.slug} selecionar={explorar} />)}</div> : <div className={styles.semVinculos}><GitBranch size={27} aria-hidden="true" /><p>Nenhum vínculo cadastrado</p><span>As conexões aparecem aqui quando a equipe registra uma relação com outro sistema.</span>{admin && <Link href="/admin/sistemas" className={styles.editar}>Cadastrar vínculo <ArrowUpRight size={14} aria-hidden="true" /></Link>}</div>}
      </section>
    </div>
  </div>
}

function Orbita({ ativo, sistemas, conexoes, selecionar }: { ativo: SistemaEcossistema; sistemas: SistemaEcossistema[]; conexoes: ConexaoEcossistema[]; selecionar: (slug: string) => void }) {
  const id = useId().replace(/:/g, '')
  const [pagina, setPagina] = useState(0)
  const outros = sistemas.filter(s => s.slug !== ativo.slug)
  const paginas = Math.ceil(outros.length / 6)
  const exibidos = outros.slice(pagina * 6, pagina * 6 + 6)
  const conectados = new Set(conexoes.flatMap(c => [c.origemSlug, c.destinoSlug]))
  const posicoes = exibidos.map((s, i) => {
    const angulo = (exibidos.length <= 2 ? i * 180 : -90 + i * 360 / exibidos.length) * Math.PI / 180
    return { sistema: s, x: 50 + 34 * Math.cos(angulo), y: 50 + 35 * Math.sin(angulo) }
  })

  return <div className={styles.universo}>
    <div className={styles.cabecalhoOrbita}><span><span className={styles.ponto} />Sistemas da equipe</span><span>{conexoes.length} {conexoes.length === 1 ? 'conexão neste sistema' : 'conexões neste sistema'}</span></div>
    <div className={styles.orbita}>
      <svg className={styles.tracos} viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="500" cy="300" rx="340" ry="210" className={styles.anel} />
        <ellipse cx="500" cy="300" rx="220" ry="135" className={styles.anelInterno} />
        <defs>{Object.entries(TIPOS_VINCULO).map(([tipo, dados]) => <marker key={tipo} id={`${id}-${tipo}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={dados.cor} /></marker>)}</defs>
        {posicoes.flatMap(({ sistema, x, y }) => {
          const ligacoes = conexoes.filter(c => c.origemSlug === sistema.slug || c.destinoSlug === sistema.slug)
          return ligacoes.map((c, i) => {
            // As linhas representam somente relações cadastradas. Os anéis são a organização visual.
            const dx = x * 10 - 500
            const dy = y * 6 - 300
            const inverso = c.origemSlug !== ativo.slug
            const inicio = { x: 500 + dx * .32, y: 300 + dy * .32 }
            const fim = { x: 500 + dx * .79, y: 300 + dy * .79 }
            const origem = inverso ? fim : inicio
            const destino = inverso ? inicio : fim
            const deslocamento = (i - (ligacoes.length - 1) / 2) * 24
            const d = `M ${origem.x} ${origem.y} Q ${(origem.x + destino.x) / 2 - dy / 210 * deslocamento} ${(origem.y + destino.y) / 2 + dx / 340 * deslocamento} ${destino.x} ${destino.y}`
            return <path key={c.id} d={d} fill="none" stroke={TIPOS_VINCULO[c.tipo].cor} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray={c.tipo === 'PROCESSO' ? '5 5' : undefined} markerEnd={`url(#${id}-${c.tipo})`} markerStart={c.direcao === 'AMBOS' ? `url(#${id}-${c.tipo})` : undefined} />
          })
        })}
      </svg>
      <div className={styles.centro} style={identidade(ativo)}><span className={styles.halo} /><Simbolo sistema={ativo} grande /><strong>{ativo.name}</strong><span>Você está explorando</span></div>
      {posicoes.map(({ sistema, x, y }) => <button type="button" key={sistema.slug} className={`${styles.satelite} ${conectados.has(sistema.slug) ? styles.sateliteConectado : ''}`} style={{ ...identidade(sistema), left: `${x}%`, top: `${y}%` }} onClick={() => selecionar(sistema.slug)} aria-label={`Explorar ${sistema.name}${conectados.has(sistema.slug) ? ', com vínculo com ' + ativo.name : ''}`}>
        <Simbolo sistema={sistema} /><strong>{sistema.name}</strong><span>{perfilDoSistema(sistema).area}</span><span className={styles.abrirSatelite}>{conectados.has(sistema.slug) ? <><GitBranch size={11} aria-hidden="true" />Com vínculo</> : <>Explorar<ArrowUpRight size={11} aria-hidden="true" /></>}</span>
      </button>)}
      {outros.length === 0 && <p className={styles.unicoSistema}>Este é o sistema disponível na seleção atual.</p>}
    </div>

    <div className={styles.seletorMobile} aria-label="Escolher sistema">{sistemas.map(s => <button key={s.slug} type="button" aria-pressed={s.slug === ativo.slug} style={identidade(s)} onClick={() => selecionar(s.slug)}><Simbolo sistema={s} /><span><strong>{s.name}</strong><span>{perfilDoSistema(s).area}</span></span>{s.slug === ativo.slug && <Check size={16} aria-hidden="true" />}</button>)}</div>

    <div className={styles.rodapeOrbita}><span><span className={styles.amostraLinha} />Linhas mostram vínculos cadastrados</span>{paginas > 1 ? <div className={styles.paginacao}><button type="button" aria-label="Sistemas anteriores" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}><ChevronLeft size={16} /></button><span>{pagina + 1} / {paginas}</span><button type="button" aria-label="Próximos sistemas" disabled={pagina + 1 === paginas} onClick={() => setPagina(p => p + 1)}><ChevronRight size={16} /></button></div> : <span className={styles.instrucaoOrbita}>Clique em um sistema para explorar <ArrowUpRight size={13} aria-hidden="true" /></span>}</div>
  </div>
}

function Relacao({ conexao, sistemas, ativo, selecionar }: { conexao: ConexaoEcossistema; sistemas: SistemaEcossistema[]; ativo: string; selecionar: (slug: string) => void }) {
  const origem = sistemas.find(s => s.slug === conexao.origemSlug)!
  const destino = sistemas.find(s => s.slug === conexao.destinoSlug)!
  const outro = origem.slug === ativo ? destino : origem
  const tipo = TIPOS_VINCULO[conexao.tipo]
  return <article className={styles.relacao} style={{ '--vinculo-cor': tipo.cor } as CSSProperties}>
    <div className={styles.tipoRelacao}><GitBranch size={13} aria-hidden="true" />{tipo.nome}<span>{conexao.direcao === 'AMBOS' ? 'Nos dois sentidos' : conexao.tipo === 'DEPENDENCIA' ? 'Depende de' : 'Origem → destino'}</span></div>
    <div className={styles.fluxo}><span><Simbolo sistema={origem} /><strong>{origem.name}</strong></span>{conexao.direcao === 'AMBOS' ? <ArrowLeftRight size={21} aria-label="Nos dois sentidos" /> : <ArrowRight size={21} aria-label={conexao.tipo === 'DEPENDENCIA' ? 'Depende de' : 'Para'} />}<span><Simbolo sistema={destino} /><strong>{destino.name}</strong></span></div>
    <p>{conexao.descricao}</p>
    <button type="button" onClick={() => selecionar(outro.slug)} className={styles.editar}>Conhecer {outro.name} <ArrowUpRight size={14} aria-hidden="true" /></button>
  </article>
}
