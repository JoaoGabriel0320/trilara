// src/app/api/logout/route.ts

import { NextResponse } from 'next/server'
import { COOKIE_SESSAO } from '@/lib/auth/jwt'
import { getSessao } from '@/lib/auth/session'
import { registrarAuditoria } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const sessao = await getSessao()
  if (sessao) {
    await prisma.sessaoColaborador.deleteMany({ where: { id: sessao.sessaoId, colaboradorId: sessao.id } })
    await prisma.colaborador.update({ where: { id: sessao.id }, data: { ultimaAtividadeEm: null } })
    await registrarAuditoria({
      ator: sessao,
      acao: 'logout',
      entidade: 'Colaborador',
      entidadeId: sessao.id,
      descricao: `${sessao.nome} saiu da área de documentação`,
    })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_SESSAO, '', { path: '/', maxAge: 0 })
  return res
}
