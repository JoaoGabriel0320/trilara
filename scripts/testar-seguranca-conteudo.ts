import assert from 'node:assert/strict'
import { markdownParaHtml } from '../src/lib/markdown'
import { chaveValida } from '../src/lib/storage'
import { verificarPdfAntesDeSalvar } from '../src/lib/pdf-antivirus'

async function main() {
  const html = markdownParaHtml('<img src=x onerror=alert(1)> [clique](javascript:alert(1))')
  assert.ok(!html.includes('<img'), 'HTML ativo não pode ser renderizado')
  assert.ok(!html.includes('href="javascript:'), 'link javascript: não pode ser criado')
  assert.equal(chaveValida('../../etc/passwd'), false, 'chave com traversal deve ser rejeitada')

  const ambienteAnterior = process.env.NODE_ENV
  const scannerAnterior = process.env.PDF_ANTIVIRUS_SOCKET
  try {
    Reflect.set(process.env, 'NODE_ENV', 'production')
    delete process.env.PDF_ANTIVIRUS_SOCKET
    assert.equal(await verificarPdfAntesDeSalvar(Buffer.from('%PDF-')), 'indisponivel', 'PDF sem scanner deve ser recusado em produção')
  } finally {
    if (ambienteAnterior === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV')
    else Reflect.set(process.env, 'NODE_ENV', ambienteAnterior)
    if (scannerAnterior === undefined) delete process.env.PDF_ANTIVIRUS_SOCKET
    else process.env.PDF_ANTIVIRUS_SOCKET = scannerAnterior
  }
  console.log('OK: XSS em Markdown, traversal de arquivo e PDF sem scanner bloqueados.')
}

main().catch((erro) => { console.error(erro); process.exitCode = 1 })
