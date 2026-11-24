// src/lib/audit.ts
//
// Trilha de auditoria. Nunca deve derrubar a operação principal: se o INSERT do
// log falhar, o login/upload do usuário continua valendo.

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { SessaoPayload } from '@/lib/auth/jwt'

type Entrada = {
  ator: Pick<SessaoPayload, 'id' | 'nome' | 'email'>
  acao: 'login' | 'logout' | 'criar' | 'editar' | 'excluir' | 'publicar' | 'despublicar' | 'baixar'
  entidade: 'Colaborador' | 'Documento' | 'Categoria' | 'Ideia' | 'Filial' | 'Departamento' | 'SolicitacaoAcesso' | 'Sistema' | 'RelatoDocumento'
  entidadeId?: string | null
  descricao: string
}

export async function registrarAuditoria(entrada: Entrada, transacao?: Prisma.TransactionClient): Promise<void> {
  if (transacao) {
    await transacao.auditLog.create({ data: {
      actorId: entrada.ator.id, actorNome: entrada.ator.nome, actorEmail: entrada.ator.email,
      acao: entrada.acao, entidade: entrada.entidade, entidadeId: entrada.entidadeId ?? null,
      descricao: entrada.descricao,
    } })
    return
  }
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entrada.ator.id,
        actorNome: entrada.ator.nome,
        actorEmail: entrada.ator.email,
        acao: entrada.acao,
        entidade: entrada.entidade,
        entidadeId: entrada.entidadeId ?? null,
        descricao: entrada.descricao,
      },
    })
  } catch (erro) {
    console.error('[auditoria] falha ao registrar', erro)
  }
}
