'use client'

import { useEffect, useState } from 'react'
import { atualizarAudiencia, getOpcoesPautista } from '@/lib/api'
import type { OpcaoPautista } from '@/lib/types'

type Props = {
  audienciaId: string
  value: string | null | undefined
  onSaved: () => void
}

export function PautistaField({ audienciaId, value, onSaved }: Props) {
  const [opcoes, setOpcoes] = useState<OpcaoPautista[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const atual = value?.trim() ?? ''

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getOpcoesPautista()
      .then((rows) => {
        if (!cancelled) setOpcoes(rows)
      })
      .catch((e) => {
        if (!cancelled) setErro((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function onChange(novo: string) {
    const pautista = novo.trim() || null
    if ((atual || '') === (pautista || '')) return
    setSaving(true)
    setErro(null)
    try {
      await atualizarAudiencia(audienciaId, { pautista })
      onSaved()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const temAtualNasOpcoes =
    !atual || opcoes.some((o) => o.nome.toUpperCase() === atual.toUpperCase())

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-semibold text-[var(--color-text-tertiary)]">Pautista:</span>
      <select
        value={atual}
        disabled={loading || saving}
        onChange={(e) => void onChange(e.target.value)}
        className="max-w-[220px] rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 py-1 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-brand)] focus:outline-none disabled:opacity-60"
        aria-label="Selecionar pautista"
      >
        <option value="">{loading ? 'Carregando…' : '— Não atribuído —'}</option>
        {!temAtualNasOpcoes && atual ? (
          <option value={atual}>{atual} (atual)</option>
        ) : null}
        {opcoes.map((o) => (
          <option key={o.id} value={o.nome}>
            {o.nome}
            {o.perfil === 'advogado' ? ' · adv.' : ''}
          </option>
        ))}
      </select>
      {saving ? (
        <span className="text-[var(--color-text-tertiary)]">Salvando…</span>
      ) : null}
      {erro ? <span className="text-[var(--urgencia-vencida-text)]">{erro}</span> : null}
    </div>
  )
}
