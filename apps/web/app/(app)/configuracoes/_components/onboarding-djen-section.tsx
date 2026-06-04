'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getOnboardingStatus,
  getOabs,
  iniciarOnboardingDjen,
  limparNomesDjen,
} from '@/lib/api'
import type { OnboardingStatus } from '@/lib/api'

type Props = {
  disabled?: boolean
}

function parseOabDefault(raw: string): { numero: string; uf: string } {
  const t = raw.trim().toUpperCase()
  let m = t.match(/^(\d+)[\/\-]([A-Z]{2})$/)
  if (m) return { numero: m[1]!, uf: m[2]! }
  m = t.match(/^([A-Z]{2})(\d+)$/)
  if (m) return { numero: m[2]!, uf: m[1]! }
  const digits = t.replace(/\D/g, '')
  return { numero: digits, uf: 'BA' }
}

export function OnboardingDjenSection({ disabled }: Props) {
  const [oabNumero, setOabNumero] = useState('')
  const [ufOab, setUfOab] = useState('BA')
  const [diasJanela, setDiasJanela] = useState(365)
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshStatus = useCallback(async () => {
    try {
      const s = await getOnboardingStatus()
      setStatus(s)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
    getOabs()
      .then((list) => {
        if (list[0]?.oab) {
          const p = parseOabDefault(list[0].oab)
          setOabNumero(p.numero)
          setUfOab(p.uf)
        }
      })
      .catch(() => {})
  }, [refreshStatus])

  useEffect(() => {
    if (status?.status !== 'RUNNING') return
    const id = setInterval(() => void refreshStatus(), 3000)
    return () => clearInterval(id)
  }, [status?.status, refreshStatus])

  const running = status?.status === 'RUNNING'

  const [limpando, setLimpando] = useState(false)
  const [resultadoLimpeza, setResultadoLimpeza] = useState<{
    total: number; corrigidos: number; zerados: number; semMudanca: number
  } | null>(null)
  const [erroLimpeza, setErroLimpeza] = useState<string | null>(null)

  async function onLimparNomes() {
    setLimpando(true)
    setResultadoLimpeza(null)
    setErroLimpeza(null)
    try {
      const res = await limparNomesDjen()
      setResultadoLimpeza(res)
    } catch (e) {
      setErroLimpeza((e as Error).message)
    } finally {
      setLimpando(false)
    }
  }

  async function onIniciar() {
    setError(null)
    setLoading(true)
    try {
      const res = await iniciarOnboardingDjen({
        oab: oabNumero.trim(),
        ufOab: ufOab.trim().toUpperCase(),
        diasJanela,
      })
      setStatus(res.status)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const pct =
    status && status.progresso.total > 0
      ? Math.round((status.progresso.processado / status.progresso.total) * 100)
      : 0

  return (
    <section className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
      <h2 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">
        Importação inicial via DJEN
      </h2>
      <p className="mb-4 text-xs text-[var(--color-text-secondary)]">
        Esta operação pode levar vários minutos. O sistema continuará funcionando
        normalmente enquanto a importação roda em segundo plano.
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-[var(--color-text-secondary)]">
          Número OAB
          <input
            type="text"
            value={oabNumero}
            onChange={(e) => setOabNumero(e.target.value)}
            disabled={disabled || running}
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            placeholder="66364"
          />
        </label>
        <label className="text-xs text-[var(--color-text-secondary)]">
          UF
          <input
            type="text"
            maxLength={2}
            value={ufOab}
            onChange={(e) => setUfOab(e.target.value.toUpperCase())}
            disabled={disabled || running}
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-[var(--color-text-secondary)]">
          Janela
          <select
            value={diasJanela}
            onChange={(e) => setDiasJanela(Number(e.target.value))}
            disabled={disabled || running}
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          >
            <option value={30}>30 dias (teste rápido)</option>
            <option value={90}>90 dias</option>
            <option value={180}>180 dias</option>
            <option value={365}>365 dias (recomendado)</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={() => void onIniciar()}
        disabled={disabled || running || loading || !oabNumero.trim()}
        className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {running ? 'Importação em andamento…' : 'Iniciar importação'}
      </button>

      {error ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : null}

      {running && status ? (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-[var(--color-text-secondary)]">
            <span>Progresso</span>
            <span>
              {status.progresso.processado} / {status.progresso.total} ({pct}%)
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
            <div
              className="h-full bg-[var(--color-brand)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}

      {status?.status === 'DONE' && status.relatorio ? (
        <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <p className="font-semibold">Importação concluída</p>
          <ul className="mt-2 list-inside list-disc text-xs">
            <li>{status.relatorio.processosNovos} processos criados</li>
            <li>{status.relatorio.comunicacoesNovas} comunicações vinculadas</li>
            <li>{status.relatorio.jaExistiam} já existiam (ignorados)</li>
            {status.relatorio.erros > 0 ? (
              <li>{status.relatorio.erros} erros (ver log de captura)</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {status?.status === 'ERROR' ? (
        <p className="mt-3 text-sm text-red-600">
          {status.erroMsg ?? 'Falha na importação.'}
        </p>
      ) : null}

      <hr className="my-5 border-[var(--color-border-default)]" />

      <h3 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">
        Corrigir nomes de processos criados pelo DJEN
      </h3>
      <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
        Processos criados automaticamente podem ter nomes inválidos (texto da publicação no lugar do nome do cliente).
        Esta operação verifica todos os processos criados pelo DJEN e tenta corrigir nomes ruins —
        onde não for possível, o campo é zerado para preenchimento manual.
      </p>

      <button
        type="button"
        onClick={() => void onLimparNomes()}
        disabled={disabled || limpando}
        className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-[var(--color-bg-subtle)]"
      >
        {limpando ? 'Corrigindo…' : 'Corrigir nomes inválidos'}
      </button>

      {erroLimpeza ? (
        <p className="mt-2 text-sm text-red-600">{erroLimpeza}</p>
      ) : null}

      {resultadoLimpeza ? (
        <div className="mt-3 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-3 text-xs">
          <p className="font-semibold text-[var(--color-text-primary)]">Operação concluída</p>
          <ul className="mt-1.5 space-y-0.5 text-[var(--color-text-secondary)]">
            <li>{resultadoLimpeza.total} processos DJEN verificados</li>
            <li>{resultadoLimpeza.semMudanca} já tinham nome válido (sem alteração)</li>
            <li>{resultadoLimpeza.corrigidos} corrigidos com nome extraído da publicação</li>
            <li>{resultadoLimpeza.zerados} zerados — nome em branco para preenchimento manual</li>
          </ul>
        </div>
      ) : null}
    </section>
  )
}
