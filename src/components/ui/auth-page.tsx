'use client'

// src/components/ui/auth-page.tsx
//
// Moldura das telas de entrada da Trilara, adaptada do AuthPage do
// 21st.dev. Tela dividida: à esquerda um painel de marca com linhas animadas
// (só a partir de lg), à direita o conteúdo que a página passar em `children`
// — hoje o formulário de e-mail e senha. Os botões de login social do
// original foram removidos: o acesso é só com as contas que a TI cria.
//
// Sempre escura, independente do tema escolhido no portal — as cores são
// fixas de propósito (sem variantes dark:).

import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'

export function AuthPage({ children }: { children: React.ReactNode }) {
  return (
    // Em telas largas o painel de marca ocupa mais que a metade, o que empurra
    // o formulário para a direita. Em lg fica 50/50: com a coluna mais
    // estreita o card de 24rem não caberia.
    <main className="auth-page relative min-h-dvh bg-ink-900 text-ink-50 lg:grid lg:grid-cols-2 xl:grid-cols-[3fr_2fr] 2xl:grid-cols-[2fr_1fr]">
      <div className="relative hidden h-full flex-col border-r border-white/10 bg-white/[0.02] p-10 lg:flex">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-ink-900 to-transparent" />
        <div className="z-10">
          <Image src="/brand/trilara-logo-dark.svg" alt="Trilara" width={180} height={48} className="h-12 w-auto" priority />
        </div>
        <div className="z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl leading-snug text-ink-100">
              Sistemas, documentos e pessoas conectados em um lugar só.
            </p>
            <footer className="font-mono text-sm font-semibold text-ink-400">Trilara · conhecimento conectado</footer>
          </blockquote>
        </div>
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>

      <div className="relative flex min-h-dvh flex-col justify-center px-4 py-8">
        <div aria-hidden className="absolute inset-0 isolate -z-0 opacity-60 [contain:strict]">
          <div className="absolute right-0 top-0 h-[80rem] w-[35rem] -translate-y-[21.875rem] rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,rgba(255,255,255,0.06)_0,hsla(0,0%,55%,0.02)_50%,rgba(255,255,255,0.01)_80%)]" />
          <div className="absolute right-0 top-0 h-[80rem] w-60 -translate-y-1/2 translate-x-[5%] rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.01)_80%,transparent_100%)]" />
          <div className="absolute right-0 top-0 h-[80rem] w-60 -translate-y-[21.875rem] rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.01)_80%,transparent_100%)]" />
        </div>

        <div className="relative mx-auto w-full space-y-6 max-w-[24rem]">
          <div className="flex flex-col items-center gap-3 text-center lg:hidden">
            <Image src="/brand/trilara-logo-dark.svg" alt="Trilara" width={156} height={42} className="h-11 w-auto" priority />
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-300">
              <span aria-hidden="true" className="h-px w-5 bg-brand-400" />
              Conhecimento conectado
              <span aria-hidden="true" className="h-px w-5 bg-brand-400" />
            </p>
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}

function FloatingPaths({ position }: { position: number }) {
  const reduzirMovimento = useReducedMotion()

  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${
      312 - i * 5 * position
    } ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
    // O original sorteava com Math.random(); aqui é determinístico, senão o
    // HTML do servidor e o do navegador divergem na hidratação.
    duracao: 20 + ((i * 7) % 10),
  }))

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="h-full w-full text-white" viewBox="0 0 696 316" fill="none" aria-hidden>
        {paths.map((path) =>
          reduzirMovimento ? (
            <path
              key={path.id}
              d={path.d}
              stroke="currentColor"
              strokeWidth={path.width}
              strokeOpacity={0.05 + path.id * 0.01}
            />
          ) : (
            <motion.path
              key={path.id}
              d={path.d}
              stroke="currentColor"
              strokeWidth={path.width}
              strokeOpacity={0.1 + path.id * 0.03}
              initial={{ pathLength: 0.3, opacity: 0.6 }}
              animate={{ pathLength: 1, opacity: [0.3, 0.6, 0.3], pathOffset: [0, 1, 0] }}
              transition={{ duration: path.duracao, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
            />
          )
        )}
      </svg>
    </div>
  )
}
