'use client'

// src/components/portal/AppShell.tsx
//
// Shell do portal logado. Decisão central: a sidebar lista os SISTEMAS, não
// só menus — quem está lendo um manual pode abrir outro sistema sem
// passar por nenhum índice. É o oposto da navbar do site público, que é
// institucional e some ao rolar.
//
// A árvore de navegação é montada aqui e desenhada por SidebarNav
// (components/ui/dashboard-sidebar): os sistemas entram como filhos de
// "Documentação" em vez de uma lista solta, então a coluna cabe na tela mesmo
// com o catálogo crescendo.

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, BookText, FileText, House, LayoutGrid, Network, Search, Settings2, Sparkles, Star, Users } from 'lucide-react'
import { MenuUsuario } from './MenuUsuario'
import { AvatarColaborador } from './AvatarColaborador'
import { iconeDoSistema } from './PlacaSistema'
import { PaletaBusca } from './PaletaBusca'
import { NavegacaoMobile } from './NavegacaoMobile'
import { AssistenteFlutuante } from './AssistenteFlutuante'
import { podeVerConsumoAssistente } from '@/lib/assistente-acesso'
import { SidebarNav, type GrupoNav } from '@/components/ui/dashboard-sidebar'
import { ASSISTENTE_ATIVO } from '@/lib/recursos'

export type SistemaNav = {
  slug: string
  name: string
  total: number
}

const CHAVE_COLAPSADA = 'portal-sidebar-colapsada'
const LARGURA_EXPANDIDA = 260
const LARGURA_COLAPSADA = 76

function IconeColapsar({ colapsado }: { colapsado: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: colapsado ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s ease' }}
    >
      <path d="M9 4v16M15 8l-4 4 4 4" />
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
    </svg>
  )
}

export function AppShell({
  nome,
  externo,
  email,
  fotoKey,
  departamento,
  podePublicar,
  souAdmin,
  sistemas,
  children,
}: {
  nome: string
  externo: boolean
  email: string
  fotoKey: string | null
  departamento: string
  podePublicar: boolean
  souAdmin: boolean
  sistemas: SistemaNav[]
  children: React.ReactNode
}) {
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [colapsada, setColapsada] = useState(false)
  const [pronta, setPronta] = useState(false)
  const [atalhoBusca, setAtalhoBusca] = useState('Ctrl K')

  // Lida antes da pintura seguinte pra não "piscar" expandida e depois encolher.
  useEffect(() => {
    try {
      setColapsada(localStorage.getItem(CHAVE_COLAPSADA) === '1')
    } catch {
      // storage bloqueado: fica expandida, é o padrão mais seguro
    }
    setPronta(true)
  }, [])

  // O rótulo da tecla só é decidido no cliente — decidir no servidor daria
  // divergência de hidratação entre um Mac e o resto.
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) setAtalhoBusca('⌘K')
  }, [])

  // ⌘K / Ctrl+K abre (ou fecha) a paleta de busca por cima de qualquer página —
  // a pessoa não perde onde estava para procurar um manual.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return
      if (document.querySelector('[role="alertdialog"][aria-modal="true"]')) return
      e.preventDefault()
      setBuscaAberta((v) => !v)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  const fecharBusca = useCallback(() => setBuscaAberta(false), [])

  function alternarColapso() {
    const proximo = !colapsada
    setColapsada(proximo)
    try {
      localStorage.setItem(CHAVE_COLAPSADA, proximo ? '1' : '0')
    } catch {
      // sem storage: a preferência só vale para esta sessão de aba
    }
  }


  const grupos: GrupoNav[] = useMemo(
    () => [
      {
        itens: [
          {
            id: 'buscar',
            titulo: 'Buscar',
            icone: Search,
            atalho: atalhoBusca,
            aoClicar: () => setBuscaAberta(true),
          },
          { id: 'inicio', titulo: 'Início', icone: House, href: '/inicio' },
          ...(!externo ? [{ id: 'ecossistema', titulo: 'Ecossistema de Sistemas', icone: Network, href: '/ecossistema' }] : []),
          {
            id: 'documentacao',
            titulo: 'Documentação',
            icone: BookText,
            href: '/documentacao',
            filhos: sistemas.map((s) => ({
              id: s.slug,
              titulo: s.name,
              icone: iconeDoSistema(s.slug),
              href: `/documentacao/${s.slug}`,
              badge: s.total || undefined,
            })),
          },
          { id: 'favoritos', titulo: 'Meus favoritos', icone: Star, href: '/favoritos' },
          ...(ASSISTENTE_ATIVO && !externo ? [{ id: 'assistente', titulo: 'Assistente dos manuais', icone: Sparkles, href: '/assistente' }] : []),
        ],
      },
      ...(podePublicar
        ? [
            {
              titulo: souAdmin ? 'Administração' : 'Documentos',
              itens: [
                { id: 'admin-docs', titulo: souAdmin ? 'Documentos' : 'Meus documentos', icone: FileText, href: souAdmin ? '/admin' : '/meus-documentos' },
                // Cadastro de colaborador é só ADMIN (ver admin/usuarios/layout).
                ...(souAdmin
                  ? [
                      { id: 'admin-sistemas', titulo: 'Sistemas', icone: LayoutGrid, href: '/admin/sistemas' },
                      { id: 'admin-relatos', titulo: 'Relatos', icone: FileText, href: '/admin/relatos' },
                      { id: 'admin-avaliacoes', titulo: 'Avaliações', icone: Star, href: '/admin/avaliacoes' },
                      ...(ASSISTENTE_ATIVO && podeVerConsumoAssistente(email)
                        ? [{ id: 'admin-assistente', titulo: 'Consumo do assistente', icone: BarChart3, href: '/admin/assistente' }]
                        : []),
                      { id: 'admin-usuarios', titulo: 'Usuários', icone: Users, href: '/admin/usuarios' },
                      { id: 'admin-logs', titulo: 'Histórico de documentos', icone: FileText, href: '/admin/logs' },
                    ]
                  : []),
                { id: 'conta', titulo: 'Minha conta', icone: Settings2, href: '/conta' },
              ],
            },
          ]
        : [{ titulo: 'Conta', itens: [{ id: 'conta', titulo: 'Minha conta', icone: Settings2, href: '/conta' }] }]),
    ],
    [sistemas, podePublicar, souAdmin, email, atalhoBusca, externo]
  )

  function Cabecalho({ colapsavel, mini }: { colapsavel: boolean; mini: boolean }) {
    return (
      <div className={'flex items-center gap-2 ' + (mini ? 'pl-7 pr-2 pt-6 pb-5' : 'px-5 pt-4 pb-3')}>
        <Link href="/inicio" className="min-w-0 flex-1 rounded-lg" title={mini ? 'Trilara' : undefined}>
          {mini ? (
            // Minimizada: só o símbolo cabe sem espremer a marca-texto. O
            // pl-7 acima desloca ele à direita do centro óptico da coluna,
            // alinhando com os ícones da navegação logo abaixo.
            <Image src="/brand/trilara-mark.svg" alt="Trilara" width={32} height={32} priority />
          ) : (
            <Image src="/brand/trilara-logo-dark.svg" alt="Trilara" width={180} height={48} priority className="h-12 w-auto" />
          )}
        </Link>
        {colapsavel && !mini && (
          <button
            onClick={alternarColapso}
            aria-label="Minimizar menu"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-500 transition hover:bg-white/5 hover:text-ink-200"
          >
            <IconeColapsar colapsado={false} />
          </button>
        )}
      </div>
    )
  }

  function Sidebar({ colapsavel }: { colapsavel: boolean }) {
    const mini = colapsavel && colapsada

    return (
      <SidebarNav
        mini={mini}
        grupos={grupos}
        cabecalho={
          <>
            <Cabecalho colapsavel={colapsavel} mini={mini} />
            {!mini && <p className="rotulo px-5 pb-4 text-ink-500">{externo ? 'Trilara · Convidados' : 'Trilara · Conhecimento'}</p>}
            {mini && colapsavel && (
              <button
                onClick={alternarColapso}
                aria-label="Expandir menu"
                className="mx-auto mb-4 grid h-7 w-7 place-items-center rounded-lg text-ink-500 transition hover:bg-white/5 hover:text-ink-200"
              >
                <IconeColapsar colapsado />
              </button>
            )}
          </>
        }
        rodape={<MenuUsuario nome={nome} email={email} fotoKey={fotoKey} departamento={departamento} colapsado={mini} />}
      />
    )
  }

  return (
    <div className="portal-raiz min-h-screen bg-ink-50 dark:bg-ink-900">
      {/* Sidebar fixa — desktop. Só troca de largura depois de ler a preferência
          salva, pra não "saltar" na primeira pintura. */}
      <aside
        className="portal-sidebar fixed inset-y-0 left-0 z-30 hidden lg:block"
        style={{
          width: colapsada ? LARGURA_COLAPSADA : LARGURA_EXPANDIDA,
          transition: pronta ? 'width 0.18s ease' : undefined,
        }}
      >
        <Sidebar colapsavel />
      </aside>


      {/* padding-left só se aplica a partir de lg (ver .portal-content em
          globals.css) — a sidebar fixa também só existe a partir de lg. */}
      <div
        className="portal-content"
        style={{
          ['--sidebar-w' as string]: `${colapsada ? LARGURA_COLAPSADA : LARGURA_EXPANDIDA}px`,
          transition: pronta ? 'padding-left 0.18s ease' : undefined,
        }}
      >
        <header className="mobile-header sticky top-0 z-20 flex min-h-14 items-center gap-3 border-b border-ink-200 bg-ink-50/95 px-4 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-900/95 sm:px-6 lg:hidden">

          <Link href="/inicio" aria-label="Trilara — início" className="flex min-h-14 items-center rounded-lg lg:hidden">
            <Image src="/brand/trilara-logo-light.svg" alt="Trilara" width={112} height={30} className="h-8 w-auto dark:hidden" />
            <Image src="/brand/trilara-logo-dark.svg" alt="Trilara" width={112} height={30} className="hidden h-8 w-auto dark:block" />
          </Link>
          <Link href="/conta" aria-label="Minha conta" title="Minha conta" className="ml-auto grid size-11 place-items-center rounded-full ring-2 ring-transparent transition hover:ring-brand-300 focus-visible:outline-brand-500">
            <AvatarColaborador nome={nome} fotoKey={fotoKey} className="h-9 w-9 rounded-full text-[12px]" />
          </Link>
        </header>

        <main id="conteudo-principal" className="portal-in portal-main min-w-0">{children}</main>
      </div>

      <NavegacaoMobile grupos={grupos} nome={nome} fotoKey={fotoKey} aoBuscar={() => setBuscaAberta(true)} />
      {ASSISTENTE_ATIVO && !externo && <AssistenteFlutuante sistemas={sistemas.map((sistema) => ({ slug: sistema.slug, nome: sistema.name }))} />}
      <PaletaBusca aberta={buscaAberta} aoFechar={fecharBusca} />
    </div>
  )
}
