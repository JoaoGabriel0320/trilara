import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const filiais = await prisma.filial.findMany({ where: { ativa: true }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } })
  return NextResponse.json({ filiais })
}
