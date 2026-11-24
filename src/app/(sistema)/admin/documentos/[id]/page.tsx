import { exigirAdmin } from '@/lib/auth/session'
// src/app/admin/documentos/[id]/page.tsx

import type { Metadata } from 'next'
import { CabecalhoDocumento } from '@/components/kb/CabecalhoDocumento'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { listarSistemas } from '@/lib/sistemas'
import { FormDocumento } from '@/components/kb/FormDocumento'

export const metadata: Metadata = {
  title: 'Editar documento · Trilara',
  robots: { index: false, follow: false },
}

export default async function EditarDocumentoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await exigirAdmin()
  const sistemasCatalogo = await listarSistemas()
  const { id } = await params

  const [documento, categorias] = await Promise.all([
    prisma.documento.findUnique({
      where: { id },
      include: {
        imagens: { orderBy: [{ ordem: 'asc' }, { criadaEm: 'asc' }] },
        passos: { orderBy: { ordem: 'asc' }, include: { imagem: { select: { id: true, arquivoNome: true } }, imagemAcesso: { select: { id: true, arquivoNome: true } } } },
      },
    }),
    prisma.categoria.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, sistemaSlug: true },
    }),
  ])

  if (!documento) notFound()

  return (
    <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 sm:py-10 xl:px-10">
      <CabecalhoDocumento editando />

      <FormDocumento
        sistemas={sistemasCatalogo.map((s) => ({ slug: s.slug, name: s.name }))}
        categorias={categorias}
        documento={{
          id: documento.id,
          sistemaSlug: documento.sistemaSlug,
          publico: documento.publico,
          slug: documento.slug,
          titulo: documento.titulo,
          descricao: documento.descricao,
          palavrasChave: documento.palavrasChave,
          tipo: documento.tipo,
          conteudo: documento.conteudo,
          urlExterna: documento.urlExterna,
          arquivoNome: documento.arquivoNome,
          imagens: documento.imagens.map((imagem) => ({ id: imagem.id, arquivoNome: imagem.arquivoNome })),
          passos: documento.passos.map((passo) => ({
            id: passo.id,
            titulo: passo.titulo,
            texto: passo.texto,
            caminhoAcesso: passo.caminhoAcesso,
            destaqueTipo: passo.destaqueTipo,
            destaqueTexto: passo.destaqueTexto,
            imagem: passo.imagem,
            imagemAcesso: passo.imagemAcesso,
          })),
          comecePorAqui: documento.comecePorAqui,
          categoriaId: documento.categoriaId,
          ordem: documento.ordem,
          ativo: documento.ativo,
        }}
      />
    </div>
  )
}
