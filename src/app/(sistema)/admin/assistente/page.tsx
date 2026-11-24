import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { exigirAdmin } from '@/lib/auth/session'
import { podeVerConsumoAssistente } from '@/lib/assistente-acesso'
import { cotaOpenRouter, estimarNeuronsCloudflare, MODELOS_CLOUDFLARE, neuronsContaCloudflare } from '@/lib/assistente-cotas'
import { GROQ_FREE_REQ_DIA_REFERENCIA, GROQ_FREE_TOKENS_DIA_REFERENCIA, MODELOS_GROQ } from '@/lib/assistente-modelos-groq'
import { LIMITE_TENTATIVAS_DIA, LIMITE_TOKENS_DIA } from '@/lib/assistente-limite'
import { ASSISTENTE_ATIVO } from '@/lib/recursos'

export const metadata: Metadata = { title: 'Consumo do assistente · Trilara', robots: { index: false, follow: false } }

const numero = new Intl.NumberFormat('pt-BR')
const ALERTA_PERCENTUAL = 80
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
})

function Cartao({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe: string }) {
  return <div className="rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800/40">
    <p className="text-sm text-ink-500 dark:text-ink-400">{titulo}</p>
    <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-900 dark:text-ink-50">{valor}</p>
    <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{detalhe}</p>
  </div>
}

function contagem(valor: number | null) { return valor === null ? 'Não informado' : numero.format(valor) }

function BarraCota({ percentual, rotulo }: { percentual: number; rotulo: string }) {
  return <div role="progressbar" aria-label={rotulo} aria-valuenow={Math.min(100, Math.max(0, percentual))} aria-valuemin={0} aria-valuemax={100}
    className="mt-3 h-2 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700">
    <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, Math.max(0, percentual))}%` }} />
  </div>
}

type LeituraGroq = { modelo: string; limiteReqDia: number | null; restantesReqDia: number | null; resetReqEm: Date | null; limiteTokensMin: number | null; restantesTokensMin: number | null; resetTokensEm: Date | null }

function resetExibido(data: Date | null, agora: Date) {
  if (!data) return 'Ainda não recebido; faça uma pergunta para registrar nova leitura'
  return `${dataHora.format(data)} (São Paulo)${data <= agora ? ' · já passou; nova leitura pendente' : ''}`
}

export default async function ConsumoAssistentePage({ searchParams }: { searchParams: Promise<{ dias?: string; pagina?: string }> }) {
  if (!ASSISTENTE_ATIVO) notFound()
  const sessao = await exigirAdmin()
  if (!podeVerConsumoAssistente(sessao.email)) notFound()
  const parametros = await searchParams
  const dias = [0, 7, 30, 90].includes(Number(parametros.dias)) ? Number(parametros.dias) : 30
  const agora = new Date()
  const inicioHojeUtc = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()))
  const where = { criadoEm: { gte: dias === 0 ? inicioHojeUtc : new Date(agora.getTime() - dias * 86400000) } }
  const [resumo, porProvedor, porStatus, porUsuario, porUsuarioHoje, semContagem, recentes, usoHoje, usoGroqPorModelo, usoCloudflarePorModelo, leiturasGroq, openRouterConta, cloudflareConta] = await Promise.all([
    prisma.usoAssistente.aggregate({ where, _count: { _all: true }, _sum: { entradaTokens: true, saidaTokens: true, totalTokens: true }, _avg: { duracaoMs: true } }),
    prisma.usoAssistente.groupBy({ by: ['provedor'], where, _count: { _all: true }, _sum: { totalTokens: true } }),
    prisma.usoAssistente.groupBy({ by: ['provedor', 'status'], where, _count: { _all: true } }),
    prisma.usoAssistente.groupBy({ by: ['colaboradorId'], where, _count: { _all: true }, _sum: { entradaTokens: true, saidaTokens: true, totalTokens: true }, _max: { criadoEm: true } }),
    prisma.usoAssistente.groupBy({ by: ['colaboradorId'], where: { criadoEm: { gte: inicioHojeUtc } }, _count: { _all: true, totalTokens: true }, _sum: { totalTokens: true }, _max: { criadoEm: true } }),
    prisma.usoAssistente.count({ where: { ...where, status: 'SUCESSO', totalTokens: null } }),
    prisma.usoAssistente.findMany({ where, orderBy: { criadoEm: 'desc' }, take: 20, include: { colaborador: { select: { nome: true } } } }),
    prisma.usoAssistente.groupBy({ by: ['provedor'], where: { criadoEm: { gte: inicioHojeUtc } }, _count: { _all: true, entradaTokens: true, saidaTokens: true }, _sum: { entradaTokens: true, saidaTokens: true, totalTokens: true } }),
    prisma.usoAssistente.groupBy({ by: ['modelo'], where: { provedor: 'Groq', criadoEm: { gte: inicioHojeUtc } }, _count: { _all: true }, _sum: { totalTokens: true } }),
    prisma.usoAssistente.groupBy({ by: ['modelo'], where: { provedor: 'Cloudflare', criadoEm: { gte: inicioHojeUtc } }, _count: { _all: true, entradaTokens: true, saidaTokens: true }, _sum: { entradaTokens: true, saidaTokens: true, totalTokens: true } }),
    prisma.$queryRaw<LeituraGroq[]>`SELECT DISTINCT ON ("modelo") "modelo", "limiteReqDia", "restantesReqDia", "resetReqEm", "limiteTokensMin", "restantesTokensMin", "resetTokensEm"
      FROM "UsoAssistente" WHERE "provedor" = 'Groq' AND "criadoEm" >= ${inicioHojeUtc}
        AND ("limiteReqDia" IS NOT NULL OR "limiteTokensMin" IS NOT NULL)
      ORDER BY "modelo", "criadoEm" DESC`,
    cotaOpenRouter(),
    neuronsContaCloudflare(inicioHojeUtc),
  ])
  const sucessos = porStatus.filter((item) => item.status === 'SUCESSO').reduce((soma, item) => soma + item._count._all, 0)
  const idsColaboradores = [...new Set([...porUsuario, ...porUsuarioHoje].flatMap((item) => item.colaboradorId ? [item.colaboradorId] : []))]
  const colaboradores = idsColaboradores.length ? await prisma.colaborador.findMany({
    where: { id: { in: idsColaboradores } }, select: { id: true, nome: true },
  }) : []
  const nomes = new Map(colaboradores.map((item) => [item.id, item.nome]))
  const ranking = porUsuario.sort((a, b) =>
    (b._sum.totalTokens ?? 0) - (a._sum.totalTokens ?? 0)
    || b._count._all - a._count._all
    || (b._max.criadoEm?.getTime() ?? 0) - (a._max.criadoEm?.getTime() ?? 0)
  )
  const rankingHoje = porUsuarioHoje.map((uso) => {
    const tokens = uso._sum.totalTokens ?? 0
    const tentativas = uso._count._all
    const percentual = Math.max(tokens / LIMITE_TOKENS_DIA, tentativas / LIMITE_TENTATIVAS_DIA) * 100
    return { ...uso, tokens, tentativas, percentual, semContagem: tentativas - uso._count.totalTokens }
  }).sort((a, b) => b.percentual - a.percentual || b.tokens - a.tokens)
  const alertasHoje = rankingHoje.filter((uso) => uso.percentual >= ALERTA_PERCENTUAL).length
  const usuariosPorPagina = 10
  const paginaSolicitada = typeof parametros.pagina === 'string' && /^[1-9]\d{0,5}$/.test(parametros.pagina) ? Number(parametros.pagina) : 1
  const totalPaginas = Math.max(1, Math.ceil(ranking.length / usuariosPorPagina))
  const pagina = Math.min(paginaSolicitada, totalPaginas)
  const usuariosVisiveis = ranking.slice((pagina - 1) * usuariosPorPagina, pagina * usuariosPorPagina)
  const caminhoPagina = (valor: number) => `/admin/assistente?dias=${dias}&pagina=${valor}#por-usuario`
  const provedores = [
    { nome: 'Groq', configurado: Boolean(process.env.GROQ_API_KEY) },
    { nome: 'Cloudflare', configurado: Boolean(process.env.CLOUDFLARE_AI_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) },
    { nome: 'OpenRouter', configurado: Boolean(process.env.OPENROUTER_API_KEY) },
  ]
  const chamadasHoje = (nome: string) => usoHoje.find((item) => item.provedor === nome)
  const usoGroqHoje = chamadasHoje('Groq')
  const leituraPorModelo = new Map(leiturasGroq.map((item) => [item.modelo, item]))
  const usoCloudflareHoje = chamadasHoje('Cloudflare')
  const usoOpenRouterHoje = chamadasHoje('OpenRouter')?._count._all ?? 0
  const limiteOpenRouter = openRouterConta?.limite ?? 50
  const neuronsCloudflare = usoCloudflarePorModelo.reduce((total, item) => total + estimarNeuronsCloudflare(item.modelo, item._sum.entradaTokens ?? 0, item._sum.saidaTokens ?? 0), 0)
  const cloudflareSemContagem = (usoCloudflareHoje?._count._all ?? 0) - Math.min(usoCloudflareHoje?._count.entradaTokens ?? 0, usoCloudflareHoje?._count.saidaTokens ?? 0)
  const neuronsExibidos = cloudflareConta ?? neuronsCloudflare
  const proximoResetDiarioUtc = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() + 1))

  return <div className="portal-page w-full px-4 py-5 sm:px-8 sm:py-10 xl:px-10">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="rotulo text-brand-600 dark:text-brand-400">Administração</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink-900 dark:text-ink-50 sm:text-[32px]">Consumo do assistente</h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Tentativas de IA, tokens informados pelos provedores e falhas.</p>
        {dias === 0 && <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Consumo de hoje desde 00h UTC.</p>}
      </div>
      <nav aria-label="Período do consumo" className="flex rounded-xl border border-ink-200 bg-white p-1 dark:border-ink-700 dark:bg-ink-800">
        {[0, 7, 30, 90].map((opcao) => <Link key={opcao} href={`/admin/assistente?dias=${opcao}`} aria-current={dias === opcao ? 'page' : undefined}
          className={`rounded-lg px-3 py-2 text-sm ${dias === opcao ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'text-ink-500 hover:text-ink-900 dark:text-ink-300'}`}>
          {opcao === 0 ? 'Hoje' : `${opcao} dias`}
        </Link>)}
      </nav>
    </header>

    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Cartao titulo="Tentativas de IA" valor={numero.format(resumo._count._all)} detalhe={`${numero.format(sucessos)} respostas · ${numero.format(resumo._count._all - sucessos)} falhas`} />
      <Cartao titulo="Tokens de entrada" valor={numero.format(resumo._sum.entradaTokens ?? 0)} detalhe="Informados pelas APIs" />
      <Cartao titulo="Tokens de saída" valor={numero.format(resumo._sum.saidaTokens ?? 0)} detalhe="Informados pelas APIs" />
      <Cartao titulo="Total de tokens" valor={numero.format(resumo._sum.totalTokens ?? 0)} detalhe={semContagem ? `${semContagem} respostas sem contagem` : 'Soma informada pelas APIs'} />
    </div>

    <section className="mb-6 rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800/40">
      <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">Cotas gratuitas de hoje</h2>
      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Dia em UTC. Os contadores locais começam quando o registro de consumo foi ativado.</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-4 dark:border-ink-700 dark:bg-ink-900/50">
          <h3 className="font-semibold text-ink-900 dark:text-ink-50">Groq</h3>
          <p className="mt-2 text-sm text-ink-800 dark:text-ink-100"><strong>{numero.format(usoGroqHoje?._count._all ?? 0)}</strong> tentativas hoje no Hub entre {MODELOS_GROQ.length} modelos</p>
          <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">{numero.format(usoGroqHoje?._sum.totalTokens ?? 0)} tokens informados hoje. Veja abaixo as cotas por modelo.</p>
          <div className="mt-3 border-t border-ink-200 pt-3 dark:border-ink-700">
            <p className="text-xs font-medium text-ink-700 dark:text-ink-200">Reset das requisições por modelo</p>
            <ul className="mt-1 space-y-1 text-xs text-ink-600 dark:text-ink-300">{MODELOS_GROQ.map((modelo) => <li key={modelo.id}><span className="font-medium">{modelo.nome}:</span> {resetExibido(leituraPorModelo.get(modelo.id)?.resetReqEm ?? null, agora)}</li>)}</ul>
          </div>
          <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">Veja o saldo real e confirme o plano Free nos <a href="https://console.groq.com/settings/limits" target="_blank" rel="noopener noreferrer" className="text-brand-700 underline dark:text-brand-300">limites da Groq</a>.</p>
        </div>
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-4 dark:border-ink-700 dark:bg-ink-900/50">
          <h3 className="font-semibold text-ink-900 dark:text-ink-50">Cloudflare Workers AI</h3>
          <p className="mt-2 text-sm text-ink-800 dark:text-ink-100"><strong>10.000 Neurons/dia</strong> gratuitos no plano Workers Free</p>
          {cloudflareConta !== null || (usoCloudflareHoje?._count._all ?? 0) === 0 || !cloudflareSemContagem || neuronsCloudflare > 0
            ? <BarraCota rotulo={cloudflareConta !== null ? 'Neurons da conta informados pela Cloudflare' : 'Neurons estimados para chamadas da Cloudflare pelo Hub'} percentual={neuronsExibidos / 10_000 * 100} /> : null}
          {cloudflareConta !== null
            ? <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">{numero.format(Math.round(cloudflareConta))} Neurons informados pela Cloudflare para a conta hoje; cerca de {numero.format(Math.max(0, Math.round(10_000 - cloudflareConta)))} até a franquia. Os dados de Analytics podem atrasar.</p>
            : <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">{cloudflareSemContagem && neuronsCloudflare === 0 ? 'Sem contagem de tokens para estimar o consumo.' : `Cerca de ${numero.format(Math.round(neuronsCloudflare))} Neurons estimados para o Hub hoje.`} {numero.format(usoCloudflareHoje?._count._all ?? 0)} tentativas registradas. Para ver o total da conta aqui, configure <code>CLOUDFLARE_ANALYTICS_TOKEN</code> com Account Analytics Read.</p>}
          <p className="mt-2 text-xs font-medium text-ink-700 dark:text-ink-200">Próximo reset da cota compartilhada: {dataHora.format(proximoResetDiarioUtc)} (São Paulo).</p>
          <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">Confira o saldo no <a href="https://dash.cloudflare.com/?to=/:account/ai/workers-ai" target="_blank" rel="noopener noreferrer" className="text-brand-700 underline dark:text-brand-300">Workers AI</a>. No Workers Paid, o excedente pode ser cobrado.</p>
        </div>
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-4 dark:border-ink-700 dark:bg-ink-900/50">
          <h3 className="font-semibold text-ink-900 dark:text-ink-50">OpenRouter</h3>
          <p className="mt-2 text-sm text-ink-800 dark:text-ink-100"><strong>{numero.format(limiteOpenRouter)} requisições/dia</strong> {openRouterConta?.limite != null ? 'na franquia gratuita informada pela API' : 'como referência do plano Free'}</p>
          <BarraCota rotulo="Requisições gratuitas do OpenRouter no dia UTC" percentual={limiteOpenRouter > 0 ? (openRouterConta?.usado ?? usoOpenRouterHoje) / limiteOpenRouter * 100 : 100} />
          <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">{openRouterConta?.usado != null ? `${numero.format(openRouterConta.usado)} usadas e ${numero.format(openRouterConta.restante ?? 0)} restantes na conta, segundo a API.` : `${numero.format(usoOpenRouterHoje)} tentativas registradas hoje no Hub; saldo da conta indisponível.`}</p>
          <p className="mt-2 text-xs font-medium text-ink-700 dark:text-ink-200">Reset diário previsto: {dataHora.format(proximoResetDiarioUtc)} (São Paulo). A franquia é compartilhada entre os modelos gratuitos.</p>
          <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">Chave: {openRouterConta?.planoFree === true ? 'plano Free' : openRouterConta?.planoFree === false ? 'plano não identificado como Free' : 'plano não verificado'}. O Hub usa <code>openrouter/free</code>, que escolhe o modelo. Confira os <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer" className="text-brand-700 underline dark:text-brand-300">limites da conta</a>.</p>
        </div>
      </div>
      <details id="modelos-groq" className="mt-4 rounded-xl border border-ink-200 p-4 dark:border-ink-700">
        <summary className="cursor-pointer font-medium text-ink-900 dark:text-ink-50">Modelos da Groq: uso e horários de reset</summary>
        <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">A ordem inicial muda a cada pergunta. Se um modelo falhar ou atingir o limite, o Hub tenta os demais antes dos outros provedores. O uso local não inclui outros aplicativos da conta.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">{MODELOS_GROQ.map((modelo) => {
          const uso = usoGroqPorModelo.find((item) => item.modelo === modelo.id)
          const leitura = leituraPorModelo.get(modelo.id)
          const requisicoes = uso?._count._all ?? 0
          const restantes = leitura?.resetReqEm && leitura.resetReqEm <= agora ? null : leitura?.restantesReqDia
          const restantesMinuto = leitura?.resetTokensEm && leitura.resetTokensEm <= agora ? null : leitura?.restantesTokensMin
          return <div key={modelo.id} className="rounded-xl border border-ink-200 bg-ink-50 p-4 dark:border-ink-700 dark:bg-ink-900/50">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-ink-900 dark:text-ink-50">{modelo.nome}</h3><span className="text-xs text-ink-500 dark:text-ink-400">{modelo.fase}</span></div>
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{modelo.id}</p>
            <p className="mt-3 text-sm text-ink-800 dark:text-ink-100"><strong>{numero.format(requisicoes)}</strong> tentativas no Hub hoje</p>
            <BarraCota rotulo={`Tentativas do ${modelo.nome} no Hub frente à referência diária`} percentual={requisicoes / GROQ_FREE_REQ_DIA_REFERENCIA * 100} />
            <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">{numero.format(uso?._sum.totalTokens ?? 0)} tokens no Hub hoje de {numero.format(GROQ_FREE_TOKENS_DIA_REFERENCIA)} por dia na referência Free deste modelo.</p>
            <BarraCota rotulo={`Tokens do ${modelo.nome} no Hub frente à referência diária`} percentual={(uso?._sum.totalTokens ?? 0) / GROQ_FREE_TOKENS_DIA_REFERENCIA * 100} />
            <div className="mt-3 border-t border-ink-200 pt-3 text-xs text-ink-600 dark:border-ink-700 dark:text-ink-300">
              <p>Groq: {restantes == null ? 'saldo diário não recebido' : `${numero.format(restantes)} de ${numero.format(leitura?.limiteReqDia ?? GROQ_FREE_REQ_DIA_REFERENCIA)} requisições restantes`}</p>
              <p className="mt-1">Reset das requisições: {resetExibido(leitura?.resetReqEm ?? null, agora)}</p>
              <p className="mt-2">Tokens por minuto: {restantesMinuto == null ? 'saldo não recebido' : `${numero.format(restantesMinuto)} de ${numero.format(leitura?.limiteTokensMin ?? 0)} restantes`}</p>
              <p className="mt-1">Reset dos tokens por minuto: {resetExibido(leitura?.resetTokensEm ?? null, agora)}</p>
              <p className="mt-2 text-ink-500 dark:text-ink-400">A Groq não envia o saldo exato de tokens por dia nesses cabeçalhos.</p>
            </div>
          </div>
        })}</div>
      </details>
      <details id="modelos-cloudflare" className="mt-3 rounded-xl border border-ink-200 p-4 dark:border-ink-700">
        <summary className="cursor-pointer font-medium text-ink-900 dark:text-ink-50">Modelos da Cloudflare: uso e reset</summary>
        <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">O Hub alterna o primeiro modelo. Se ele falhar, tenta os demais. Os três usam a mesma franquia diária de 10.000 Neurons da conta; esgotá-la envia a pergunta ao OpenRouter. <a href="https://developers.cloudflare.com/workers-ai/platform/pricing/" target="_blank" rel="noopener noreferrer" className="text-brand-700 underline dark:text-brand-300">Ver limites e reset na Cloudflare</a>.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">{MODELOS_CLOUDFLARE.map((modelo) => {
          const uso = usoCloudflarePorModelo.find((item) => item.modelo === modelo.id)
          const estimativa = estimarNeuronsCloudflare(modelo.id, uso?._sum.entradaTokens ?? 0, uso?._sum.saidaTokens ?? 0)
          const semTokens = (uso?._count._all ?? 0) > Math.min(uso?._count.entradaTokens ?? 0, uso?._count.saidaTokens ?? 0)
          return <div key={modelo.id} className="rounded-xl border border-ink-200 bg-ink-50 p-4 dark:border-ink-700 dark:bg-ink-900/50">
            <h3 className="font-semibold text-ink-900 dark:text-ink-50">{modelo.nome}</h3>
            <p className="mt-1 break-all text-xs text-ink-500 dark:text-ink-400">{modelo.id}</p>
            <p className="mt-3 text-sm text-ink-800 dark:text-ink-100"><strong>{numero.format(uso?._count._all ?? 0)}</strong> tentativas no Hub hoje</p>
            <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">{numero.format(uso?._sum.totalTokens ?? 0)} tokens informados · cerca de {numero.format(Math.round(estimativa))} Neurons estimados{semTokens ? ' (há chamadas sem contagem)' : ''}.</p>
            <p className="mt-3 border-t border-ink-200 pt-3 text-xs text-ink-600 dark:border-ink-700 dark:text-ink-300">Reset da cota compartilhada: <strong>{dataHora.format(proximoResetDiarioUtc)}</strong> (São Paulo). Não há franquia diária separada para este modelo.</p>
          </div>
        })}</div>
      </details>
      <p className="mt-4 text-xs text-ink-500 dark:text-ink-400">Este painel não controla o plano nem outros aplicativos que usam as mesmas contas. Para evitar cobrança, mantenha Groq no Free e Cloudflare no Workers Free; o OpenRouter está restrito ao modelo gratuito.</p>
    </section>

    <section className="mb-6 rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800/40">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">Acompanhamento por colaborador hoje</h2>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Dia em UTC. Limite por colaborador: {numero.format(LIMITE_TOKENS_DIA)} tokens informados ou {LIMITE_TENTATIVAS_DIA} tentativas de IA. Aviso a partir de {ALERTA_PERCENTUAL}%.</p>
        </div>
        <span className="text-xs text-ink-500 dark:text-ink-400">{alertasHoje} {alertasHoje === 1 ? 'colaborador em alerta' : 'colaboradores em alerta'}</span>
      </div>
      {rankingHoje.length === 0
        ? <p className="mt-4 rounded-lg bg-ink-50 p-4 text-sm text-ink-500 dark:bg-ink-900/50 dark:text-ink-400">Ainda não houve chamadas de IA hoje.</p>
        : <div className="mt-4 space-y-2">{rankingHoje.slice(0, 10).map((uso) => <div key={uso.colaboradorId ?? 'removidos'} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-ink-200 px-3 py-3 text-sm dark:border-ink-700">
          <div className="min-w-[150px] flex-1">
            <p className="font-medium text-ink-900 dark:text-ink-50">{uso.colaboradorId ? nomes.get(uso.colaboradorId) ?? 'Usuário removido' : 'Usuários removidos'}</p>
            <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">Última tentativa: {uso._max.criadoEm ? dataHora.format(uso._max.criadoEm) : '—'}</p>
          </div>
          <span className="text-ink-700 dark:text-ink-200">{numero.format(uso.tokens)} tokens · {numero.format(uso.tentativas)} tentativas</span>
          {uso.percentual >= ALERTA_PERCENTUAL && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${uso.percentual >= 100 ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>{uso.percentual >= 100 ? 'Limite atingido' : 'Atenção'}</span>}
          {uso.semContagem > 0 && <span className="w-full text-xs text-ink-500 dark:text-ink-400">{uso.semContagem} {uso.semContagem === 1 ? 'tentativa sem contagem' : 'tentativas sem contagem'} de tokens, incluindo possíveis falhas.</span>}
        </div>)}</div>}
      {rankingHoje.length > 10 && <p className="mt-3 text-xs text-ink-500 dark:text-ink-400">Mostrando os 10 maiores consumos de hoje. O ranking do período abaixo inclui todos os colaboradores.</p>}
      <p className="mt-3 text-xs text-ink-500 dark:text-ink-400">Ao atingir um dos limites, novas chamadas à IA são suspensas até 00h UTC. A consulta aos documentos continua disponível. A última resposta pode ultrapassar o limite porque os tokens só são informados depois da chamada; uma pergunta pode gerar várias tentativas quando há troca de modelo ou provedor.</p>
    </section>

    <section id="por-usuario" className="mb-6 rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800/40">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">Consumo por colaborador</h2>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Ordenado pelos tokens informados pelas APIs. Tentativas incluem falhas e trocas de provedor.</p>
        </div>
        <span className="text-xs text-ink-500 dark:text-ink-400">{ranking.length} {ranking.length === 1 ? 'colaborador' : 'colaboradores'} no período</span>
      </div>
      {ranking.length === 0 ? <p className="mt-4 rounded-lg bg-ink-50 p-5 text-sm text-ink-500 dark:bg-ink-900/50 dark:text-ink-400">O ranking aparecerá quando houver chamadas de IA.</p> :
        <div className="mt-4 space-y-2">{usuariosVisiveis.map((uso, indice) => {
          const tokens = uso._sum.totalTokens ?? 0
          const participacao = resumo._sum.totalTokens ? Math.round(tokens / resumo._sum.totalTokens * 100) : 0
          return <div key={uso.colaboradorId ?? 'removidos'} className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-ink-200 px-3 py-3 dark:border-ink-700">
            <span className="w-7 shrink-0 text-sm font-semibold tabular-nums text-ink-400">{(pagina - 1) * usuariosPorPagina + indice + 1}.</span>
            <div className="min-w-[150px] flex-1">
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">{uso.colaboradorId ? nomes.get(uso.colaboradorId) ?? 'Usuário removido' : 'Usuários removidos'}</p>
              <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">Última tentativa: {uso._max.criadoEm ? dataHora.format(uso._max.criadoEm) : '—'}</p>
            </div>
            <div className="min-w-[85px] text-sm text-ink-600 dark:text-ink-300"><span className="font-semibold tabular-nums text-ink-900 dark:text-ink-50">{numero.format(uso._count._all)}</span> tentativas</div>
            <div className="min-w-[125px] text-sm text-ink-600 dark:text-ink-300"><span className="font-semibold tabular-nums text-ink-900 dark:text-ink-50">{numero.format(tokens)}</span> tokens <span className="text-xs text-ink-400">({participacao}%)</span></div>
          </div>
        })}</div>}
      {totalPaginas > 1 && <nav aria-label="Páginas do consumo por colaborador" className="mt-4 flex items-center justify-end gap-3 text-sm">
        {pagina > 1 && <Link href={caminhoPagina(pagina - 1)} className="rounded-lg border border-ink-200 px-3 py-2 text-ink-700 hover:border-brand-400 dark:border-ink-700 dark:text-ink-200">Anterior</Link>}
        <span className="text-ink-500 dark:text-ink-400">Página {pagina} de {totalPaginas}</span>
        {pagina < totalPaginas && <Link href={caminhoPagina(pagina + 1)} className="rounded-lg border border-ink-200 px-3 py-2 text-ink-700 hover:border-brand-400 dark:border-ink-700 dark:text-ink-200">Próxima</Link>}
      </nav>}
    </section>

    <section className="mb-6 rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800/40">
      <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">Provedores</h2>
      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Uma pergunta pode gerar mais de uma tentativa quando um provedor falha.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">{provedores.map((provedor) => {
        const uso = porProvedor.find((item) => item.provedor === provedor.nome)
        const respostas = porStatus.find((item) => item.provedor === provedor.nome && item.status === 'SUCESSO')?._count._all ?? 0
        return <div key={provedor.nome} className="rounded-xl border border-ink-200 bg-ink-50 p-4 dark:border-ink-700 dark:bg-ink-900/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-ink-900 dark:text-ink-50">{provedor.nome}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${provedor.configurado ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'}`}>{provedor.configurado ? 'Configurado' : 'Sem credencial'}</span>
          </div>
          <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">{numero.format(uso?._count._all ?? 0)} tentativas · {numero.format(respostas)} respostas</p>
          <p className="mt-1 text-sm font-medium text-ink-900 dark:text-ink-50">{numero.format(uso?._sum.totalTokens ?? 0)} tokens informados</p>
        </div>
      })}</div>
    </section>

    <section className="rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800/40">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">Chamadas recentes</h2>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Últimas 20 tentativas, sem guardar perguntas, respostas ou chaves.</p></div>
        {resumo._avg.duracaoMs !== null && <p className="text-xs text-ink-500 dark:text-ink-400">Tempo médio: {numero.format(Math.round(resumo._avg.duracaoMs))} ms</p>}
      </div>
      {recentes.length === 0 ? <p className="mt-5 rounded-lg bg-ink-50 p-5 text-sm text-ink-500 dark:bg-ink-900/50 dark:text-ink-400">Ainda não há chamadas de IA neste período. O registro começa após publicar esta atualização e configurar uma credencial.</p> :
        <div className="mt-4 space-y-2">{recentes.map((uso) => <div key={uso.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-ink-200 px-3 py-3 text-sm dark:border-ink-700">
          <div className="min-w-[130px] flex-1"><p className="font-medium text-ink-900 dark:text-ink-50">{uso.provedor} <span className="font-normal text-ink-500 dark:text-ink-400">· {uso.modelo}</span></p>
            <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{uso.colaborador?.nome ?? 'Usuário removido'} · {dataHora.format(uso.criadoEm)}</p></div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${uso.status === 'SUCESSO' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>{uso.status === 'SUCESSO' ? 'Respondida' : uso.status === 'SEM_TEXTO' ? 'Sem texto' : uso.httpStatus ? `Erro ${uso.httpStatus}` : 'Falha de conexão'}</span>
          <span className="w-full text-xs text-ink-600 dark:text-ink-300 sm:w-auto">Entrada {contagem(uso.entradaTokens)} · Saída {contagem(uso.saidaTokens)} · Total {contagem(uso.totalTokens)}</span>
        </div>)}</div>}
    </section>
    <p className="mt-4 text-xs text-ink-500 dark:text-ink-400">A soma reflete apenas as contagens recebidas. Consulte o painel de cada provedor para ver a cota restante da conta.</p>
  </div>
}
