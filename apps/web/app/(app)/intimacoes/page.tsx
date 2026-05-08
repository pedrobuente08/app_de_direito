'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { getProcessos, uploadPdf } from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import type { Processo, UploadPdfResult } from '@/lib/types'
import { ReuNormalizacao } from './_components/reu-normalizacao'

export default function IntimacoesPage() {
  const [processos, setProcessos] = useState<Processo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadPdfResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await getProcessos()
      setProcessos(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    try {
      const result = await uploadPdf(file)
      setUploadResult(result)
      if ('assincrono' in result && result.assincrono) {
        toast.success(
          `PDF na fila de processamento (job ${result.jobId}). Atualize em instantes.`,
        )
        load()
      } else if ('ok' in result && result.ok) {
        toast.success('Processo importado com sucesso.')
        load()
      } else if ('ok' in result && !result.ok) {
        toast.error(`Revisão necessária: ${result.motivo}`)
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Intimações</h1>
        <div className="flex items-center gap-3">
          {uploading && (
            <span className="text-sm text-[var(--color-text-secondary)]">Processando…</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
          >
            Enviar PDF
          </button>
        </div>
      </div>

      <ReuNormalizacao processos={processos} onNormalized={load} />

      {uploadResult &&
        'ok' in uploadResult &&
        !uploadResult.ok && (
        <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--urgencia-atencao-border)] bg-[var(--urgencia-atencao-bg)] px-4 py-3 text-sm">
          <span className="text-[var(--urgencia-atencao-text)]">
            Extração com baixa confiança — revisão manual necessária.
          </span>
          <Link
            href={`/revisoes/${uploadResult.extracaoPendenteId}`}
            className="ml-auto shrink-0 font-medium text-[var(--color-brand)] hover:underline"
          >
            Revisar agora →
          </Link>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded bg-[var(--color-bg-subtle)]" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm text-[var(--urgencia-vencida-text)]">
          {error}{' '}
          <button onClick={load} className="underline">
            Tentar novamente
          </button>
        </div>
      ) : processos.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
          Nenhum processo cadastrado. Envie um PDF para começar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-muted)]">
              <tr>
                {['Número', 'Cliente', 'Réu', 'Vara', 'Matéria', 'Dt. Audiência', 'Status'].map(
                  (col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]"
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {processos.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--color-bg-hover)]">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-[var(--color-text-primary)]">
                    {p.numero}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text-primary)]">{p.clienteNome}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{p.reuTexto}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-secondary)]">
                    {p.vara}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                    {p.materia ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-secondary)]">
                    {p.dataAudiencia ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {p.requerConferencia ? (
                      <span className="rounded-full bg-[var(--urgencia-atencao-bg)] px-2 py-0.5 text-xs text-[var(--urgencia-atencao-text)]">
                        Conferir
                      </span>
                    ) : (
                      <span className="rounded-full bg-[var(--urgencia-normal-bg)] px-2 py-0.5 text-xs text-[var(--urgencia-normal-text)]">
                        {p.situacao ?? 'Ativo'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
