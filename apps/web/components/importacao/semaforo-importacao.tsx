'use client'

import { useCallback, useMemo, useState } from 'react'
import { confirmarBatchPdf, previewPdfBatch } from '@/lib/api'
import { PDF_PREVIEW_LABELS, corBadgeClass, previewItemToConfirmBatchItem } from '@/lib/pdf-preview'
import { ToastContainer, useToast } from '@/lib/toast'
import type {
  ConfirmarBatchItem,
  ConfirmarBatchResult,
  PdfPreviewItem,
  PdfSemaforoCor,
} from '@/lib/types'

type EstadoImportacao = 'idle' | 'uploading' | 'revisao' | 'confirmando' | 'resultado'

type ItemEditavel = PdfPreviewItem & {
  selecionado: boolean
  camposEditados: Partial<ConfirmarBatchItem>
}

function linhaSelecionavel(r: PdfPreviewItem): boolean {
  return !(r.cor === 'VERMELHO' && r.duplicata)
}

function mergeCampos(base: PdfPreviewItem, ed: Partial<ConfirmarBatchItem>): PdfPreviewItem {
  return {
    ...base,
    numero: ed.numero !== undefined ? ed.numero : base.numero,
    clienteNome: ed.clienteNome !== undefined ? ed.clienteNome : base.clienteNome,
    clienteCpf: ed.clienteCpf !== undefined ? ed.clienteCpf : base.clienteCpf,
    reuTexto: ed.reuTexto !== undefined ? ed.reuTexto : base.reuTexto,
    vara: ed.vara !== undefined ? ed.vara : base.vara,
    materia: ed.materia !== undefined ? ed.materia : base.materia,
    sistema: ed.sistema !== undefined ? ed.sistema : base.sistema,
    login: ed.login !== undefined ? ed.login : base.login,
    dataDistribuicao:
      ed.dataDistribuicao !== undefined ? ed.dataDistribuicao : base.dataDistribuicao,
    dataAudiencia: ed.dataAudiencia !== undefined ? ed.dataAudiencia : base.dataAudiencia,
    horaAudiencia: ed.horaAudiencia !== undefined ? ed.horaAudiencia : base.horaAudiencia,
  }
}

function CorBadge({ cor }: { cor: PdfSemaforoCor }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${corBadgeClass(cor)}`}
    >
      {cor}
    </span>
  )
}

export function SemaforoImportacao() {
  const toast = useToast()
  const [estado, setEstado] = useState<EstadoImportacao>('idle')
  const [files, setFiles] = useState<File[]>([])
  const [itens, setItens] = useState<ItemEditavel[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftEdicao, setDraftEdicao] = useState<Partial<ConfirmarBatchItem>>({})
  const [resultado, setResultado] = useState<ConfirmarBatchResult | null>(null)

  const todosSelecionaveis = useMemo(
    () => itens.filter((i) => linhaSelecionavel(i)),
    [itens],
  )

  const selecionadosCount = useMemo(
    () => itens.filter((i) => i.selecionado).length,
    [itens],
  )

  const todosMarcados =
    todosSelecionaveis.length > 0 &&
    todosSelecionaveis.every((i) => i.selecionado)

  function removerArquivo(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  function onPickFiles(list: FileList | null) {
    if (!list?.length) return
    const pdfs = Array.from(list).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    )
    setFiles((prev) => [...prev, ...pdfs].slice(0, 30))
  }

  async function processar() {
    if (!files.length) {
      toast.error('Selecione ao menos um PDF.')
      return
    }
    setEstado('uploading')
    setResultado(null)
    try {
      const data = await previewPdfBatch(files)
      const mapped: ItemEditavel[] = data.map((row) => ({
        ...row,
        selecionado: linhaSelecionavel(row),
        camposEditados: {},
      }))
      setItens(mapped)
      setEstado('revisao')
      if (data.length !== files.length) {
        toast.error('Resposta incompleta: número de itens diferente dos arquivos enviados.')
      }
    } catch (e) {
      toast.error((e as Error).message)
      setEstado('idle')
    }
  }

  const setEdit = useCallback((itemId: string, patch: Partial<ConfirmarBatchItem>) => {
    setItens((prev) =>
      prev.map((it) =>
        it.itemId === itemId
          ? { ...it, camposEditados: { ...it.camposEditados, ...patch } }
          : it,
      ),
    )
  }, [])

  function toggleOne(id: string) {
    const row = itens.find((i) => i.itemId === id)
    if (!row || !linhaSelecionavel(row)) return
    setItens((prev) =>
      prev.map((it) =>
        it.itemId === id ? { ...it, selecionado: !it.selecionado } : it,
      ),
    )
  }

  function toggleTodos(checked: boolean) {
    setItens((prev) =>
      prev.map((it) =>
        linhaSelecionavel(it) ? { ...it, selecionado: checked } : it,
      ),
    )
  }

  function abrirEdicao(it: ItemEditavel) {
    const merged = mergeCampos(it, it.camposEditados)
    setDraftEdicao(previewItemToConfirmBatchItem(merged))
    setEditingId(it.itemId)
  }

  function salvarEdicao() {
    if (!editingId) return
    const rest = { ...(draftEdicao as ConfirmarBatchItem) } as Record<string, unknown>
    delete rest.itemId
    setEdit(editingId, rest as Omit<ConfirmarBatchItem, 'itemId'>)
    setEditingId(null)
    setDraftEdicao({})
  }

  async function confirmarSelecionados() {
    const sel = itens.filter((i) => i.selecionado)
    if (!sel.length) {
      toast.error('Marque ao menos uma linha selecionável.')
      return
    }
    const payloads = sel.map((it) =>
      previewItemToConfirmBatchItem(mergeCampos(it, it.camposEditados)),
    )
    setEstado('confirmando')
    try {
      const res = await confirmarBatchPdf(payloads)
      setResultado(res)
      setEstado('resultado')
      toast.success(
        `Inseridos: ${res.inseridos}. Já existiam: ${res.jaExistiam}. Erros: ${res.erros.length}.`,
      )
    } catch (e) {
      toast.error((e as Error).message)
      setEstado('revisao')
    }
  }

  function cancelarTudo() {
    setEstado('idle')
    setFiles([])
    setItens([])
    setEditingId(null)
    setDraftEdicao({})
    setResultado(null)
  }

  function novaImportacao() {
    cancelarTudo()
  }

  const editando = editingId ? itens.find((i) => i.itemId === editingId) : null

  return (
    <div className="space-y-4">
      {estado === 'idle' && (
        <>
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
                selecionar ficheiros
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => onPickFiles(e.target.files)}
                />
              </label>
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              Até 30 ficheiros · 15 MB cada
            </p>
          </div>

          {files.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-2 text-sm">
              {files.map((f, idx) => (
                <li
                  key={`${f.name}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-[var(--color-bg-hover)]"
                >
                  <span className="truncate font-mono text-xs">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removerArquivo(idx)}
                    className="shrink-0 text-xs text-[var(--urgencia-vencida-text)] hover:underline"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!files.length}
              onClick={processar}
              className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
            >
              Processar {files.length || 0} PDF(s)
            </button>
          </div>
        </>
      )}

      {estado === 'uploading' && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-8 text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-brand)] border-t-transparent" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            A analisar {files.length} ficheiro(s)…
          </p>
        </div>
      )}

      {estado === 'revisao' && (
        <>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-muted)] p-3 text-xs text-[var(--color-text-secondary)]">
            <p className="mb-2 font-semibold text-[var(--color-text-primary)]">Legenda do semáforo</p>
            <ul className="space-y-1">
              <li>
                <span className="font-medium text-[var(--urgencia-normal-text)]">VERDE</span> — campos
                críticos com alta confiança.
              </li>
              <li>
                <span className="font-medium text-[var(--urgencia-atencao-text)]">AMARELO</span> — confiança
                mais baixa ou campos em falta; reveja antes de confirmar.
              </li>
              <li>
                <span className="font-medium text-[var(--urgencia-vencida-text)]">VERMELHO</span> — duplicata,
                PDF ilegível ou erro; linhas com duplicata não podem ser selecionadas até corrigir o número noutro
                ecrã.
              </li>
            </ul>
          </div>

          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)]">
            <table className="w-full min-w-[960px] text-left text-xs">
              <thead className="bg-[var(--color-bg-muted)] text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                <tr>
                  <th className="w-10 px-2 py-2">
                    <input
                      type="checkbox"
                      checked={todosMarcados}
                      onChange={(e) => toggleTodos(e.target.checked)}
                      title="Selecionar todos (apenas linhas selecionáveis)"
                    />
                  </th>
                  <th className="px-2 py-2">Cor</th>
                  <th className="px-2 py-2">Ficheiro</th>
                  <th className="px-2 py-2">{PDF_PREVIEW_LABELS.numero}</th>
                  <th className="px-2 py-2">{PDF_PREVIEW_LABELS.clienteNome}</th>
                  <th className="px-2 py-2">{PDF_PREVIEW_LABELS.reuTexto}</th>
                  <th className="px-2 py-2">{PDF_PREVIEW_LABELS.vara}</th>
                  <th className="px-2 py-2">Conf.</th>
                  <th className="px-2 py-2">Alertas</th>
                  <th className="px-2 py-2">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {itens.map((it) => {
                  const row = mergeCampos(it, it.camposEditados)
                  const selOk = linhaSelecionavel(it)
                  return (
                    <tr key={it.itemId} className="align-top hover:bg-[var(--color-bg-hover)]">
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={it.selecionado}
                          disabled={!selOk}
                          onChange={() => toggleOne(it.itemId)}
                          className="mt-1"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <CorBadge cor={it.cor} />
                      </td>
                      <td
                        className="max-w-[140px] truncate px-2 py-2 font-mono text-[10px]"
                        title={it.arquivo}
                      >
                        {it.arquivo}
                      </td>
                      <td className="px-2 py-2 font-mono">{row.numero ?? '—'}</td>
                      <td className="max-w-[120px] truncate px-2 py-2">{row.clienteNome ?? '—'}</td>
                      <td className="max-w-[100px] truncate px-2 py-2">{row.reuTexto ?? '—'}</td>
                      <td className="max-w-[80px] truncate px-2 py-2">{row.vara ?? '—'}</td>
                      <td className="whitespace-nowrap px-2 py-2">
                        {Math.round((it.confidence || 0) * 100)}%
                      </td>
                      <td className="max-w-[140px] px-2 py-2">
                        {it.alertas.length > 0 ? (
                          <span className="cursor-help text-lg" title={it.alertas.join(' · ')}>
                            ⚠️
                          </span>
                        ) : (
                          '—'
                        )}
                        {it.duplicata && it.cor === 'VERMELHO' ? (
                          <span className="mt-1 block text-[10px] text-[var(--urgencia-vencida-text)]">
                            Duplicata — não selecionável
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(it)}
                          className="text-[var(--color-brand)] hover:underline"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmarSelecionados}
              disabled={selecionadosCount === 0}
              className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
            >
              Confirmar selecionados ({selecionadosCount})
            </button>
            <button
              type="button"
              onClick={cancelarTudo}
              className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            >
              Cancelar tudo
            </button>
          </div>
        </>
      )}

      {estado === 'confirmando' && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-8 text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-brand)] border-t-transparent" />
          <p className="text-sm text-[var(--color-text-secondary)]">A inserir processos…</p>
        </div>
      )}

      {estado === 'resultado' && resultado && (
        <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <p className="text-sm text-[var(--color-text-primary)]">
            <strong>{resultado.inseridos}</strong> inserido(s),{' '}
            <strong>{resultado.jaExistiam}</strong> já existente(s),{' '}
            <strong>{resultado.erros.length}</strong> erro(s).
          </p>
          {resultado.erros.length > 0 && (
            <ul className="list-inside list-disc text-xs text-[var(--urgencia-vencida-text)]">
              {resultado.erros.map((err) => (
                <li key={err.itemId}>
                  {err.itemId}: {err.mensagem}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={novaImportacao}
            className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
          >
            Nova importação
          </button>
        </div>
      )}

      {editingId && editando && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          role="dialog"
          aria-modal="true"
        >
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Editar linha</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setDraftEdicao({})
                }}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              >
                ✕
              </button>
            </div>
            <p className="mb-3 truncate font-mono text-[10px] text-[var(--color-text-tertiary)]">
              {editando.arquivo}
            </p>
            <div className="grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                {PDF_PREVIEW_LABELS.numero} *
                <input
                  value={draftEdicao.numero ?? ''}
                  onChange={(e) => setDraftEdicao((d) => ({ ...d, numero: e.target.value }))}
                  className="rounded border px-2 py-1.5 font-mono text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                {PDF_PREVIEW_LABELS.sistema} *
                <input
                  value={draftEdicao.sistema ?? ''}
                  onChange={(e) => setDraftEdicao((d) => ({ ...d, sistema: e.target.value }))}
                  className="rounded border px-2 py-1.5 font-mono text-sm uppercase"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                {PDF_PREVIEW_LABELS.clienteNome}
                <input
                  value={draftEdicao.clienteNome ?? ''}
                  onChange={(e) =>
                    setDraftEdicao((d) => ({ ...d, clienteNome: e.target.value || null }))
                  }
                  className="rounded border px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                {PDF_PREVIEW_LABELS.clienteCpf}
                <input
                  value={draftEdicao.clienteCpf ?? ''}
                  onChange={(e) =>
                    setDraftEdicao((d) => ({ ...d, clienteCpf: e.target.value || null }))
                  }
                  className="rounded border px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                {PDF_PREVIEW_LABELS.reuTexto}
                <input
                  value={draftEdicao.reuTexto ?? ''}
                  onChange={(e) =>
                    setDraftEdicao((d) => ({ ...d, reuTexto: e.target.value || null }))
                  }
                  className="rounded border px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                {PDF_PREVIEW_LABELS.vara}
                <input
                  value={draftEdicao.vara ?? ''}
                  onChange={(e) => setDraftEdicao((d) => ({ ...d, vara: e.target.value || null }))}
                  className="rounded border px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                {PDF_PREVIEW_LABELS.materia}
                <input
                  value={draftEdicao.materia ?? ''}
                  onChange={(e) =>
                    setDraftEdicao((d) => ({ ...d, materia: e.target.value || null }))
                  }
                  className="rounded border px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                {PDF_PREVIEW_LABELS.login}
                <input
                  value={draftEdicao.login ?? ''}
                  onChange={(e) => setDraftEdicao((d) => ({ ...d, login: e.target.value || null }))}
                  className="rounded border px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                {PDF_PREVIEW_LABELS.dataDistribuicao}
                <input
                  type="date"
                  value={draftEdicao.dataDistribuicao ?? ''}
                  onChange={(e) =>
                    setDraftEdicao((d) => ({
                      ...d,
                      dataDistribuicao: e.target.value || null,
                    }))
                  }
                  className="rounded border px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                {PDF_PREVIEW_LABELS.dataAudiencia}
                <input
                  type="date"
                  value={draftEdicao.dataAudiencia ?? ''}
                  onChange={(e) =>
                    setDraftEdicao((d) => ({ ...d, dataAudiencia: e.target.value || null }))
                  }
                  className="rounded border px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                {PDF_PREVIEW_LABELS.horaAudiencia}
                <input
                  type="time"
                  value={draftEdicao.horaAudiencia ?? ''}
                  onChange={(e) =>
                    setDraftEdicao((d) => ({ ...d, horaAudiencia: e.target.value || null }))
                  }
                  className="rounded border px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={salvarEdicao}
                disabled={!(draftEdicao.numero ?? '').trim() || !(draftEdicao.sistema ?? '').trim()}
                className="rounded bg-[var(--color-brand)] px-3 py-1.5 text-sm text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setDraftEdicao({})
                }}
                className="rounded border px-3 py-1.5 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
