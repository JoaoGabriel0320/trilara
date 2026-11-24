const LIMITES: Record<string, number> = {
  sistemaSlug: 64,
  publico: 7,
  titulo: 200,
  slug: 200,
  descricao: 2000,
  palavrasChave: 2000,
  conteudo: 500_000,
  categoriaId: 100,
  urlExterna: 2048,
  ordem: 12,
  passos: 1_000_000,
  comecePorAqui: 5,
  descartarPassos: 1,
}

export function camposDocumentoDentroDosLimites(form: FormData): boolean {
  return Object.entries(LIMITES).every(([campo, limite]) => {
    const valor = form.get(campo)
    return valor === null || (typeof valor === 'string' && valor.length <= limite)
  })
}

export function lerBooleanoDoForm(form: FormData, campo: string): boolean | undefined | null {
  const valor = form.get(campo)
  if (valor === null) return undefined
  if (valor === 'true') return true
  if (valor === 'false') return false
  return null
}
