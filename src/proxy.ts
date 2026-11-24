// src/proxy.ts
//
// ATENÇÃO: este arquivo precisa ficar em src/ porque o projeto usa diretório
// `src`. Na raiz o Next ignora o proxy/middleware em silêncio — sem erro, sem aviso —
// e a área logada fica aberta.
//
// Importa '@/lib/auth/jwt' direto (e não '@/lib/auth') porque o proxy roda
// no Edge Runtime, onde next/headers não existe.

import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_SESSAO, verificarToken } from '@/lib/auth/jwt'
import { ASSISTENTE_ATIVO, SITE_PUBLICO } from '@/lib/recursos'

const ROTA_DEFINIR_SENHA = '/definir-senha'
const API_DEFINIR_SENHA = '/api/definir-senha'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (SITE_PUBLICO) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Rota indisponível na demonstração pública.' }, { status: 404 })
    }
    return new NextResponse(null, { status: 404 })
  }

  if (['/login', '/solicitar-acesso', '/recuperar-senha', '/redefinir-senha'].includes(pathname)) {
    return NextResponse.next()
  }

  if (!ASSISTENTE_ATIVO && (
    pathname === '/assistente' || pathname.startsWith('/assistente/')
    || pathname === '/admin/assistente' || pathname.startsWith('/admin/assistente/')
    || pathname === '/api/assistente' || pathname.startsWith('/api/assistente/')
  )) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Este recurso está temporariamente desativado.' }, { status: 404 })
    }
    return NextResponse.redirect(new URL('/inicio', req.url))
  }

  // Trilara Lab: dormente por decisão do produto (não removido — código,
  // schema e migration continuam intactos). Bloqueado antes até da checagem
  // de sessão, então nem gasta uma verificação de JWT com uma rota desligada.
  if (pathname === '/lab' || pathname.startsWith('/lab/') || pathname.startsWith('/api/lab')) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Este módulo está temporariamente desativado.' }, { status: 404 })
    }
    return NextResponse.redirect(new URL('/inicio', req.url))
  }

  if (pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origem = req.headers.get('origin') || req.headers.get('referer')
    const host = req.headers.get('host')
    let origemConfiavel = false
    try {
      origemConfiavel = Boolean(origem && host && new URL(origem).host === host)
    } catch {
      origemConfiavel = false
    }
    if (!origemConfiavel || req.headers.get('sec-fetch-site') === 'cross-site') {
      return NextResponse.json({ error: 'Origem da requisição não autorizada.' }, { status: 403 })
    }
  }

  // Essas rotas são públicas; as demais APIs exigem sessão.
  if (['/api/login', '/api/solicitar-acesso', '/api/recuperar-senha', '/api/redefinir-senha', '/api/filiais', '/api/logout'].includes(pathname)) {
    return NextResponse.next()
  }

  const token = req.cookies.get(COOKIE_SESSAO)?.value
  const sessao = token ? await verificarToken(token) : null

  if (!sessao) {
    // Para chamadas de API, 401 é mais útil que um redirect em HTML que o
    // fetch seguiria e entregaria a página de login como se fosse a resposta.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 })
    }
    const login = new URL('/login', req.url)
    login.searchParams.set('destino', pathname + req.nextUrl.search)
    if (token) login.searchParams.set('motivo', 'sessao-expirada')
    const res = NextResponse.redirect(login)
    // Token vencido/inválido: limpa o cookie para não ficar em loop de redirect.
    if (token) res.cookies.set(COOKIE_SESSAO, '', { path: '/', maxAge: 0 })
    return res
  }

  // Senha temporária (colaborador recém-criado ou resetado pelo admin): trava
  // tudo até ele definir a própria senha. A claim vem do JWT, sem consulta ao
  // banco — é o que mantém o proxy leve no Edge Runtime.
  const naRotaDeTroca = pathname === ROTA_DEFINIR_SENHA || pathname === API_DEFINIR_SENHA
  if (sessao.mustChangePassword && !naRotaDeTroca) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Defina uma nova senha antes de continuar.', mustChangePassword: true },
        { status: 403 }
      )
    }
    return NextResponse.redirect(new URL(ROTA_DEFINIR_SENHA, req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/inicio/:path*',
    '/ecossistema/:path*',
    '/documentacao/:path*',
    '/favoritos/:path*',
    '/assistente/:path*',
    '/admin/:path*',
    '/meus-documentos/:path*',
    '/conta/:path*',
    '/lab/:path*',
    '/definir-senha',
    '/login/:path*',
    '/solicitar-acesso/:path*',
    '/recuperar-senha/:path*',
    '/redefinir-senha/:path*',
    '/api/documentos/:path*',
    '/api/admin/:path*',
    '/api/conta/:path*',
    '/api/lab/:path*',
    '/api/definir-senha',
    '/api/:path*',
  ],
}
