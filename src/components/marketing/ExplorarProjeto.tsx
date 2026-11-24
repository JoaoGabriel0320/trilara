'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpenText, Boxes, ChevronRight, CircleHelp, FileText, LayoutGrid, ListOrdered, Search } from 'lucide-react'

type Tela = 'inicio' | 'biblioteca' | 'pagina' | 'guia'

const telas: { id: Tela; numero: string; nome: string; resumo: string }[] = [
  { id: 'inicio', numero: '01', nome: 'Visão geral', resumo: 'Encontre sistemas e conteúdo em um painel.' },
  { id: 'biblioteca', numero: '02', nome: 'Documentação', resumo: 'Veja os manuais agrupados por assunto.' },
  { id: 'pagina', numero: '03', nome: 'Página', resumo: 'Leia a orientação com contexto e links.' },
  { id: 'guia', numero: '04', nome: 'Passo a passo', resumo: 'Acompanhe uma tarefa do início ao fim.' },
]

const sistemas = [
  { letra: 'P', nome: 'Portal de clientes', detalhe: 'Solicitações e atualizações', cor: 'bg-[#DFF7F2] text-[#087D72]' },
  { letra: 'A', nome: 'Agenda de operações', detalhe: 'Compromissos e horários', cor: 'bg-[#E6EEFF] text-[#4665A4]' },
  { letra: 'F', nome: 'Gestão financeira', detalhe: 'Lançamentos e relatórios', cor: 'bg-[#FFE9ED] text-[#AD5369]' },
  { letra: 'E', nome: 'Controle de estoque', detalhe: 'Itens e movimentações', cor: 'bg-[#FFF2DC] text-[#A46F27]' },
]

const documentos = [
  { titulo: 'Comece por aqui: Portal de clientes', tipo: 'Página', secao: 'Primeiros passos' },
  { titulo: 'Como acompanhar uma solicitação', tipo: 'Passo a passo', secao: 'Operação diária' },
  { titulo: 'Entenda os status das solicitações', tipo: 'Página', secao: 'Referência' },
]

const passos = [
  { titulo: 'Abra a lista de solicitações', caminho: 'Portal de clientes > Solicitações', texto: 'Entre no Portal de clientes e escolha Solicitações. Os registros mais recentes aparecem primeiro.' },
  { titulo: 'Encontre o registro', caminho: 'Solicitações > Busca', texto: 'Pesquise pelo assunto “Troca de endereço” ou pela referência fictícia SOL-1042.' },
  { titulo: 'Leia o histórico', caminho: 'Solicitação > Atualizações', texto: 'Percorra as atualizações em ordem e observe quando cada mensagem foi adicionada.' },
  { titulo: 'Confira o status', caminho: 'Solicitação > Situação', texto: 'Veja se o registro está Aberto, Em análise ou Concluído e identifique a próxima ação.' },
]

const botaoPequeno = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B8B80]'

export function ExplorarProjeto() {
  const [tela, setTela] = useState<Tela>('inicio')
  const [passo, setPasso] = useState(0)
  const [busca, setBusca] = useState('')
  const indice = telas.findIndex(item => item.id === tela)
  const encontrados = documentos.filter(item => `${item.titulo} ${item.secao} ${item.tipo}`.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR').trim()))

  function escolherTela(proxima: Tela) {
    setTela(proxima)
    if (proxima === 'guia') setPasso(0)
  }

  return <section id="explorar" aria-labelledby="explorar-titulo" className="scroll-mt-8 bg-[#EEF6F4] px-5 py-20 text-[#0B1724] sm:px-8 lg:py-28">
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#087D72]">Explore sem criar uma conta</p>
          <h2 id="explorar-titulo" className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Veja como a Trilara funciona.</h2>
          <p className="mt-5 text-base leading-relaxed text-[#47616A]">Passe pelas telas de demonstração, leia uma página e acompanhe um guia passo a passo com dados fictícios.</p>
        </div>
        <span className="rounded-full border border-[#B8DAD3] bg-white px-4 py-2 text-xs font-semibold text-[#087D72]">Prévia interativa · dados fictícios</span>
      </div>

      <div role="tablist" aria-label="Telas da demonstração" className="mt-10 flex gap-3 overflow-x-auto pb-2">
        {telas.map(item => <button key={item.id} id={`aba-${item.id}`} type="button" role="tab" aria-selected={tela === item.id} aria-controls="painel-explorar" onClick={() => escolherTela(item.id)} className={`min-w-[180px] flex-1 rounded-2xl border px-5 py-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B8B80] ${tela === item.id ? 'border-[#0B8B80] bg-[#0B1724] text-white shadow-lg' : 'border-[#CFE2DD] bg-white text-[#0B1724] hover:border-[#0B8B80]'}`}>
          <span className={`text-[11px] font-bold tracking-[0.16em] ${tela === item.id ? 'text-[#5CE0CC]' : 'text-[#087D72]'}`}>{item.numero} / {item.nome}</span>
          <span className={`mt-2 block text-xs leading-relaxed ${tela === item.id ? 'text-[#C7D7D5]' : 'text-[#607A7B]'}`}>{item.resumo}</span>
        </button>)}
      </div>

      <div id="painel-explorar" role="tabpanel" aria-labelledby={`aba-${tela}`} className="mt-5 overflow-hidden rounded-[26px] border border-[#C7DBD6] bg-white shadow-[0_30px_90px_-45px_rgba(11,23,36,0.45)]">
        <div className="flex items-center gap-2 border-b border-[#E2ECE9] bg-[#F9FCFB] px-4 py-3 sm:px-5">
          <span className="size-2.5 rounded-full bg-[#EFB28F]" /><span className="size-2.5 rounded-full bg-[#E8D89C]" /><span className="size-2.5 rounded-full bg-[#8ED4C6]" />
          <span className="mx-auto max-w-[55%] truncate rounded-lg border border-[#E2ECE9] bg-white px-4 py-1.5 text-center text-[11px] text-[#607A7B]">trilara / {tela === 'inicio' ? 'início' : tela === 'biblioteca' ? 'documentação / portal de clientes' : tela === 'pagina' ? 'documentação / página' : 'documentação / guia'}</span>
          <span className="hidden text-[11px] font-semibold text-[#087D72] sm:block">DEMONSTRAÇÃO</span>
        </div>
        <div className="grid min-h-[570px] grid-cols-1 md:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="hidden bg-[#0B1724] p-5 text-white md:block">
            <div className="mb-10 flex items-center gap-2 text-xl font-semibold tracking-tight"><span className="grid size-8 place-items-center rounded-lg bg-[#5CE0CC] text-[#0B1724]">T</span> trilara</div>
            <nav aria-label="Navegação da prévia" className="space-y-1 text-sm">
              <button type="button" onClick={() => escolherTela('inicio')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${tela === 'inicio' ? 'bg-white/12 text-white' : 'text-[#A7BFBD] hover:bg-white/10'}`}><LayoutGrid size={17} /> Início</button>
              <button type="button" onClick={() => escolherTela('biblioteca')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${tela !== 'inicio' ? 'bg-white/12 text-white' : 'text-[#A7BFBD] hover:bg-white/10'}`}><BookOpenText size={17} /> Documentação</button>
              <div className="px-3 pt-6 text-[10px] font-bold uppercase tracking-[0.15em] text-[#7D9997]">Sistemas</div>
              <button type="button" onClick={() => escolherTela('biblioteca')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[#A7BFBD] transition hover:bg-white/10"><Boxes size={17} /> Portal de clientes</button>
            </nav>
            <p className="mt-36 border-t border-white/10 pt-5 text-xs leading-relaxed text-[#8FA9A7]">Ambiente ilustrativo com conteúdo inventado para apresentação.</p>
          </aside>

          <div className="min-w-0 bg-[#F4F9F8] p-5 sm:p-7 lg:p-10">
            {tela === 'inicio' && <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#087D72]">Trilara · Início</p>
              <h3 className="mt-2 text-[27px] font-semibold tracking-tight sm:text-[32px]">Bom dia, Visitante</h3>
              <p className="mt-2 text-sm text-[#607A7B]">Seus manuais, sistemas e procedimentos em um só lugar.</p>
              <button type="button" onClick={() => escolherTela('biblioteca')} className="mt-7 flex min-h-14 w-full items-center gap-3 rounded-xl border border-[#CFE2DD] bg-white px-4 text-left text-sm text-[#7A9693] shadow-sm transition hover:border-[#0B8B80]"><Search size={18} /> Buscar guias, sistemas ou processos... <ArrowRight size={17} className="ml-auto" /></button>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[{ valor: '05', rotulo: 'Sistemas de exemplo', icone: Boxes }, { valor: '11', rotulo: 'Documentos fictícios', icone: FileText }, { valor: '05', rotulo: 'Guias passo a passo', icone: ListOrdered }].map(({ valor, rotulo, icone: Icone }) => <div key={rotulo} className="rounded-xl border border-[#E2ECE9] bg-white p-4"><Icone size={18} className="text-[#0B8B80]" /><p className="mt-3 text-2xl font-semibold">{valor}</p><p className="text-xs text-[#607A7B]">{rotulo}</p></div>)}
              </div>
              <div className="mt-7 flex items-center justify-between"><h4 className="text-sm font-semibold">Sistemas disponíveis</h4><button type="button" onClick={() => escolherTela('biblioteca')} className="text-xs font-semibold text-[#087D72] hover:underline">Ver documentação <ArrowRight size={13} className="inline" /></button></div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">{sistemas.slice(0, 2).map(item => <button key={item.nome} type="button" onClick={() => escolherTela('biblioteca')} className="flex items-center gap-3 rounded-xl border border-[#E2ECE9] bg-white p-4 text-left transition hover:border-[#0B8B80]"><span className={`grid size-10 shrink-0 place-items-center rounded-lg font-bold ${item.cor}`}>{item.letra}</span><span><span className="block text-sm font-semibold">{item.nome}</span><span className="mt-1 block text-xs text-[#607A7B]">{item.detalhe}</span></span><ChevronRight size={16} className="ml-auto text-[#91AAA7]" /></button>)}</div>
            </div>}

            {tela === 'biblioteca' && <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#087D72]">Central de documentação</p>
              <h3 className="mt-2 text-[27px] font-semibold tracking-tight sm:text-[32px]">Portal de clientes</h3>
              <p className="mt-2 text-sm text-[#607A7B]">Guias e páginas para entender um portal de solicitações fictício.</p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[#E6F7F2] px-3 py-1.5 font-semibold text-[#087D72]">1 guia passo a passo</span><span className="rounded-full bg-white px-3 py-1.5 text-[#607A7B]">2 páginas</span></div>
              <label className="mt-7 flex min-h-12 items-center gap-3 rounded-xl border border-[#CFE2DD] bg-white px-4 focus-within:border-[#0B8B80]"><Search size={17} className="text-[#607A7B]" /><span className="sr-only">Buscar nos documentos de demonstração</span><input type="search" value={busca} onChange={event => setBusca(event.target.value)} placeholder="Buscar nos guias. Ex.: solicitação" className="w-full bg-transparent text-sm outline-none placeholder:text-[#8AA2A0]" /></label>
              <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.16em] text-[#087D72]">Comece por aqui</p>
              {encontrados.some(item => item.secao === 'Primeiros passos') && <button type="button" onClick={() => escolherTela('pagina')} className="mt-3 flex w-full items-center gap-4 rounded-xl border border-[#CFE2DD] bg-white p-4 text-left transition hover:border-[#0B8B80]"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#E6F7F2] text-[#087D72]"><BookOpenText size={19} /></span><span><span className="block text-sm font-semibold">Comece por aqui: Portal de clientes</span><span className="mt-1 block text-xs text-[#607A7B]">Conheça solicitações, status e arquivos.</span></span><ArrowRight size={17} className="ml-auto shrink-0 text-[#087D72]" /></button>}
              <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.16em] text-[#087D72]">Documentos do sistema</p>
              <div className="mt-3 space-y-2">{encontrados.map(item => <button key={item.titulo} type="button" onClick={() => escolherTela(item.tipo === 'Página' ? 'pagina' : 'guia')} className="flex w-full items-center gap-3 rounded-xl border border-[#E2ECE9] bg-white p-4 text-left transition hover:border-[#0B8B80]"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#F2F7F6] text-[#087D72]">{item.tipo === 'Página' ? <FileText size={18} /> : <ListOrdered size={18} />}</span><span className="min-w-0"><span className="block text-sm font-semibold">{item.titulo}</span><span className="mt-1 block text-xs text-[#607A7B]">{item.secao} · {item.tipo}</span></span><ArrowRight size={16} className="ml-auto shrink-0 text-[#91AAA7]" /></button>)}</div>
              {encontrados.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-[#CFE2DD] bg-white p-5 text-sm text-[#607A7B]">Nenhum documento encontrado. Tente “solicitação”.</p>}
            </div>}

            {tela === 'pagina' && <div>
              <button type="button" onClick={() => escolherTela('biblioteca')} className="inline-flex items-center gap-2 text-xs font-semibold text-[#087D72] hover:underline"><ArrowLeft size={14} /> Portal de clientes</button>
              <article className="mt-5 rounded-2xl border border-[#E2ECE9] bg-white p-5 sm:p-8">
                <div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#E6F7F2] px-3 py-1 text-xs font-semibold text-[#087D72]">Página</span><span className="rounded-full bg-[#F2F7F6] px-3 py-1 text-xs text-[#607A7B]">Primeiros passos</span></div>
                <h3 className="mt-4 text-[25px] font-semibold tracking-tight sm:text-[30px]">Comece por aqui: Portal de clientes</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#607A7B]">Conheça a organização das solicitações, os status e os arquivos do portal de demonstração.</p>
                <div className="mt-6 rounded-xl border-l-4 border-[#0B8B80] bg-[#E9F8F4] px-4 py-3 text-sm text-[#47616A]">Exemplo fictício para demonstração da Trilara. Nenhum registro representa uma operação real.</div>
                <h4 className="mt-7 text-lg font-semibold">Para que serve</h4>
                <p className="mt-2 text-sm leading-relaxed text-[#47616A]">O Portal de clientes reúne pedidos de atendimento em um só lugar. Neste cenário, a empresa fictícia Aurora Ateliê usa o portal para acompanhar dúvidas sobre seus pedidos.</p>
                <h4 className="mt-6 text-lg font-semibold">O que você encontra</h4>
                <ul className="mt-3 space-y-2 text-sm text-[#47616A]"><li>• Solicitações com assunto, referência e situação.</li><li>• Arquivos enviados durante o atendimento.</li><li>• Atualizações organizadas em ordem cronológica.</li></ul>
                <button type="button" onClick={() => escolherTela('guia')} className="mt-8 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0B8B80] px-4 text-xs font-semibold text-white transition hover:bg-[#076C64]">Ver um passo a passo <ArrowRight size={15} /></button>
              </article>
            </div>}

            {tela === 'guia' && <div>
              <button type="button" onClick={() => escolherTela('biblioteca')} className="inline-flex items-center gap-2 text-xs font-semibold text-[#087D72] hover:underline"><ArrowLeft size={14} /> Portal de clientes</button>
              <div className="mt-5 rounded-2xl border border-[#E2ECE9] bg-white p-5 sm:p-7">
                <div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#E6F7F2] px-3 py-1 text-xs font-semibold text-[#087D72]">Passo a passo</span><span className="rounded-full bg-[#F2F7F6] px-3 py-1 text-xs text-[#607A7B]">Operação diária</span></div>
                <h3 className="mt-4 text-[25px] font-semibold tracking-tight sm:text-[30px]">Como acompanhar uma solicitação</h3>
                <p className="mt-2 text-sm text-[#607A7B]">Guia de demonstração para localizar uma solicitação e entender seu andamento.</p>
                <p className="mt-4 text-xs font-medium text-[#087D72]">{passos.length} passos · Conteúdo fictício</p>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-[#E2ECE9] bg-white p-4"><p className="text-xs font-semibold">Neste guia</p><div className="mt-4 h-1.5 rounded-full bg-[#E6F2EF]"><div className="h-full rounded-full bg-[#0B8B80] transition-all" style={{ width: `${(passo + 1) / passos.length * 100}%` }} /></div><div className="mt-3 space-y-1">{passos.map((item, index) => <button key={item.titulo} type="button" onClick={() => setPasso(index)} aria-current={passo === index ? 'step' : undefined} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${passo === index ? 'bg-[#E6F7F2] font-semibold text-[#087D72]' : 'text-[#607A7B] hover:bg-[#F4F9F8]'}`}><span className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] ${passo === index ? 'bg-[#0B8B80] text-white' : 'bg-[#E6F2EF]'}`}>{index + 1}</span>{item.titulo}</button>)}</div></div>
                <div className="rounded-2xl border border-[#E2ECE9] bg-white p-5 sm:p-7"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#087D72]">Passo {passo + 1} de {passos.length}</p><h4 className="mt-3 text-xl font-semibold">{passos[passo].titulo}</h4><p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#F2F7F6] px-3 py-2 text-xs text-[#47616A]"><ChevronRight size={14} /> {passos[passo].caminho}</p><p className="mt-5 text-sm leading-relaxed text-[#47616A]">{passos[passo].texto}</p><div className="mt-8 flex flex-wrap gap-2"><button type="button" onClick={() => setPasso(Math.max(0, passo - 1))} disabled={passo === 0} className={`${botaoPequeno} border border-[#CFE2DD] text-[#47616A] disabled:cursor-not-allowed disabled:opacity-40`}><ArrowLeft size={15} /> Anterior</button><button type="button" onClick={() => setPasso(Math.min(passos.length - 1, passo + 1))} disabled={passo === passos.length - 1} className={`${botaoPequeno} bg-[#0B8B80] text-white disabled:cursor-not-allowed disabled:opacity-40`}>Próximo passo <ArrowRight size={15} /></button></div></div>
              </div>
            </div>}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-sm text-[#47616A]"><p className="flex items-center gap-2"><CircleHelp size={17} className="text-[#087D72]" /> Esta prévia mostra o formato e a navegação. Os registros são fictícios.</p><div className="flex gap-2"><button type="button" onClick={() => escolherTela(telas[Math.max(0, indice - 1)].id)} disabled={indice === 0} aria-label="Tela anterior" className={`${botaoPequeno} border border-[#CFE2DD] bg-white disabled:opacity-40`}><ArrowLeft size={16} /></button><button type="button" onClick={() => escolherTela(telas[Math.min(telas.length - 1, indice + 1)].id)} disabled={indice === telas.length - 1} aria-label="Próxima tela" className={`${botaoPequeno} border border-[#CFE2DD] bg-white disabled:opacity-40`}><ArrowRight size={16} /></button></div></div>
    </div>
  </section>
}
