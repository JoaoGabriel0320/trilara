'use client'

// src/components/ui/dashboard-sidebar.tsx
//
// Navegação lateral em grupos: rótulo de seção, item com ícone, contador e
// atalho, e subitens que abrem no lugar com uma guia vertical ligando filho e
// pai. O componente é genérico — quem monta a árvore é o consumidor (ver
// AppShell), aqui não há nenhuma rota escrita à mão.
//
// Três decisões que não se leem no tipo:
// - A cor sai de ink-*/brand-*, não dos tokens semânticos do shadcn
//   (bg-card, text-muted-foreground, border-border): este projeto não os
//   define, e a sidebar é um painel escuro nos dois temas.
// - Item com href E filhos separa os dois gestos: o rótulo navega, a seta
//   abre. Fundir os dois deixaria /documentacao inalcançável pelo menu.
// - Em modo mini a sublista não abre — não há largura pra ela. O item vira só
//   o link do próprio href e os filhos voltam quando a sidebar expande.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export type ItemNav = {
  id: string
  titulo: string
  icone: React.ElementType
  href?: string
  /** Contador à direita (documentos do sistema, pendências…). 0 não pinta. */
  badge?: number | string
  /** Dica de atalho; aparece só no hover. Quem registra a tecla é o consumidor. */
  atalho?: string
  aoClicar?: () => void
  filhos?: ItemNav[]
}

export type GrupoNav = {
  /** Sem título o grupo é só um bloco espaçado — usado no topo da lista. */
  titulo?: string
  itens: ItemNav[]
}

/** Casa rota exata ou subárvore: /documentacao casa com /documentacao/portal-de-clientes. */
function casaRota(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

function todosHrefs(itens: ItemNav[]): string[] {
  return itens.flatMap((i) => [...(i.href && !i.href.includes('#') ? [i.href] : []), ...todosHrefs(i.filhos ?? [])])
}

/**
 * Só UM href fica ativo: o mais específico que casa. Sem isso /admin acende
 * junto com /admin/usuarios, já que um é prefixo do outro. Hrefs com âncora
 * (#buscar) são atalhos, não páginas, e nunca ficam ativos.
 */
function hrefMaisEspecifico(pathname: string, grupos: GrupoNav[]): string | undefined {
  return todosHrefs(grupos.flatMap((g) => g.itens))
    .filter((h) => casaRota(pathname, h))
    .sort((a, b) => b.length - a.length)[0]
}

function algumFilhoAtivo(hrefAtivo: string | undefined, item: ItemNav): boolean {
  return !!item.filhos?.some((f) => f.href === hrefAtivo || algumFilhoAtivo(hrefAtivo, f))
}

function Item({
  item,
  mini,
  hrefAtivo,
  nivel = 0,
}: {
  item: ItemNav
  mini: boolean
  hrefAtivo?: string
  nivel?: number
}) {
  const temFilhos = !!item.filhos?.length && !mini
  const filhoAtivo = algumFilhoAtivo(hrefAtivo, item)
  const ativo = !!item.href && item.href === hrefAtivo

  const [aberto, setAberto] = useState(filhoAtivo)

  // Chegou num filho por outro caminho (busca, breadcrumb): a sublista precisa
  // aparecer aberta, senão o item ativo fica escondido.
  useEffect(() => {
    if (filhoAtivo) setAberto(true)
  }, [filhoAtivo])

  const Icone = item.icone

  // Realce discreto pro pai fechado que contém a rota atual — a pessoa continua
  // vendo onde está mesmo com a sublista recolhida.
  const realce = ativo || (temFilhos && filhoAtivo && !aberto)

  const classesLinha = cn(
    'group relative flex w-full items-center gap-2.5 rounded-lg py-[7px] pr-2 text-[13px] transition',
    mini ? 'justify-center px-0' : 'px-3',
    realce ? 'bg-brand-500/15 font-medium text-white' : 'text-ink-400 hover:bg-white/5 hover:text-ink-100'
  )

  const conteudo = (
    <>
      {ativo && !mini && nivel === 0 && (
        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-brand-500" />
      )}
      <Icone
        className={cn(
          'h-4 w-4 shrink-0 transition',
          realce ? (nivel > 0 ? 'text-ink-200' : 'text-brand-400') : 'text-ink-500 group-hover:text-ink-300'
        )}
        strokeWidth={1.7}
      />
      {!mini && (
        <>
          <span className="min-w-0 flex-1 truncate text-left">{item.titulo}</span>
          {item.atalho && (
            <kbd className="rotulo hidden shrink-0 items-center rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] tracking-normal text-ink-500 group-hover:inline-flex">
              {item.atalho}
            </kbd>
          )}
          {!!item.badge && (
            <span className="rotulo shrink-0 text-ink-600 group-hover:text-ink-500">{item.badge}</span>
          )}
          {/* Sem href a linha inteira é o botão de abrir, então a seta mora
              dentro dela. Com href ela vira um alvo separado (ver abaixo). */}
          {temFilhos && !item.href && (
            <ChevronRight
              aria-hidden="true"
              className={cn('h-3.5 w-3.5 shrink-0 text-ink-600 transition-transform duration-200', aberto && 'rotate-90')}
              strokeWidth={2}
            />
          )}
        </>
      )}
    </>
  )

  // Item com filhos e sem href não vai a lugar nenhum: a linha inteira é o
  // botão de abrir. Com href, o rótulo navega e só a seta abre.
  const linha = item.href ? (
    <Link href={item.href} title={mini ? item.titulo : undefined} className={classesLinha}>
      {conteudo}
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => (temFilhos ? setAberto((v) => !v) : item.aoClicar?.())}
      title={mini ? item.titulo : undefined}
      aria-expanded={temFilhos ? aberto : undefined}
      className={classesLinha}
    >
      {conteudo}
    </button>
  )

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        {linha}
        {temFilhos && item.href && (
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-label={(aberto ? 'Recolher ' : 'Expandir ') + item.titulo}
            aria-expanded={aberto}
            className="ml-0.5 grid h-7 w-6 shrink-0 place-items-center rounded-md text-ink-600 transition hover:bg-white/5 hover:text-ink-300"
          >
            <ChevronRight
              className={cn('h-3.5 w-3.5 transition-transform duration-200', aberto && 'rotate-90')}
              strokeWidth={2}
            />
          </button>
        )}
      </div>

      {temFilhos && (
        // grid-rows 0fr→1fr anima a altura sem medir o conteúdo em JS.
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
            aberto ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          )}
        >
          <div className="relative mt-0.5 flex min-h-0 flex-col gap-0.5 overflow-hidden">
            <span
              aria-hidden="true"
              className="absolute inset-y-0 border-l border-white/10"
              style={{ left: `${nivel * 12 + 18}px` }}
            />
            {item.filhos!.map((filho) => (
              <div key={filho.id} style={{ paddingLeft: `${nivel * 12 + 12}px` }}>
                <Item item={filho} mini={mini} hrefAtivo={hrefAtivo} nivel={nivel + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function SidebarNav({
  grupos,
  mini = false,
  cabecalho,
  rodape,
  className,
}: {
  grupos: GrupoNav[]
  /** Colapsada: só ícones, sem sublistas nem rótulos de grupo. */
  mini?: boolean
  cabecalho?: React.ReactNode
  rodape?: React.ReactNode
  className?: string
}) {
  const pathname = usePathname()
  const hrefAtivo = hrefMaisEspecifico(pathname, grupos)

  return (
    // No tema escuro a página já é ink-900, então a sidebar sobe um degrau
    // (ink-800) + filete na borda: sem isso menu e conteúdo viram uma mancha só.
    <div
      className={cn(
        'flex h-full flex-col bg-ink-900 text-ink-300 dark:border-r dark:border-white/[0.07] dark:bg-ink-800',
        className
      )}
    >
      {cabecalho}

      <nav className={cn('min-h-0 flex-1 space-y-5 overflow-y-auto scroll-thin', mini ? 'px-2' : 'px-3')}>
        {grupos.map((grupo, i) => (
          <div key={grupo.titulo ?? i} className="flex flex-col gap-0.5">
            {grupo.titulo && !mini && <p className="rotulo px-3 pb-1.5 text-ink-600 dark:text-ink-500">{grupo.titulo}</p>}
            {grupo.titulo && mini && <span aria-hidden="true" className="mx-auto mb-1.5 h-px w-5 bg-white/10" />}
            {grupo.itens.map((item) => (
              <Item key={item.id} item={item} mini={mini} hrefAtivo={hrefAtivo} />
            ))}
          </div>
        ))}
      </nav>

      {rodape && <div className="mt-auto border-t border-white/10 p-3">{rodape}</div>}
    </div>
  )
}
