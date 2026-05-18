'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  getReprotocoloList,
  getReprotocoloResumo,
  patchReprotocolo,
} from '@/lib/api'
import { Btn } from '@/components/ui/btn'
import { FamiliaTabs } from '@/components/ui/familia-tabs'
import { KpiCard } from '@/components/ui/kpi-card'
import { ToastContainer, useToast } from '@/lib/toast'
import type { ReprotocoloLinha } from '@/lib/types'

const SUB_TABS = [
  { id: '', label: 'Todas' },
  { id: 'AGUARDANDO_ISENCAO_CUSTAS', label: 'Aguard. isenção' },
  { id: 'AGUARDANDO_ANALISE', label: 'Aguard. análise' },
  { id: 'AGUARDANDO_DOC_CLIENTE', label: 'Aguard. doc.' },
  { id: 'EM_REPROTOCOLO', label: 'Em reprotocolo' },
  { id: 'REPROTOCOLADO', label: 'Reprotocolado' },
  { id: 'DESCARTADO', label: 'Descartado' },
]

function labelSubEstado(s: string | null | undefined): string {
  if (!s) return '—'
  return SUB_TABS.find((t) => t.id === s)?.label ?? s.replace(/_/g, ' ')
}

export default function ReprotocoloPage() {
  const toast = useToast()
  const [lista, setLista] = useState<ReprotocoloLinha[]>([])
  const [resumo, setResumo] = useState<Awaited<ReturnType<typeof getReprotocoloResumo>> | null>(null)
  const [filtro, setFiltro] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rows, r] = await Promise.all([
        getReprotocoloList(filtro || undefined),
        getReprotocoloResumo(),
      ])
      setLista(rows)
      setResumo(r)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [filtro, toast])

  useEffect(() => {
    void load()
  }, [load])

  async function atualizarSubEstado(
    processoId: string,
    subEstado: string,
    extra?: Record<string, unknown>,
  ) {
    setSalvando(processoId)
    try {
      await patchReprotocolo(processoId, { subEstado, ...extra })
      toast.success('Sub-estado atualizado.')
      void load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(null)
    }
  }

  const kpiCards = [
    { label: 'Total', value: resumo?.total, variant: 'default' as const, filtro: '' },
    {
      label: 'Aguard. isenção',
      value: resumo?.porSubEstado?.AGUARDANDO_ISENCAO_CUSTAS,
      variant: 'warning' as const,
      filtro: 'AGUARDANDO_ISENCAO_CUSTAS',
    },
    {
      label: 'Aguard. análise',
      value: resumo?.porSubEstado?.AGUARDANDO_ANALISE,
      variant: 'default' as const,
      filtro: 'AGUARDANDO_ANALISE',
    },
    {
      label: 'Em reprotocolo',
      value: resumo?.porSubEstado?.EM_REPROTOCOLO,
      variant: 'accent' as const,
      filtro: 'EM_REPROTOCOLO',
    },
    {
      label: 'A revisitar',
      value: resumo?.aRevisitarSemana,
      variant: 'danger' as const,
      filtro: '',
    },
  ]

  return (
    <div className="animate-fade-in-up space-y-4">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      <div>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Reprotocolo
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          Processos extintos sem mérito com fluxo de isenção, análise e reprotocolo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((c) => (
          <KpiCard
            key={c.label}
            label={c.label}
            value={c.value ?? '—'}
            variant={c.variant}
            onClick={() => setFiltro(c.filtro)}
          />
        ))}
      </div>

      <FamiliaTabs
        tabs={SUB_TABS.map((t) => ({
          ...t,
          count:
            t.id === ''
              ? resumo?.total
              : resumo?.porSubEstado?.[t.id],
        }))}
        activeId={filtro}
        onChange={setFiltro}
      />

      {loading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Nenhum processo em reprotocolo. Registre extinção sem mérito em{' '}
          <Link href="/intimacoes" className="text-[var(--color-brand)] hover:underline">
            Intimações
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-muted)]">
              <tr>
                {[
                  'Processo',
                  'Cliente',
                  'Réu',
                  'Modalidade',
                  'Sub-estado',
                  'Extinção',
                  'Isenção',
                  'Reprotocolo',
                  'Ações',
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {lista.map((row) => {
                const r = row.reprotocolo
                const p = row.processo
                const sub = r.subEstado
                return (
                  <tr key={r.processoId} className="hover:bg-[var(--color-bg-hover)]">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link
                        href={`/intimacoes`}
                        className="text-[var(--color-brand)] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.numero}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{p.clienteNome ?? '—'}</td>
                    <td className="px-3 py-2">{p.reuTexto ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">{r.modalidadeExtincao ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 text-xs">
                        {labelSubEstado(sub)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{r.dataExtincao ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">{r.dataIsencaoResultado ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">{r.dataReprotocolo ?? '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {sub === 'AGUARDANDO_ISENCAO_CUSTAS' ? (
                          <Btn
                            variant="default"
                            className="!px-2 !py-1 text-[10px]"
                            loading={salvando === r.processoId}
                            onClick={() => {
                              const v = window.prompt('Resultado isenção (DEFERIDA/INDEFERIDA):')
                              if (v) {
                                void atualizarSubEstado(r.processoId, 'AGUARDANDO_ANALISE', {
                                  dataIsencaoResultado: v.trim(),
                                })
                              }
                            }}
                          >
                            Isenção
                          </Btn>
                        ) : null}
                        {sub === 'AGUARDANDO_ANALISE' ? (
                          <>
                            <Btn
                              variant="primary"
                              className="!px-2 !py-1 text-[10px]"
                              loading={salvando === r.processoId}
                              onClick={() =>
                                void atualizarSubEstado(r.processoId, 'EM_REPROTOCOLO')
                              }
                            >
                              Aprovar
                            </Btn>
                            <Btn
                              variant="default"
                              className="!px-2 !py-1 text-[10px]"
                              onClick={() =>
                                void atualizarSubEstado(r.processoId, 'DESCARTADO')
                              }
                            >
                              Descartar
                            </Btn>
                          </>
                        ) : null}
                        {sub === 'EM_REPROTOCOLO' ? (
                          <Btn
                            variant="primary"
                            className="!px-2 !py-1 text-[10px]"
                            onClick={() => {
                              const novo = window.prompt('ID do processo novo (UUID):')
                              if (novo?.trim()) {
                                void atualizarSubEstado(r.processoId, 'REPROTOCOLADO', {
                                  processoNovoId: novo.trim(),
                                  dataReprotocolo: new Date().toISOString().slice(0, 10),
                                })
                              }
                            }}
                          >
                            Reprotocolado
                          </Btn>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
