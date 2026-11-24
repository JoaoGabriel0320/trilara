'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PerfilEcossistema, System, TipoVinculoSistema, VinculoSistema } from '@/types'
import { Selecao } from '@/components/ui/Selecao'
import { perfilDoSistema, TIPOS_VINCULO } from '@/lib/ecossistema'

type Item = { sistema: System; ativo: boolean }
const vazio: System = {
  id: '', slug: '', name: '', letter: '', kind: 'internal', description: '',
  status: 'ONLINE', color: 'brand', tags: [], metric: { value: '', label: '' },
}
const campo = 'w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50'

export function GerenciarSistemas({ sistemas }: { sistemas: Item[] }) {
  const router = useRouter()
  const [editando, setEditando] = useState<string | null>(null)
  const [rascunho, setRascunho] = useState<System>(vazio)
  const [categoriasTexto, setCategoriasTexto] = useState('')
  const [funcionalidadesTexto, setFuncionalidadesTexto] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [arquivar, setArquivar] = useState<System | null>(null)

  function abrir(sistema?: System) {
    const origem = sistema ?? vazio
    const perfil = origem.ecossistema ?? perfilDoSistema(origem)
    setRascunho({
      ...origem,
      tags: [...origem.tags],
      metric: { ...origem.metric },
      ecossistema: { ...perfil, funcionalidades: [...perfil.funcionalidades], vinculos: perfil.vinculos.map((vinculo) => ({ ...vinculo })) },
    })
    setCategoriasTexto(sistema?.tags.join(', ') ?? '')
    setFuncionalidadesTexto(perfil.funcionalidades.join('\n'))
    setEditando(sistema?.slug ?? '')
    setErro('')
  }

  function alterar<K extends keyof System>(chave: K, valor: System[K]) {
    setRascunho((atual) => ({ ...atual, [chave]: valor }))
  }

  function alterarPerfil<K extends keyof PerfilEcossistema>(chave: K, valor: PerfilEcossistema[K]) {
    setRascunho((atual) => ({ ...atual, ecossistema: { ...(atual.ecossistema ?? perfilDoSistema(atual)), [chave]: valor } }))
  }

  function alterarVinculo<K extends keyof VinculoSistema>(indice: number, chave: K, valor: VinculoSistema[K]) {
    setRascunho((atual) => {
      const perfil = atual.ecossistema ?? perfilDoSistema(atual)
      return { ...atual, ecossistema: { ...perfil, vinculos: perfil.vinculos.map((vinculo, i) => i === indice ? { ...vinculo, [chave]: valor } : vinculo) } }
    })
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    setErro('')
    try {
      const novo = editando === ''
      const resposta = await fetch(novo ? '/api/admin/sistemas' : `/api/admin/sistemas/${encodeURIComponent(editando!)}`, {
        method: novo ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rascunho,
          tags: categoriasTexto.split(',').map((tag) => tag.trim()).filter(Boolean),
          ecossistema: { ...(rascunho.ecossistema ?? perfilDoSistema(rascunho)), funcionalidades: funcionalidadesTexto.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) },
        }),
      })
      const dados = await resposta.json()
      if (!resposta.ok) { setErro(dados.error ?? 'Não foi possível salvar o sistema.'); return }
      setEditando(null)
      router.refresh()
    } catch { setErro('Falha de conexão. Tente novamente.') }
    finally { setOcupado(false) }
  }

  async function alterarVisibilidade(item: Item, ativo: boolean) {
    setOcupado(true)
    setErro('')
    try {
      const resposta = await fetch(`/api/admin/sistemas/${encodeURIComponent(item.sistema.slug)}`, {
        method: ativo ? 'PATCH' : 'DELETE',
        ...(ativo ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: true }) } : {}),
      })
      const dados = await resposta.json()
      if (!resposta.ok) { setErro(dados.error ?? 'Não foi possível alterar o sistema.'); return }
      setArquivar(null)
      router.refresh()
    } catch { setErro('Falha de conexão. Tente novamente.') }
    finally { setOcupado(false) }
  }

  const perfil = rascunho.ecossistema ?? perfilDoSistema(rascunho)
  const destinos = sistemas.filter((item) => item.ativo && item.sistema.slug !== rascunho.slug)

  return <div className="space-y-5">
    <button type="button" onClick={() => abrir()} disabled={editando !== null} className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">Adicionar sistema</button>
    {erro && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{erro}</p>}

    {editando !== null && <form onSubmit={salvar} className="space-y-4 rounded-xl border border-brand-200 bg-white p-5 dark:border-brand-800 dark:bg-ink-800">
      <h2 className="text-lg font-semibold text-ink-900 dark:text-white">{editando ? `Editar ${rascunho.name}` : 'Novo sistema'}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-ink-600 dark:text-ink-300">Nome *<input className={campo} value={rascunho.name} onChange={(e) => alterar('name', e.target.value)} required maxLength={100} /></label>
        <label className="text-sm text-ink-600 dark:text-ink-300">Identificador {editando ? '(fixo)' : '(opcional)'}<input className={campo} value={rascunho.slug} onChange={(e) => alterar('slug', e.target.value)} disabled={Boolean(editando)} placeholder="gerado pelo nome" maxLength={80} /></label>
        <div className="text-sm text-ink-600 dark:text-ink-300"><span id="rotulo-origem-sistema">Origem</span><Selecao rotuloId="rotulo-origem-sistema" valor={rascunho.kind ?? 'internal'} onChange={(valor) => alterar('kind', valor as System['kind'])} opcoes={[{ value: 'internal', label: 'Interno' }, { value: 'external', label: 'Externo' }]} /></div>
        <div className="text-sm text-ink-600 dark:text-ink-300"><span id="rotulo-situacao-sistema">Situação</span><Selecao rotuloId="rotulo-situacao-sistema" valor={rascunho.status} onChange={(valor) => alterar('status', valor as System['status'])} opcoes={[{ value: 'ONLINE', label: 'Online' }, { value: 'MAINTENANCE', label: 'Em manutenção' }, { value: 'OFFLINE', label: 'Offline' }]} /></div>
        <div className="text-sm text-ink-600 dark:text-ink-300"><span id="rotulo-cor-sistema">Cor</span><Selecao rotuloId="rotulo-cor-sistema" valor={rascunho.color} onChange={(valor) => alterar('color', valor as System['color'])} opcoes={[{ value: 'brand', label: 'Roxo' }, { value: 'blue', label: 'Azul' }, { value: 'green', label: 'Verde' }, { value: 'amber', label: 'Âmbar' }, { value: 'teal', label: 'Turquesa' }, { value: 'rose', label: 'Rosa' }]} /></div>
        <label className="text-sm text-ink-600 dark:text-ink-300">Link de acesso<input className={campo} type="url" value={rascunho.url ?? ''} onChange={(e) => alterar('url', e.target.value)} placeholder="https://..." maxLength={500} /></label>
        <label className="text-sm text-ink-600 dark:text-ink-300">Logo (caminho em /logos/)<input className={campo} value={rascunho.logoUrl ?? ''} onChange={(e) => alterar('logoUrl', e.target.value)} placeholder="/logos/exemplo.png" maxLength={300} /></label>
        <label className="text-sm text-ink-600 dark:text-ink-300">Categorias (separadas por vírgula)<input className={campo} value={categoriasTexto} onChange={(e) => setCategoriasTexto(e.target.value)} /></label>
        <label className="text-sm text-ink-600 dark:text-ink-300 sm:col-span-2">Descrição *<textarea className={campo} rows={2} value={rascunho.description} onChange={(e) => alterar('description', e.target.value)} required maxLength={500} /></label>
        <label className="text-sm text-ink-600 dark:text-ink-300 sm:col-span-2">Descrição detalhada<textarea className={campo} rows={3} value={rascunho.longDescription ?? ''} onChange={(e) => alterar('longDescription', e.target.value)} maxLength={2000} /></label>
        <label className="text-sm text-ink-600 dark:text-ink-300 sm:col-span-2">Descrição em inglês<textarea className={campo} rows={2} value={rascunho.descriptionEn ?? ''} onChange={(e) => alterar('descriptionEn', e.target.value)} maxLength={500} /></label>
        <label className="text-sm text-ink-600 dark:text-ink-300 sm:col-span-2">Descrição detalhada em inglês<textarea className={campo} rows={3} value={rascunho.longDescriptionEn ?? ''} onChange={(e) => alterar('longDescriptionEn', e.target.value)} maxLength={2000} /></label>
      </div>
      <fieldset className="space-y-4 rounded-xl border border-ink-200 p-4 dark:border-ink-700">
        <legend className="px-2 text-sm font-semibold text-ink-900 dark:text-white">Ecossistema de sistemas</legend>
        <p className="text-sm text-ink-500 dark:text-ink-400">Estas informações aparecem no mapa e nos detalhes do sistema.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-ink-600 dark:text-ink-300">Área ou processo<input className={campo} value={perfil.area} onChange={(e) => alterarPerfil('area', e.target.value)} placeholder="Ex.: Transporte, Armazém, Financeiro" maxLength={100} /></label>
          <label className="text-sm text-ink-600 dark:text-ink-300">Equipe responsável<input className={campo} value={perfil.responsavel} onChange={(e) => alterarPerfil('responsavel', e.target.value)} placeholder="Ex.: Equipe de sistemas" maxLength={120} /></label>
          <label className="text-sm text-ink-600 dark:text-ink-300 sm:col-span-2">Quem usa<textarea className={campo} rows={2} value={perfil.quemUsa} onChange={(e) => alterarPerfil('quemUsa', e.target.value)} placeholder="Áreas ou funções que utilizam este sistema" maxLength={300} /></label>
          <label className="text-sm text-ink-600 dark:text-ink-300 sm:col-span-2">Principais funcionalidades (uma por linha)<textarea className={campo} rows={4} value={funcionalidadesTexto} onChange={(e) => setFuncionalidadesTexto(e.target.value)} aria-describedby="ajuda-funcionalidades" maxLength={3220} /><span id="ajuda-funcionalidades" className="mt-1 block text-xs text-ink-500 dark:text-ink-400">Até 20 funcionalidades de 160 caracteres cada.</span></label>
        </div>
        <div className="border-t border-ink-200 pt-4 dark:border-ink-700">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Vínculos confirmados</h3>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Cadastre relações confirmadas com outros sistemas ativos. Descreva o que conecta os sistemas e, nas integrações, quais informações são trocadas.</p>
          {perfil.vinculos.length === 0 && <p className="mt-3 rounded-lg bg-ink-50 p-3 text-sm text-ink-500 dark:bg-ink-900 dark:text-ink-400">Nenhum vínculo cadastrado para este sistema.</p>}
          <div className="mt-3 space-y-3">{perfil.vinculos.map((vinculo, indice) => {
            const destinoValido = destinos.some((item) => item.sistema.slug === vinculo.destinoSlug)
            const opcoesDestino = destinos.map((item) => ({ value: item.sistema.slug, label: item.sistema.name }))
            if (!destinoValido && vinculo.destinoSlug) opcoesDestino.unshift({ value: vinculo.destinoSlug, label: `${vinculo.destinoSlug} (indisponível)` })
            return <fieldset key={indice} className="rounded-lg border border-ink-200 p-3 dark:border-ink-700" aria-describedby={`ajuda-vinculo-${indice}`}>
              <legend className="px-1 text-xs font-semibold text-ink-700 dark:text-ink-200">Vínculo {indice + 1}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="text-sm text-ink-600 dark:text-ink-300"><span id={`rotulo-destino-${indice}`}>Sistema de destino *</span><Selecao rotuloId={`rotulo-destino-${indice}`} valor={vinculo.destinoSlug} onChange={(valor) => alterarVinculo(indice, 'destinoSlug', valor)} opcoes={opcoesDestino} buscavel /></div>
                <div className="text-sm text-ink-600 dark:text-ink-300"><span id={`rotulo-tipo-vinculo-${indice}`}>Tipo de vínculo *</span><Selecao rotuloId={`rotulo-tipo-vinculo-${indice}`} valor={vinculo.tipo} onChange={(valor) => alterarVinculo(indice, 'tipo', valor as TipoVinculoSistema)} opcoes={(Object.keys(TIPOS_VINCULO) as TipoVinculoSistema[]).map((tipo) => ({ value: tipo, label: TIPOS_VINCULO[tipo].nome, descricao: TIPOS_VINCULO[tipo].explicacao }))} /></div>
                <div className="text-sm text-ink-600 dark:text-ink-300 sm:col-span-2"><span id={`rotulo-direcao-vinculo-${indice}`}>Sentido do vínculo *</span><Selecao rotuloId={`rotulo-direcao-vinculo-${indice}`} valor={vinculo.direcao} onChange={(valor) => alterarVinculo(indice, 'direcao', valor as VinculoSistema['direcao'])} opcoes={[{ value: 'IDA', label: 'Deste sistema para o destino' }, { value: 'AMBOS', label: 'Nos dois sentidos' }]} /></div>
                <label className="text-sm text-ink-600 dark:text-ink-300 sm:col-span-2">Descrição do vínculo *<textarea className={campo} rows={2} value={vinculo.descricao} onChange={(e) => alterarVinculo(indice, 'descricao', e.target.value)} required maxLength={500} placeholder="Explique a relação entre os sistemas" /></label>
              </div>
              <p id={`ajuda-vinculo-${indice}`} className="mt-2 text-xs text-ink-500 dark:text-ink-400">{TIPOS_VINCULO[vinculo.tipo].explicacao}</p>
              {!destinoValido && <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-300">O destino está indisponível. Escolha outro sistema ativo ou remova este vínculo antes de salvar.</p>}
              <button type="button" disabled={ocupado} aria-label={`Remover vínculo ${indice + 1}`} onClick={() => alterarPerfil('vinculos', perfil.vinculos.filter((_, i) => i !== indice))} className="mt-2 min-h-11 text-sm font-medium text-rose-600 disabled:opacity-50 dark:text-rose-400">Remover vínculo</button>
            </fieldset>
          })}</div>
          <button type="button" disabled={ocupado || destinos.length === 0 || perfil.vinculos.length >= 30} onClick={() => alterarPerfil('vinculos', [...perfil.vinculos, { destinoSlug: destinos[0].sistema.slug, tipo: 'INTEGRACAO', direcao: 'IDA', descricao: '' }])} className="mt-3 min-h-11 rounded-lg border border-ink-200 px-4 text-sm font-medium text-brand-600 disabled:opacity-50 dark:border-ink-700 dark:text-brand-400">Adicionar vínculo</button>
          {destinos.length === 0 && <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">Cadastre ou restaure outro sistema para criar vínculos.</p>}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200"><input type="checkbox" checked={Boolean(rascunho.featured)} onChange={(e) => alterar('featured', e.target.checked)} /> Destaque na vitrine</label>
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={ocupado} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{ocupado ? 'Salvando…' : 'Salvar sistema'}</button><button type="button" onClick={() => { setEditando(null); setErro('') }} className="rounded-lg border border-ink-200 px-5 py-2.5 text-sm text-ink-600 dark:border-ink-700 dark:text-ink-300">Cancelar</button></div>
    </form>}

    <div className="grid gap-3">{sistemas.map((item) => <div key={item.sistema.slug} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-800">
      <div><p className="font-semibold text-ink-900 dark:text-white">{item.sistema.name} <span className="ml-2 text-xs font-normal text-ink-400">{item.sistema.slug}</span></p><p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{item.sistema.kind === 'external' ? 'Externo' : 'Interno'} · {item.ativo ? 'Ativo' : 'Arquivado'}</p></div>
      <div className="flex flex-wrap gap-3 text-sm"><button type="button" disabled={editando !== null || ocupado} onClick={() => abrir(item.sistema)} className="min-h-11 px-2 font-medium text-brand-600 disabled:opacity-50 dark:text-brand-400">Editar</button>{item.ativo ? <button type="button" disabled={editando !== null || ocupado} onClick={() => setArquivar(item.sistema)} className="min-h-11 px-2 font-medium text-rose-600 disabled:opacity-50">Remover</button> : <button type="button" disabled={editando !== null || ocupado} onClick={() => void alterarVisibilidade(item, true)} className="min-h-11 px-2 font-medium text-emerald-600 disabled:opacity-50">Restaurar</button>}</div>
    </div>)}</div>
    {arquivar && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/60 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="titulo-arquivar" className="mobile-modal w-full max-w-md rounded-xl bg-white p-6 dark:bg-ink-800"><h2 id="titulo-arquivar" className="text-lg font-semibold text-ink-900 dark:text-white">Remover {arquivar.name}?</h2><p className="mt-2 text-sm text-ink-600 dark:text-ink-300">O sistema sairá do site e do portal. Manuais e avaliações existentes serão preservados; você poderá restaurá-lo depois.</p><div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setArquivar(null)} className="rounded-lg border border-ink-200 px-4 py-2 text-sm dark:border-ink-700">Cancelar</button><button type="button" disabled={ocupado} onClick={() => void alterarVisibilidade({ sistema: arquivar, ativo: true }, false)} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Remover sistema</button></div></div></div>}
  </div>
}
