import { loadEnvConfig } from '@next/env'
import { PrismaClient } from '@prisma/client'

loadEnvConfig(process.cwd())

const MARCADOR = '[TESTE PAGINAÇÃO HUB]'
const prisma = new PrismaClient()

async function main() {
  const endereco = process.env.DATABASE_URL
  if (!endereco) throw new Error('DATABASE_URL não configurada.')
  const banco = new URL(endereco)
  if (!['127.0.0.1', 'localhost', '::1'].includes(banco.hostname)) {
    throw new Error('Este script só pode alterar o banco local.')
  }

  if (process.argv.includes('--limpar')) {
    const removidos = await prisma.avaliacaoSistema.deleteMany({
      where: { gostaria: { startsWith: MARCADOR } },
    })
    console.log(`${removidos.count} respostas de teste removidas.`)
    return
  }

  const existentes = await prisma.avaliacaoSistema.count({
    where: { gostaria: { startsWith: MARCADOR } },
  })
  if (existentes > 0) {
    console.log(`${existentes} respostas de teste já existem. Nenhuma duplicata foi criada.`)
    return
  }

  const usuarios = await prisma.colaborador.findMany({
    where: { ativo: true, adminProtegido: false, nome: { contains: 'teste', mode: 'insensitive' } },
    select: { id: true, filialNome: true },
    orderBy: { nome: 'asc' },
    take: 10,
  })
  const sistema = await prisma.sistemaCadastro.findUnique({ where: { slug: 'portal-de-clientes' }, select: { ativo: true } })
  if (!usuarios.length || !sistema?.ativo) throw new Error('É preciso ter contas de teste ativas e o Portal de clientes no banco local.')

  const exemplos = [
    { nota: 5, gosta: 'Encontro os manuais rapidamente.', melhorar: 'Destacar os conteúdos atualizados.', gostaria: 'Uma lista de novidades.' },
    { nota: 4, gosta: 'As instruções são fáceis de seguir.', melhorar: 'Adicionar mais imagens em alguns passos.', gostaria: 'Tutoriais curtos em vídeo.' },
    { nota: 3, gosta: 'A busca ajuda bastante.', melhorar: 'Melhorar os resultados para termos parecidos.', gostaria: 'Sugestões automáticas na busca.' },
    { nota: 5, gosta: 'Consigo consultar tudo pelo celular.', melhorar: 'Nada por enquanto.', gostaria: 'Atalhos para os manuais favoritos.' },
    { nota: 2, gosta: 'Os documentos estão organizados por assunto.', melhorar: 'Revisar instruções antigas.', gostaria: 'Aviso quando um manual for revisado.' },
    { nota: 4, gosta: 'A navegação é simples.', melhorar: 'Mostrar a data de atualização com mais destaque.', gostaria: 'Uma seção de dúvidas frequentes.' },
    { nota: 1, gosta: 'O acesso ao portal é rápido.', melhorar: 'Explicar melhor algumas etapas do processo.', gostaria: 'Exemplos práticos em cada módulo.' },
    { nota: 3, gosta: 'A separação por sistema facilita a consulta.', melhorar: 'Incluir mais palavras-chave.', gostaria: 'Filtros por departamento.' },
    { nota: 4, gosta: 'Os materiais abrem sem dificuldade.', melhorar: 'Deixar os títulos mais objetivos.', gostaria: 'Opção para compartilhar um manual.' },
    { nota: 5, gosta: 'Achei a resposta que precisava em poucos cliques.', melhorar: 'Continuar atualizando o conteúdo.', gostaria: 'Mais guias passo a passo.' },
  ]

  const agora = Date.now()
  const resultado = await prisma.avaliacaoSistema.createMany({
    data: exemplos.map((exemplo, indice) => {
      const usuario = usuarios[indice % usuarios.length]
      return {
        colaboradorId: usuario.id,
        sistemaSlug: 'portal-de-clientes',
        filialNome: usuario.filialNome,
        nota: exemplo.nota,
        gosta: exemplo.gosta,
        melhorar: exemplo.melhorar,
        gostaria: `${MARCADOR} ${exemplo.gostaria}`,
        criadoEm: new Date(agora - indice * 60_000),
      }
    }),
  })
  console.log(`${resultado.count} respostas de teste criadas no banco local.`)
}

main().catch((erro) => {
  console.error(erro)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
