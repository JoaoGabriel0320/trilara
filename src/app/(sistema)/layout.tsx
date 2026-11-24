import { podeAcessarSistema } from '@/lib/publico'
// src/app/(sistema)/layout.tsx
//
// Raiz do portal logado. Tudo neste grupo exige sessão e recebe o shell
// próprio — nada da navbar institucional chega aqui.

import { exigirSessao } from '@/lib/auth/session'
import { podePublicar, souAdmin } from '@/lib/auth/jwt'
import { listarSistemas } from '@/lib/sistemas'
import { getContagensDocumentosPorSistema, getDepartamentoColaborador } from '@/lib/portal-cache'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/portal/AppShell'
import { PresencaUsuario } from '@/components/portal/PresencaUsuario'

export const dynamic = 'force-dynamic'

export default async function SistemaLayout({ children }: { children: React.ReactNode }) {
  // O proxy já barra quem não tem sessão; isto garante que nenhuma página do
  // grupo renderize sem usuário caso o matcher mude.
  const [sessao, sistemasCatalogo] = await Promise.all([exigirSessao(), listarSistemas()])

  // A contagem por sistema alimenta a sidebar inteira, então é carregada aqui
  // uma vez por navegação em vez de em cada página. O departamento não vai no JWT
  // (payload enxuto), então busca no banco — é só para o menu do usuário.
  // Ambas cacheadas (60s, invalidadas via revalidateTag nas rotas de escrita)
  // para não bater no Postgres a cada navegação dentro da área logada.
  const [contagens, departamento, perfil] = await Promise.all([
    getContagensDocumentosPorSistema(sessao.tipoAcesso!),
    getDepartamentoColaborador(sessao.id),
    prisma.colaborador.findUnique({ where: { id: sessao.id }, select: { fotoKey: true } }),
  ])
  const porSistema = new Map(contagens.map((c) => [c.sistemaSlug, c._count._all]))

  const sistemas = sistemasCatalogo.filter((s) => podeAcessarSistema(sessao, s.slug)).map((s) => ({
    slug: s.slug,
    name: s.name,
    total: porSistema.get(s.slug) ?? 0,
  }))

  return (
    <>
      <PresencaUsuario />
      <AppShell
        externo={sessao.tipoAcesso === 'EXTERNO'}
        nome={sessao.nome}
        email={sessao.email}
        fotoKey={perfil?.fotoKey ?? null}
        departamento={departamento ?? ''}
        podePublicar={podePublicar(sessao.papel)}
        souAdmin={souAdmin(sessao.papel)}
        sistemas={sistemas}
      >
        {children}
      </AppShell>
    </>
  )
}
