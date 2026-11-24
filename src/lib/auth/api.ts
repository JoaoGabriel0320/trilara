// src/lib/auth/api.ts
//
// Guardas para Route Handlers. Retornam a sessão OU uma resposta pronta — em
// rotas de API redirecionar não serve, o fetch seguiria o redirect e entregaria
// HTML onde o cliente espera JSON.

import { NextResponse } from 'next/server'
import { podePublicar, souAdmin, type SessaoPayload } from './jwt'
import { getSessao } from './session'

export async function exigirSessaoApi(): Promise<
  { sessao: SessaoPayload; erro: null } | { sessao: null; erro: NextResponse }
> {
  const sessao = await getSessao()
  if (!sessao) {
    return { sessao: null, erro: NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 }) }
  }
  return { sessao, erro: null }
}

export async function exigirEditorApi(): Promise<
  { sessao: SessaoPayload; erro: null } | { sessao: null; erro: NextResponse }
> {
  const resultado = await exigirSessaoApi()
  if (resultado.erro) return resultado
  if (resultado.sessao.tipoAcesso !== 'INTERNO' || !podePublicar(resultado.sessao.papel)) {
    return {
      sessao: null,
      erro: NextResponse.json({ error: 'Você não tem permissão para publicar.' }, { status: 403 }),
    }
  }
  return resultado
}

export async function exigirAdminApi(): Promise<
  { sessao: SessaoPayload; erro: null } | { sessao: null; erro: NextResponse }
> {
  const resultado = await exigirSessaoApi()
  if (resultado.erro) return resultado
  if (resultado.sessao.tipoAcesso !== 'INTERNO' || !souAdmin(resultado.sessao.papel)) {
    return {
      sessao: null,
      erro: NextResponse.json({ error: 'Acesso exclusivo de administradores.' }, { status: 403 }),
    }
  }
  return resultado
}

export async function exigirInternoApi() {
  const resultado = await exigirSessaoApi()
  if (resultado.erro) return resultado
  if (resultado.sessao.tipoAcesso !== 'INTERNO') {
    return { sessao: null, erro: NextResponse.json({ error: 'Recurso disponível apenas para a equipe interna.' }, { status: 403 }) } as const
  }
  return resultado
}
