// src/app/api/lab/route.ts — publicar uma ideia na Trilara Lab
//
// Diferente de /api/admin/documentos: aqui é exigirInternoApi, não
// exigirEditorApi. A ideia parte de quem opera o sistema no dia a dia — travar
// isso a EDITOR/ADMIN mataria o propósito do mural.

import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirInternoApi } from '@/lib/auth/api'
import { slugDeSistemaValido } from '@/lib/sistemas'
import { registrarAuditoria } from '@/lib/audit'
import { lerObjetoJsonLimitado } from '@/lib/json-limitado'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { sessao, erro } = await exigirInternoApi()
  if (erro) return erro

  const corpo = await lerObjetoJsonLimitado(req)
  const titulo = typeof corpo?.titulo === 'string' ? corpo.titulo.trim() : ''
  const resumo = typeof corpo?.resumo === 'string' ? corpo.resumo.trim() : ''
  const conteudo = typeof corpo?.conteudo === 'string' ? corpo.conteudo.trim() : ''
  const sistemaSlug = typeof corpo?.sistemaSlug === 'string' ? corpo.sistemaSlug.trim() || undefined : undefined

  if (!titulo || titulo.length > 160) return NextResponse.json({ error: 'Dê um título de até 160 caracteres para a ideia.' }, { status: 400 })
  if (!resumo || resumo.length > 300) return NextResponse.json({ error: 'Escreva um resumo de até 300 caracteres.' }, { status: 400 })
  if (!conteudo || conteudo.length > 10000) return NextResponse.json({ error: 'Descreva a ideia em até 10.000 caracteres.' }, { status: 400 })
  if (sistemaSlug && !(await slugDeSistemaValido(sistemaSlug))) {
    return NextResponse.json({ error: 'Sistema inválido.' }, { status: 400 })
  }

  const ideia = await prisma.ideia.create({
    data: { titulo, resumo, conteudo, sistemaSlug: sistemaSlug ?? null, autorId: sessao.id },
  })

  await registrarAuditoria({
    ator: sessao,
    acao: 'criar',
    entidade: 'Ideia',
    entidadeId: ideia.id,
    descricao: `${sessao.nome} publicou a ideia "${titulo}" na Trilara Lab`,
  })

  return NextResponse.json({ ok: true, id: ideia.id }, { status: 201 })
}
