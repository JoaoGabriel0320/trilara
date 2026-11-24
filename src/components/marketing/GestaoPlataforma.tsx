import Link from 'next/link'
import { ArrowRight, BookOpenCheck, Settings2, UsersRound } from 'lucide-react'
import { SITE_PUBLICO } from '@/lib/recursos'

const capacidades = [
  {
    icone: UsersRound,
    titulo: 'Usuários e permissões',
    texto: 'Crie contas, analise solicitações de acesso e defina o papel de cada pessoa.',
  },
  {
    icone: BookOpenCheck,
    titulo: 'Manuais sob seu controle',
    texto: 'Crie páginas e guias passo a passo, edite o conteúdo e publique quando estiver pronto.',
  },
  {
    icone: Settings2,
    titulo: 'Catálogo organizado',
    texto: 'Cadastre sistemas, atualize informações e organize os documentos em seções.',
  },
]

export function GestaoPlataforma() {
  return <section aria-labelledby="gestao-titulo" className="px-5 py-20 sm:px-8 lg:py-28">
    <div className="mx-auto max-w-7xl">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#087D72]">Gestão da plataforma</p>
        <h2 id="gestao-titulo" className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">O conteúdo e os acessos ficam nas suas mãos.</h2>
        <p className="mt-5 text-base leading-relaxed text-[#47616A]">Além de consultar informações, você administra quem usa a Trilara e mantém a documentação atualizada no próprio sistema.</p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {capacidades.map(({ icone: Icone, titulo, texto }) => <article key={titulo} className="rounded-2xl border border-[#D7E5E2] bg-white p-6 shadow-[0_15px_35px_-30px_rgba(11,23,36,0.45)]">
          <span className="grid size-11 place-items-center rounded-xl bg-[#E6F7F2] text-[#087D72]"><Icone size={22} aria-hidden="true" /></span>
          <h3 className="mt-6 text-lg font-semibold">{titulo}</h3>
          <p className="mt-3 text-sm leading-relaxed text-[#607A7B]">{texto}</p>
        </article>)}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-[#B8DAD3] bg-[#EAF8F4] p-5 sm:p-6">
        <p className="max-w-2xl text-sm leading-relaxed text-[#47616A]">A prévia pública mostra os fluxos principais. Outras opções aparecem apenas para quem acessa o sistema, de acordo com suas permissões.</p>
        {SITE_PUBLICO
          ? <a href="#explorar" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#0B1724] px-5 text-sm font-semibold text-white transition hover:bg-[#0B8B80]">Explorar a demonstração <ArrowRight size={16} aria-hidden="true" /></a>
          : <Link href="/login" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#0B1724] px-5 text-sm font-semibold text-white transition hover:bg-[#0B8B80]">Já tem acesso? Entrar <ArrowRight size={16} aria-hidden="true" /></Link>}
      </div>
    </div>
  </section>
}
