// src/lib/markdown.ts
//
// Renderizador de markdown mínimo, sem dependência externa. A ordem importa:
// o HTML da entrada é escapado ANTES de qualquer conversão, então nenhuma tag
// escrita no editor chega ao navegador — é o que dispensa um sanitizador.
// Suporta: títulos, negrito, itálico, código, links, listas e citações.

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inline(texto: string): string {
  return texto
    .replace(/`([^`]+)`/g, '<code class="rounded bg-ink-100 dark:bg-ink-800 px-1.5 py-0.5 font-mono text-[0.9em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    // Só http(s) e caminhos internos: bloqueia javascript: no destino do link.
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g,
      '<a href="$2" class="text-brand-600 dark:text-brand-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
    )
}

export function markdownParaTextoPlano(valor: string): string {
  return valor
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_>`~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim()
}

export function markdownParaHtml(markdown: string): string {
  const linhas = escaparHtml(markdown).split(/\r?\n/)
  const saida: string[] = []
  let emLista = false

  const fecharLista = () => {
    if (emLista) {
      saida.push('</ul>')
      emLista = false
    }
  }

  for (const linha of linhas) {
    const l = linha.trimEnd()

    if (!l.trim()) {
      fecharLista()
      continue
    }

    const titulo = /^(#{1,4})\s+(.*)$/.exec(l)
    if (titulo) {
      fecharLista()
      const nivel = titulo[1].length
      const tamanhos = ['text-[24px] mt-8', 'text-[19px] mt-7', 'text-[16px] mt-6', 'text-[15px] mt-5']
      saida.push(
        `<h${nivel + 1} class="${tamanhos[nivel - 1]} mb-2 font-semibold tracking-tight text-ink-900 dark:text-ink-50">${inline(titulo[2])}</h${nivel + 1}>`
      )
      continue
    }

    const item = /^[-*]\s+(.*)$/.exec(l)
    if (item) {
      if (!emLista) {
        saida.push('<ul class="my-3 list-disc space-y-1.5 pl-5">')
        emLista = true
      }
      saida.push(`<li>${inline(item[1])}</li>`)
      continue
    }

    const citacao = /^&gt;\s+(.*)$/.exec(l)
    if (citacao) {
      fecharLista()
      saida.push(
        `<blockquote class="my-4 border-l-2 border-brand-400 pl-4 text-ink-600 dark:text-ink-400">${inline(citacao[1])}</blockquote>`
      )
      continue
    }

    fecharLista()
    saida.push(`<p class="my-3 leading-relaxed">${inline(l)}</p>`)
  }

  fecharLista()
  return saida.join('\n')
}
