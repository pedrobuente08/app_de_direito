'use client'

import { useCallback, useEffect, useState } from 'react'
import { PopUpPosPendencia } from '@/components/popups'
import { Btn } from '@/components/ui/btn'
import { KpiCard } from '@/components/ui/kpi-card'
import { urgenciaPendencia } from '@/lib/pendencia-urgencia'
import {
  getAtendimentoLista,
  getAtendimentoResumo,
  puxarAtendimentoFila,
} from '@/lib/api'
import type { AtendimentoLinha, AtendimentoResumo, Pendencia } from '@/lib/types'
import { ToastContainer, useToast } from '@/lib/toast'

const TIPO_LABELS: Record<string, string> = {
  SOLICITAR_DOC_GRATUIDADE:    'Solicitar doc. gratuidade',
  SOLICITAR_DOC_CONFORME_VARA: 'Solicitar doc. conforme vara',
  SOLICITAR_NOVA_PROCURACAO: 'Solicitar nova procuração',
  CONTATO_URGENTE_CLIENTE_MA_FE: 'Contato urgente — má-fé',
  JUSTIFICAR_AUSENCIA_CLIENTE: 'Justificar ausência do cliente',
}

function tipoLabel(tipo: string): string {
  return TIPO_LABELS[tipo] ?? tipo.replace(/_/g, ' ')
}

export default function AtendimentoPage() {
  const [linhas, setLinhas] = useState<AtendimentoLinha[]>([])
  const [resumo, setResumo] = useState<AtendimentoResumo | null>(null)
  const [loading, setLoading] = useState(true)
  const [puxando, setPuxando] = useState(false)
  const [soMinhas, setSoMinhas] = useState(false)
  const [encerrar, setEncerrar] = useState<Pendencia | null>(null)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, r] = await Promise.all([
        getAtendimentoLista(soMinhas),
        getAtendimentoResumo(),
      ])
      setLinhas(list)
      setResumo(r)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [soMinhas])

  useEffect(() => { load() }, [load])

  async function handlePuxar() {
    setPuxando(true)
    try {
      await puxarAtendimentoFila()
      toast.success('Pendência atribuída a você.')
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setPuxando(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-auto p-6">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Atendimento</h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            Fila de contato com clientes — documentos, gratuidade e justificativas
          </p>
        </div>
        <Btn
          variant="primary"
          loading={puxando}
          onClick={handlePuxar}
          disabled={puxando}
        >
          Puxar da fila
        </Btn>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Abertas"
          value={resumo?.abertas ?? '—'}
          variant="default"
        />
        <KpiCard
          label="Vencendo em 3d"
          value={resumo?.vencendo ?? '—'}
          variant="warning"
        />
        <KpiCard
          label="Na fila (sem dono)"
          value={resumo?.naFila ?? '—'}
          foot="Clique em 'Puxar da fila' para assumir"
          variant="accent"
        />
        <KpiCard
          label="Cumpridas 30d"
          value={resumo?.cumpridas30d ?? '—'}
          variant="success"
        />
      </div>

      {/* Filtro toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSoMinhas(false)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            !soMinhas
              ? 'bg-[var(--color-brand)] text-white'
              : 'bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
          }`}
        >
          Toda a fila
        </button>
        <button
          type="button"
          onClick={() => setSoMinhas(true)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            soMinhas
              ? 'bg-[var(--color-brand)] text-white'
              : 'bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
          }`}
        >
          Minhas pendências
        </button>
      </div>

      {/* Estado */}
      {error && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {loading && (
        <p className="text-sm text-[var(--color-text-tertiary)]">Carregando...</p>
      )}

      {/* Lista */}
      {!loading && !error && linhas.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-default)] py-16 text-center">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Nenhuma pendência na fila</p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {soMinhas ? 'Você não tem pendências atribuídas.' : 'A fila de atendimento está vazia.'}
          </p>
        </div>
      )}

      {!loading && linhas.length > 0 && (
        <div className="overflow-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <table className="w-max min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--color-bg-muted)] shadow-sm">
              <tr>
                {['Processo', 'Cliente', 'Telefone', 'Tipo', 'Prazo', 'Responsável', ''].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {linhas.map(({ pendencia: p, processo: pr }) => {
                const urg = urgenciaPendencia(p.dataLimite)
                const tel = pr.telefone?.replace(/\D/g, '')
                return (
                  <tr key={p.id} className="hover:bg-[var(--color-bg-hover)]">
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs text-[var(--color-text-primary)]">
                        {pr.numero}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="block max-w-[180px] truncate text-sm">
                        {pr.clienteNome ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {tel ? (
                        <a
                          href={`https://wa.me/55${tel}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--color-brand)] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {pr.telefone}
                        </a>
                      ) : (
                        <span className="text-sm text-[var(--color-text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="block max-w-[220px] truncate text-sm">
                        {tipoLabel(p.tipo)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {p.dataLimite ? (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ background: urg.bg, color: urg.text }}
                        >
                          {p.dataLimite} · {urg.label}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-text-tertiary)]">Sem prazo</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        {p.responsavel || <span className="italic text-[var(--color-text-tertiary)]">na fila</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setEncerrar(p)}
                        className="text-xs font-medium text-[var(--color-brand)] hover:underline"
                      >
                        Cumprir
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && linhas.length > 0 && (
        <p className="text-right text-xs text-[var(--color-text-tertiary)]">
          {linhas.length} pendência{linhas.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Pop-up cumprir */}
      <PopUpPosPendencia
        open={encerrar !== null}
        pendencia={encerrar}
        onClose={() => setEncerrar(null)}
        onSuccess={() => {
          setEncerrar(null)
          load()
          toast.success('Pendência encerrada.')
        }}
      />
    </div>
  )
}
