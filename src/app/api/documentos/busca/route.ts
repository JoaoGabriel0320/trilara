// src/app/api/documentos/busca/route.ts — índice da paleta de busca
//
// Carregado sob demanda quando a paleta abre, em vez de ir no layout: assim a
// lista inteira não viaja no HTML de toda página do portal. O proxy já cobre
// /api/documentos/*; a checagem aqui é a mesma defesa em profundidade das
// outras rotas.

import { NextResponse } from 'next/server'
import { exigirSessaoApi } from '@/lib/auth/api'
import { listarDocumentosBusca } from '@/lib/busca'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { erro } = await exigirSessaoApi()
  if (erro) return erro

  const documentos = await listarDocumentosBusca()
  return NextResponse.json({ documentos }, { headers: { 'Cache-Control': 'private, no-store' } })
}
