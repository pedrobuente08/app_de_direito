'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  cadastrarOab,
  getComunicacoes,
  getOabs,
  getProcessos,
  resolverComunicacao,
} from '@/lib/api'
import { FamiliaTabs } from '@/components/ui/familia-tabs'
import { FilterBar, FilterField, filterControlClass } from '@/components/ui/filter-bar'
import { Btn } from '@/components/ui/btn'
import { ToastContainer, useToast } from '@/lib/toast'
import type { Comunicacao, OabEscuta, ResolverComunicacaoPayload } from '@/lib/types'

const STATUS_CLASS: Record<string, string> = {
  LIDA: 'bg-[var(--urgencia-normal-bg)] text-[var(--urgencia-normal-text)]',
  NAO_LIDA: 'bg-[var(--urgencia-atencao-bg)] text-[var(--urgencia-atencao-text)]',
  ORFA: 'bg-[var(--urgencia-vencida-bg)] text-[var(--urgencia-vencida-text)]',
  DESCARTADA: 'bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]',
  ERRO: 'bg-[var(--urgencia-vencida-bg)] text-[var(--urgencia-vencida-text)]',
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function ComunicacoesPage() {
  const [comunicacoes, setComunicacoes] = useState<Comunicacao[]>([])
  const [oabs, setOabs] = useState<OabEscuta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [novaOab, setNovaOab] = useState('')
  const [savingOab, setSavingOab] = useState(false)
  const [aba, setAba] = useState<'orfas' | 'todas'>('orfas')
  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const [resolvendoId, setResolvendoId] = useState<string | null>(null)
  const [vinculoNumero, setVinculoNumero] = useState('')
  const [vinculoSistema, setVinculoSistema] = useState('ESAJ')
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, o] = await Promise.all([getComunicacoes(), getOabs()])
      setComunicacoes(c)
      setOabs(o)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const orfas = useMemo(
    () => comunicacoes.filter((c) => !c.processoId && c.status === 'ORFA'),
    [comunicacoes],
  )

  const lista = aba === 'orfas' ? orfas : comunicacoes

  async function handleCadastrarOab(e: React.FormEvent) {
    e.preventDefault()
    setSavingOab(true)
    try {
      await cadastrarOab(novaOab)
      toast.success('OAB cadastrada.')
      setNovaOab('')
      setOabs(await getOabs())
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSavingOab(false)
    }
  }

  async function resolver(
    id: string,
    decisao: ResolverComunicacaoPayload['decisao'],
    extra?: Omit<ResolverComunicacaoPayload, 'decisao'>,
  ) {
    setResolvendoId(id)
    try {
      await resolverComunicacao(id, { decisao, ...extra })
      toast.success('Comunicação atualizada.')
      void load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setResolvendoId(null)
    }
  }

  async function vincularComNovoProcesso(id: string) {
    const numero = vinculoNumero.trim()
    if (!numero) {
      toast.error('Informe o número do processo.')
      return
    }
    await resolver(id, 'VINCULAR', {
      dadosNovoProcesso: {
        numero,
        sistema: vinculoSistema.trim() || 'ESAJ',
      },
    })
    setVinculoNumero('')
  }

  async function vincularExistente(id: string) {
    const q = vinculoNumero.trim()
    if (q.length < 3) {
      toast.error('Digite ao menos 3 caracteres do número.')
      return
    }
    const res = await getProcessos({ numero: q, page: 1, pageSize: 1 })
    const p = res.data[0]
    if (!p) {
      toast.error('Processo não encontrado — use criar novo abaixo.')
      return
    }
    await resolver(id, 'VINCULAR', { processoId: p.id })
    setVinculoNumero('')
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      <div>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Comunicações Órfãs
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Comunicações sem processo vinculado — resolva com vincular, descartar ou marcar erro.
        </p>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
        <h2 className="mb-3 text-sm font-semibold">OABs monitoradas</h2>
        <form onSubmit={handleCadastrarOab} className="mb-3 flex gap-2">
          <input
            value={novaOab}
            onChange={(e) => setNovaOab(e.target.value.toUpperCase())}
            placeholder="Ex: SP123456"
            required
            className={filterControlClass}
          />
          <Btn type="submit" variant="primary" loading={savingOab}>
            Adicionar
          </Btn>
        </form>
        {oabs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Nenhuma OAB cadastrada.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {oabs.map((o) => (
              <span
                key={o.id}
                className="rounded-full bg-[var(--color-bg-muted)] px-3 py-1 text-xs font-mono"
              >
                {o.oab}
              </span>
            ))}
          </div>
        )}
      </div>

      <FamiliaTabs
        tabs={[
          { id: 'orfas', label: 'Sem processo', count: orfas.length },
          { id: 'todas', label: 'Todas', count: comunicacoes.length },
        ]}
        activeId={aba}
        onChange={(id) => setAba(id as 'orfas' | 'todas')}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded bg-[var(--color-bg-subtle)]" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm">
          {error}{' '}
          <button type="button" onClick={() => void load()} className="underline">
            Tentar novamente
          </button>
        </div>
      ) : lista.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Nenhuma comunicação nesta visão.
        </p>
      ) : (
        <div className="space-y-3">
          {lista.map((c) => (
            <article
              key={c.id}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs">{c.numeroProcessoBruto ?? '—'}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {formatDate(c.dataDisponibilizacao ?? c.createdAt)} · OAB {c.oab} ·{' '}
                    {c.tipo ?? '—'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[c.status] ?? ''}`}
                >
                  {c.status}
                </span>
              </div>

              {c.resumo ? (
                <p className="mt-2 text-xs text-[var(--color-text-secondary)] line-clamp-2">
                  {c.resumo}
                </p>
              ) : null}

              {aba === 'orfas' && !c.processoId ? (
                <FilterBar className="mt-3 !mb-0">
                  <FilterField label="Nº processo" className="min-w-[180px]">
                    <input
                      value={vinculoNumero}
                      onChange={(e) => setVinculoNumero(e.target.value)}
                      className={filterControlClass}
                      placeholder="CNJ…"
                    />
                  </FilterField>
                  <FilterField label="Sistema">
                    <input
                      value={vinculoSistema}
                      onChange={(e) => setVinculoSistema(e.target.value)}
                      className={filterControlClass}
                    />
                  </FilterField>
                  <Btn
                    variant="primary"
                    className="!py-1.5 text-xs"
                    loading={resolvendoId === c.id}
                    onClick={() => void vincularExistente(c.id)}
                  >
                    Vincular
                  </Btn>
                  <Btn
                    variant="default"
                    className="!py-1.5 text-xs"
                    loading={resolvendoId === c.id}
                    onClick={() => void vincularComNovoProcesso(c.id)}
                  >
                    Criar e vincular
                  </Btn>
                  <Btn
                    variant="default"
                    className="!py-1.5 text-xs"
                    loading={resolvendoId === c.id}
                    onClick={() => void resolver(c.id, 'NAO_E_NOSSO')}
                  >
                    Não é nosso
                  </Btn>
                  <Btn
                    variant="danger"
                    className="!py-1.5 text-xs"
                    loading={resolvendoId === c.id}
                    onClick={() => void resolver(c.id, 'ERRO')}
                  >
                    Erro
                  </Btn>
                </FilterBar>
              ) : null}

              {c.resumo ? (
                <button
                  type="button"
                  onClick={() => setExpandidoId(expandidoId === c.id ? null : c.id)}
                  className="mt-2 text-xs text-[var(--color-brand)] hover:underline"
                >
                  {expandidoId === c.id ? 'Fechar' : 'Ver resumo completo'}
                </button>
              ) : null}
              {expandidoId === c.id ? (
                <p className="mt-2 whitespace-pre-wrap text-xs text-[var(--color-text-secondary)]">
                  {c.resumo}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
