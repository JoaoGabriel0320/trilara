// src/app/(sistema)/admin/usuarios/layout.tsx
//
// /admin exige ADMIN (ver admin/layout.tsx). Gestão de
// colaboradores é mais sensível — senha, papel, desativação — então esta
// subárvore aperta pra só ADMIN.

import { exigirAdmin } from '@/lib/auth/session'

export default async function UsuariosLayout({ children }: { children: React.ReactNode }) {
  await exigirAdmin()
  return <>{children}</>
}
