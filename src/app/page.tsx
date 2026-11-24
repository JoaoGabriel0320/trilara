import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpenText, Boxes, FileText, Network, Search, ShieldCheck } from 'lucide-react'
import { ExplorarProjeto } from '@/components/marketing/ExplorarProjeto'
import { GestaoPlataforma } from '@/components/marketing/GestaoPlataforma'
import { SITE_PUBLICO } from '@/lib/recursos'

export const metadata: Metadata = {
  title: 'Trilara | Conhecimento conectado',
  description: 'Organize sistemas e documentação, crie manuais e gerencie usuários e permissões em um único lugar.',
  openGraph: { title: 'Trilara | Conhecimento conectado', description: 'Uma plataforma para conectar sistemas, pessoas e conhecimento.', type: 'website' },
}

const recursos = [
  { icone: Boxes, titulo: 'Catálogo de sistemas', texto: 'Uma visão clara das ferramentas, seus responsáveis e o que cada uma resolve.' },
  { icone: BookOpenText, titulo: 'Documentação acessível', texto: 'Guias, artigos e procedimentos organizados para encontrar respostas com rapidez.' },
  { icone: Network, titulo: 'Mapa de conexões', texto: 'Explore as relações entre ferramentas e entenda o fluxo de informação.' },
  { icone: Search, titulo: 'Busca nos conteúdos', texto: 'Pesquise guias e documentos para encontrar o procedimento que você precisa.' },
]

const documentos = [
  { titulo: 'Comece por aqui: Portal de clientes', tipo: 'Página', cor: 'bg-[#D7F5ED] text-[#076B60]' },
  { titulo: 'Como acompanhar uma solicitação', tipo: 'Guia', cor: 'bg-[#E6EAF8] text-[#4758A8]' },
  { titulo: 'Como registrar uma entrada de exemplo', tipo: 'Guia', cor: 'bg-[#FFF0E4] text-[#9A5933]' },
]

export default function HomePage() {
  return <main className="min-h-screen overflow-hidden bg-[#F5FAF9] text-[#0B1724]">
    <div className="relative isolate">
      <div aria-hidden className="pointer-events-none absolute -right-32 -top-52 -z-10 h-[520px] w-[700px] rounded-full bg-[#BDEDE3]/60 blur-[100px]" />
      <div aria-hidden className="pointer-events-none absolute -left-64 top-[400px] -z-10 h-[500px] w-[600px] rounded-full bg-[#FCE9DB]/70 blur-[100px]" />
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" aria-label="Trilara, página inicial"><Image src="/brand/trilara-logo-light.svg" alt="Trilara" width={150} height={40} priority className="h-10 w-auto" /></Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-[#47616A] md:flex" aria-label="Navegação principal"><a href="#explorar" className="hover:text-[#0B8B80]">Produto</a><a href="#recursos" className="hover:text-[#0B8B80]">Recursos</a><a href="#sobre" className="hover:text-[#0B8B80]">Sobre o projeto</a></nav>
        {SITE_PUBLICO
          ? <a href="#explorar" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#D7E5E2] bg-white px-4 text-sm font-semibold hover:border-[#0B8B80] sm:px-5">Ver demonstração <ArrowRight size={16} aria-hidden /></a>
          : <Link href="/login" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#D7E5E2] bg-white px-4 text-sm font-semibold hover:border-[#0B8B80] sm:px-5">Entrar <ArrowRight size={16} aria-hidden /></Link>}
      </header>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:px-10 lg:pb-28 lg:pt-24">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#A9E7DA] bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0B7068]"><span className="size-2 rounded-full bg-[#12AA99]" /> Plataforma de conhecimento</span>
          <h1 className="mt-7 text-[clamp(3.25rem,6vw,5.9rem)] font-semibold leading-[0.98] tracking-[-0.065em]">Conhecimento que <span className="text-[#0B8B80]">se conecta.</span></h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-[#47616A]">A Trilara reúne sistemas, documentos e pessoas em uma experiência simples de explorar. Crie manuais, gerencie acessos e encontre o que você precisa em um só lugar.</p>
          <div className="mt-9 flex flex-wrap gap-3"><a href="#explorar" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#0B1724] px-6 text-sm font-semibold text-white hover:bg-[#0B8B80]">Explorar o projeto <ArrowRight size={17} aria-hidden /></a><a href="#sobre" className="inline-flex min-h-12 items-center rounded-full border border-[#B8CBC8] px-6 text-sm font-semibold hover:bg-white">Conhecer a ideia</a></div>
          <p className="mt-8 flex items-center gap-2 text-xs text-[#607A7B]"><ShieldCheck size={16} aria-hidden /> Visualização ilustrativa com dados fictícios.</p>
        </div>
        <div id="produto" className="relative scroll-mt-20">
          <div aria-hidden className="absolute -inset-4 rotate-[-2deg] rounded-[36px] border border-[#B8CBC8]/60 bg-white/25" />
          <div className="relative overflow-hidden rounded-[28px] border border-[#D7E5E2] bg-white shadow-[0_35px_90px_-45px_rgba(11,23,36,0.36)]">
            <div className="flex items-center gap-2 border-b border-[#EAF2F0] px-5 py-4"><span className="size-2.5 rounded-full bg-[#F6B786]" /><span className="size-2.5 rounded-full bg-[#D7E5E2]" /><span className="size-2.5 rounded-full bg-[#A9E7DA]" /><span className="ml-auto rounded-full bg-[#F5FAF9] px-3 py-1 text-[10px] font-medium text-[#607A7B]">Visão ilustrativa</span></div>
            <div className="grid min-h-[480px] grid-cols-[76px_1fr] sm:grid-cols-[150px_1fr]">
              <aside className="flex flex-col gap-3 bg-[#0B1724] px-3 py-6 text-white sm:px-4"><Image src="/brand/trilara-mark.svg" alt="" width={32} height={32} className="mb-6 size-8" /><span className="flex items-center gap-2 rounded-lg bg-white/10 p-2 text-xs"><Boxes size={16} /> <span className="hidden sm:inline">Visão geral</span></span><span className="flex items-center gap-2 p-2 text-xs text-[#A7BFBD]"><BookOpenText size={16} /> <span className="hidden sm:inline">Documentos</span></span><span className="flex items-center gap-2 p-2 text-xs text-[#A7BFBD]"><Network size={16} /> <span className="hidden sm:inline">Conexões</span></span></aside>
              <div className="min-w-0 p-5 sm:p-7"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B8B80]">Painel de conhecimento</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[29px]">Tudo em seu lugar.</h2><p className="mt-2 text-xs text-[#607A7B] sm:text-sm">Encontre o caminho certo para cada informação.</p><div className="mt-6 flex items-center gap-2 rounded-xl border border-[#D7E5E2] bg-[#F8FBFA] px-4 py-3 text-xs text-[#839E9C] sm:text-sm"><Search size={17} /> Buscar guias, sistemas ou processos...</div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#E9FAF6] p-4"><Boxes className="text-[#0B8B80]" size={19} /><p className="mt-3 text-2xl font-semibold">05</p><p className="text-[11px] text-[#47616A]">Sistemas de exemplo</p></div><div className="rounded-2xl bg-[#FFF0E4] p-4"><FileText className="text-[#B76A43]" size={19} /><p className="mt-3 text-2xl font-semibold">11</p><p className="text-[11px] text-[#7A6254]">Documentos fictícios</p></div></div><div className="mt-6 flex items-center justify-between"><h3 className="text-xs font-semibold sm:text-sm">Conteúdo recente</h3><span className="text-[11px] font-medium text-[#0B8B80]">Prévia</span></div><div className="mt-3 space-y-2">{documentos.map(item => <div key={item.titulo} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#EAF2F0] px-3 py-2.5"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.cor}`}><FileText size={15} /></span><span className="min-w-0 flex-1 truncate text-[11px] font-medium sm:text-xs">{item.titulo}</span><span className="hidden text-[10px] text-[#839E9C] sm:inline">{item.tipo}</span></div>)}</div></div>
            </div>
          </div>
        </div>
      </section>
    </div>
    <ExplorarProjeto />
    <GestaoPlataforma />
    <section id="recursos" className="scroll-mt-14 bg-[#0B1724] px-5 py-20 text-white sm:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5CE0CC]">O que a Trilara faz</p><h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">De informação solta a conhecimento útil.</h2><p className="mt-5 leading-relaxed text-[#A7BFBD]">Uma experiência pensada para tornar processos e ferramentas mais fáceis de entender e usar.</p></div><div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{recursos.map(({ icone: Icone, titulo, texto }, indice) => <article key={titulo} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"><div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl bg-[#5CE0CC]/10 text-[#5CE0CC]"><Icone size={22} /></span><span className="text-xs text-[#607A7B]">0{indice + 1}</span></div><h3 className="mt-8 text-lg font-semibold">{titulo}</h3><p className="mt-3 text-sm leading-relaxed text-[#A7BFBD]">{texto}</p></article>)}</div></div></section>
    <section id="sobre" className="scroll-mt-14 px-5 py-20 sm:px-8 lg:py-28"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0B8B80]">Sobre o projeto</p><h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Feito para aprender, evoluir e compartilhar.</h2></div><div><p className="text-lg leading-relaxed text-[#47616A]">A Trilara nasceu de uma ideia: criar um espaço em que a documentação tenha contexto, os sistemas tenham relações claras e as respostas sejam fáceis de encontrar.</p><p className="mt-5 text-sm leading-relaxed text-[#607A7B]">Esta página apresenta o conceito com conteúdo fictício. O produto está em desenvolvimento e as áreas privadas exigem uma conta.</p></div></div></section>
    <footer className="border-t border-[#D7E5E2] px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><Image src="/brand/trilara-logo-light.svg" alt="Trilara" width={120} height={32} className="h-8 w-auto" /><span className="text-xs text-[#607A7B]">Conhecimento conectado</span></div></footer>
  </main>
}
