import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { destinoAposLogin } from '../src/lib/destino-login'
import { lerFormularioLimitado, lerObjetoJsonLimitado } from '../src/lib/json-limitado'
import { markdownParaHtml } from '../src/lib/markdown'
import { urlExternaValida } from '../src/lib/url-externa'
import { camposDocumentoDentroDosLimites } from '../src/lib/campos-documento'
import { verificarPdfAntesDeSalvar, verificarPdfComClamAV } from '../src/lib/pdf-antivirus'

async function testarScanner(resposta: string, esperado: 'limpo' | 'infectado') {
  const socketPath = process.platform === 'win32'
    ? `\\\\.\\pipe\\hub-pdf-${randomUUID()}`
    : path.join(tmpdir(), `hub-pdf-${randomUUID()}.sock`)
  const servidor = createServer((conexao) => {
    let recebido = Buffer.alloc(0)
    conexao.on('data', (parte: Buffer) => {
      recebido = Buffer.concat([recebido, parte])
      if (recebido.subarray(0, 10).toString() === 'zINSTREAM\0' && recebido.subarray(-4).equals(Buffer.alloc(4))) {
        conexao.end(`stream: ${resposta}\0`)
      }
    })
  })
  await new Promise<void>((ok) => servidor.listen(socketPath, ok))
  try {
    assert.equal(await verificarPdfComClamAV(Buffer.from('%PDF-1.7\n%%EOF'), socketPath), esperado)
  } finally {
    await new Promise<void>((ok) => servidor.close(() => ok()))
  }
}

async function testar() {
  assert.equal(destinoAposLogin('/inicio?aba=favoritos'), '/inicio?aba=favoritos')
  for (const destino of ['//outro.site', '/\\outro.site', 'https://outro.site', '/inicio\nLocation: outro.site']) {
    assert.equal(destinoAposLogin(destino), '/inicio')
  }

  assert.equal(urlExternaValida('https://exemplo.com/manual'), true)
  for (const url of ['javascript:alert(1)', 'https://usuario:senha@exemplo.com', 'https://exemplo.com\\@outro.site']) {
    assert.equal(urlExternaValida(url), false)
  }

  const html = markdownParaHtml('<img src=x onerror=alert(1)> [abrir](javascript:alert(1))')
  assert.equal(html.includes('<img'), false)
  assert.equal(html.includes('href="javascript:'), false)

  const json = () => new Request('https://hub.local/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valor: 'x'.repeat(100) }),
  })
  assert.equal(await lerObjetoJsonLimitado(json(), 32), null)
  assert.deepEqual(await lerObjetoJsonLimitado(new Request('https://hub.local/api', {
    method: 'POST', body: '{"ok":true}', headers: { 'Content-Type': 'application/json' },
  })), { ok: true })
  assert.equal(await lerObjetoJsonLimitado(new Request('https://hub.local/api', {
    method: 'POST', body: '[1]', headers: { 'Content-Type': 'application/json' },
  })), null)

  const formulario = new FormData()
  formulario.set('titulo', 'Documento seguro')
  const envio = () => new Request('https://hub.local/api', { method: 'POST', body: formulario })
  assert.equal((await lerFormularioLimitado(envio(), 1024))?.get('titulo'), 'Documento seguro')
  assert.equal(await lerFormularioLimitado(envio(), 8), null)

  assert.equal(camposDocumentoDentroDosLimites(formulario), true)
  formulario.set('titulo', 'x'.repeat(201))
  assert.equal(camposDocumentoDentroDosLimites(formulario), false)

  await testarScanner('OK', 'limpo')
  await testarScanner('Eicar-Test-Signature FOUND', 'infectado')
  const socketAnterior = process.env.PDF_ANTIVIRUS_SOCKET
  const obrigatorioAnterior = process.env.PDF_SCAN_REQUIRED
  try {
    delete process.env.PDF_ANTIVIRUS_SOCKET
    process.env.PDF_SCAN_REQUIRED = 'true'
    assert.equal(await verificarPdfAntesDeSalvar(Buffer.from('%PDF-1.7\n%%EOF')), 'indisponivel')
  } finally {
    if (socketAnterior === undefined) delete process.env.PDF_ANTIVIRUS_SOCKET
    else process.env.PDF_ANTIVIRUS_SOCKET = socketAnterior
    if (obrigatorioAnterior === undefined) delete process.env.PDF_SCAN_REQUIRED
    else process.env.PDF_SCAN_REQUIRED = obrigatorioAnterior
  }

  console.log('Validações de segurança passaram.')
}

testar().catch((erro) => {
  console.error(erro)
  process.exitCode = 1
})
