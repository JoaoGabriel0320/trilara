// src/types/index.ts

export type SystemStatus = 'ONLINE' | 'MAINTENANCE' | 'OFFLINE'

export type SystemColor = 'brand' | 'blue' | 'green' | 'amber' | 'teal' | 'rose'

export type TipoVinculoSistema = 'INTEGRACAO' | 'DEPENDENCIA' | 'PROCESSO'

export interface VinculoSistema {
  destinoSlug: string
  tipo: TipoVinculoSistema
  descricao: string
  direcao: 'IDA' | 'AMBOS'
}

export interface PerfilEcossistema {
  area: string
  funcionalidades: string[]
  quemUsa: string
  responsavel: string
  vinculos: VinculoSistema[]
}

export interface SystemMetric {
  /** Valor exibido (ex: "12.4k", "98%") */
  value: string
  /** Rótulo curto (ex: "acessos no mês") */
  label: string
}

export interface System {
  id: string
  name: string
  slug: string
  /** Inicial usada no monograma (ex: 'P' para Portal de clientes) */
  letter: string
  description: string
  descriptionEn?: string
  longDescription?: string
  longDescriptionEn?: string
  url?: string
  status: SystemStatus
  color: SystemColor
  tags: string[]
  /** KPI estático mostrado nos cards (não é real-time) */
  metric: SystemMetric
  featured?: boolean
  /** URL do vídeo/gif de demonstração (mp4, gif ou URL externa) */
  videoUrl?: string
  /** Caminho da logo do sistema (exibida no banner do modal) */
  logoUrl?: string
  /** 'internal' = mantido pela equipe · 'external' = sistema de terceiro */
  kind?: 'internal' | 'external'
  /** Informações e relações confirmadas pela administração do catálogo. */
  ecossistema?: PerfilEcossistema
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}
