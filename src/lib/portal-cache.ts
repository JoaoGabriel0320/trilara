import { documentosDoPublico, type Publico } from '@/lib/publico'
// src/lib/portal-cache.ts
//
// Dados que alimentam o shell do portal logado (sidebar) em toda navegação.
// Sem cache, o layout re-consulta o banco a cada clique — aqui cacheamos por
// um curto período e invalidamos via revalidateTag nas rotas que alteram os
// dados subjacentes (ver TAG_* abaixo).

import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

export const TAG_CONTAGEM_DOCUMENTOS = 'documentos-contagem'
export const TAG_DEPARTAMENTO_COLABORADOR = 'colaboradores-cargo'

const REVALIDATE_SEGUNDOS = 60

export const getContagensDocumentosPorSistema = unstable_cache(
  async (publico: Publico) => {
    const contagens = await prisma.documento.groupBy({
      by: ['sistemaSlug'],
      where: documentosDoPublico(publico),
      _count: { _all: true },
    })
    return contagens
  },
  ['documentos-contagem-por-sistema-publico-v1'],
  { revalidate: REVALIDATE_SEGUNDOS, tags: [TAG_CONTAGEM_DOCUMENTOS] }
)

export const getDepartamentoColaborador = unstable_cache(
  async (id: string) => {
    const colaborador = await prisma.colaborador.findUnique({ where: { id }, select: { departamento: true } })
    return colaborador?.departamento ?? null
  },
  ['colaborador-cargo'],
  { revalidate: REVALIDATE_SEGUNDOS, tags: [TAG_DEPARTAMENTO_COLABORADOR] }
)
