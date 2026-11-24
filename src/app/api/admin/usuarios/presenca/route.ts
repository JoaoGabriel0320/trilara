import { NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth/session'
import { souAdmin } from '@/lib/auth/jwt'
import { prisma } from '@/lib/prisma'
import { desdePresencaOnline } from '@/lib/presenca'

export async function GET() {
  const sessao = await getSessao()
  if (!sessao || !souAdmin(sessao.papel)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const usuarios = await prisma.colaborador.findMany({
    where: { ativo: true, ultimaAtividadeEm: { gte: desdePresencaOnline() } },
    select: { id: true },
  })

  return NextResponse.json({ ids: usuarios.map((usuario) => usuario.id) }, { headers: { 'Cache-Control': 'no-store' } })
}
