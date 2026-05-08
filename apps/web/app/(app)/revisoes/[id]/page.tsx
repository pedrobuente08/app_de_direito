'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { aplicarExtracaoPendente, getExtracaoPendente } from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import type { ExtracaoPendenteDetalhe, ProcessoCampos } from '@/lib/types'

type CampoConfig = { key: keyof ProcessoCampos; label: string }

const CAMPOS: CampoConfig[] = [
  { key: 'numero', label: 'Número do processo' },
  { key: 'cliente_nome', label: 'Nome do cliente' },
  { key: 'cliente_cpf', label: 'CPF do cliente' },
  { key: 'reu_texto', label: 'Réu' },
  { key: 'vara', label: 'Vara' },
  { key: 'sistema', label: 'Sistema (PROJUDI / PJE)' },
  { key: 'data_distribuicao', label: 'Data de distribuição' },
  { key: 'data_audiencia', label: 'Data da audiência' },
  { key: 'hora_audiencia', label: 'Hora da audiência' },
  { key: 'tipo_audiencia', label: 'Tipo de audiência' },
  { key: 'materia', label: 'Matéria' },
  { key: 'login', label: 'Advogado / login' },
  { key: 'fase_inicial', label: 'Fase inicial' },
  { key: 'situacao_inicial', label: 'Situação inicial' },
]

export default function RevisaoDetalhePage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const toast = useToast()
  const [item, setItem] = useState<ExtracaoPendenteDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [campos, setCampos] = useState<Partial<ProcessoCampos>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getExtracaoPendente(params.id)
        setItem(data)
        setCampos((data.resultadoSkill?.processo ?? {}) as Partial<ProcessoCampos>)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  async function handleAplicar() {
    setSaving(true)
    try {
      await aplicarExtracaoPendente(params.id, campos)
      toast.success('Processo importado com sucesso.')
      setTimeout(() => router.push('/intimacoes'), 1500)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded bg-[var(--color-bg-subtle)]" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm text-[var(--urgencia-vencida-text)]">
        {error}
      </div>
    )
  }

  if (!item) return null

  const extraidos = new Set(item.resultadoSkill?.campos_extraidos ?? [])
  const vazios = new Set(item.resultadoSkill?.campos_vazios ?? [])

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {item.arquivoNome}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Confidence: {Math.round(item.confidence * 100)}%
          {item.alerta ? ` · ${item.alerta}` : ''}
        </p>
      </div>

      <div className="mb-2 flex gap-4 text-xs text-[var(--color-text-secondary)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--urgencia-normal-bg)] ring-1 ring-[var(--urgencia-normal-border)]" />
          Extraído pela skill
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--urgencia-vencida-bg)] ring-1 ring-[var(--urgencia-vencida-border)]" />
          Campo vazio — preencha
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 sm:grid-cols-2">
        {CAMPOS.map(({ key, label }) => {
          const isExtraido = extraidos.has(key)
          const isVazio = vazios.has(key)
          const bg = isExtraido
            ? 'border-[var(--urgencia-normal-border)] bg-[var(--urgencia-normal-bg)]'
            : isVazio
              ? 'border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)]'
              : 'border-[var(--color-border-default)]'

          return (
            <div key={key} className={`rounded-[var(--radius-sm)] border p-2.5 ${bg}`}>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                {label}
                {isVazio && (
                  <span className="ml-1 text-[var(--urgencia-vencida-text)]">*</span>
                )}
              </label>
              <input
                type="text"
                value={campos[key] ?? ''}
                onChange={(e) =>
                  setCampos((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className="w-full rounded border-0 bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:ring-1 focus:ring-[var(--color-brand)]"
                placeholder="—"
              />
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleAplicar}
          disabled={saving}
          className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
        >
          {saving ? 'Aplicando…' : 'Aplicar'}
        </button>
        <button
          onClick={() => router.push('/revisoes')}
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          Voltar
        </button>
      </div>

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
