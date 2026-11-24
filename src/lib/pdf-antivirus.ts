import { createConnection } from 'node:net'

export type ResultadoAntivirusPdf = 'limpo' | 'infectado' | 'indisponivel' | 'desativado'

/** Envia os bytes ao clamd pelo socket local, usando o protocolo INSTREAM. */
export async function verificarPdfComClamAV(bytes: Buffer, socketPath: string): Promise<'limpo' | 'infectado'> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ path: socketPath })
    let encerrado = false
    let resposta = ''

    function concluir(resultado?: 'limpo' | 'infectado', erro?: Error) {
      if (encerrado) return
      encerrado = true
      socket.destroy()
      if (erro) reject(erro)
      else resolve(resultado!)
    }

    socket.setTimeout(60_000)
    socket.on('timeout', () => concluir(undefined, new Error('Tempo de análise do PDF excedido.')))
    socket.on('error', (erro) => concluir(undefined, erro))
    socket.on('close', () => {
      if (!encerrado) concluir(undefined, new Error('Scanner encerrou a conexão sem resposta.'))
    })
    socket.on('data', (dados: Buffer) => {
      resposta += dados.toString('utf8')
      if (resposta.length > 4096) return concluir(undefined, new Error('Resposta do scanner maior que o esperado.'))
      const fim = resposta.indexOf('\0')
      if (fim === -1) return
      const registro = resposta.slice(0, fim)
      if (/^stream: OK$/.test(registro)) return concluir('limpo')
      if (/^stream: .+ FOUND$/.test(registro)) return concluir('infectado')
      concluir(undefined, new Error('Scanner não confirmou que o PDF está limpo.'))
    })

    socket.on('connect', () => {
      async function enviar() {
        const escrever = (parte: Buffer) => new Promise<void>((ok, falha) => {
          socket.write(parte, (erro) => erro ? falha(erro) : ok())
        })
        await escrever(Buffer.from('zINSTREAM\0'))
        for (let posicao = 0; posicao < bytes.length; posicao += 1024 * 1024) {
          if (encerrado) return
          const parte = bytes.subarray(posicao, posicao + 1024 * 1024)
          const tamanho = Buffer.allocUnsafe(4)
          tamanho.writeUInt32BE(parte.length)
          await escrever(tamanho)
          await escrever(parte)
        }
        if (!encerrado) await escrever(Buffer.alloc(4))
      }
      enviar().catch((erro) => concluir(undefined, erro))
    })
  })
}

export async function verificarPdfAntesDeSalvar(bytes: Buffer): Promise<ResultadoAntivirusPdf> {
  const socketPath = process.env.PDF_ANTIVIRUS_SOCKET?.trim()
  if (!socketPath) return process.env.NODE_ENV === 'production' || process.env.PDF_SCAN_REQUIRED === 'true' ? 'indisponivel' : 'desativado'
  try {
    return await verificarPdfComClamAV(bytes, socketPath)
  } catch (erro) {
    console.error('[pdf-antivirus] scanner indisponível:', erro)
    return 'indisponivel'
  }
}
