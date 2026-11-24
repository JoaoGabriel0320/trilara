import { type NextRequest } from 'next/server'
import { getSessao, sessaoFoiSubstituida } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const INTERVALO_VERIFICACAO_MS = 1_000

export async function GET(request: NextRequest) {
  const sessao = await getSessao()
  const motivoInicial = sessao ? null : (await sessaoFoiSubstituida() ? 'novo-login' : 'sessao-expirada')
  const encoder = new TextEncoder()
  let intervalo: ReturnType<typeof setInterval> | undefined
  let encerrado = false
  let consultando = false
  let limparAbort: (() => void) | undefined

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      function encerrar() {
        if (encerrado) return
        encerrado = true
        if (intervalo) clearInterval(intervalo)
        limparAbort?.()
        controller.close()
      }

      function avisar(motivo: string) {
        if (encerrado) return
        controller.enqueue(encoder.encode(`event: ${motivo}\ndata: {}\n\n`))
        encerrar()
      }

      controller.enqueue(encoder.encode(': conectado\n\n'))
      if (motivoInicial) {
        avisar(motivoInicial)
        return
      }

      let verificacoes = 0
      intervalo = setInterval(async () => {
        if (encerrado || consultando || !sessao) return
        consultando = true
        try {
          const registro = await prisma.sessaoColaborador.findUnique({
            where: { id: sessao.sessaoId },
            select: { substituidaEm: true, expiraEm: true },
          })
          if (encerrado) return
          if (registro?.substituidaEm) avisar('novo-login')
          else if (!registro || registro.expiraEm.getTime() <= Date.now()) avisar('sessao-expirada')
          else if (++verificacoes % 15 === 0) controller.enqueue(encoder.encode(': ativo\n\n'))
        } catch {
          // EventSource reconecta automaticamente; a checagem HTTP continua como reserva.
          encerrar()
        } finally {
          consultando = false
        }
      }, INTERVALO_VERIFICACAO_MS)

      request.signal.addEventListener('abort', encerrar, { once: true })
      limparAbort = () => request.signal.removeEventListener('abort', encerrar)
      if (request.signal.aborted) encerrar()
    },
    cancel() {
      encerrado = true
      if (intervalo) clearInterval(intervalo)
      limparAbort?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
