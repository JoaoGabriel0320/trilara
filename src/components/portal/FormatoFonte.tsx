'use client'

import { LayoutGrid } from 'lucide-react'
import { ICONE_TIPO, ROTULO_TIPO } from '@/components/portal/BuscaGlobal'
import type { FonteAssistente } from '@/lib/assistente-hub'

export function FormatoFonte({ tipo }: { tipo: FonteAssistente['tipo'] }) {
  const Icone = tipo === 'SISTEMA' ? LayoutGrid : ICONE_TIPO[tipo]
  const rotulo = tipo === 'SISTEMA' ? 'Sistema' : ROTULO_TIPO[tipo]
  return <span className="inline-flex items-center gap-1"><Icone size={13} aria-hidden="true" />{rotulo}</span>
}
