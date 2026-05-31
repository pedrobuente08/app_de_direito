'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getAiQuota } from '@/lib/api'
import type { AiQuota } from '@/lib/types'

export function AiUsageMeter() {
  const [quota, setQuota] = useState<AiQuota | null>(null)

  useEffect(() => {
    getAiQuota()
      .then(setQuota)
      .catch(() => setQuota(null))
  }, [])

  if (!quota) {
    return (
      <div className="relative z-[2] mt-4 rounded-pauta-lg border border-[rgba(157,179,164,0.25)] bg-white/[0.025] p-[14px]">
        <p className="text-xs font-medium text-pauta-sage">Uso de IA</p>
        <p className="mt-1 font-mono text-[11px] text-[#B9BBAB]">Carregando…</p>
      </div>
    )
  }

  const pct = quota.percentualUsado
  const label = quota.periodoLabel ?? quota.periodo

  return (
    <Link
      href="/configuracoes/ia-plano"
      className="relative z-[2] mt-4 block rounded-pauta-lg border border-[rgba(157,179,164,0.25)] bg-white/[0.025] p-[14px] transition-colors hover:bg-white/[0.04]"
    >
      <p className="mb-1.5 text-xs font-medium text-pauta-sage">
        Uso de IA · {label}
      </p>
      <div className="mb-2 h-[6px] overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--sage), var(--ochre))',
          }}
        />
      </div>
      <p className="font-mono text-[11px] text-[#B9BBAB]">
        {quota.creditosUsados.toLocaleString('pt-BR')} /{' '}
        {quota.creditosTotal.toLocaleString('pt-BR')} créditos
      </p>
    </Link>
  )
}
