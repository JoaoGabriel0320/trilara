// src/lib/auth/session.ts
//
// Leitura da sessão a partir do cookie. Só para Server Components e Route
// Handlers (runtime Node) — nunca importar isto do middleware.

import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_SESSAO, verificarToken, podePublicar, souAdmin, type SessaoPayload } from './jwt'
import { credencialConfere } from './credencial'
import { prisma } from '@/lib/prisma'

// cache(): dedupe por requisição da verificação do token e do estado da conta.
export const getSessao = cache(async (): Promise<SessaoPayload | null> => {
  const store = await cookies()
  const token = store.get(COOKIE_SESSAO)?.value
  if (!token) return null
  const payload = await verificarToken(token)
  if (!payload) return null
  const registro = await prisma.sessaoColaborador.findUnique({
    where: { id: payload.sessaoId },
    select: {
      colaboradorId: true,
      expiraEm: true,
      substituidaEm: true,
      colaborador: { select: { nome: true, email: true, papel: true, tipoAcesso: true, ativo: true, mustChangePassword: true, senhaHash: true } },
    },
  })
  if (!registro || registro.colaboradorId !== payload.id || registro.expiraEm.getTime() <= Date.now() || registro.substituidaEm) return null
  const colaborador = registro.colaborador
  if (!colaborador.ativo || !credencialConfere(payload.credencial, colaborador.senhaHash)) return null
  // Permissões e estado da conta vêm sempre do banco, não de claims antigas.
  return {
    id: payload.id,
    sessaoId: payload.sessaoId,
    nome: colaborador.nome,
    email: colaborador.email,
    papel: colaborador.tipoAcesso === 'EXTERNO' ? 'COLABORADOR' : colaborador.papel,
    tipoAcesso: colaborador.tipoAcesso,
    mustChangePassword: colaborador.mustChangePassword,
    credencial: payload.credencial,
  }
})

/** Distingue um novo login de expiração ou logout para mostrar o aviso correto. */
export async function sessaoFoiSubstituida(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value
  const payload = token ? await verificarToken(token) : null
  if (!payload) return false
  const registro = await prisma.sessaoColaborador.findUnique({
    where: { id: payload.sessaoId },
    select: { colaboradorId: true, substituidaEm: true },
  })
  return registro?.colaboradorId === payload.id && registro.substituidaEm !== null
}

/** Usa em páginas que exigem login. O middleware já barra, isto é a segunda tranca. */
export async function exigirSessao(): Promise<SessaoPayload> {
  const sessao = await getSessao()
  if (!sessao) redirect(await sessaoFoiSubstituida() ? '/login?motivo=novo-login' : '/login?motivo=sessao-expirada')
  return sessao
}

/** Usa em páginas/rotas de administração de conteúdo. */
export async function exigirEditor(): Promise<SessaoPayload> {
  const sessao = await exigirSessao()
  if (sessao.tipoAcesso !== 'INTERNO' || !podePublicar(sessao.papel)) redirect('/documentacao')
  return sessao
}

/** Usa em páginas de gestão de colaboradores — mais restrito que exigirEditor. */
export async function exigirAdmin(): Promise<SessaoPayload> {
  const sessao = await exigirSessao()
  if (sessao.tipoAcesso !== 'INTERNO' || !souAdmin(sessao.papel)) redirect(podePublicar(sessao.papel) ? '/meus-documentos' : '/inicio')
  return sessao
}

export async function exigirInterno(): Promise<SessaoPayload> {
  const sessao = await exigirSessao()
  if (sessao.tipoAcesso !== 'INTERNO') redirect('/inicio')
  return sessao
}
