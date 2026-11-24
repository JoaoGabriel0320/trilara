'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { BookText, House, LogOut, Menu, Moon, Network, Search, Sparkles, Star, Sun, UserRound, X } from 'lucide-react'
import type { GrupoNav } from '@/components/ui/dashboard-sidebar'
import { AvatarColaborador } from './AvatarColaborador'

export function NavegacaoMobile({ grupos, nome, fotoKey, aoBuscar }: {
  grupos: GrupoNav[]
  nome: string
  fotoKey: string | null
  aoBuscar: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const [aberto, setAberto] = useState(false)
  const [escuro, setEscuro] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [erro, setErro] = useState('')
  const [tecladoAberto, setTecladoAberto] = useState(false)

  useEffect(() => { setAberto(false) }, [pathname])

  useEffect(() => {
    const viewport = window.visualViewport
    function atualizar() {
      setTecladoAberto(!!viewport && window.innerHeight - viewport.height > 150)
    }
    viewport?.addEventListener('resize', atualizar)
    return () => viewport?.removeEventListener('resize', atualizar)
  }, [])

  useEffect(() => {
    const elemento = dialog.current
    if (!aberto || !elemento) return
    setEscuro(document.documentElement.classList.contains('dark'))
    elemento.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const desktop = window.matchMedia('(min-width: 1024px)')
    const aoRedimensionar = () => { if (desktop.matches) setAberto(false) }
    desktop.addEventListener('change', aoRedimensionar)
    return () => {
      if (elemento.open) elemento.close()
      document.body.style.overflow = overflow
      desktop.removeEventListener('change', aoRedimensionar)
    }
  }, [aberto])

  function alternarTema() {
    const proximo = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', proximo)
    setEscuro(proximo)
    try { localStorage.setItem('theme', proximo ? 'dark' : 'light') } catch { /* Tema só nesta aba. */ }
  }

  async function sair() {
    setSaindo(true)
    setErro('')
    try {
      const resposta = await fetch('/api/logout', { method: 'POST' })
      if (!resposta.ok) throw new Error()
      setAberto(false)
      router.push('/login')
      router.refresh()
    } catch {
      setErro('Não foi possível sair. Tente novamente.')
      setSaindo(false)
    }
  }

  const itens = [
    { titulo: 'Início', href: '/inicio', icone: House, ativo: pathname === '/inicio' },
    { titulo: 'Documentos', href: '/documentacao', icone: BookText, ativo: pathname.startsWith('/documentacao') },
    { titulo: 'Buscar', icone: Search, aoClicar: aoBuscar, ativo: false },
    { titulo: 'Conta', href: '/conta', icone: UserRound, ativo: pathname.startsWith('/conta') },
    { titulo: 'Menu', icone: Menu, aoClicar: () => setAberto(true), ativo: pathname.startsWith('/admin') || pathname.startsWith('/meus-documentos') || pathname.startsWith('/ecossistema') },
  ]

  return <>
    <nav aria-label="Navegação principal no celular" className={`mobile-dock fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 backdrop-blur-xl dark:border-ink-700 dark:bg-ink-900/95 lg:hidden ${tecladoAberto ? 'invisible' : ''}`}>
      <div className="mx-auto grid max-w-xl grid-cols-5 px-2 pt-1">
        {itens.map(({ titulo, href, icone: Icone, ativo, aoClicar }) => {
          const classes = `flex min-h-[60px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors ${ativo ? 'text-brand-600 dark:text-brand-300' : 'text-ink-500 hover:text-brand-600 dark:text-ink-400'}`
          const conteudo = <><span className={`flex h-7 w-12 items-center justify-center rounded-full ${ativo ? 'bg-brand-50 dark:bg-brand-500/20' : ''}`}><Icone size={20} strokeWidth={ativo ? 2.2 : 1.8} aria-hidden /></span><span>{titulo}</span></>
          return href ? <Link key={titulo} href={href} aria-current={ativo ? 'page' : undefined} className={classes}>{conteudo}</Link>
            : <button key={titulo} type="button" onClick={aoClicar} aria-label={titulo === 'Menu' ? 'Abrir menu' : 'Buscar documentos'} aria-expanded={titulo === 'Menu' ? aberto : undefined} aria-controls={titulo === 'Menu' ? 'menu-mobile' : undefined} className={classes}>{conteudo}</button>
        })}
      </div>
    </nav>

    <dialog ref={dialog} id="menu-mobile" aria-labelledby="menu-mobile-titulo" onCancel={() => setAberto(false)} onClick={e => { if (e.target === e.currentTarget) setAberto(false) }} className="mobile-menu m-0 mt-auto w-full max-w-none rounded-t-3xl border-0 bg-white p-0 text-ink-900 shadow-2xl backdrop:bg-ink-900/50 backdrop:backdrop-blur-sm dark:bg-ink-900 dark:text-ink-50">
      <div className="mx-auto max-w-xl p-4 pb-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-200 dark:bg-ink-700" aria-hidden />
        <div className="mb-5 flex items-center gap-3">
          <AvatarColaborador nome={nome} fotoKey={fotoKey} className="size-11 shrink-0 rounded-full text-sm" />
          <div className="min-w-0 flex-1"><h2 id="menu-mobile-titulo" className="text-lg font-semibold">Menu do Hub</h2><p className="truncate text-sm text-ink-500 dark:text-ink-400">{nome}</p></div>
          <button type="button" autoFocus onClick={() => setAberto(false)} aria-label="Fechar menu" className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-50 dark:bg-ink-800"><X size={20} /></button>
        </div>
        {grupos.filter(g => g.titulo).map(grupo => <section key={grupo.titulo} className="mb-5">
          <h3 className="rotulo mb-2 text-ink-500 dark:text-ink-400">{grupo.titulo}</h3>
          <div className="grid grid-cols-2 gap-2">
            {grupo.itens.map(item => item.href && <Link key={item.id} href={item.href} onClick={() => setAberto(false)} aria-current={pathname === item.href ? 'page' : undefined} className={`flex min-h-14 min-w-0 items-center gap-2.5 rounded-xl border p-3 text-[13px] font-medium ${pathname === item.href ? 'border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300' : 'border-ink-200 dark:border-ink-700'}`}><item.icone size={19} className="shrink-0 text-brand-500" aria-hidden /><span className="break-words">{item.titulo}</span></Link>)}
          </div>
        </section>)}
        <section className="mb-5">
          {grupos[0]?.itens.some(i => i.id === 'ecossistema') && <Link href="/ecossistema" onClick={() => setAberto(false)} className="mb-3 flex min-h-12 items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><Network size={18} aria-hidden="true" /> Ecossistema de Sistemas</Link>}
          {grupos[0]?.itens.some(i => i.id === 'assistente') && <Link href="/assistente" onClick={() => setAberto(false)} className="mb-3 flex min-h-12 items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><Sparkles size={18} aria-hidden="true" /> Assistente dos manuais</Link>}
          <Link href="/favoritos" onClick={() => setAberto(false)} className="mb-3 flex min-h-12 items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><Star size={18} aria-hidden="true" /> Meus favoritos</Link>
          <h3 className="rotulo mb-2 text-ink-500 dark:text-ink-400">Manuais por sistema</h3>
          <div className="grid grid-cols-2 gap-2">
            {grupos[0]?.itens.find(i => i.id === 'documentacao')?.filhos?.map(item => <Link key={item.id} href={item.href!} onClick={() => setAberto(false)} className="flex min-h-12 min-w-0 items-center gap-2 rounded-xl bg-ink-50 p-3 text-[13px] dark:bg-ink-800"><item.icone size={18} className="shrink-0 text-ink-500" aria-hidden /><span className="break-words">{item.titulo}</span></Link>)}
          </div>
        </section>
        <div className="flex gap-2 border-t border-ink-200 pt-4 dark:border-ink-700">
          <button type="button" onClick={alternarTema} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-ink-50 text-sm dark:bg-ink-800">{escuro ? <Sun size={18} /> : <Moon size={18} />}{escuro ? 'Tema claro' : 'Tema escuro'}</button>
          <button type="button" onClick={sair} disabled={saindo} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-ink-50 text-sm disabled:opacity-50 dark:bg-ink-800"><LogOut size={18} />{saindo ? 'Saindo…' : 'Sair'}</button>
        </div>
        {erro && <p role="alert" className="mt-3 text-sm text-red-600">{erro}</p>}
      </div>
    </dialog>
  </>
}
