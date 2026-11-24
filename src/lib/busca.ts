import { getSessao } from '@/lib/auth/session'
import { documentosDoPublico, type Publico } from '@/lib/publico'
// src/lib/busca.ts
//
// Índice que alimenta a paleta de busca (⌘K / "Buscar" na sidebar). Só roda no
// servidor — importa o Prisma. O filtro em si acontece no cliente, sobre esta
// lista inteira: o acervo é de dezenas/centenas de documentos, não compensa uma
// busca no banco a cada tecla.

import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { listarSistemas } from '@/lib/sistemas'
import type { DocumentoBusca } from '@/components/portal/BuscaGlobal'
import { textoPesquisavelDosPassos } from '@/lib/passos-documento'
import { TAG_CONTAGEM_DOCUMENTOS } from '@/lib/portal-cache'

const FUSO = 'America/Sao_Paulo'

/** "há 3 dias", "hoje" — mesmo rótulo da página inicial. */
function quando(data: Date | string): string {
  // O cache do Next serializa Date como string ao recuperar uma entrada.
  const dataDocumento = data instanceof Date ? data : new Date(data)
  const dias = Math.floor((Date.now() - dataDocumento.getTime()) / 86_400_000)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
  return dataDocumento.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: FUSO })
}

const registrosBusca = unstable_cache(
  async (publico: Publico) => prisma.documento.findMany({
    where: documentosDoPublico(publico),
    orderBy: { atualizadoEm: 'desc' },
    select: {
      id: true,
      titulo: true,
      descricao: true,
      slug: true,
      sistemaSlug: true,
      tipo: true,
      urlExterna: true,
      atualizadoEm: true,
      palavrasChave: true,
      categoria: { select: { nome: true } },
      passos: { orderBy: { ordem: 'asc' }, select: { titulo: true, texto: true, destaqueTipo: true, destaqueTexto: true } },
    },
  }),
  ['documentos-indice-busca-publico-v1'],
  { revalidate: 60, tags: [TAG_CONTAGEM_DOCUMENTOS] },
)

export async function listarDocumentosBusca(): Promise<DocumentoBusca[]> {
  const sessao = await getSessao()
  if (!sessao?.tipoAcesso) return []
  const [registros, sistemas] = await Promise.all([registrosBusca(sessao.tipoAcesso), listarSistemas()])
  return registros.map((d) => {
    const sistema = sistemas.find((item) => item.slug === d.sistemaSlug)
    return {
      id: d.id,
      titulo: d.titulo,
      descricao: d.descricao,
      slug: d.slug,
      sistemaSlug: d.sistemaSlug,
      sistemaNome: sistema?.name ?? d.sistemaSlug,
      tipo: d.tipo,
      categoriaNome: d.categoria?.nome ?? null,
      urlExterna: d.urlExterna,
      palavrasChave: d.palavrasChave,
      textoPassos: d.tipo === 'PASSO_A_PASSO' ? textoPesquisavelDosPassos(d.passos) : null,
      quando: quando(d.atualizadoEm),
    }
  })
}
