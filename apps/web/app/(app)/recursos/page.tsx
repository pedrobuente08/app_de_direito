'use client'

import { useCallback, useEffect, useState } from 'react'
import { PopUpEmbargosDeclaracao } from '@/components/recursos/popup-embargos-declaracao'
import { RegistrarSegundoGrauDialog } from '@/components/recursos/registrar-segundo-grau-dialog'
import type { RecursoLinha } from '@/components/recursos/registrar-segundo-grau-dialog'
import { getAddonsStatus, getAuthMe, getRecursos, getRecursosResumo } from '@/lib/api'
import { faseLabel } from '@/lib/fase-label'
import { KpiCard } from '@/components/ui/kpi-card'
import type { RecursoListaItem, RecursosResumo } from '@/lib/types'
import { ToastContainer, useToast } from '@/lib/toast'

export default function RecursosPage() {
  const toast = useToast()
  const [readOnly, setReadOnly] = useState(false)
  const [recursosAvancados, setRecursosAvancados] = useState(false)
  const [lista, setLista] = useState<RecursoListaItem[]>([])
  const [resumo, setResumo] = useState<RecursosResumo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogItem, setDialogItem] = useState<RecursoLinha | null>(null)
  const [embargosItem, setEmbargosItem] = useState<{
    processoId: string
    numero: string
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [items, r] = await Promise.all([getRecursos(), getRecursosResumo()])
      setLista(items)
      setResumo(r)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    getAuthMe()
      .then((me) => setReadOnly(me.perfil === 'leitura'))
      .catch(() => setReadOnly(false))
    getAddonsStatus()
      .then((s) => setRecursosAvancados(s.addons.recursos_avancados === true))
      .catch(() => setRecursosAvancados(false))
    void load()
  }, [load])

  const cards = [
    { label: 'Total em recurso', value: resumo?.totalEmRecurso ?? '—', variant: 'default' as const },
    { label: 'Manifestação ≤7d', value: resumo?.manifestacao7d ?? '—', variant: 'warning' as const },
    { label: 'Aguardando acórdão', value: resumo?.aguardandoAcordao ?? '—', variant: 'accent' as const },
    { label: 'Com decisão', value: resumo?.comDecisao ?? '—', variant: 'success' as const },
  ]

  return (
    <div className="animate-fade-in-up space-y-4">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      <div>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Recursos</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          Processos em recurso sem acórdão de 2º grau. Registre a decisão pelo botão na linha.
          {recursosAvancados
            ? ' Com add-on PRO: registre embargos de declaração e acompanhe o badge ED.'
            : null}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <KpiCard key={c.label} label={c.label} value={c.value} variant={c.variant} />
        ))}
      </div>

      {error ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm">
          {error}{' '}
          <button type="button" onClick={() => void load()} className="underline">
            Tentar novamente
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-[var(--color-bg-subtle)]" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Nenhum processo em recurso no momento.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-muted)]">
              <tr>
                {['Processo', 'Cliente', 'Origem', 'Turma', 'Fase', 'Prazo manifestação', ''].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {lista.map((r) => (
                <tr key={r.processoId} className="hover:bg-[var(--color-bg-hover)]">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{r.numero}</span>
                      {r.embargosAbertos ? (
                        <span
                          className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-orange-800"
                          title="Embargos de declaração pendentes"
                        >
                          ED
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">{r.clienteNome ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    {r.origemRecurso === 'NOSSO'
                      ? 'Nosso'
                      : r.origemRecurso === 'REU'
                        ? 'Réu'
                        : '—'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {r.turmaRecursal ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">{faseLabel(r.faseAtual)}</td>
                  <td className="px-4 py-2.5">
                    {r.prazoSuspensoEd ? (
                      <span className="text-orange-700">Suspenso (ED)</span>
                    ) : (
                      (r.prazoManifestacao ?? '—')
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {!readOnly ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        {recursosAvancados && !r.embargosAbertos ? (
                          <button
                            type="button"
                            onClick={() =>
                              setEmbargosItem({
                                processoId: r.processoId,
                                numero: r.numero,
                              })
                            }
                            className="text-xs text-orange-700 hover:underline"
                          >
                            Embargos
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            setDialogItem({
                              processoId: r.processoId,
                              numero: r.numero,
                              origemRecurso: r.origemRecurso,
                            })
                          }
                          className="text-xs text-[var(--color-brand)] hover:underline"
                        >
                          Registrar acórdão
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RegistrarSegundoGrauDialog
        open={!!dialogItem}
        item={dialogItem}
        onClose={() => setDialogItem(null)}
        onSuccess={() => {
          toast.success('Acórdão registrado.')
          void load()
        }}
      />

      <PopUpEmbargosDeclaracao
        open={!!embargosItem}
        item={embargosItem}
        onClose={() => setEmbargosItem(null)}
        onSuccess={() => {
          toast.success('Embargos registrados.')
          void load()
        }}
      />
    </div>
  )
}
