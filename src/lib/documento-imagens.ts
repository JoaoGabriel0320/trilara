import { removerArquivo, salvarImagem, TAMANHO_MAXIMO_IMAGEM_BYTES, MAX_IMAGENS_DOCUMENTO, ImagemInvalidaError } from './storage'

export type ImagemSalva = {
  arquivoKey: string
  arquivoNome: string
  arquivoBytes: number
  mimeType: string
  ordem: number
}

export function lerImagensDoForm(
  form: FormData,
  opcoes: { campo?: string; limite?: number; mensagemLimite?: string } = {},
): File[] {
  const campo = opcoes.campo ?? 'imagens'
  const limite = opcoes.limite ?? MAX_IMAGENS_DOCUMENTO
  const entradas = form.getAll(campo)
  if (entradas.length > limite) {
    throw new ImagemInvalidaError(opcoes.mensagemLimite ?? `Adicione no máximo ${limite} imagens por documento.`)
  }
  const arquivos: File[] = []
  for (const entrada of entradas) {
    if (!(entrada instanceof File) || entrada.size === 0) {
      throw new ImagemInvalidaError('Selecione arquivos de imagem válidos.')
    }
    if (entrada.size > TAMANHO_MAXIMO_IMAGEM_BYTES) {
      throw new ImagemInvalidaError('Cada imagem pode ter no máximo 8 MB.')
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(entrada.type)) {
      throw new ImagemInvalidaError('Envie imagens PNG, JPEG ou WebP.')
    }
    arquivos.push(entrada)
  }
  return arquivos
}

export function lerImagensRemover(form: FormData): string[] {
  const valor = form.get('imagensRemover')
  if (valor === null) return []
  if (typeof valor !== 'string') throw new ImagemInvalidaError('Lista de imagens inválida.')
  let ids: unknown
  try {
    ids = JSON.parse(valor)
  } catch {
    throw new ImagemInvalidaError('Lista de imagens inválida.')
  }
  if (!Array.isArray(ids) || ids.length > MAX_IMAGENS_DOCUMENTO || ids.some((id) => typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) || new Set(ids).size !== ids.length) {
    throw new ImagemInvalidaError('Lista de imagens inválida.')
  }
  return ids
}

export async function salvarImagens(sistemaSlug: string, arquivos: File[], ordemInicial = 0): Promise<ImagemSalva[]> {
  const salvas: ImagemSalva[] = []
  try {
    for (const [indice, arquivo] of arquivos.entries()) {
      const salvo = await salvarImagem(sistemaSlug, Buffer.from(await arquivo.arrayBuffer()), arquivo.type)
      const nome = arquivo.name.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 255) || `imagem-${indice + 1}`
      salvas.push({
        arquivoKey: salvo.chave,
        arquivoNome: nome,
        arquivoBytes: salvo.tamanho,
        mimeType: salvo.mimeType,
        ordem: ordemInicial + indice,
      })
    }
    return salvas
  } catch (erro) {
    await Promise.all(salvas.map((imagem) => removerArquivo(imagem.arquivoKey)))
    throw erro
  }
}
