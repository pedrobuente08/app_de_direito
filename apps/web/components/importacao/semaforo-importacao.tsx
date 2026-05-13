'use client'

import { useCallback, useMemo, useState } from 'react'
import { confirmarBatchPdf, previewPdfBatch } from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import type { ConfirmarBatchItem, ConfirmarBatchResult, PdfPreviewItem, PdfSemaforoCor } from '@/lib/types'

type Edits = Partial<
  Pick<
    PdfPreviewItem,
    | 'numero'
    | 'clienteNome'
    | 'clienteCpf'
    | 'reuTexto'
    | 'vara'
    | 'materia'
    | 'sistema'
    | 'login'
    | 'dataDistribuicao'
    | 'dataAudiencia'
    | 'horaAudiencia'
  >
>

function corBadge(cor: PdfSemaforoCor) {
  const cls =
    cor === 'VERDE'
      ? 'border-[var(--urgencia-normal-border)] bg-[var(--urgencia-normal-bg)] text-[var(--urgencia-normal-text)]'
      : cor === 'AMARELO'
        ? 'border-[var(--urgencia-atencao-border)] bg-[var(--urgencia-atencao-bg)] text-[var(--urgencia-atencao-text)]'
        : 'border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] text-[var(--urgencia-vencida-text)]'
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {cor}
    </span>
  )
}

function mergeRow(r: PdfPreviewItem, e: Edits | undefined): PdfPreviewItem {
  if (!e) return r
  return { ...r, ...e }
}

function toConfirmPayload(r: PdfPreviewItem): ConfirmarBatchItem {
  const sistema = (r.sistema ?? 'DESCONHECIDO').trim() || 'DESCONHECIDO'
  return {
    itemId: r.itemId,
    numero: (r.numero ?? '').trim(),
    clienteNome: r.clienteNome,
    clienteCpf: r.clienteCpf,
    reuTexto: r.reuTexto,
    vara: r.vara,
    materia: r.materia,
    sistema,
    login: r.login,
    dataDistribuicao: r.dataDistribuicao,
    dataAudiencia: r.dataAudiencia,
    horaAudiencia: r.horaAudiencia,
  }
}

export function SemaforoImportacao() {
  const toast = useToast()
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [rows, setRows] = useState<PdfPreviewItem[]>([])
  const [edits, setEdits] = useState<Record<string, Edits>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lastBatch, setLastBatch] = useState<ConfirmarBatchResult | null>(null)
  const [confirming, setConfirming] = useState(false)

  const mergedRows = useMemo(
    () => rows.map((r) => mergeRow(r, edits[r.itemId])),
    [rows, edits],
  )

  const setEdit = useCallback((itemId: string, patch: Edits) => {
    setEdits((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...patch },
    }))
  }, [])

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function onPickFiles(list: FileList | null) {
    if (!list?.length) return
    const pdfs = Array.from(list).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    )
    setFiles(pdfs.slice(0, 30))
    setRows([])
    setEdits({})
    setSelected(new Set())
    setLastBatch(null)
  }

  async function processar() {
    if (!files.length) {
      toast.error('Selecione ao menos um PDF.')
      return
    }
    setProcessing(true)
    setLastBatch(null)
    try {
      const data = await previewPdfBatch(files)
      if (data.length !== files.length) {
        toast.error('Resposta incompleta: número de itens diferente dos arquivos enviados.')
      }
      setRows(data)
      const auto = new Set(
        data.filter((r) => r.cor === 'VERDE' && !r.duplicata).map((r) => r.itemId),
      )
      setSelected(auto)
      toast.success(`${data.length} PDF(s) processados. Revise o semáforo e confirme.`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  async function confirmarSomenteVerdes() {
    const verdes = mergedRows.filter((r) => r.cor === 'VERDE' && !r.duplicata)
    await enviarConfirmacao(verdes.map(toConfirmPayload))
  }

  async function confirmarSelecionados() {
    const itens = mergedRows.filter((r) => selected.has(r.itemId))
    if (!itens.length) {
      toast.error('Marque ao menos uma linha.')
      return
    }
    await enviarConfirmacao(itens.map(toConfirmPayload))
  }

  async function enviarConfirmacao(items: ConfirmarBatchItem[]) {
    setConfirming(true)
    setLastBatch(null)
    try {
      const res = await confirmarBatchPdf(items)
      setLastBatch(res)
      toast.success(
        `Inseridos: ${res.inseridos}. Já existiam: ${res.jaExistiam}. Erros: ${res.erros.length}.`,
      )
      if (res.inseridos > 0) {
        setFiles([])
        setRows([])
        setEdits({})
        setSelected(new Set())
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setConfirming(false)
    }
  }

  const podeEditar = (cor: PdfSemaforoCor) => cor === 'AMARELO' || cor === 'VERMELHO'

  return (
    <div className="space-y-4">
      <div
        className="rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-4 py-8 text-center"
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => {
          e.preventDefault()
          onPickFiles(e.dataTransfer.files)
        }}
      >
        <p className="text-sm text-[var(--color-text-secondary)]">
          Arraste PDFs aqui ou{' '}
          <label className="cursor-pointer font-medium text-[var(--color-brand)] hover:underline">
            selecione arquivos
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(e) => onPickFiles(e.target.files)}
            />
          </label>
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">Máximo 30 arquivos por lote · até 15 MB cada</p>
        {files.length > 0 && (
          <p className="mt-3 text-xs text-[var(--color-text-primary)]">
            {files.length} arquivo{files.length !== 1 ? 's' : ''} selecionado{files.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!files.length || processing}
          onClick={processar}
          className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
        >
          {processing ? 'Processando…' : `Processar ${files.length || 0} PDF(s)`}
        </button>
        {mergedRows.length > 0 && (
          <>
            <button
              type="button"
              disabled={confirming}
              onClick={confirmarSomenteVerdes}
              className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
            >
              Inserir todos os verdes
            </button>
            <button
              type="button"
              disabled={confirming || selected.size === 0}
              onClick={confirmarSelecionados}
              className="rounded-[var(--radius-md)] border border-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)] disabled:opacity-50"
            >
              Inserir selecionados ({selected.size})
            </button>
          </>
        )}
      </div>

      {mergedRows.length > 0 && (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)]">
          <table className="w-full min-w-[960px] text-left text-xs">
            <thead className="bg-[var(--color-bg-muted)] text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
              <tr>
                <th className="w-10 px-2 py-2" />
                <th className="px-2 py-2">Cor</th>
                <th className="px-2 py-2">Arquivo</th>
                <th className="px-2 py-2">Nº</th>
                <th className="px-2 py-2">Cliente</th>
                <th className="px-2 py-2">Réu</th>
                <th className="px-2 py-2">Vara</th>
                <th className="px-2 py-2">Matéria</th>
                <th className="px-2 py-2">Sistema</th>
                <th className="px-2 py-2">Conf.</th>
                <th className="px-2 py-2">Alertas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {mergedRows.map((r) => (
                <tr key={r.itemId} className="align-top hover:bg-[var(--color-bg-hover)]">
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(r.itemId)}
                      onChange={() => toggleSelected(r.itemId)}
                      className="mt-1"
                    />
                  </td>
                  <td className="px-2 py-2">{corBadge(r.cor)}</td>
                  <td className="max-w-[140px] truncate px-2 py-2 font-mono text-[10px]" title={r.arquivo}>
                    {r.arquivo}
                  </td>
                  <td className="px-2 py-2">
                    {podeEditar(r.cor) ? (
                      <input
                        value={r.numero ?? ''}
                        onChange={(e) => setEdit(r.itemId, { numero: e.target.value })}
                        className="w-full min-w-[120px] rounded border border-[var(--color-border-default)] px-1 py-0.5 font-mono"
                      />
                    ) : (
                      <span className="font-mono">{r.numero ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {podeEditar(r.cor) ? (
                      <input
                        value={r.clienteNome ?? ''}
                        onChange={(e) => setEdit(r.itemId, { clienteNome: e.target.value || null })}
                        className="w-full min-w-[100px] rounded border px-1 py-0.5"
                      />
                    ) : (
                      r.clienteNome ?? '—'
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {podeEditar(r.cor) ? (
                      <input
                        value={r.reuTexto ?? ''}
                        onChange={(e) => setEdit(r.itemId, { reuTexto: e.target.value || null })}
                        className="w-full min-w-[80px] rounded border px-1 py-0.5"
                      />
                    ) : (
                      r.reuTexto ?? '—'
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {podeEditar(r.cor) ? (
                      <input
                        value={r.vara ?? ''}
                        onChange={(e) => setEdit(r.itemId, { vara: e.target.value || null })}
                        className="w-full min-w-[70px] rounded border px-1 py-0.5"
                      />
                    ) : (
                      r.vara ?? '—'
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {podeEditar(r.cor) ? (
                      <input
                        value={r.materia ?? ''}
                        onChange={(e) => setEdit(r.itemId, { materia: e.target.value || null })}
                        className="w-full min-w-[70px] rounded border px-1 py-0.5"
                      />
                    ) : (
                      r.materia ?? '—'
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {podeEditar(r.cor) ? (
                      <input
                        value={r.sistema ?? ''}
                        onChange={(e) => setEdit(r.itemId, { sistema: e.target.value || null })}
                        className="w-full min-w-[56px] rounded border px-1 py-0.5 font-mono uppercase"
                      />
                    ) : (
                      <span className="font-mono">{r.sistema ?? '—'}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2">
                    {Math.round((r.confidence || 0) * 100)}%
                  </td>
                  <td className="max-w-[200px] px-2 py-2 text-[10px] text-[var(--color-text-secondary)]">
                    {r.alertas.length ? r.alertas.join(' · ') : '—'}
                    {r.duplicata && r.processoExistenteId ? (
                      <span className="mt-1 block text-[var(--urgencia-vencida-text)]">
                        Duplicata (processo {r.processoExistenteId.slice(0, 8)}…)
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lastBatch && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-3 text-sm text-[var(--color-text-secondary)]">
          <p>
            Último lote: <strong>{lastBatch.inseridos}</strong> inserido(s),{' '}
            <strong>{lastBatch.jaExistiam}</strong> já existente(s).
          </p>
          {lastBatch.erros.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs text-[var(--urgencia-vencida-text)]">
              {lastBatch.erros.map((err) => (
                <li key={err.itemId}>
                  {err.itemId}: {err.mensagem}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
