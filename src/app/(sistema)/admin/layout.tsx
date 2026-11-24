// src/app/(sistema)/admin/layout.tsx
//
// O grupo (sistema) já garante que existe sessão e monta o shell. O que falta
// aqui é o PAPEL: um COLABORADOR logado passa pelo proxy e chegaria nesta
// árvore sem esta checagem.

import { exigirAdmin } from '@/lib/auth/session'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigirAdmin()
  return <>{children}</>
}
