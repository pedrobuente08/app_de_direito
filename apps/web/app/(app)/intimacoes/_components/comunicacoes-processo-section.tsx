'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getComunicacoesProcesso, patchProcesso } from '@/lib/api'
import type { Comunicacao, Processo } from '@/lib/types'
import { NovaPendenciaDialog } from '@/components/pendencias/nova-pendencia-dialog'
import type { ToastApi } from './processo-editable'

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

// ─── Section (botão de acesso) ────────────────────────────────────────────────

type SectionProps = {
  processo: Processo
  onProcessoUpdated: (p: Processo) => void
  toast: ToastApi
  readOnly?: boolean
}

export function ComunicacoesProcessoSection({
  processo,
  onProcessoUpdated,
  toast,
  readOnly,
}: SectionProps) {
  const [comunicacoes, setComunicacoes] = useState<Comunicacao[]>([])
  const [loading, setLoading] = useState(true)
  const [listaOpen, setListaOpen] = useState(false)
  const [pendenciaOpen, setPendenciaOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    getComunicacoesProcesso(processo.id)
      .then(setComunicacoes)
      .catch(() => setComunicacoes([]))
      .finally(() => setLoading(false))
  }, [processo.id])

  return (
    <>
      <div className="col-span-full">
        <button
          type="button"
          disabled={loading}
          onClick={() => setListaOpen(true)}
          className="inline-flex items-center gap-2 rounded border border-[var(--color-border-default)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
        >
          Ver publicações DJEN
          {!loading && (
            <span className="rounded-full bg-[var(--color-bg-muted)] px-1.5 py-0.5 font-mono text-[10px]">
              {comunicacoes.length}
            </span>
          )}
        </button>
      </div>

      {listaOpen && (
        <ComunicacoesListaModal
          comunicacoes={comunicacoes}
          processo={processo}
          onProcessoUpdated={onProcessoUpdated}
          toast={toast}
          readOnly={readOnly}
          onClose={() => setListaOpen(false)}
          onNovaPendencia={() => {
            setListaOpen(false)
            setPendenciaOpen(true)
          }}
        />
      )}

      <NovaPendenciaDialog
        open={pendenciaOpen}
        processo={processo}
        onClose={() => setPendenciaOpen(false)}
        onSuccess={() => setPendenciaOpen(false)}
      />
    </>
  )
}

// ─── Modal lista de publicações ───────────────────────────────────────────────

type ListaModalProps = {
  comunicacoes: Comunicacao[]
  processo: Processo
  onProcessoUpdated: (p: Processo) => void
  toast: ToastApi
  readOnly?: boolean
  onClose: () => void
  onNovaPendencia: () => void
}

function ComunicacoesListaModal({
  comunicacoes,
  processo,
  onProcessoUpdated,
  toast,
  readOnly,
  onClose,
  onNovaPendencia,
}: ListaModalProps) {
  const [selecionada, setSelecionada] = useState<Comunicacao | null>(null)

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-[70] bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-[71] flex max-h-[75vh] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-default)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Publicações DJEN
            </h2>
            <p className="font-mono text-[11px] text-[var(--color-text-secondary)]">
              {processo.numero}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {comunicacoes.length === 0 ? (
            <p className="py-4 text-center text-xs text-[var(--color-text-secondary)]">
              Nenhuma publicação registrada.
            </p>
          ) : (
            <div className="space-y-2">
              {comunicacoes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelecionada(c)}
                  className="w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2 text-left transition-colors hover:bg-[var(--color-bg-muted)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {c.tipo && (
                      <span className="rounded bg-[var(--urgencia-atencao-bg)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--urgencia-atencao-text)]">
                        {c.tipo}
                      </span>
                    )}
                    <span className="text-[11px] text-[var(--color-text-tertiary)]">
                      {formatDate(c.dataDisponibilizacao ?? c.createdAt)} · OAB {c.oab}
                    </span>
                  </div>
                  {c.resumo && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--color-text-secondary)]">
                      {c.resumo}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selecionada && (
        <ComunicacaoDetalheModal
          comunicacao={selecionada}
          processo={processo}
          onProcessoUpdated={onProcessoUpdated}
          toast={toast}
          readOnly={readOnly}
          onClose={() => setSelecionada(null)}
          onNovaPendencia={onNovaPendencia}
        />
      )}
    </>,
    document.body,
  )
}

// ─── Modal detalhe de uma publicação ─────────────────────────────────────────

type DetalheModalProps = {
  comunicacao: Comunicacao
  processo: Processo
  onProcessoUpdated: (p: Processo) => void
  toast: ToastApi
  readOnly?: boolean
  onClose: () => void
  onNovaPendencia: () => void
}

function ComunicacaoDetalheModal({
  comunicacao,
  processo,
  onProcessoUpdated,
  toast,
  readOnly,
  onClose,
  onNovaPendencia,
}: DetalheModalProps) {
  const [dataAudiencia, setDataAudiencia] = useState(processo.dataAudiencia ?? '')
  const [horaAudiencia, setHoraAudiencia] = useState(
    processo.horaAudiencia ? String(processo.horaAudiencia).slice(0, 5) : '',
  )
  const [tipoAudiencia, setTipoAudiencia] = useState(processo.tipoAudiencia ?? '')
  const [salvando, setSalvando] = useState(false)

  async function salvarAudiencia() {
    setSalvando(true)
    try {
      const updated = await patchProcesso(processo.id, {
        dataAudiencia: dataAudiencia || null,
        horaAudiencia: horaAudiencia || null,
        tipoAudiencia: tipoAudiencia || null,
      })
      onProcessoUpdated(updated)
      toast.success('Audiência salva — evento criado na agenda.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-[80] bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-[81] flex max-h-[78vh] w-[min(46rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-default)] px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {comunicacao.tipo && (
              <span className="shrink-0 rounded bg-[var(--urgencia-atencao-bg)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--urgencia-atencao-text)]">
                {comunicacao.tipo}
              </span>
            )}
            <span className="truncate font-mono text-xs text-[var(--color-text-secondary)]">
              {formatDate(comunicacao.dataDisponibilizacao ?? comunicacao.createdAt)} · OAB{' '}
              {comunicacao.oab}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Texto da publicação
            </p>
            <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
              {comunicacao.conteudoCompleto ?? comunicacao.resumo ?? '—'}
            </p>
          </div>

          {!readOnly && (
            <>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  Registrar audiência
                </p>
                <p className="mb-3 text-[11px] text-[var(--color-text-secondary)]">
                  Ao salvar, a audiência é criada automaticamente na agenda.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <label className="block text-xs text-[var(--color-text-secondary)]">
                    Data
                    <input
                      type="date"
                      value={dataAudiencia}
                      onChange={(e) => setDataAudiencia(e.target.value)}
                      className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block text-xs text-[var(--color-text-secondary)]">
                    Hora
                    <input
                      type="time"
                      value={horaAudiencia}
                      onChange={(e) => setHoraAudiencia(e.target.value)}
                      className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block text-xs text-[var(--color-text-secondary)]">
                    Tipo
                    <input
                      value={tipoAudiencia}
                      onChange={(e) => setTipoAudiencia(e.target.value)}
                      placeholder="Instrução, Conciliação…"
                      className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={salvando || !dataAudiencia}
                  onClick={salvarAudiencia}
                  className="mt-3 rounded bg-[var(--color-brand)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {salvando ? 'Salvando…' : 'Salvar audiência'}
                </button>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  Ações
                </p>
                <button
                  type="button"
                  onClick={onNovaPendencia}
                  className="rounded border border-[var(--color-border-default)] px-3 py-1.5 text-xs hover:bg-[var(--color-bg-subtle)]"
                >
                  Criar pendência
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
