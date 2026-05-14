'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  confirmarBatchPdf,
  getAuthMe,
  getEscritorioConfig,
  getProcesso,
  getProcessos,
  previewPdfBatch,
} from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import type {
  ConfirmarBatchItem,
  DropdownsProcessoConfig,
  PdfPreviewItem,
  Processo,
  ProcessosListMeta,
} from '@/lib/types'
import { PdfRevisaoModal } from './_components/pdf-revisao-modal'
import { ProcessosGrid } from './_components/processos-grid'
import { ProcessoModal } from './_components/processo-modal'
import { ReuNormalizacao } from './_components/reu-normalizacao'

const PAGE_SIZE = 50

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Cadastro' },
  { value: 'updatedAt', label: 'Atualização' },
  { value: 'numero', label: 'Número' },
  { value: 'vara', label: 'Vara' },
  { value: 'materia', label: 'Matéria' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'clienteNome', label: 'Cliente' },
] as const

export default function IntimacoesPage() {
  const [processos, setProcessos] = useState<Processo[]>([])
  const [meta, setMeta] = useState<ProcessosListMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  const [draftNumero, setDraftNumero] = useState('')
  const [draftCliente, setDraftCliente] = useState('')
  const [draftVara, setDraftVara] = useState('')
  const [draftFilterUltimaSentenca, setDraftFilterUltimaSentenca] = useState<
    '' | 'BOA' | 'RUIM' | 'SEM'
  >('')
  const [draftSortField, setDraftSortField] = useState<
    (typeof SORT_OPTIONS)[number]['value']
  >('createdAt')
  const [draftSortOrder, setDraftSortOrder] = useState<'asc' | 'desc'>('desc')

  const [appliedNumero, setAppliedNumero] = useState('')
  const [appliedCliente, setAppliedCliente] = useState('')
  const [appliedVara, setAppliedVara] = useState('')
  const [appliedFilterUltimaSentenca, setAppliedFilterUltimaSentenca] = useState<
    '' | 'BOA' | 'RUIM' | 'SEM'
  >('')
  const [appliedSortField, setAppliedSortField] = useState<
    (typeof SORT_OPTIONS)[number]['value']
  >('createdAt')
  const [appliedSortOrder, setAppliedSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const [readOnly, setReadOnly] = useState(false)
  const [dropdowns, setDropdowns] = useState<DropdownsProcessoConfig | null>(null)
  const [selectedProcesso, setSelectedProcesso] = useState<Processo | null>(null)
  const [pdfRevisaoOpen, setPdfRevisaoOpen] = useState(false)
  const [pdfPreviewItem, setPdfPreviewItem] = useState<PdfPreviewItem | null>(null)
  const [confirmingPdf, setConfirmingPdf] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadSession() {
      try {
        const [me, cfg] = await Promise.all([getAuthMe(), getEscritorioConfig()])
        if (cancelled) return
        setReadOnly(me.perfil === 'leitura')
        setDropdowns(cfg.dropdowns_processo ?? null)
      } catch {
        if (!cancelled) {
          setReadOnly(false)
          setDropdowns(null)
        }
      }
    }
    loadSession()
    return () => { cancelled = true }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, meta: m } = await getProcessos({
        limit: PAGE_SIZE,
        page,
        sort: appliedSortField,
        order: appliedSortOrder,
        ...(appliedNumero.trim() && { numero: appliedNumero.trim() }),
        ...(appliedCliente.trim() && { clienteNome: appliedCliente.trim() }),
        ...(appliedVara.trim() && { vara: appliedVara.trim() }),
        ...(appliedFilterUltimaSentenca && {
          filterUltimaSentenca: appliedFilterUltimaSentenca,
        }),
      })
      setProcessos(data)
      setMeta(m)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [
    appliedNumero,
    appliedCliente,
    appliedVara,
    appliedFilterUltimaSentenca,
    appliedSortField,
    appliedSortOrder,
    page,
  ])

  useEffect(() => { load() }, [load])

  const onRowUpdated = useCallback((row: Processo) => {
    setProcessos((prev) => prev.map((p) => (p.id === row.id ? row : p)))
  }, [])

  function aplicarFiltros() {
    setAppliedNumero(draftNumero)
    setAppliedCliente(draftCliente)
    setAppliedVara(draftVara)
    setAppliedFilterUltimaSentenca(draftFilterUltimaSentenca)
    setAppliedSortField(draftSortField)
    setAppliedSortOrder(draftSortOrder)
    setPage(1)
    setFiltrosAbertos(false)
  }

  function abrirPainelFiltros() {
    setDraftNumero(appliedNumero)
    setDraftCliente(appliedCliente)
    setDraftVara(appliedVara)
    setDraftFilterUltimaSentenca(appliedFilterUltimaSentenca)
    setDraftSortField(appliedSortField)
    setDraftSortOrder(appliedSortOrder)
    setFiltrosAbertos(true)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setPdfPreviewItem(null)
    try {
      const data = await previewPdfBatch([file])
      const first = data[0]
      if (!first) {
        toast.error('Não foi possível analisar o PDF.')
        return
      }
      setPdfPreviewItem(first)
      setPdfRevisaoOpen(true)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleConfirmarPdf(payload: ConfirmarBatchItem) {
    setConfirmingPdf(true)
    try {
      const res = await confirmarBatchPdf([payload])
      if (res.erros.length > 0) {
        toast.error(res.erros.map((x) => x.mensagem).join(' '))
        return
      }
      if (res.inseridos > 0) {
        toast.success('Processo inserido.')
      } else if (res.jaExistiam > 0) {
        toast.error('Este número já existe — nada foi inserido.')
      }
      setPdfRevisaoOpen(false)
      setPdfPreviewItem(null)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setConfirmingPdf(false)
    }
  }

  async function handleAbrirProcessoDuplicado(id: string) {
    try {
      const p = await getProcesso(id)
      setSelectedProcesso(p)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const totalPages = meta?.totalPages ?? 1

  return (
    <div className="animate-fade-in-up">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Intimações</h1>
        <div className="flex flex-wrap items-center gap-2">
          {readOnly && (
            <span className="text-xs text-[var(--color-text-secondary)]">Somente leitura</span>
          )}
          {uploading && (
            <span className="text-sm text-[var(--color-text-secondary)]">Processando…</span>
          )}
          <button
            type="button"
            onClick={() => (filtrosAbertos ? setFiltrosAbertos(false) : abrirPainelFiltros())}
            className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
          >
            {filtrosAbertos ? 'Fechar filtros' : 'Filtros'}
          </button>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
          >
            Atualizar lista
          </button>
          {!readOnly && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFile}
                disabled={uploading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
              >
                Enviar PDF
              </button>
            </>
          )}
        </div>
      </div>

      {filtrosAbertos && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Nº processo
            <input
              value={draftNumero}
              onChange={(e) => setDraftNumero(e.target.value)}
              placeholder="Contém…"
              className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]"
            />
          </label>
          <label className="flex min-w-[140px] flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Cliente
            <input
              value={draftCliente}
              onChange={(e) => setDraftCliente(e.target.value)}
              placeholder="Nome…"
              className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]"
            />
          </label>
          <label className="flex min-w-[120px] flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Vara
            <input
              value={draftVara}
              onChange={(e) => setDraftVara(e.target.value)}
              placeholder="Contém…"
              className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]"
            />
          </label>
          <label className="flex min-w-[160px] flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Última sentença
            <select
              value={draftFilterUltimaSentenca}
              onChange={(e) =>
                setDraftFilterUltimaSentenca(e.target.value as '' | 'BOA' | 'RUIM' | 'SEM')
              }
              className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]"
            >
              <option value="">Todos</option>
              <option value="BOA">Bom (autor)</option>
              <option value="RUIM">Ruim (réu)</option>
              <option value="SEM">Sem sentença</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Ordenar por
            <select
              value={draftSortField}
              onChange={(e) =>
                setDraftSortField(e.target.value as (typeof SORT_OPTIONS)[number]['value'])
              }
              className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Direção
            <select
              value={draftSortOrder}
              onChange={(e) => setDraftSortOrder(e.target.value as 'asc' | 'desc')}
              className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]"
            >
              <option value="desc">Decrescente</option>
              <option value="asc">Crescente</option>
            </select>
          </label>
          <button
            type="button"
            onClick={aplicarFiltros}
            disabled={loading}
            className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
          >
            Aplicar filtros
          </button>
        </div>
      )}

      {!readOnly && <ReuNormalizacao processos={processos} onNormalized={load} />}

      {meta ? (
        <p className="mb-2 text-xs text-[var(--color-text-secondary)]">
          {meta.total} processo{meta.total !== 1 ? 's' : ''} no escritório
          {meta.totalPages > 1
            ? ` · página ${meta.page} de ${meta.totalPages} (${PAGE_SIZE} por página)`
            : ''}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded bg-[var(--color-bg-subtle)]" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm text-[var(--urgencia-vencida-text)]">
          {error}{' '}
          <button type="button" onClick={load} className="underline">
            Tentar novamente
          </button>
        </div>
      ) : processos.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
          Nenhum processo nesta página. Envie um PDF ou ajuste filtros/página.
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-[var(--color-text-secondary)]">
            Clique em um processo para ver detalhes{readOnly ? '.' : ' e editar.'}
          </p>
          <ProcessosGrid data={processos} onRowClick={setSelectedProcesso} />

          {totalPages > 1 ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-[var(--color-border-default)] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-[var(--color-text-secondary)]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-[var(--color-border-default)] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          ) : null}
        </>
      )}

      {selectedProcesso && (
        <ProcessoModal
          processo={selectedProcesso}
          onClose={() => setSelectedProcesso(null)}
          onUpdated={onRowUpdated}
          toast={toast}
          readOnly={readOnly}
          dropdowns={dropdowns}
        />
      )}

      <PdfRevisaoModal
        open={pdfRevisaoOpen}
        item={pdfPreviewItem}
        confirming={confirmingPdf}
        onClose={() => {
          setPdfRevisaoOpen(false)
          setPdfPreviewItem(null)
        }}
        onConfirm={handleConfirmarPdf}
        onAbrirProcessoExistente={handleAbrirProcessoDuplicado}
      />

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
