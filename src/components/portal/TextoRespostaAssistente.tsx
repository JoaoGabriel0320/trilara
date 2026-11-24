import { Fragment } from 'react'
import { limparCitacoesDoAssistente } from '@/lib/assistente-citacoes'

export function TextoRespostaAssistente({ texto }: { texto: string }) {
  const partes = limparCitacoesDoAssistente(texto).split(/(\*\*[^*\n]+\*\*)/g)

  return <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{partes.map((parte, indice) =>
    parte.startsWith('**') && parte.endsWith('**')
      ? <strong key={indice} className="font-semibold">{parte.slice(2, -2)}</strong>
      : <Fragment key={indice}>{parte}</Fragment>
  )}</p>
}
