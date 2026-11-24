const FUSO = 'America/Sao_Paulo'

const FRASES = [
  'Compartilhar o que aprendemos facilita o próximo passo de alguém.',
  'Hoje é uma nova chance de avançar, um passo de cada vez.',
  'Conhecimento útil é aquele que chega a quem precisa.',
  'O progresso aparece quando damos atenção às pequenas melhorias.',
  'Documentar uma solução também é cuidar da equipe.',
  'Cada desafio superado mostra o quanto você pode avançar.',
  'Boas perguntas abrem espaço para boas soluções.',
  'Você pode aprender algo novo a cada dia.',
  'Um processo claro ajuda todos a avançar.',
  'Juntos, somos capazes de ir mais longe.',
  'O que você descobre hoje pode ajudar alguém amanhã.',
  'Seu esforço de hoje contribui para uma equipe mais forte.',
  'Vale registrar o caminho depois de encontrar a solução.',
  'Um passo de cada vez também é progresso.',
  'Quando a equipe compartilha, todos ganham confiança para avançar.',
  'Você não precisa saber tudo: aprender faz parte do caminho.',
  'Toda melhoria começa com alguém que decide tentar.',
  'A melhor resposta costuma nascer de uma boa pergunta.',
  'Experiência compartilhada vira referência para todos.',
  'Desafios ficam mais leves quando buscamos soluções juntos.',
  'Um procedimento bem explicado dá confiança a quem começa.',
  'Aprender com o que passou nos prepara para ir além.',
  'A constância de hoje constrói resultados amanhã.',
  'Conhecimento ganha valor quando circula pela equipe.',
  'Sua contribuição faz diferença para a equipe.',
  'Organizar uma ideia é o primeiro passo para colocá-la em prática.',
  'O cuidado com os detalhes torna bons resultados ainda melhores.',
  'Compartilhe suas conquistas: elas podem inspirar alguém.',
] as const

const formato = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
})

/** A mensagem só troca depois das 8h no horário de São Paulo. */
export function diaDaMensagem(agora: Date): number {
  const partes = Object.fromEntries(formato.formatToParts(agora).map(({ type, value }) => [type, value]))
  const dia = Date.UTC(Number(partes.year), Number(partes.month) - 1, Number(partes.day)) / 86_400_000
  return Number(partes.hour) < 8 ? dia - 1 : dia
}

export function deslocamentoDaMensagem(usuarioId: string): number {
  let codigo = 0
  for (const caractere of usuarioId) codigo = (codigo * 31 + caractere.charCodeAt(0)) >>> 0
  return codigo % FRASES.length
}

export function mensagemDoDia(deslocamento: number, agora: Date): string {
  return FRASES[(deslocamento + diaDaMensagem(agora)) % FRASES.length]
}
