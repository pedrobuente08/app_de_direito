'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getComunicacoes } from '@/lib/api'
import { FamiliaTabs } from '@/components/ui/familia-tabs'
import { ToastContainer, useToast } from '@/lib/toast'
import type { Comunicacao } from '@/lib/types'

const STATUS_LABEL: Record<string, string> = {
  LIDA: 'Lida',
  NAO_LIDA: 'Não lida',
  ORFA: 'Sem processo',
  DESCARTADA: 'Descartada',
  ERRO: 'Erro',
}

const STATUS_CLASS: Record<string, string> = {
  LIDA: 'bg-[var(--urgencia-normal-bg)] text-[var(--urgencia-normal-text)]',
  NAO_LIDA: 'bg-[var(--urgencia-atencao-bg)] text-[var(--urgencia-atencao-text)]',
  ORFA: 'bg-[var(--urgencia-vencida-bg)] text-[var(--urgencia-vencida-text)]',
  DESCARTADA: 'bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]',
  ERRO: 'bg-[var(--urgencia-vencida-bg)] text-[var(--urgencia-vencida-text)]',
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

type Aba = 'todas' | 'nao_lida' | 'orfa'

export default function PublicacoesPage() {
  const router = useRouter()
  const toast = useToast()
  const [comunicacoes, setComunicacoes] = useState<Comunicacao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aba, setAba] = useState<Aba>('todas')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getComunicacoes()
      setComunicacoes(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const lista = useMemo(() => {
    if (aba === 'nao_lida') return comunicacoes.filter((c) => c.status === 'NAO_LIDA')
    if (aba === 'orfa') return comunicacoes.filter((c) => c.status === 'ORFA')
    return comunicacoes
  }, [comunicacoes, aba])

  const naoLidas = useMemo(() => comunicacoes.filter((c) => c.status === 'NAO_LIDA').length, [comunicacoes])
  const orfas = useMemo(() => comunicacoes.filter((c) => c.status === 'ORFA').length, [comunicacoes])

  function handleClick(c: Comunicacao) {
    if (c.status === 'ORFA' || !c.processoId) {
      router.push('/comunicacoes')
      return
    }
    const numero = c.numeroProcessoBruto?.trim()
    if (numero) {
      router.push(`/intimacoes?numero=${encodeURIComponent(numero)}`)
    } else {
      router.push('/intimacoes')
    }
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      <div>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Publicações DJEN
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Todas as publicações capturadas pelo DJEN. Clique para ir ao processo correspondente.
        </p>
      </div>

      <FamiliaTabs
        tabs={[
          { id: 'todas', label: 'Todas', count: comunicacoes.length },
          { id: 'nao_lida', label: 'Não lidas', count: naoLidas },
          { id: 'orfa', label: 'Sem processo', count: orfas },
        ]}
        activeId={aba}
        onChange={(id) => setAba(id as Aba)}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-[var(--color-bg-subtle)]" />
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
        <p className="text-sm text-[var(--color-text-secondary)]">Nenhuma publicação nesta visão.</p>
      ) : (
        <div className="space-y-2">
          {lista.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleClick(c)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                {c.tipo && (
                  <span className="rounded bg-[var(--urgencia-atencao-bg)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--urgencia-atencao-text)]">
                    {c.tipo}
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASS[c.status] ?? ''}`}
                >
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
                <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                  {c.numeroProcessoBruto ?? '—'}
                </span>
                <span className="ml-auto text-[11px] text-[var(--color-text-tertiary)]">
                  {formatDate(c.dataDisponibilizacao ?? c.createdAt)} · OAB {c.oab}
                </span>
              </div>
              {c.resumo && (
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-[var(--color-text-secondary)]">
                  {c.resumo}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
