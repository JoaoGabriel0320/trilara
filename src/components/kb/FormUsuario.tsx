'use client'

import type { Publico } from '@/lib/publico'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { KeyRound, Save, ShieldCheck, UserPlus, UserRound } from 'lucide-react'
import { SenhaTemporaria } from './SenhaTemporaria'
import { AvatarColaborador } from '@/components/portal/AvatarColaborador'
import { Selecao } from '@/components/ui/Selecao'

type Papel = 'COLABORADOR' | 'EDITOR' | 'ADMIN'

export type UsuarioForm = {
  id: string
  nome: string
  email: string
  departamento: string | null
  filialNome: string | null
  papel: Papel
  tipoAcesso: Publico
  empresaNome: string | null
  fotoKey: string | null
  adminProtegido?: boolean
}

const campo =
  'mt-2 min-h-12 w-full rounded-xl border border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-900 px-4 py-3 text-[15px] text-ink-900 dark:text-ink-50 placeholder:text-ink-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition'

const rotulo = 'text-[14px] font-medium text-ink-700 dark:text-ink-300'

const OPCOES_PAPEL = [
  { value: 'COLABORADOR', label: 'Colaborador', descricao: 'Consulta os manuais e documentos disponíveis.' },
  { value: 'EDITOR', label: 'Gestor', descricao: 'Cria documentos e edita apenas os próprios, sem acesso à administração.' },
  { value: 'ADMIN', label: 'Administrador', descricao: 'Também gerencia colaboradores e permissões.' },
] satisfies { value: Papel; label: string; descricao: string }[]

export function FormUsuario({ usuario, filiais, departamentos }: { usuario?: UsuarioForm; filiais: { id: string; nome: string }[]; departamentos: { id: string; nome: string }[] }) {
  const router = useRouter()
  const editando = Boolean(usuario)

  const [tipoAcesso, setTipoAcesso] = useState<Publico>(usuario?.tipoAcesso ?? 'INTERNO')
  const [empresaNome, setEmpresaNome] = useState(usuario?.empresaNome ?? '')
  const externo = tipoAcesso === 'EXTERNO'
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [departamento, setDepartamento] = useState(usuario?.departamento ?? '')
  const [filialNome, setFilialNome] = useState(usuario?.filialNome ?? '')
  const [papel, setPapel] = useState<Papel>(usuario?.papel ?? 'COLABORADOR')
  const [fotoKey, setFotoKey] = useState<string | null>(usuario?.fotoKey ?? null)
  const [removendoFoto, setRemovendoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState<string | null>(null)
  const [avisoFoto, setAvisoFoto] = useState<string | null>(null)

  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null)

  async function removerFoto() {
    if (!usuario || !fotoKey) return
    setRemovendoFoto(true)
    setErroFoto(null)
    setAvisoFoto(null)
    try {
      const resposta = await fetch(`/api/admin/usuarios/${encodeURIComponent(usuario.id)}/foto`, { method: 'DELETE' })
      const dados = await resposta.json().catch(() => ({}))
      if (!resposta.ok) throw new Error(dados.error ?? 'Não foi possível remover a foto.')
      setFotoKey(null)
      setAvisoFoto('Foto removida. O colaborador poderá adicionar outra em Minha conta.')
      router.refresh()
    } catch (falha) {
      setErroFoto(falha instanceof Error ? falha.message : 'Não foi possível remover a foto.')
    } finally {
      setRemovendoFoto(false)
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!externo && (!filialNome || !departamento)) {
      setErro('Selecione uma filial e um departamento.')
      return
    }
    setEnviando(true)

    const corpo = { nome, email, departamento, filialNome, papel: externo ? 'COLABORADOR' : papel, tipoAcesso, empresaNome }

    try {
      const res = await fetch(editando ? `/api/admin/usuarios/${usuario!.id}` : '/api/admin/usuarios', {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      const dados = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErro(dados.error ?? 'Não foi possível salvar.')
        setEnviando(false)
        return
      }

      if (!editando) {
        // Não navega ainda: a senha temporária só aparece agora, nesta
        // resposta. Sair da página antes de o admin copiar ela é perdê-la
        // de vez — precisa fechar o painel pra só então seguir.
        setSenhaGerada(dados.senhaTemporaria)
        setEnviando(false)
        return
      }

      router.push('/admin/usuarios')
      router.refresh()
    } catch {
      setErro('Falha de conexão. Tente novamente.')
      setEnviando(false)
    }
  }

  if (senhaGerada) {
    return (
      <SenhaTemporaria
        senha={senhaGerada}
        nomeColaborador={nome}
        onFechar={() => {
          router.push('/admin/usuarios')
          router.refresh()
        }}
      />
    )
  }

  return (
    <form onSubmit={enviar} aria-busy={enviando} className="space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
        <section aria-labelledby="dados-colaborador" className="min-w-0 rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-800">
          <div className="flex items-center gap-3 border-b border-ink-200 px-4 py-4 sm:py-5 dark:border-ink-700 sm:px-7">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <UserRound size={21} aria-hidden="true" />
            </span>
            <div>
              <h2 id="dados-colaborador" className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">Dados do colaborador</h2>
              <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Informações de identificação e vínculo com a empresa.</p>
            </div>
          </div>

          <div className="space-y-6 p-4 sm:p-7">
            {usuario && (
              <div className="flex flex-wrap items-center gap-4 rounded-xl bg-ink-50 p-4 dark:bg-ink-900">
                <AvatarColaborador
                  nome={nome || usuario.nome}
                  fotoKey={fotoKey}
                  urlFoto={`/api/admin/usuarios/${encodeURIComponent(usuario.id)}/foto`}
                  className="h-16 w-16 rounded-xl text-[20px]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-ink-900 dark:text-ink-50">Foto do colaborador</p>
                  <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">{fotoKey ? 'Foto atual do perfil' : 'Nenhuma foto cadastrada'}</p>
                  {fotoKey && (
                    <button type="button" onClick={removerFoto} disabled={removendoFoto || enviando} className="mt-2 text-[13px] font-medium text-rose-600 hover:underline disabled:cursor-wait disabled:opacity-50 dark:text-rose-400">
                      {removendoFoto ? 'Removendo foto…' : 'Remover foto'}
                    </button>
                  )}
                </div>
                {erroFoto && <p role="alert" className="w-full text-[13px] text-rose-600 dark:text-rose-400">{erroFoto}</p>}
                {avisoFoto && <p role="status" className="w-full text-[13px] text-emerald-700 dark:text-emerald-400">{avisoFoto}</p>}
              </div>
            )}
            <div>
              <span id="tipo-acesso-usuario" className={rotulo}>Tipo de acesso</span>
              <Selecao
                rotuloId="tipo-acesso-usuario"
                tamanho="grande"
                valor={tipoAcesso}
                disabled={Boolean(usuario?.adminProtegido)}
                onChange={(valor) => {
                  setTipoAcesso(valor as Publico)
                  if (valor === 'EXTERNO') setPapel('COLABORADOR')
                }}
                opcoes={[
                  { value: 'INTERNO', label: 'Equipe' },
                  { value: 'EXTERNO', label: 'Externo — cliente ou transportadora' },
                ]}
              />
            </div>
            <p className="text-[13px] text-ink-500 dark:text-ink-400">{externo ? 'Acesso aos materiais publicados para convidados.' : 'Acesso aos materiais internos da empresa.'}</p>
            {externo && <label className="block"><span className={rotulo}>Empresa</span><input value={empresaNome} onChange={e => setEmpresaNome(e.target.value)} maxLength={160} required className={campo} placeholder="Nome da empresa" /></label>}
            <label className="block">
              <span className={rotulo}>Nome completo</span>
              <input name="nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Nome completo" className={campo} />
            </label>

            <label className="block">
              <span className={rotulo}>E-mail</span>
              <input
                name="email"
                autoComplete="email"
                type="email"
                title={externo ? "E-mail do cliente" : "Informe um e-mail válido"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={externo ? "nome@empresa.com.br" : "nome@exemplo.com"}
                className={campo}
              />
            </label>

            {!externo && <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className={rotulo}>Departamento</span>
                <Selecao valor={departamento} onChange={setDepartamento} placeholder="Selecione um departamento" buscavel={departamentos.length > 6} opcoes={departamentos.map((item) => ({ value: item.nome, label: item.nome }))} />
              </label>

              <label className="block">
                <span className={rotulo}>Filial</span>
                <Selecao valor={filialNome} onChange={setFilialNome} placeholder="Selecione uma filial" buscavel={filiais.length > 6} opcoes={filiais.map((item) => ({ value: item.nome, label: item.nome }))} />
              </label>
            </div>}
          </div>
        </section>

        <section aria-labelledby="acesso-colaborador" className="min-w-0 rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-800">
          <div className="flex items-center gap-3 border-b border-ink-200 px-4 py-4 sm:py-5 dark:border-ink-700 sm:px-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <ShieldCheck size={21} aria-hidden="true" />
            </span>
            <div>
              <h2 id="acesso-colaborador" className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">Permissões de acesso</h2>
              <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Defina o perfil deste colaborador no portal.</p>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <fieldset>
              <legend className="sr-only">Papel do colaborador</legend>
              <div className="space-y-3">
                {OPCOES_PAPEL.filter(opcao => !externo || opcao.value === 'COLABORADOR').map((opcao) => (
                  <label key={opcao.value} className={usuario?.adminProtegido && opcao.value !== 'ADMIN' ? 'block cursor-not-allowed opacity-50' : 'block cursor-pointer'}>
                    <input
                      type="radio"
                      name="papel"
                      value={opcao.value}
                      checked={papel === opcao.value}
                      disabled={usuario?.adminProtegido && opcao.value !== 'ADMIN'}
                      onChange={() => setPapel(opcao.value)}
                      className="peer sr-only"
                    />
                    <span className="flex items-start gap-3 rounded-xl border border-ink-200 p-4 transition hover:border-brand-300 peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 dark:border-ink-700 dark:peer-checked:border-brand-400 dark:peer-checked:bg-brand-500/10 dark:peer-focus-visible:ring-offset-ink-800">
                      <span aria-hidden="true" className={'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ' + (papel === opcao.value ? 'border-brand-500 bg-brand-500' : 'border-ink-300 dark:border-ink-600')}>
                        {papel === opcao.value && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                      <span>
                        <span className="block text-[14px] font-semibold text-ink-900 dark:text-ink-50">{opcao.label}</span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">{opcao.descricao}</span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {!editando && (
              <div className="mt-5 flex gap-3 rounded-xl bg-ink-50 p-4 dark:bg-ink-900">
                <KeyRound size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-400" />
                <div>
                  <h3 className="text-[13px] font-semibold text-ink-700 dark:text-ink-200">Primeiro acesso</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">
                    Ao criar o colaborador, uma senha temporária aparece uma única vez. Copie e entregue a ele,
                    que definirá a senha definitiva no primeiro acesso.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {erro && (
        <p role="alert" className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2.5 text-[13px] text-rose-700 dark:text-rose-300">
          {erro}
        </p>
      )}

      <div className="flex flex-col gap-4 rounded-2xl border border-ink-200 bg-white p-4 sm:p-5 dark:border-ink-800 dark:bg-ink-800 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="text-[13px] text-ink-500 dark:text-ink-400">Confira os dados e as permissões antes de salvar.</p>
        <div className="flex shrink-0 flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            disabled={enviando}
            onClick={() => router.push('/admin/usuarios')}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ink-200 px-6 py-3 text-[15px] font-medium text-ink-600 transition hover:bg-ink-100 disabled:opacity-60 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-500 px-7 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
          >
            {editando ? <Save size={19} aria-hidden="true" /> : <UserPlus size={19} aria-hidden="true" />}
            {enviando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar colaborador'}
          </button>
        </div>
      </div>
    </form>
  )
}
