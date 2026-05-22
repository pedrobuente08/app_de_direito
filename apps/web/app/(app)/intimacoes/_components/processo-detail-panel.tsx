'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ProcessoTimeline } from '@/components/drawers/processo-timeline'
import {
  getProcesso,
  getProcessoTimeline,
  getSentencas,
  patchProcesso,
} from '@/lib/api'
import {
  FASE_OPCOES_CANONICAS,
  faseLabel,
  faseSelectOptions,
} from '@/lib/fase-label'
import { SISTEMAS_TRIBUNAL_SUGESTAO } from '@/lib/pdf-preview'
import type {
  DropdownsProcessoConfig,
  PatchProcessoPayload,
  Processo,
  Sentenca,
} from '@/lib/types'
import {
  EditableDate,
  EditableSelect,
  EditableText,
  EditableTextarea,
  EditableTime,
  Field,
  ReadField,
  type ToastApi,
} from './processo-editable'
import { CentroObservacoes } from '@/components/drawers/centro-observacoes'
import { PopUpSobrestamento } from '@/components/popups'
import { Btn } from '@/components/ui/btn'
import { RegistrarSentencaSection } from './registrar-sentenca-section'
import { DajeSection } from '@/components/processos/daje-section'
import { desistirProcesso } from '@/lib/api'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 border-b border-[var(--color-border-default)] pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 [&>*]:min-w-0">
        {children}
      </div>
    </div>
  )
}

type Props = {
  processo: Processo
  onUpdated: (p: Processo) => void
  toast: ToastApi
  readOnly?: boolean
  dropdowns?: DropdownsProcessoConfig | null
  onNovaPendencia?: (p: Processo) => void
}

export function ProcessoDetailPanel({
  processo,
  onUpdated,
  toast,
  readOnly,
  dropdowns,
  onNovaPendencia,
}: Props) {
  const [current, setCurrent] = useState<Processo>(processo)
  const [sobrestarOpen, setSobrestarOpen] = useState(false)
  const [desistirOpen, setDesistirOpen] = useState(false)
  const [motivoDesistencia, setMotivoDesistencia] = useState('')
  const [sentencas, setSentencas] = useState<Sentenca[]>([])
  const [timelineLoading, setTimelineLoading] = useState(true)
  const [timelineError, setTimelineError] = useState<string | null>(null)
  const [timelineEventos, setTimelineEventos] = useState<
    Awaited<ReturnType<typeof getProcessoTimeline>>['eventos']
  >([])

  useEffect(() => { setCurrent(processo) }, [processo])

  const reloadTimeline = useCallback(async () => {
    setTimelineLoading(true)
    setTimelineError(null)
    try {
      const res = await getProcessoTimeline(current.id)
      setTimelineEventos(res.eventos)
    } catch (e) {
      setTimelineError((e as Error).message)
      setTimelineEventos([])
    } finally {
      setTimelineLoading(false)
    }
  }, [current.id])

  const reloadSentencas = useCallback(async () => {
    try {
      const list = await getSentencas(current.id)
      setSentencas(list)
    } catch {
      setSentencas([])
    }
  }, [current.id])

  useEffect(() => {
    void reloadTimeline()
    void reloadSentencas()
  }, [reloadTimeline, reloadSentencas])

  const patch = useCallback(async (payload: PatchProcessoPayload) => {
    const updated = await patchProcesso(current.id, payload)
    setCurrent(updated)
    onUpdated(updated)
    if (
      payload.faseAtual !== undefined ||
      payload.dataDistribuicao !== undefined
    ) {
      void reloadTimeline()
    }
  }, [current.id, onUpdated, reloadTimeline])

  const ro = readOnly === true
  const statusOpts = useMemo(() => {
    const base = (dropdowns?.status_processo ?? []).filter(Boolean)
    const uniq = Array.from(new Set(base))
    return uniq.length ? uniq : ['ATIVO', 'SOBRESTADO', 'ARQUIVADO']
  }, [dropdowns])
  const faseOpts = useMemo(
    () =>
      faseSelectOptions(
        (dropdowns?.fase_atual?.length ? dropdowns.fase_atual : FASE_OPCOES_CANONICAS) as string[],
      ),
    [dropdowns?.fase_atual],
  )
  const situacaoOpts = useMemo(() => {
    const base = (dropdowns?.situacao ?? []).filter(Boolean)
    return Array.from(new Set(base))
  }, [dropdowns])
  const sistemaOpts = useMemo(() => {
    const s = (current.sistema ?? '').trim().toUpperCase()
    const set = new Set<string>([...SISTEMAS_TRIBUNAL_SUGESTAO])
    if (s) set.add(s.length > 20 ? s.slice(0, 20) : s)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [current.sistema])

  async function onSentencaCreated() {
    await reloadSentencas()
    await reloadTimeline()
    try {
      const updated = await getProcesso(current.id)
      setCurrent(updated)
      onUpdated(updated)
    } catch {
      /* timeline/sentenças já atualizados */
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
      <aside className="shrink-0 lg:w-56 xl:w-64">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Timeline do processo
        </p>
        <ProcessoTimeline
          eventos={timelineEventos}
          loading={timelineLoading}
          error={timelineError}
        />
      </aside>

      <div className="min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto overscroll-y-contain pb-4">
        {!ro ? (
          <div className="flex flex-wrap gap-2">
            <Btn type="button" variant="default" onClick={() => setSobrestarOpen(true)}>
              Sobrestar
            </Btn>
            {onNovaPendencia ? (
              <Btn type="button" variant="default" onClick={() => onNovaPendencia(current)}>
                Pendência manual
              </Btn>
            ) : null}
          </div>
        ) : null}

        <Section title="Observações">
          <Field label="Observação geral" className="col-span-2 sm:col-span-3">
            {ro ? (
              <ReadField value={current.observacaoGeral ?? current.observacoes} />
            ) : (
              <EditableTextarea
                value={current.observacaoGeral ?? current.observacoes}
                toast={toast}
                rows={3}
                onCommit={(v) => patch({ observacaoGeral: v, observacoes: v })}
              />
            )}
          </Field>
          <CentroObservacoes processoId={current.id} />
        </Section>

        <Section title="Identificação">
          <Field label="Sistema">
            {ro ? <ReadField value={current.sistema} /> : (
              <EditableSelect
                value={current.sistema}
                options={sistemaOpts}
                toast={toast}
                onCommit={(v) => patch({ sistema: v ?? 'DESCONHECIDO' })}
              />
            )}
          </Field>
          <Field label="Login">
            {ro ? <ReadField value={current.login} /> : (
              <EditableText value={current.login} toast={toast} onCommit={(v) => patch({ login: v })} />
            )}
          </Field>
          <Field label="Vara">
            {ro ? <ReadField value={current.vara} /> : (
              <EditableText value={current.vara} toast={toast} onCommit={(v) => patch({ vara: v })} />
            )}
          </Field>
          <Field label="Matéria">
            {ro ? <ReadField value={current.materia} /> : (
              <EditableText value={current.materia} toast={toast} onCommit={(v) => patch({ materia: v })} />
            )}
          </Field>
          <Field label="Status do processo">
            {ro ? <ReadField value={current.statusProcesso ?? 'ATIVO'} /> : statusOpts.length > 0 ? (
              <EditableSelect value={current.statusProcesso ?? 'ATIVO'} options={statusOpts} toast={toast} onCommit={(v) => patch({ statusProcesso: v ?? 'ATIVO' })} />
            ) : (
              <EditableText value={current.statusProcesso ?? 'ATIVO'} toast={toast} onCommit={(v) => patch({ statusProcesso: v ?? 'ATIVO' })} />
            )}
          </Field>
          <Field label="Fase">
            {ro ? (
              <ReadField value={faseLabel(current.faseAtual)} />
            ) : (
              <EditableSelect
                value={current.faseAtual}
                options={faseOpts}
                toast={toast}
                onCommit={(v) => patch({ faseAtual: v })}
              />
            )}
          </Field>
        </Section>

        <Section title="Partes">
          <Field label="Cliente" className="col-span-2">
            {ro ? <ReadField value={current.clienteNome} /> : (
              <EditableText value={current.clienteNome} toast={toast} onCommit={(v) => patch({ clienteNome: v })} />
            )}
          </Field>
          <Field label="CPF">
            {ro ? <ReadField value={current.clienteCpf} /> : (
              <EditableText value={current.clienteCpf} toast={toast} monospace onCommit={(v) => patch({ clienteCpf: v })} />
            )}
          </Field>
          <Field label="Réu" className="col-span-2 sm:col-span-3">
            {ro ? <ReadField value={current.reuTexto} /> : (
              <EditableText value={current.reuTexto} toast={toast} onCommit={(v) => patch({ reuTexto: v })} />
            )}
          </Field>
        </Section>

        <Section title="Audiência">
          <Field label="Distribuição">
            {ro ? <ReadField value={current.dataDistribuicao} /> : (
              <EditableDate value={current.dataDistribuicao} toast={toast} onCommit={(v) => patch({ dataDistribuicao: v })} />
            )}
          </Field>
          <Field label="Data audiência">
            {ro ? <ReadField value={current.dataAudiencia} /> : (
              <EditableDate value={current.dataAudiencia} toast={toast} onCommit={(v) => patch({ dataAudiencia: v })} />
            )}
          </Field>
          <Field label="Hora">
            {ro ? <ReadField value={current.horaAudiencia} /> : (
              <EditableTime value={current.horaAudiencia} toast={toast} onCommit={(v) => patch({ horaAudiencia: v })} />
            )}
          </Field>
          <Field label="Tipo">
            {ro ? <ReadField value={current.tipoAudiencia} /> : (
              <EditableText value={current.tipoAudiencia} toast={toast} onCommit={(v) => patch({ tipoAudiencia: v })} />
            )}
          </Field>
          <Field label="Status audiência">
            {ro ? <ReadField value={current.statusAudiencia} /> : (
              <EditableText value={current.statusAudiencia} toast={toast} onCommit={(v) => patch({ statusAudiencia: v })} />
            )}
          </Field>
        </Section>

        <Section title="Sentenças">
          <RegistrarSentencaSection
            processoId={current.id}
            processoNumero={current.numero}
            sentencas={sentencas}
            readOnly={ro}
            dropdowns={dropdowns}
            toast={toast}
            onCreated={() => { void onSentencaCreated() }}
          />
        </Section>

        <Section title="Situação e justiça gratuita">
          <Field label="Situação" className="col-span-2 sm:col-span-3">
            {ro ? <ReadField value={current.qualidadeCaso} /> : situacaoOpts.length > 0 ? (
              <EditableSelect
                value={current.qualidadeCaso}
                options={situacaoOpts}
                toast={toast}
                onCommit={(v) => patch({ qualidadeCaso: v })}
              />
            ) : (
              <EditableText
                value={current.qualidadeCaso}
                toast={toast}
                onCommit={(v) => patch({ qualidadeCaso: v })}
              />
            )}
          </Field>
          <Field label="Justiça gratuita">
            {ro ? (
              <ReadField value={current.justicaGratuita ? 'Sim' : 'Não'} />
            ) : (
              <label className="flex min-h-[32px] cursor-pointer items-center gap-2 text-sm text-[var(--color-text-primary)]">
                <input
                  type="checkbox"
                  className="rounded border-[var(--color-border-default)]"
                  checked={!!current.justicaGratuita}
                  onChange={(e) => { void patch({ justicaGratuita: e.target.checked }) }}
                />
                Cliente com justiça gratuita
              </label>
            )}
          </Field>
        </Section>

        <Section title="Custas (DAJE)">
          <DajeSection
            processo={current}
            readOnly={ro}
            onUpdated={(p) => {
              setCurrent(p)
              onUpdated(p)
            }}
            toast={toast}
          />
        </Section>

        <Section title="Outros">
          {current.reuOrgaoPublico ? (
            <p className="col-span-2 text-xs font-medium text-[var(--color-brand)] sm:col-span-3">
              Órgão público (prazo em dobro na Justiça Comum)
            </p>
          ) : null}
          {current.litiganciaMaFe ? (
            <p className="col-span-2 text-xs text-[var(--urgencia-vencida-text)] sm:col-span-3">
              Litigância de má-fé
            </p>
          ) : null}
          <Field label="Situação final">
            {ro ? <ReadField value={current.situacaoFinal} /> : (
              <EditableText value={current.situacaoFinal} toast={toast} onCommit={(v) => patch({ situacaoFinal: v })} />
            )}
          </Field>
          <Field label="Telefone">
            {ro ? <ReadField value={current.telefone} /> : (
              <EditableText value={current.telefone} toast={toast} onCommit={(v) => patch({ telefone: v })} />
            )}
          </Field>
          <Field label="Última movimentação" className="col-span-2">
            {ro ? <ReadField value={current.ultimaMovimentacaoTipo} /> : (
              <EditableText value={current.ultimaMovimentacaoTipo} toast={toast} onCommit={(v) => patch({ ultimaMovimentacaoTipo: v })} />
            )}
          </Field>
        </Section>

        {!ro && current.statusProcesso !== 'ARQUIVADO' ? (
          <Section title="Ações avançadas">
            <div className="col-span-2 sm:col-span-3">
              {!desistirOpen ? (
                <button
                  type="button"
                  className="text-xs text-[var(--color-text-secondary)] underline"
                  onClick={() => setDesistirOpen(true)}
                >
                  Registrar desistência
                </button>
              ) : (
                <div className="space-y-2 rounded border p-3">
                  <textarea
                    value={motivoDesistencia}
                    onChange={(e) => setMotivoDesistencia(e.target.value)}
                    placeholder="Motivo da desistência"
                    rows={2}
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-[var(--color-brand)] px-2 py-1 text-xs text-white"
                      onClick={async () => {
                        try {
                          const p = await desistirProcesso(current.id, {
                            motivo: motivoDesistencia,
                            data: new Date().toISOString().slice(0, 10),
                          })
                          setCurrent(p)
                          onUpdated(p)
                          toast.success('Desistência registrada.')
                          setDesistirOpen(false)
                        } catch (e) {
                          toast.error((e as Error).message)
                        }
                      }}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="text-xs underline"
                      onClick={() => setDesistirOpen(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Section>
        ) : null}
      </div>

      <PopUpSobrestamento
        open={sobrestarOpen}
        processoId={current.id}
        processoNumero={current.numero}
        onClose={() => setSobrestarOpen(false)}
        onSuccess={() => {
          toast.success('Processo sobrestado.')
          void patch({ statusProcesso: 'SOBRESTADO' })
          setSobrestarOpen(false)
        }}
      />
    </div>
  )
}
