'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAiHealth, getAiUsage } from '@/lib/api'
import type { AiHealth, AiUsageRow } from '@/lib/types'

const FEATURE_LABELS: Record<string, string> = {
  RESUMO_ANDAMENTO: 'Resumo de andamento',
  TRADUCAO_WA: 'Tradução WhatsApp',
  EXTRACAO_FALLBACK: 'Extração (fallback)',
  JURIMETRIA_INSIGHT: 'Jurimetria',
  MINUTAS: 'Minutas',
}

const PLANO_LABELS: Record<string, string> = {
  autonomo: 'Autônomo',
  escritorio: 'Escritório',
  banca: 'Banca',
}

function fmtData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function fmtFeature(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature
}

export default function IaPlanoPage() {
  const [health, setHealth] = useState<AiHealth | null>(null)
  const [historico, setHistorico] = useState<AiUsageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getAiHealth(), getAiUsage(100)])
      .then(([h, u]) => {
        setHealth(h)
        setHistorico(u)
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-2 py-4 text-sm text-pauta-muted">
        Carregando uso de IA…
      </div>
    )
  }

  if (error || !health) {
    return (
      <div className="mx-auto max-w-4xl px-2 py-4">
        <p className="text-sm text-pauta-clay">
          {error ?? 'Não foi possível carregar os dados de IA.'}
        </p>
        <Link href="/configuracoes" className="mt-2 inline-block text-sm text-pauta-forest">
          ← Voltar às configurações
        </Link>
      </div>
    )
  }

  const { quota, usoPorFeature, ultimasChamadas, redisAtivo, anthropicConfigurado } = health
  const maxFeatureCreditos = Math.max(1, ...usoPorFeature.map((f) => f.totalCreditos))

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-2 py-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-pauta-ink">IA & Plano</h1>
          <p className="mt-1 text-sm text-pauta-muted">
            Consumo de créditos de inteligência artificial do escritório.
          </p>
        </div>
        <Link
          href="/configuracoes"
          className="text-sm font-medium text-pauta-forest hover:underline"
        >
          ← Configurações
        </Link>
      </div>

      {/* Quota card */}
      <div className="rounded-pauta-xl border border-pauta-line bg-pauta-card px-6 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[1px] text-pauta-muted">
              Plano {PLANO_LABELS[quota.plano] ?? quota.plano} · {quota.periodoLabel ?? quota.periodo}
            </p>
            <p className="mt-1 font-display text-3xl font-semibold text-pauta-ink">
              {quota.creditosRestantes.toLocaleString('pt-BR')}
              <span className="ml-1 text-base font-normal text-pauta-muted">créditos restantes</span>
            </p>
          </div>
          <div className="text-right text-sm text-pauta-muted">
            <p>{quota.creditosUsados.toLocaleString('pt-BR')} usados</p>
            <p>de {quota.creditosTotal.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-pauta-line">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${quota.percentualUsado}%`,
              background: 'linear-gradient(90deg, var(--sage), var(--ochre))',
            }}
          />
        </div>

        {quota.overagePolicy === 'block' && quota.creditosRestantes === 0 ? (
          <p className="mt-3 text-sm text-pauta-clay">
            Quota esgotada. Novas chamadas de IA estão bloqueadas até o próximo período.
          </p>
        ) : null}
      </div>

      {/* Status infra */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-pauta-lg border border-pauta-line bg-pauta-card-2 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-pauta-muted">Provedor</p>
          <p className={`mt-1 text-sm font-semibold ${anthropicConfigurado ? 'text-pauta-pos' : 'text-pauta-clay'}`}>
            Anthropic {anthropicConfigurado ? '· configurado' : '· não configurado'}
          </p>
        </div>
        <div className="rounded-pauta-lg border border-pauta-line bg-pauta-card-2 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-pauta-muted">Cache / quota</p>
          <p className={`mt-1 text-sm font-semibold ${redisAtivo ? 'text-pauta-pos' : 'text-pauta-muted'}`}>
            Redis {redisAtivo ? '· ativo' : '· fallback em memória/DB'}
          </p>
        </div>
      </div>

      {/* Uso por feature */}
      <div className="rounded-pauta-xl border border-pauta-line bg-pauta-card px-6 py-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-pauta-ink">Uso por feature</h2>

        {usoPorFeature.length === 0 ? (
          <p className="text-sm text-pauta-muted">
            Nenhuma chamada de IA registrada neste período.
          </p>
        ) : (
          <ul className="space-y-3">
            {usoPorFeature.map((f) => (
              <li key={f.feature}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-pauta-ink">{fmtFeature(f.feature)}</span>
                  <span className="font-mono text-xs text-pauta-muted">
                    {f.totalCreditos} créd. · {f.totalChamadas} chamada(s)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-pauta-line">
                  <div
                    className="h-full rounded-full bg-pauta-sage"
                    style={{ width: `${(f.totalCreditos / maxFeatureCreditos) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Histórico */}
      <div className="rounded-pauta-xl border border-pauta-line bg-pauta-card px-6 py-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-pauta-ink">Histórico recente</h2>

        {(historico.length ? historico : ultimasChamadas).length === 0 ? (
          <p className="text-sm text-pauta-muted">Sem registros ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-pauta-line text-xs uppercase tracking-wide text-pauta-muted">
                  <th className="pb-2 pr-4 font-medium">Data</th>
                  <th className="pb-2 pr-4 font-medium">Feature</th>
                  <th className="pb-2 pr-4 font-medium">Modelo</th>
                  <th className="pb-2 pr-4 font-medium">Tokens</th>
                  <th className="pb-2 pr-4 font-medium">Créditos</th>
                  <th className="pb-2 font-medium">Cache</th>
                </tr>
              </thead>
              <tbody>
                {(historico.length ? historico : ultimasChamadas).map((row) => (
                  <tr key={row.id} className="border-b border-pauta-line/60 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-xs text-pauta-muted">
                      {fmtData(row.createdAt)}
                    </td>
                    <td className="py-2.5 pr-4 text-pauta-ink">{fmtFeature(row.feature)}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-pauta-muted">
                      {row.model.replace('claude-', '').replace('-latest', '')}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-pauta-muted">
                      {row.inputTokens}+{row.outputTokens}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-pauta-ink">
                      {row.creditos}
                    </td>
                    <td className="py-2.5 font-mono text-xs">
                      {row.cacheHit ? (
                        <span className="text-pauta-pos">hit</span>
                      ) : (
                        <span className="text-pauta-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
