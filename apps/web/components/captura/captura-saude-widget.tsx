'use client'

import { useEffect, useState } from 'react'
import { getCapturaLogs, getCapturaSaude } from '@/lib/api'
import type { CapturaLog, FonteSaude } from '@/lib/types'

function fmtData(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function labelFonte(fonte: string): string {
  if (fonte === 'djen') return 'DJEN'
  return fonte.toUpperCase()
}

export function CapturaSaudeWidget() {
  const [saude, setSaude] = useState<FonteSaude[]>([])
  const [logs, setLogs] = useState<CapturaLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getCapturaSaude(), getCapturaLogs(5)])
      .then(([s, l]) => {
        setSaude(s)
        setLogs(l)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-pauta-xl border border-pauta-line bg-pauta-card px-4 py-3 text-sm text-pauta-muted">
        Carregando status de captura…
      </div>
    )
  }

  if (!saude.length && !logs.length) {
    return (
      <div className="rounded-pauta-xl border border-pauta-line bg-pauta-card px-4 py-3 text-sm text-pauta-muted">
        Nenhuma captura registrada. Cadastre OABs em Comunicações órfãs para ativar o monitoramento DJEN.
      </div>
    )
  }

  return (
    <div className="rounded-pauta-xl border border-pauta-line bg-pauta-card px-[18px] py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold text-pauta-ink">Captura automática</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.6px] text-pauta-muted">
          Fontes oficiais
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(saude.length ? saude : [{ fonte: 'djen', ultimoOkEm: null, ultimaFalhaEm: null, falhasConsecutivas: 0, saudavel: true }]).map(
          (f) => (
            <div
              key={f.fonte}
              className="rounded-pauta-md border border-pauta-line bg-pauta-card-2 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-pauta-ink">{labelFonte(f.fonte)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                    f.saudavel
                      ? 'bg-pauta-pos-bg text-pauta-pos'
                      : 'bg-[var(--delta-crit-bg)] text-pauta-clay'
                  }`}
                >
                  {f.saudavel ? 'OK' : `${f.falhasConsecutivas} falha(s)`}
                </span>
              </div>
              <p className="mt-1 text-xs text-pauta-muted">
                Último OK: {fmtData(f.ultimoOkEm)}
              </p>
              {f.ultimaFalhaEm ? (
                <p className="text-xs text-pauta-clay">Última falha: {fmtData(f.ultimaFalhaEm)}</p>
              ) : null}
            </div>
          ),
        )}
      </div>

      {logs.length > 0 ? (
        <div className="mt-3 border-t border-pauta-line pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-pauta-muted">
            Execuções recentes
          </p>
          <ul className="space-y-1.5">
            {logs.slice(0, 3).map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-pauta-ink-soft"
              >
                <span className="font-mono text-pauta-ink">{log.oab}</span>
                <span>·</span>
                <span>{fmtData(log.iniciadoEm)}</span>
                <span>·</span>
                <span
                  className={
                    log.status === 'ok'
                      ? 'text-pauta-pos'
                      : log.status === 'falha'
                        ? 'text-pauta-clay'
                        : 'text-pauta-muted'
                  }
                >
                  {log.status}
                  {log.novosItems != null ? ` · ${log.novosItems} novo(s)` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
