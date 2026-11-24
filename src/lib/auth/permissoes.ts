import type { Papel } from './jwt'

// EDITOR é o identificador legado do perfil exibido como Gestor.
export function podeCriarDocumento(papel: Papel): boolean {
  return papel === 'ADMIN' || papel === 'EDITOR'
}

export function podeEditarDocumento(sessao: { id: string; papel: Papel }, autorId: string | null): boolean {
  return sessao.papel === 'ADMIN' || (sessao.papel === 'EDITOR' && autorId === sessao.id)
}

export function podeLerRascunho(sessao: { id: string; papel: Papel }, autorId: string | null): boolean {
  return podeEditarDocumento(sessao, autorId)
}
