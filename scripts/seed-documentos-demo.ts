// Conteúdo inteiramente fictício para demonstrar a documentação da Trilara.
// Uso: npm run demo:documentos
import { loadEnvConfig } from '@next/env'
import { PrismaClient, type TipoDestaquePasso } from '@prisma/client'

loadEnvConfig(process.cwd(), false)

type Passo = {
  titulo: string
  texto: string
  caminhoAcesso?: string
  destaqueTipo?: TipoDestaquePasso
  destaqueTexto?: string
}

type Exemplo = {
  sistemaSlug: string
  slug: string
  titulo: string
  descricao: string
  categoria: 'Primeiros passos' | 'Operação diária' | 'Referência'
  palavrasChave: string
  comecePorAqui?: boolean
  conteudo?: string
  passos?: Passo[]
}

const aviso = '> Exemplo fictício para demonstração da Trilara. Nomes, registros e telas mencionados aqui não representam uma operação real.'

const exemplos: Exemplo[] = [
  {
    sistemaSlug: 'portal-de-clientes', slug: 'demo-comece-portal-clientes',
    titulo: 'Comece por aqui: Portal de clientes',
    descricao: 'Conheça a organização das solicitações, os status e os arquivos do portal de demonstração.',
    categoria: 'Primeiros passos', palavrasChave: 'introdução, início, solicitação, cliente', comecePorAqui: true,
    conteudo: `${aviso}\n\n## Para que serve\n\nO Portal de clientes reúne pedidos de atendimento em um só lugar. Neste cenário, a empresa fictícia **Aurora Ateliê** usa o portal para acompanhar dúvidas sobre seus pedidos.\n\n## O que você encontra\n\n- **Solicitações:** lista com assunto, número de referência e situação.\n- **Arquivos:** anexos enviados durante o atendimento.\n- **Atualizações:** histórico de mensagens em ordem cronológica.\n\n## Seu primeiro percurso\n\nAbra **Solicitações**, selecione um registro de exemplo e confira o histórico antes de responder. Use a busca pelo número ou pelo assunto quando a lista estiver longa.\n\n> Dica: para demonstrar o sistema, use apenas registros criados para a apresentação.`,
  },
  {
    sistemaSlug: 'portal-de-clientes', slug: 'demo-acompanhar-solicitacao',
    titulo: 'Como acompanhar uma solicitação',
    descricao: 'Guia de demonstração para localizar uma solicitação e entender seu andamento.',
    categoria: 'Operação diária', palavrasChave: 'chamado, ticket, atendimento, status',
    passos: [
      { titulo: 'Abra a lista de solicitações', texto: 'No exemplo fictício, entre no Portal de clientes e escolha **Solicitações**. A lista mostra os registros mais recentes primeiro.', caminhoAcesso: 'Portal de clientes > Solicitações' },
      { titulo: 'Encontre o registro', texto: 'Pesquise pelo assunto “Troca de endereço” ou pelo número de referência de demonstração **SOL-1042**. Confira o nome antes de abrir.', destaqueTipo: 'DICA', destaqueTexto: 'O número SOL-1042 é inventado e serve apenas para ilustrar a busca.' },
      { titulo: 'Leia o histórico', texto: 'Abra a solicitação e percorra as atualizações em ordem. Observe quem registrou cada mensagem e quando ela foi adicionada.' },
      { titulo: 'Confira o status', texto: 'Veja se o registro está **Aberto**, **Em análise** ou **Concluído**. Se houver uma próxima ação, ela aparece junto da atualização mais recente.', destaqueTipo: 'ATENCAO', destaqueTexto: 'Não use o status de um registro fictício para orientar um atendimento real.' },
    ],
  },
  {
    sistemaSlug: 'portal-de-clientes', slug: 'demo-status-solicitacoes',
    titulo: 'Entenda os status das solicitações',
    descricao: 'Página de referência com o significado dos status usados na apresentação.',
    categoria: 'Referência', palavrasChave: 'situação, aberto, análise, concluído',
    conteudo: `${aviso}\n\n## Aberto\n\nA solicitação foi recebida e ainda aguarda a primeira análise.\n\n## Em análise\n\nUma pessoa está verificando as informações e pode pedir detalhes adicionais.\n\n## Concluído\n\nA resposta final foi registrada. O histórico continua disponível para consulta.\n\nEsses nomes são apenas um vocabulário de exemplo para a apresentação.`,
  },
  {
    sistemaSlug: 'agenda-de-operacoes', slug: 'demo-comece-agenda',
    titulo: 'Comece por aqui: Agenda de operações',
    descricao: 'Veja como a agenda fictícia organiza compromissos, responsáveis e horários.',
    categoria: 'Primeiros passos', palavrasChave: 'agenda, calendário, compromisso, início', comecePorAqui: true,
    conteudo: `${aviso}\n\n## Visão geral\n\nA Agenda de operações mostra atividades de uma equipe fictícia em uma linha do tempo. Cada compromisso tem título, horário e responsável.\n\n## Como se orientar\n\nUse a visão semanal para localizar espaços livres. Abra um compromisso para ver a descrição e confirmar quem participa. A visualização por dia ajuda a conferir a sequência das atividades.\n\n## Exemplo de uso\n\nUma equipe de demonstração agenda uma **Revisão do catálogo** para terça-feira às 10h. Antes de criar outro compromisso, verifica se o horário já está ocupado.`,
  },
  {
    sistemaSlug: 'agenda-de-operacoes', slug: 'demo-criar-compromisso',
    titulo: 'Como criar um compromisso de exemplo',
    descricao: 'Passo a passo para ilustrar a inclusão de uma atividade na agenda fictícia.',
    categoria: 'Operação diária', palavrasChave: 'evento, marcar, calendário, horário',
    passos: [
      { titulo: 'Escolha o dia', texto: 'Na visão semanal da agenda fictícia, selecione um dia com horário livre.', caminhoAcesso: 'Agenda de operações > Visão semanal' },
      { titulo: 'Preencha os dados', texto: 'Use o título “Revisão do catálogo”, indique um horário de exemplo e adicione uma descrição curta da atividade.' },
      { titulo: 'Confira conflitos', texto: 'Antes de salvar, compare o horário com os demais compromissos exibidos na agenda.', destaqueTipo: 'REGRA', destaqueTexto: 'Neste exemplo, um responsável não deve ter dois compromissos no mesmo horário.' },
      { titulo: 'Salve e confira', texto: 'Conclua a criação e volte à visão semanal. O novo compromisso deve aparecer no dia escolhido.' },
    ],
  },
  {
    sistemaSlug: 'gestao-financeira', slug: 'demo-comece-financeiro',
    titulo: 'Comece por aqui: Gestão financeira',
    descricao: 'Introdução aos lançamentos e relatórios do cenário financeiro fictício.',
    categoria: 'Primeiros passos', palavrasChave: 'financeiro, lançamento, relatório, início', comecePorAqui: true,
    conteudo: `${aviso}\n\n## O que aparece no painel\n\nO cenário de Gestão financeira reúne lançamentos de exemplo, agrupados por período e situação. Os valores exibidos são inventados.\n\n## Conceitos básicos\n\n- **Previsto:** valor planejado, ainda sem confirmação.\n- **Confirmado:** valor registrado no cenário de demonstração.\n- **Pendente:** item que precisa de revisão.\n\n## Primeiro acesso\n\nEscolha um período, abra a lista de lançamentos e examine os filtros. O relatório mostra um resumo dos mesmos registros, para comparar a visão detalhada com a visão agregada.\n\nNenhum dado desta página deve ser usado para decisões financeiras reais.`,
  },
  {
    sistemaSlug: 'gestao-financeira', slug: 'demo-consultar-lancamento',
    titulo: 'Como consultar um lançamento fictício',
    descricao: 'Exemplo de consulta por período e situação, com conferência dos detalhes.',
    categoria: 'Operação diária', palavrasChave: 'consulta, período, valor, lançamento',
    passos: [
      { titulo: 'Abra os lançamentos', texto: 'Acesse a lista de lançamentos do cenário de demonstração.', caminhoAcesso: 'Gestão financeira > Lançamentos' },
      { titulo: 'Defina o período', texto: 'Selecione um mês de exemplo e aplique o filtro **Pendente** para reduzir a lista.' },
      { titulo: 'Examine um item', texto: 'Abra um lançamento fictício e confira descrição, data, valor de exemplo e situação.' },
      { titulo: 'Compare com o resumo', texto: 'Volte ao relatório do período e verifique como o item aparece no total da categoria.', destaqueTipo: 'ATENCAO', destaqueTexto: 'Os valores e resultados da demonstração não são registros contábeis.' },
    ],
  },
  {
    sistemaSlug: 'controle-de-estoque', slug: 'demo-comece-estoque',
    titulo: 'Comece por aqui: Controle de estoque',
    descricao: 'Conheça itens, quantidades e movimentações em um depósito de exemplo.',
    categoria: 'Primeiros passos', palavrasChave: 'estoque, depósito, item, início', comecePorAqui: true,
    conteudo: `${aviso}\n\n## Conheça o cenário\n\nO depósito fictício **Estação Norte** guarda materiais de escritório para uma equipe de demonstração. Cada item tem código, descrição e quantidade disponível.\n\n## Áreas principais\n\n- **Itens:** cadastro e busca por código ou nome.\n- **Movimentações:** entradas e saídas em ordem de data.\n- **Resumo:** visão das quantidades atuais.\n\n## Uma leitura útil\n\nAbra um item e observe a sequência de movimentações. A quantidade final resulta do saldo inicial somado às entradas e subtraído das saídas.`,
  },
  {
    sistemaSlug: 'controle-de-estoque', slug: 'demo-registrar-entrada',
    titulo: 'Como registrar uma entrada de exemplo',
    descricao: 'Guia ilustrativo para adicionar quantidade a um item fictício.',
    categoria: 'Operação diária', palavrasChave: 'entrada, recebimento, quantidade, item',
    passos: [
      { titulo: 'Localize o item', texto: 'Na lista de itens de demonstração, procure “Caderno A5” e confira o código mostrado no cadastro.', caminhoAcesso: 'Controle de estoque > Itens' },
      { titulo: 'Inicie a movimentação', texto: 'Abra o item e selecione uma nova movimentação do tipo **Entrada**.' },
      { titulo: 'Informe a quantidade', texto: 'Digite uma quantidade de exemplo, como **12 unidades**, e registre uma observação curta.', destaqueTipo: 'DICA', destaqueTexto: 'Na apresentação, use quantidades inventadas e evite reproduzir comprovantes reais.' },
      { titulo: 'Confira o saldo', texto: 'Salve a movimentação e verifique se ela aparece no histórico e no resumo do item.' },
    ],
  },
  {
    sistemaSlug: 'painel-de-entregas', slug: 'demo-comece-entregas',
    titulo: 'Comece por aqui: Painel de entregas',
    descricao: 'Entenda como ler a linha do tempo e as ocorrências das entregas de exemplo.',
    categoria: 'Primeiros passos', palavrasChave: 'entrega, transporte, rastreamento, início', comecePorAqui: true,
    conteudo: `${aviso}\n\n## Visão geral\n\nO Painel de entregas reúne etapas de pedidos fictícios. A linha do tempo ajuda a entender o que já aconteceu e qual é a próxima etapa prevista.\n\n## Informações principais\n\nCada registro mostra uma referência, uma situação e as atualizações recebidas. Uma ocorrência descreve algo que precisa de atenção, como um endereço incompleto no cenário de demonstração.\n\n## Por onde começar\n\nAbra a lista, selecione uma entrega de exemplo e percorra as etapas do início ao fim. Compare a situação atual com a atualização mais recente.`,
  },
  {
    sistemaSlug: 'painel-de-entregas', slug: 'demo-consultar-entrega',
    titulo: 'Como consultar uma entrega de exemplo',
    descricao: 'Passo a passo para localizar uma entrega fictícia e ler suas atualizações.',
    categoria: 'Operação diária', palavrasChave: 'pedido, rastrear, status, ocorrência',
    passos: [
      { titulo: 'Abra as entregas', texto: 'Entre na lista de entregas do painel de demonstração.', caminhoAcesso: 'Painel de entregas > Entregas' },
      { titulo: 'Pesquise a referência', texto: 'Use a referência inventada **ENT-2086** e abra o resultado correspondente.' },
      { titulo: 'Leia a linha do tempo', texto: 'Percorra as etapas em ordem e identifique a atualização mais recente.' },
      { titulo: 'Verifique as ocorrências', texto: 'Se houver uma ocorrência, leia a descrição e a ação sugerida no próprio registro.', destaqueTipo: 'ATENCAO', destaqueTexto: 'ENT-2086 é uma referência fictícia; não representa rastreamento de uma entrega real.' },
    ],
  },
]

async function main() {
  const banco = new URL(process.env.DATABASE_URL ?? '')
  if (!['localhost', '127.0.0.1', '[::1]'].includes(banco.hostname)
    || banco.port !== '5435' || banco.pathname !== '/trilara' || banco.username !== 'trilara') {
    throw new Error('Este comando só pode usar o banco pessoal local trilara na porta 5435.')
  }

  const prisma = new PrismaClient()
  try {
    let criados = 0
    let existentes = 0
    await prisma.$transaction(async (tx) => {
      const categorias = new Map<string, string>()
      for (const exemplo of exemplos) {
        const chave = `${exemplo.sistemaSlug}:${exemplo.categoria}`
        if (!categorias.has(chave)) {
          const categoria = await tx.categoria.upsert({
            where: { sistemaSlug_nome: { sistemaSlug: exemplo.sistemaSlug, nome: exemplo.categoria } },
            create: {
              sistemaSlug: exemplo.sistemaSlug,
              nome: exemplo.categoria,
              ordem: exemplo.categoria === 'Primeiros passos' ? 0 : exemplo.categoria === 'Operação diária' ? 1 : 2,
            },
            update: {},
          })
          categorias.set(chave, categoria.id)
        }

        const documento = await tx.documento.findUnique({
          where: { sistemaSlug_slug: { sistemaSlug: exemplo.sistemaSlug, slug: exemplo.slug } },
          select: { id: true },
        })
        if (documento) { existentes++; continue }

        await tx.documento.create({
          data: {
            sistemaSlug: exemplo.sistemaSlug,
            slug: exemplo.slug,
            titulo: exemplo.titulo,
            descricao: exemplo.descricao,
            tipo: exemplo.passos ? 'PASSO_A_PASSO' : 'ARTIGO',
            publico: 'INTERNO',
            conteudo: exemplo.conteudo,
            palavrasChave: exemplo.palavrasChave,
            comecePorAqui: exemplo.comecePorAqui ?? false,
            categoriaId: categorias.get(chave),
            ordem: exemplo.comecePorAqui ? 0 : exemplo.passos ? 1 : 2,
            passos: exemplo.passos ? {
              create: exemplo.passos.map((passo, ordem) => ({ ...passo, ordem })),
            } : undefined,
          },
        })
        criados++
      }
    })
    console.log(`${criados} documentos fictícios criados; ${existentes} já existiam e foram preservados.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((erro) => { console.error(erro); process.exitCode = 1 })
