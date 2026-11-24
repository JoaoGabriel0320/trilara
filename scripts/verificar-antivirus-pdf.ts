import { loadEnvConfig } from '@next/env'
import { verificarPdfComClamAV } from '../src/lib/pdf-antivirus'

async function main() {
  loadEnvConfig(process.cwd())
  const socket = process.env.PDF_ANTIVIRUS_SOCKET?.trim()
  if (!socket) throw new Error('PDF_ANTIVIRUS_SOCKET não está configurado no ambiente do Hub.')

  const pdfMinimo = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n')
  const resultado = await verificarPdfComClamAV(pdfMinimo, socket)
  if (resultado !== 'limpo') throw new Error('O scanner não aprovou o PDF de teste.')
  console.log(`ClamAV respondeu corretamente pelo socket ${socket}.`)
}

main().catch((erro) => {
  console.error(erro)
  process.exitCode = 1
})
