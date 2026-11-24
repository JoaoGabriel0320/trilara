import { exigirEditor } from '@/lib/auth/session'
export default async function MeusDocumentosLayout({ children }: { children: React.ReactNode }) {
  await exigirEditor()
  return <>{children}</>
}
