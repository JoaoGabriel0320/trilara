import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { TemaInicial } from '@/components/portal/TemaInicial'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3002')),
  title: 'Trilara | Conhecimento conectado',
  description: 'Organize sistemas, documentos e conhecimento em um só lugar.',
  icons: { icon: '/brand/trilara-mark.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR" data-scroll-behavior="smooth" className={[GeistSans.variable, GeistMono.variable].join(' ')} suppressHydrationWarning>
    <body className="bg-ink-50 text-ink-900 antialiased font-sans transition-colors duration-200 dark:bg-ink-900 dark:text-ink-50">
      <TemaInicial />{children}
    </body>
  </html>
}
