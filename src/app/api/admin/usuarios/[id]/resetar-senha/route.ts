// src/app/api/admin/usuarios/[id]/resetar-senha/route.ts

import { NextResponse, type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { exigirAdminApi } from '@/lib/auth/api'
import { gerarSenhaTemporaria } from '@/lib/senha'
import { registrarAuditoria } from '@/lib/audit'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro

  const { id } = await params
  const colaborador = await prisma.colaborador.findUnique({ where: { id } })
  if (!colaborador) {
    return NextResponse.json({ error: 'Colaborador não encontrado.' }, { status: 404 })
  }
  if (colaborador.adminProtegido) {
    return NextResponse.json({
      error: 'A senha desta conta protegida só pode ser alterada pelo próprio titular.',
    }, { status: 403 })
  }

  const senhaTemporaria = gerarSenhaTemporaria()
  const senhaHash = await bcrypt.hash(senhaTemporaria, 10)

  const alteracao = await prisma.colaborador.updateMany({
    where: { id, adminProtegido: false },
    // A troca do hash invalida as sessões abertas do colaborador.
    data: { senhaHash, mustChangePassword: true, resetToken: null, resetTokenExpiry: null },
  })
  if (alteracao.count !== 1) {
    return NextResponse.json({ error: 'Esta conta administrativa é protegida.' }, { status: 403 })
  }

  await registrarAuditoria({
    ator: sessao,
    acao: 'editar',
    entidade: 'Colaborador',
    entidadeId: id,
    descricao: `${sessao.nome} gerou uma nova senha temporária para ${colaborador.nome}`,
  })

  return NextResponse.json({ ok: true, senhaTemporaria }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
