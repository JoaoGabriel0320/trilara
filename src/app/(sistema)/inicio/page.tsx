import { documentosVisiveis, podeAcessarSistema } from '@/lib/publico'
// src/app/(sistema)/inicio/page.tsx
//
// Página inicial da Trilara. Abre dizendo o que o produto é — muita gente
// chega aqui pela primeira vez por um link que alguém mandou — e emenda direto
// na busca, que é o trabalho real de quem entra: achar um procedimento no meio
// do turno. Os indicadores e a coluna de sistemas vêm depois, como atalhos.

import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, Clock3, FilePlus2, FileText, TrendingUp, type LucideIcon } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { exigirSessao } from '@/lib/auth/session'
import { podePublicar, souAdmin } from '@/lib/auth/jwt'
import { listarSistemas } from '@/lib/sistemas'
import { listarDocumentosBusca } from '@/lib/busca'
import { BuscaGlobal } from '@/components/portal/BuscaGlobal'
import { MensagemDoDia } from '@/components/portal/MensagemDoDia'
import { deslocamentoDaMensagem, mensagemDoDia } from '@/lib/mensagem-do-dia'

export const metadata: Metadata = {
  title: 'Início · Trilara',
  robots: { index: false, follow: false },
}

const FUSO = 'America/Sao_Paulo'

function saudacao(agora: Date): string {
  const hora = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: FUSO }).format(agora))
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function Indicador({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
  href,
  valorCurto = true,
}: {
  rotulo: string
  valor: string
  detalhe: string
  icone: LucideIcon
  /** Com href o card inteiro vira link (ex.: o manual mais lido). */
  href?: string
  /** false: o valor é texto (título de manual), não um número grande. */
  valorCurto?: boolean
}) {
  const conteudo = (
    <>
      <span className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
        <Icone size={21} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-500 dark:text-ink-400">{rotulo}</p>
        <p
          className={
            valorCurto
              ? 'mt-1 text-[24px] sm:text-[28px] font-semibold tabular-nums tracking-tight text-ink-900 dark:text-ink-50'
              : 'mt-1 line-clamp-2 text-[15px] sm:text-[18px] font-semibold leading-snug tracking-tight text-ink-900 dark:text-ink-50'
          }
        >
          {valor}
        </p>
        <p className="mt-1 text-[12px] text-ink-500 dark:text-ink-400">{detalhe}</p>
      </div>
    </>
  )
  const base = 'flex min-w-0 items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-800 sm:p-6'
  return href ? (
    <Link href={href} className={base + ' transition hover:border-brand-300 dark:hover:border-brand-500/40'}>
      {conteudo}
    </Link>
  ) : (
    <div className={base}>{conteudo}</div>
  )
}

export default async function InicioPage() {
  const [sistemasCatalogo, sessao] = await Promise.all([listarSistemas(), exigirSessao()])
  const primeiroNome = sessao?.nome.split(' ')[0] ?? ''
  const editor = sessao ? podePublicar(sessao.papel) : false

  const agora = new Date()
  const deslocamentoMensagem = deslocamentoDaMensagem(sessao?.id ?? '')
  const seteDiasAtras = new Date(agora.getTime() - 7 * 86_400_000)

  // listarDocumentosBusca() é a mesma função que alimenta a paleta de busca
  // (⌘K) — uma lista só, montada num lugar só, pra tela inicial e paleta
  // nunca divergirem. novosNaSemana usa data crua, que DocumentoBusca não
  // carrega (só o rótulo já formatado "há 3 dias"), daí a contagem à parte.
  const [documentos, novosNaSemana, maisLido] = await Promise.all([
    listarDocumentosBusca(),
    prisma.documento.count({ where: { ...documentosVisiveis(sessao), atualizadoEm: { gte: seteDiasAtras } } }),
    // visualizacoes é um contador acumulado (só leituras de COLABORADOR), não
    // mensal — por isso o card se chama "Mais lido", sem janela de tempo.
    prisma.documento.findFirst({
      where: { ...documentosVisiveis(sessao), visualizacoes: { gt: 0 } },
      orderBy: [{ visualizacoes: 'desc' }, { atualizadoEm: 'desc' }],
      select: { titulo: true, slug: true, sistemaSlug: true, visualizacoes: true },
    }),
  ])

  const porSistema = new Map<string, number>()
  for (const d of documentos) porSistema.set(d.sistemaSlug, (porSistema.get(d.sistemaSlug) ?? 0) + 1)
  const sistemas = sistemasCatalogo.filter((s) => podeAcessarSistema(sessao, s.slug)).map((s) => ({
    slug: s.slug,
    nome: s.name,
    total: porSistema.get(s.slug) ?? 0,
  }))

  const dataExtenso = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: FUSO,
  }).format(agora)
  // "quinta-feira, 25 de setembro" → "Quinta-feira, 25 de setembro"
  const dataHoje = dataExtenso.charAt(0).toUpperCase() + dataExtenso.slice(1)

  return (
    <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 sm:py-10 xl:px-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-8 sm:gap-5">
        <div>
          <p className="rotulo hidden sm:block text-brand-600 dark:text-brand-400">Trilara · Início</p>
          <h1 className="mt-1 text-[26px] sm:mt-2 font-semibold tracking-tight text-ink-900 dark:text-ink-50 sm:text-[32px]">
            {saudacao(agora)}{primeiroNome && `, ${primeiroNome}`}
          </h1>
          <p className="mt-2 text-[14px] text-ink-500 dark:text-ink-400">
            {sessao.tipoAcesso === 'EXTERNO' ? 'Manuais e guias compartilhados com convidados.' : 'Seus manuais, sistemas e procedimentos em um só lugar.'}
          </p>
        </div>
        <MensagemDoDia deslocamento={deslocamentoMensagem} inicial={mensagemDoDia(deslocamentoMensagem, agora)} dataInicial={dataHoje} />
      </header>

      <BuscaGlobal
        documentos={documentos}
        sistemas={sistemas}
        conteudoVazio={
          <div key="conteudo-vazio" className="px-5 py-10 sm:px-7">
            <BookOpen size={28} aria-hidden="true" className="mb-4 text-brand-500" />
            <p className="text-[16px] font-semibold text-ink-800 dark:text-ink-100">
              {editor ? 'Publique o primeiro manual' : 'Nenhum manual publicado ainda'}
            </p>
            <p className="mt-2 max-w-[480px] text-[14px] leading-relaxed text-ink-500 dark:text-ink-400">
              {editor
                ? 'Escolha um sistema e adicione um PDF, artigo ou link para os colaboradores consultarem.'
                : 'Os manuais aparecerão aqui assim que forem publicados pela equipe de TI.'}
            </p>
            {editor && (
              <Link href={sessao && souAdmin(sessao.papel) ? "/admin/documentos/novo" : "/meus-documentos/novo"} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-brand-600">
                <FilePlus2 size={19} aria-hidden="true" /> Novo documento
              </Link>
            )}
          </div>
        }
        indicadores={
          <div key="indicadores-inicio" className="mobile-indicators grid gap-3 md:grid-cols-3 md:gap-4">
            <Indicador
              icone={FileText}
              rotulo="Documentos disponíveis"
              valor={documentos.length.toLocaleString('pt-BR')}
              detalhe="manuais, artigos e links"
            />
            {maisLido ? (
              <Indicador
                icone={TrendingUp}
                rotulo="Manual mais lido"
                valor={maisLido.titulo}
                valorCurto={false}
                detalhe={`${maisLido.visualizacoes.toLocaleString('pt-BR')} ${maisLido.visualizacoes === 1 ? 'leitura' : 'leituras'}`}
                href={`/documentacao/${maisLido.sistemaSlug}/${maisLido.slug}`}
              />
            ) : (
              <Indicador icone={TrendingUp} rotulo="Manual mais lido" valor="—" detalhe="ainda sem leituras" />
            )}
            <Indicador
              icone={Clock3}
              rotulo="Atualizados na semana"
              valor={novosNaSemana.toLocaleString('pt-BR')}
              detalhe="nos últimos 7 dias"
            />
          </div>
        }
      />
    </div>
  )
}
