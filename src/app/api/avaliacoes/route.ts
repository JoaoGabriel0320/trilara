import { podeAcessarSistema } from '@/lib/publico'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirSessaoApi } from '@/lib/auth/api'
import { slugDeSistemaValido } from '@/lib/sistemas'
import { proximaAvaliacao } from '@/lib/avaliacoes'
import { lerObjetoJsonLimitado } from '@/lib/json-limitado'

export const runtime = 'nodejs'

const CAMPOS = ['gosta', 'melhorar', 'gostaria'] as const

class AvaliacaoRecenteError extends Error {
  constructor(readonly proximaEm: Date) {
    super('AVALIACAO_RECENTE')
  }
}

export async function POST(req: NextRequest) {
  const { sessao, erro } = await exigirSessaoApi()
  if (erro) return erro

  const corpo = await lerObjetoJsonLimitado(req)
  if (!corpo) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const { sistemaSlug, nota } = corpo
  if (typeof sistemaSlug !== 'string' || !podeAcessarSistema(sessao, sistemaSlug) || !(await slugDeSistemaValido(sistemaSlug))) {
    return NextResponse.json({ error: 'Sistema inválido.' }, { status: 400 })
  }
  if (typeof nota !== 'number' || !Number.isInteger(nota) || nota < 1 || nota > 5) {
    return NextResponse.json({ error: 'Escolha uma nota de 1 a 5 estrelas.' }, { status: 400 })
  }

  const comentarios: Record<(typeof CAMPOS)[number], string | null> = {
    gosta: null, melhorar: null, gostaria: null,
  }
  for (const campo of CAMPOS) {
    const valor = corpo[campo]
    if (valor !== undefined && valor !== null && typeof valor !== 'string') {
      return NextResponse.json({ error: 'Comentário inválido.' }, { status: 400 })
    }
    const texto = (valor ?? '').trim()
    if (texto.length > 500) {
      return NextResponse.json({ error: 'Cada comentário deve ter até 500 caracteres.' }, { status: 400 })
    }
    comentarios[campo] = texto || null
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // Serializa gravações do mesmo usuário/sistema para impedir respostas duplicadas.
      const [bloqueio] = await tx.$queryRaw<Array<{ obtido: boolean }>>`
        SELECT pg_try_advisory_xact_lock(hashtext(${sessao.id}), hashtext(${sistemaSlug})) AS obtido
      `
      if (!bloqueio?.obtido) throw new Error('AVALIACAO_EM_ANDAMENTO')
      const ultima = await tx.avaliacaoSistema.findFirst({
        where: { colaboradorId: sessao.id, sistemaSlug },
        orderBy: { criadoEm: 'desc' },
      })
      const agora = new Date()
      if (ultima && agora < proximaAvaliacao(ultima.criadoEm)) {
        throw new AvaliacaoRecenteError(proximaAvaliacao(ultima.criadoEm))
      }
      const colaborador = await tx.colaborador.findUnique({
        where: { id: sessao.id },
        select: { filialNome: true },
      })
      if (!colaborador) throw new Error('COLABORADOR_NAO_ENCONTRADO')
      return tx.avaliacaoSistema.create({
        data: { colaboradorId: sessao.id, sistemaSlug, filialNome: colaborador.filialNome, nota, ...comentarios },
      })
    })

    return NextResponse.json({
      ok: true,
      criadoEm: resultado.criadoEm.toISOString(),
      proximaEm: proximaAvaliacao(resultado.criadoEm).toISOString(),
    }, { status: 201 })
  } catch (falha) {
    if (falha instanceof AvaliacaoRecenteError) {
      return NextResponse.json({
        error: 'Você já avaliou este sistema nos últimos 30 dias.',
        proximaEm: falha.proximaEm.toISOString(),
      }, { status: 429 })
    }
    if (falha instanceof Error && falha.message === 'AVALIACAO_EM_ANDAMENTO') {
      return NextResponse.json({ error: 'Outra avaliação está sendo salva. Tente novamente.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Não foi possível salvar a avaliação. Tente novamente.' }, { status: 500 })
  }
}
