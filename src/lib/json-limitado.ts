/** Limita o corpo real, inclusive em envios sem Content-Length. */
async function lerBytesLimitados(req: Request, limiteBytes: number): Promise<Uint8Array | null> {
  const tamanhoDeclarado = Number(req.headers.get('content-length'))
  if (Number.isFinite(tamanhoDeclarado) && tamanhoDeclarado > limiteBytes) return null
  if (!req.body) return null

  const leitor = req.body.getReader()
  const partes: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await leitor.read()
      if (done) break
      total += value.byteLength
      if (total > limiteBytes) {
        await leitor.cancel()
        return null
      }
      partes.push(value)
    }
    const bytes = new Uint8Array(total)
    let posicao = 0
    for (const parte of partes) {
      bytes.set(parte, posicao)
      posicao += parte.byteLength
    }
    return bytes
  } catch {
    return null
  } finally {
    leitor.releaseLock()
  }
}

/** Lê JSON com limite real de bytes, mesmo sem Content-Length. */
export async function lerJsonLimitado(req: Request, limiteBytes = 16 * 1024): Promise<unknown> {
  const bytes = await lerBytesLimitados(req, limiteBytes)
  if (!bytes) return null
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    return null
  }
}

/** Além do tamanho, exige um objeto JSON no topo (sem arrays). */
export async function lerObjetoJsonLimitado(req: Request, limiteBytes = 16 * 1024): Promise<Record<string, unknown> | null> {
  const valor = await lerJsonLimitado(req, limiteBytes)
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor as Record<string, unknown> : null
}

/** Evita que o parser multipart carregue um upload arbitrariamente grande na memória. */
export async function lerFormularioLimitado(req: Request, limiteBytes: number): Promise<FormData | null> {
  const tipo = req.headers.get('content-type')
  if (!tipo?.toLowerCase().startsWith('multipart/form-data;')) return null
  const bytes = await lerBytesLimitados(req, limiteBytes)
  if (!bytes) return null
  try {
    return await new Response(bytes as unknown as BodyInit, { headers: { 'Content-Type': tipo } }).formData()
  } catch {
    return null
  }
}
