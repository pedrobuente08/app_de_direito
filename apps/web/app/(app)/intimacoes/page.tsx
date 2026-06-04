'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  confirmarBatchPdf,
  getAuthMe,
  getComarcas,
  getComunicacoesOrfas,
  getEscritorioConfig,
  getProcesso,
  getProcessos,
  getProcessosResumo,
  getUsuarios,
  previewPdfBatch,
} from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import type {
  Comarca,
  ConfirmarBatchItem,
  DropdownsProcessoConfig,
  PaginatedComunicacoes,
  PdfPreviewItem,
  Processo,
  ProcessosListMeta,
  ProcessosResumo,
  Usuario,
  VaraConfig,
} from '@/lib/types'
import { NovaPendenciaDialog } from '@/components/pendencias/nova-pendencia-dialog'
import { FASE_OPCOES_CANONICAS, faseLabel } from '@/lib/fase-label'
import { FilterBar, FilterField, filterControlClass } from '@/components/ui/filter-bar'
import { KpiCard } from '@/components/ui/kpi-card'
import { OrfasSection } from './_components/orfas-section'
import { PdfRevisaoModal, type PdfRevisaoCatalogo } from './_components/pdf-revisao-modal'
import { ProcessosGrid } from './_components/processos-grid'
import { ProcessoModal } from './_components/processo-modal'
import { ReuNormalizacao } from './_components/reu-normalizacao'

const PAGE_SIZE = 50

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Cadastro' },
  { value: 'updatedAt', label: 'Atualização' },
  { value: 'ultimaMovimentacaoDt', label: 'Última movimentação' },
  { value: 'numero', label: 'Número' },
  { value: 'vara', label: 'Vara' },
  { value: 'materia', label: 'Matéria' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'clienteNome', label: 'Cliente' },
] as const

const MOVIMENTACAO_OPCOES = [
  { value: '', label: 'Qualquer data' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '60', label: 'Últimos 60 dias' },
  { value: '90', label: 'Últimos 90 dias' },
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
  const [draftQualidadeCaso, setDraftQualidadeCaso] = useState('')
  const [draftFilterUltimaSentenca, setDraftFilterUltimaSentenca] = useState<
    '' | 'BOA' | 'RUIM' | 'SEM'
  >('')
  const [draftEmAvaliacao, setDraftEmAvaliacao] = useState(false)
  const [draftSortField, setDraftSortField] = useState<
    (typeof SORT_OPTIONS)[number]['value']
  >('createdAt')
  const [draftSortOrder, setDraftSortOrder] = useState<'asc' | 'desc'>('desc')

  const [appliedNumero, setAppliedNumero] = useState('')
  const [appliedCliente, setAppliedCliente] = useState('')
  const [appliedVara, setAppliedVara] = useState('')
  const [appliedQualidadeCaso, setAppliedQualidadeCaso] = useState('')
  const [appliedFilterUltimaSentenca, setAppliedFilterUltimaSentenca] = useState<
    '' | 'BOA' | 'RUIM' | 'SEM'
  >('')
  const [appliedEmAvaliacao, setAppliedEmAvaliacao] = useState(false)
  const [appliedAcaoImediata, setAppliedAcaoImediata] = useState(false)
  const [appliedArquivados30d, setAppliedArquivados30d] = useState(false)
  const [draftMovimentacaoRecenteDias, setDraftMovimentacaoRecenteDias] = useState('')
  const [appliedMovimentacaoRecenteDias, setAppliedMovimentacaoRecenteDias] = useState('')
  const [draftStatusProcesso, setDraftStatusProcesso] = useState('')
  const [draftFaseAtual, setDraftFaseAtual] = useState('')
  const [appliedStatusProcesso, setAppliedStatusProcesso] = useState('')
  const [appliedFaseAtual, setAppliedFaseAtual] = useState('')
  const [resumo, setResumo] = useState<ProcessosResumo | null>(null)
  const [pendenciaProcesso, setPendenciaProcesso] = useState<Processo | null>(null)
  const [appliedSortField, setAppliedSortField] = useState<
    (typeof SORT_OPTIONS)[number]['value']
  >('createdAt')
  const [appliedSortOrder, setAppliedSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const [orfasPaginadas, setOrfasPaginadas] = useState<PaginatedComunicacoes | null>(null)

  const searchParams = useSearchParams()
  useEffect(() => {
    const numero = searchParams.get('numero')
    if (numero?.trim()) {
      setDraftNumero(numero.trim())
      setAppliedNumero(numero.trim())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [readOnly, setReadOnly] = useState(false)
  const [dropdowns, setDropdowns] = useState<DropdownsProcessoConfig | null>(null)
  const [varasConfig, setVarasConfig] = useState<Record<string, VaraConfig> | null>(null)
  const [selectedProcesso, setSelectedProcesso] = useState<Processo | null>(null)
  const [pdfRevisaoOpen, setPdfRevisaoOpen] = useState(false)
  const [pdfPreviewItem, setPdfPreviewItem] = useState<PdfPreviewItem | null>(null)
  const [confirmingPdf, setConfirmingPdf] = useState(false)
  const [pdfCatalogo, setPdfCatalogo] = useState<PdfRevisaoCatalogo>({
    materias: [],
    comarcas: [],
    logins: [],
  })

  useEffect(() => {
    let cancelled = false
    async function loadSession() {
      try {
        const [me, cfg, comarcasRes, usuariosRes] = await Promise.all([
          getAuthMe(),
          getEscritorioConfig(),
          getComarcas().catch(() => [] as Comarca[]),
          getUsuarios().catch(() => [] as Usuario[]),
        ])
        if (cancelled) return
        setReadOnly(me.perfil === 'leitura')
        setDropdowns(cfg.dropdowns_processo ?? null)
        setVarasConfig(cfg.varas_config ?? null)
        const comarcas = (comarcasRes ?? [])
          .map((c) => c.nome.trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        const logins = Array.from(
          new Set(
            (usuariosRes ?? []).flatMap((u) =>
              (u.loginAliases ?? []).map((a) => String(a).trim()).filter(Boolean),
            ),
          ),
        ).sort((a, b) => a.localeCompare(b, 'pt-BR'))
        setPdfCatalogo({
          materias: (cfg.materias_validas ?? [])
            .map((m) => String(m).trim())
            .filter(Boolean),
          comarcas,
          logins,
        })
      } catch {
        if (!cancelled) {
          setReadOnly(false)
          setDropdowns(null)
          setPdfCatalogo({ materias: [], comarcas: [], logins: [] })
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
        ...(appliedQualidadeCaso.trim() && {
          qualidadeCaso: appliedQualidadeCaso.trim(),
        }),
        ...(appliedFilterUltimaSentenca && {
          filterUltimaSentenca: appliedFilterUltimaSentenca,
        }),
        ...(appliedEmAvaliacao && { emAvaliacao: 'true' }),
        ...(appliedAcaoImediata && { acaoImediata: 'true' }),
        ...(appliedArquivados30d && { arquivados30d: 'true' }),
        ...(appliedMovimentacaoRecenteDias && {
          movimentacaoRecenteDias: appliedMovimentacaoRecenteDias,
        }),
        ...(appliedStatusProcesso.trim() && {
          statusProcesso: appliedStatusProcesso.trim(),
        }),
        ...(appliedFaseAtual.trim() && { faseAtual: appliedFaseAtual.trim() }),
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
    appliedQualidadeCaso,
    appliedFilterUltimaSentenca,
    appliedEmAvaliacao,
    appliedAcaoImediata,
    appliedArquivados30d,
    appliedMovimentacaoRecenteDias,
    appliedStatusProcesso,
    appliedFaseAtual,
    appliedSortField,
    appliedSortOrder,
    page,
  ])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    getProcessosResumo().then(setResumo).catch(() => setResumo(null))
    getComunicacoesOrfas(1, 20).then(setOrfasPaginadas).catch(() => setOrfasPaginadas(null))
  }, [])

  const onRowUpdated = useCallback((row: Processo) => {
    setProcessos((prev) => prev.map((p) => (p.id === row.id ? row : p)))
  }, [])

  function aplicarFiltros() {
    setAppliedNumero(draftNumero)
    setAppliedCliente(draftCliente)
    setAppliedVara(draftVara)
    setAppliedQualidadeCaso(draftQualidadeCaso)
    setAppliedFilterUltimaSentenca(draftFilterUltimaSentenca)
    setAppliedEmAvaliacao(draftEmAvaliacao)
    setAppliedAcaoImediata(false)
    setAppliedArquivados30d(false)
    if (draftEmAvaliacao) {
      setAppliedAcaoImediata(false)
      setAppliedArquivados30d(false)
    }
    setAppliedStatusProcesso(draftStatusProcesso)
    setAppliedFaseAtual(draftFaseAtual)
    setAppliedMovimentacaoRecenteDias(draftMovimentacaoRecenteDias)
    setAppliedSortField(draftSortField)
    setAppliedSortOrder(draftSortOrder)
    setPage(1)
    setFiltrosAbertos(false)
  }

  function abrirPainelFiltros() {
    setDraftNumero(appliedNumero)
    setDraftCliente(appliedCliente)
    setDraftVara(appliedVara)
    setDraftQualidadeCaso(appliedQualidadeCaso)
    setDraftFilterUltimaSentenca(appliedFilterUltimaSentenca)
    setDraftEmAvaliacao(appliedEmAvaliacao)
    setDraftStatusProcesso(appliedStatusProcesso)
    setDraftFaseAtual(appliedFaseAtual)
    setDraftMovimentacaoRecenteDias(appliedMovimentacaoRecenteDias)
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

  function aplicarCard(
    preset: 'ativos' | 'acao' | 'avaliar' | 'arquivados',
  ) {
    setAppliedNumero('')
    setAppliedCliente('')
    setAppliedVara('')
    setAppliedQualidadeCaso('')
    setAppliedFilterUltimaSentenca('')
    setAppliedStatusProcesso('')
    setAppliedFaseAtual('')
    setAppliedEmAvaliacao(false)
    setAppliedAcaoImediata(false)
    setAppliedArquivados30d(false)
    setAppliedMovimentacaoRecenteDias('')
    setDraftMovimentacaoRecenteDias('')
    if (preset === 'acao') setAppliedAcaoImediata(true)
    if (preset === 'avaliar') setAppliedEmAvaliacao(true)
    if (preset === 'arquivados') setAppliedArquivados30d(true)
    setPage(1)
    setDraftEmAvaliacao(preset === 'avaliar')
    setDraftStatusProcesso('')
    setDraftFaseAtual('')
  }

  const cards = [
    { id: 'ativos' as const, label: 'Total ativos', value: resumo?.totalAtivos },
    { id: 'acao' as const, label: 'Ação imediata', value: resumo?.acaoImediata },
    { id: 'avaliar' as const, label: 'Em avaliação', value: resumo?.emAvaliacao },
    { id: 'arquivados' as const, label: 'Arquivados 30d', value: resumo?.arquivados30d },
  ]

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
                Enviar 1 PDF
              </button>
              <Link
                href="/importacao"
                className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
              >
                Importar vários PDFs…
              </Link>
            </>
          )}
        </div>
      </div>

      <OrfasSection
        orfas={orfasPaginadas?.data ?? []}
        total={orfasPaginadas?.total}
        materias={pdfCatalogo.materias}
        onResolved={() => {
          getComunicacoesOrfas(1, 20).then(setOrfasPaginadas).catch(() => setOrfasPaginadas(null))
          load()
        }}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <KpiCard
            key={c.id}
            label={c.label}
            value={c.value ?? '—'}
            variant={c.id === 'acao' ? 'danger' : c.id === 'avaliar' ? 'warning' : 'default'}
            onClick={() => aplicarCard(c.id)}
          />
        ))}
      </div>

      {filtrosAbertos && (
        <FilterBar>
          <FilterField label="Nº processo">
            <input
              value={draftNumero}
              onChange={(e) => setDraftNumero(e.target.value)}
              placeholder="Contém…"
              className={filterControlClass}
            />
          </FilterField>
          <FilterField label="Cliente" className="min-w-[140px]">
            <input
              value={draftCliente}
              onChange={(e) => setDraftCliente(e.target.value)}
              placeholder="Nome…"
              className={filterControlClass}
            />
          </FilterField>
          <FilterField label="Vara">
            <input
              value={draftVara}
              onChange={(e) => setDraftVara(e.target.value)}
              placeholder="Contém…"
              className={filterControlClass}
            />
          </FilterField>
          <FilterField label="Situação" className="min-w-[140px]">
            <input
              value={draftQualidadeCaso}
              onChange={(e) => setDraftQualidadeCaso(e.target.value)}
              placeholder="Ex.: BOA, RUIM…"
              className={filterControlClass}
            />
          </FilterField>
          <FilterField label="Sentença" className="min-w-[160px]">
            <select
              value={draftFilterUltimaSentenca}
              onChange={(e) =>
                setDraftFilterUltimaSentenca(e.target.value as '' | 'BOA' | 'RUIM' | 'SEM')
              }
              className={filterControlClass}
            >
              <option value="">Todos</option>
              <option value="BOA">Favorável ao autor</option>
              <option value="RUIM">Favorável ao réu</option>
              <option value="SEM">Sem sentença</option>
            </select>
          </FilterField>
          <FilterField label="Status">
            <select
              value={draftStatusProcesso}
              onChange={(e) => setDraftStatusProcesso(e.target.value)}
              className={filterControlClass}
            >
              <option value="">Ativos (padrão)</option>
              <option value="ATIVO">ATIVO</option>
              <option value="SOBRESTADO">SOBRESTADO</option>
              <option value="ARQUIVADO">ARQUIVADO</option>
            </select>
          </FilterField>
          <FilterField label="Fase" className="min-w-[180px]">
            <select
              value={draftFaseAtual}
              onChange={(e) => setDraftFaseAtual(e.target.value)}
              className={filterControlClass}
            >
              <option value="">Todas</option>
              {FASE_OPCOES_CANONICAS.map((code) => (
                <option key={code} value={code}>
                  {faseLabel(code)}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Avaliação" className="min-w-[160px]">
            <label className="flex min-h-[34px] items-center gap-2 text-sm text-[var(--color-text-primary)]">
              <input
                type="checkbox"
                checked={draftEmAvaliacao}
                onChange={(e) => setDraftEmAvaliacao(e.target.checked)}
              />
              Em avaliação (recurso)
            </label>
          </FilterField>
          <FilterField label="Movimentação" className="min-w-[160px]">
            <select
              value={draftMovimentacaoRecenteDias}
              onChange={(e) => setDraftMovimentacaoRecenteDias(e.target.value)}
              className={filterControlClass}
            >
              {MOVIMENTACAO_OPCOES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Ordenar por">
            <select
              value={draftSortField}
              onChange={(e) =>
                setDraftSortField(e.target.value as (typeof SORT_OPTIONS)[number]['value'])
              }
              className={filterControlClass}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Direção">
            <select
              value={draftSortOrder}
              onChange={(e) => setDraftSortOrder(e.target.value as 'asc' | 'desc')}
              className={filterControlClass}
            >
              <option value="desc">Decrescente</option>
              <option value="asc">Crescente</option>
            </select>
          </FilterField>
          <button
            type="button"
            onClick={aplicarFiltros}
            disabled={loading}
            className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
          >
            Aplicar filtros
          </button>
        </FilterBar>
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
          <ProcessosGrid
            data={processos}
            onRowClick={setSelectedProcesso}
            readOnly={readOnly}
            onAddPendencia={readOnly ? undefined : setPendenciaProcesso}
          />

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
          varasConfig={varasConfig}
          onNovaPendencia={(p) => {
            setSelectedProcesso(null)
            setPendenciaProcesso(p)
          }}
        />
      )}

      <PdfRevisaoModal
        open={pdfRevisaoOpen}
        item={pdfPreviewItem}
        confirming={confirmingPdf}
        catalogo={pdfCatalogo}
        onClose={() => {
          setPdfRevisaoOpen(false)
          setPdfPreviewItem(null)
        }}
        onConfirm={handleConfirmarPdf}
        onAbrirProcessoExistente={handleAbrirProcessoDuplicado}
      />

      <NovaPendenciaDialog
        open={!!pendenciaProcesso}
        processo={pendenciaProcesso}
        onClose={() => setPendenciaProcesso(null)}
        onSuccess={() => {
          toast.success('Pendência criada.')
          getProcessosResumo().then(setResumo).catch(() => {})
          load()
        }}
      />

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
