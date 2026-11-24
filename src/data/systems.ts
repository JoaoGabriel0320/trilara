import type { System } from '@/types'

// Catálogo fictício inicial da instalação pessoal.
export const INTERNAL_SYSTEMS: System[] = [
  {
    id: 'portal-de-clientes', slug: 'portal-de-clientes', kind: 'internal', letter: 'P', name: 'Portal de clientes',
    description: 'Exemplo de portal para consultar solicitações, arquivos e atualizações.',
    longDescription: 'Sistema fictício usado para demonstrar o catálogo e a documentação da Trilara.',
    status: 'ONLINE', color: 'brand', tags: ['Atendimento', 'Consulta'],
    metric: { value: 'Demo', label: 'exemplo fictício' }, featured: true,
  },
  {
    id: 'agenda-de-operacoes', slug: 'agenda-de-operacoes', kind: 'internal', letter: 'A', name: 'Agenda de operações',
    description: 'Exemplo de agenda compartilhada para organizar tarefas e horários.',
    longDescription: 'Sistema fictício usado para mostrar como as ferramentas podem ser relacionadas.',
    status: 'ONLINE', color: 'blue', tags: ['Agenda', 'Operações'],
    metric: { value: 'Demo', label: 'exemplo fictício' },
  },
  {
    id: 'gestao-financeira', slug: 'gestao-financeira', kind: 'internal', letter: 'F', name: 'Gestão financeira',
    description: 'Exemplo de sistema para acompanhar lançamentos e relatórios financeiros.',
    longDescription: 'Sistema fictício incluído para ilustrar um fluxo de informação entre áreas.',
    status: 'ONLINE', color: 'rose', tags: ['Finanças', 'Relatórios'],
    metric: { value: 'Demo', label: 'exemplo fictício' },
  },
  {
    id: 'controle-de-estoque', slug: 'controle-de-estoque', kind: 'internal', letter: 'E', name: 'Controle de estoque',
    description: 'Exemplo de ferramenta para consultar itens, entradas e saídas.',
    longDescription: 'Sistema fictício incluído para demonstrar categorias, guias e conexões.',
    status: 'ONLINE', color: 'amber', tags: ['Estoque', 'Consulta'],
    metric: { value: 'Demo', label: 'exemplo fictício' },
  },
  {
    id: 'painel-de-entregas', slug: 'painel-de-entregas', kind: 'internal', letter: 'P', name: 'Painel de entregas',
    description: 'Exemplo de painel para visualizar etapas e ocorrências de entrega.',
    longDescription: 'Sistema fictício incluído para demonstrar a visão de ecossistema.',
    status: 'ONLINE', color: 'teal', tags: ['Entregas', 'Acompanhamento'],
    metric: { value: 'Demo', label: 'exemplo fictício' },
  },
]

export const EXTERNAL_SYSTEMS: System[] = []
export const SYSTEMS = [...INTERNAL_SYSTEMS, ...EXTERNAL_SYSTEMS]
export const FEATURED = INTERNAL_SYSTEMS.find((s) => s.featured)!
export const REST = INTERNAL_SYSTEMS.filter((s) => !s.featured)
