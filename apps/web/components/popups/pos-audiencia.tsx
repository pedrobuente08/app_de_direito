'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { finalizarAudiencia, getEscritoriosAdversarios } from '@/lib/api'
import type { Audiencia, EscritorioAdversario, VaraConfig } from '@/lib/types'

export type PendenciaPosAudienciaInput = {
  tipo: string
  diasUteis: string
  dataLimite: string
  responsavel?: string | null
  observacao?: string | null
}

export type PendenciaPosAudienciaApi = {
  tipo: string
  dataLimite: string
  responsavel?: string | null
  observacao?: string | null
}

export type FinalizarAudienciaPayload = {
  obsPos: string
  status: string
  /** Derivado do cenário — enviado para backward compat com a API. */
  autorPresenca?: string
  /** Derivado do cenário — enviado para backward compat com a API. */
  reuPresenca?: string
  motivoCancelamento?: string
  novaData?: string
  novaHora?: string | null
  houvePendencia?: boolean
  pendencias?: PendenciaPosAudienciaApi[]
  escritorioAdversarioId?: string | null
  cenario?: string
  cenarioObservacao?: string | null
}

const STATUS_OPCOES: { value: string; label: string }[] = [
  { value: 'REALIZADA', label: 'Realizada' },
  { value: 'REDESIGNADA', label: 'Redesignada (vara marcou outra data)' },
  { value: 'CANCELADA', label: 'Cancelada' },
  { value: 'ADIADA', label: 'Adiada' },
]

const CENARIO_OPCOES: { value: string; label: string; descricao?: string }[] = [
  { value: 'TODOS_COMPARECERAM', label: 'Todos compareceram', descricao: 'Trâmite normal' },
  { value: 'REVELIA', label: 'Revelia', descricao: 'Réu faltou; autor compareceu' },
  { value: 'SO_ADVOGADO', label: 'Só o advogado', descricao: 'Cliente faltou; cria pendência automática para o atendimento obter justificativa' },
]

const MOTIVOS_CANCELAMENTO = [
  { value: 'AUSENCIA_CONTATO', label: 'Ausência de contato com o cliente' },
  { value: 'CANCELAMENTO_VARA', label: 'Cancelamento pela vara' },
  { value: 'OUTRO', label: 'Outro' },
] as const


const RESPONSAVEIS_OPCOES = [
  { value: 'ADV', label: 'ADV (advogado responsável)' },
  { value: 'ATENDIMENTO', label: 'ATENDIMENTO (fila telemarketing)' },
  { value: 'PAUTISTA', label: 'PAUTISTA' },
  { value: 'ADMINISTRATIVO', label: 'ADMINISTRATIVO' },
] as const

function addBusinessDays(fromIso: string, days: number): string {
  const d = new Date(`${fromIso}T12:00:00`)
  let rest = Math.max(1, days)
  while (rest > 0) {
    d.setDate(d.getDate() + 1)
    const wd = d.getDay()
    if (wd !== 0 && wd !== 6) rest -= 1
  }
  return d.toISOString().slice(0, 10)
}

const PENDENCIA_TIPOS_PADRAO = [
  'PROCURAÇÃO',
  'PROCURAÇÃO ALVARÁ',
  'HIPOSSUFICIÊNCIA',
  'DILIGÊNCIA',
  'CR',
  'CR PROCURAÇÃO',
] as const

type Props = {
  open: boolean
  audiencia: Audiencia | null
  readOnly?: boolean
  tiposPendencia?: string[]
  /** Mapa vara → config (fonte de verdade). */
  varasConfig?: Record<string, VaraConfig>
  /** Fallback legado: lista de varas FRACIONADAS. */
  varasFracionadas?: string[]
  /** Fallback legado: lista de varas que mudam de sala virtual. */
  varasMudaSala?: string[]
  /** Fallback legado: lista de varas UNA condicional. */
  varasUnaCondicional?: string[]
  onClose: () => void
  onSuccess: () => void
}

function emptyPendencia(): PendenciaPosAudienciaInput {
  return {
    tipo: '',
    diasUteis: '5',
    dataLimite: '',
    responsavel: 'ADV',
    observacao: '',
  }
}

function normalizarVara(v: string | null | undefined): string {
  return (v ?? '').trim().toUpperCase()
}

export function PopUpPosAudiencia({
  open,
  audiencia,
  readOnly,
  tiposPendencia,
  varasConfig,
  varasFracionadas,
  varasMudaSala,
  varasUnaCondicional,
  onClose,
  onSuccess,
}: Props) {
  const [obsPos, setObsPos] = useState('')
  const [status, setStatus] = useState<string>('REALIZADA')
  const [motivoCancelamento, setMotivoCancelamento] = useState('CANCELAMENTO_VARA')
  const [novaData, setNovaData] = useState('')
  const [novaHora, setNovaHora] = useState('')
  const [houvePendencia, setHouvePendencia] = useState(false)
  const [pendencias, setPendencias] = useState<PendenciaPosAudienciaInput[]>([
    emptyPendencia(),
  ])
  const [escritorioAdvId, setEscritorioAdvId] = useState('')
  const [cenario, setCenario] = useState('')
  const [cenarioObservacao, setCenarioObservacao] = useState('')
  /** 'sem_acordo' | 'com_acordo' | 'outro' — usado só quando vara é FRACIONADA */
  const [resultadoFracionada, setResultadoFracionada] = useState<'sem_acordo' | 'com_acordo' | 'outro'>('sem_acordo')
  const [adversarios, setAdversarios] = useState<EscritorioAdversario[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [solicitouAij, setSolicitouAij] = useState<boolean | null>(null)

  const varaCfgEntry = useMemo(() => {
    const vara = normalizarVara(audiencia?.processo?.vara)
    if (!vara || !varasConfig) return null
    const entry = Object.entries(varasConfig).find(([k]) => normalizarVara(k) === vara)
    return entry ? entry[1] : null
  }, [audiencia?.processo?.vara, varasConfig])

  const varaEhFracionada = useMemo(() => {
    if (varaCfgEntry) return varaCfgEntry.tipo === 'fracionada'
    const vara = normalizarVara(audiencia?.processo?.vara)
    if (!vara || !varasFracionadas?.length) return false
    return varasFracionadas.some((v) => normalizarVara(v) === vara)
  }, [varaCfgEntry, audiencia?.processo?.vara, varasFracionadas])

  const varaEhMudaSala = useMemo(() => {
    if (varaCfgEntry) return !!varaCfgEntry.muda_sala
    const vara = normalizarVara(audiencia?.processo?.vara)
    if (!vara || !varasMudaSala?.length) return false
    return varasMudaSala.some((v) => normalizarVara(v) === vara)
  }, [varaCfgEntry, audiencia?.processo?.vara, varasMudaSala])

  const varaEhCondicional = useMemo(() => {
    if (varaCfgEntry) return !!varaCfgEntry.una_condicional
    const vara = normalizarVara(audiencia?.processo?.vara)
    if (!vara || !varasUnaCondicional?.length) return false
    return varasUnaCondicional.some((v) => normalizarVara(v) === vara)
  }, [varaCfgEntry, audiencia?.processo?.vara, varasUnaCondicional])

  const tipoOpts = useMemo(() => {
    const set = new Set<string>([...PENDENCIA_TIPOS_PADRAO, ...(tiposPendencia ?? [])])
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [tiposPendencia])

  useEffect(() => {
    if (!open) return
    setObsPos('')
    setStatus('REALIZADA')
    setMotivoCancelamento('CANCELAMENTO_VARA')
    setNovaData('')
    setNovaHora('')
    setHouvePendencia(false)
    setPendencias([emptyPendencia()])
    setEscritorioAdvId(audiencia?.escritorioAdversarioId ?? '')
    setCenario(varaEhFracionada ? 'FRACIONADA' : '')
    setCenarioObservacao('')
    setResultadoFracionada('sem_acordo')
    setSolicitouAij(null)
    setErro(null)
    getEscritoriosAdversarios()
      .then(setAdversarios)
      .catch(() => setAdversarios([]))
  }, [open, audiencia?.escritorioAdversarioId])

  // Item B — saída sem perder dados: bloquear fechamento acidental quando há rascunho.
  const formSujo =
    obsPos.trim().length > 0 ||
    cenarioObservacao.trim().length > 0 ||
    novaData.trim().length > 0 ||
    novaHora.trim().length > 0 ||
    houvePendencia ||
    pendencias.some(
      (p) =>
        p.tipo.trim() ||
        (p.observacao ?? '').trim() ||
        p.dataLimite.trim() ||
        p.diasUteis.trim(),
    )
  const fecharComConfirmacao = useCallback(() => {
    if (salvando) return
    if (
      !formSujo ||
      window.confirm(
        'Há informações preenchidas que serão descartadas. Fechar mesmo assim?',
      )
    ) {
      onClose()
    }
  }, [formSujo, onClose, salvando])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') fecharComConfirmacao()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, fecharComConfirmacao])

  // Sincroniza cenário derivado quando vara é fracionada.
  useEffect(() => {
    if (!varaEhFracionada || status !== 'REALIZADA') return
    if (resultadoFracionada === 'sem_acordo') {
      setCenario('FRACIONADA')
    } else if (resultadoFracionada === 'com_acordo') {
      setCenario('TODOS_COMPARECERAM')
    } else {
      setCenario('')
    }
  }, [resultadoFracionada, varaEhFracionada, status])

  // Item F — aviso quando a audiência está atrasada (mais de 7 dias no passado).
  const diasDesdeAudiencia = useMemo(() => {
    if (!audiencia?.data) return 0
    const dataAud = new Date(`${audiencia.data.slice(0, 10)}T12:00:00`)
    const hoje = new Date()
    const ms = hoje.getTime() - dataAud.getTime()
    return Math.floor(ms / (1000 * 60 * 60 * 24))
  }, [audiencia?.data])

  if (!open || !audiencia || typeof document === 'undefined') return null

  const audienciaAtrasada = diasDesdeAudiencia > 7
  const precisaNovaData = status === 'REDESIGNADA' || cenario === 'FRACIONADA'
  const precisaMotivoCancelamento = status === 'CANCELADA' || status === 'ADIADA'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!audiencia) return
    setErro(null)
    const obs = obsPos.trim()
    if (obs.length < 10) {
      setErro('Observações devem ter no mínimo 10 caracteres.')
      return
    }
    if (precisaNovaData && !novaData.trim()) {
      setErro(
        status === 'REDESIGNADA'
          ? 'Informe a nova data da audiência redesignada.'
          : 'Informe a nova data da audiência fracionada (continuação da instrução).',
      )
      return
    }
    if (precisaMotivoCancelamento && !motivoCancelamento.trim()) {
      setErro('Informe o motivo do cancelamento/adiamento.')
      return
    }
    const pendenciasValidas = pendencias.filter((p) => p.tipo.trim())
    if (houvePendencia && pendenciasValidas.length === 0) {
      setErro('Adicione ao menos uma pendência ou marque "Não".')
      return
    }
    if (status === 'REALIZADA' && !cenario.trim()) {
      setErro(
        varaEhFracionada
          ? 'Selecione o resultado da sessão.'
          : 'Selecione o cenário da audiência.',
      )
      return
    }
    if (status === 'REALIZADA' && cenario === 'SO_ADVOGADO' && !cenarioObservacao.trim()) {
      setErro('Informe a justificativa (só o advogado compareceu).')
      return
    }

    setSalvando(true)
    try {
      const body: FinalizarAudienciaPayload = {
        obsPos: obs,
        status,
        escritorioAdversarioId: escritorioAdvId.trim() || null,
      }
      if (status === 'REALIZADA') {
        if (cenario === 'REVELIA') {
          body.autorPresenca = 'PRESENTE'; body.reuPresenca = 'AUSENTE'
        } else if (cenario === 'SO_ADVOGADO') {
          body.autorPresenca = 'AUSENTE'; body.reuPresenca = 'PRESENTE'
        } else {
          body.autorPresenca = 'PRESENTE'; body.reuPresenca = 'PRESENTE'
        }
      }
      if (precisaNovaData) {
        body.novaData = novaData.slice(0, 10)
        body.novaHora = novaHora.trim() || null
      }
      if (precisaMotivoCancelamento) {
        body.motivoCancelamento = motivoCancelamento
      }
      if (status === 'REALIZADA') {
        body.cenario = cenario.trim()
        body.cenarioObservacao = cenarioObservacao.trim() || null
        body.houvePendencia = houvePendencia
        if (houvePendencia) {
          const hoje = new Date().toISOString().slice(0, 10)
          body.pendencias = pendenciasValidas.map((p) => {
            const dias = Number.parseInt(p.diasUteis, 10)
            const dataLimite =
              p.dataLimite.trim() ||
              (Number.isFinite(dias) && dias > 0
                ? addBusinessDays(hoje, dias)
                : '')
            return {
              tipo: p.tipo.trim(),
              dataLimite,
              responsavel: p.responsavel?.trim() || 'ADV',
              observacao: p.observacao?.trim() || null,
            }
          })
        }
      }
      await finalizarAudiencia(audiencia.id, body)
      onSuccess()
      onClose()
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return createPortal(
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-[60] bg-black/50"
        onClick={fecharComConfirmacao}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-[61] flex max-h-[min(90vh,42rem)] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-[var(--color-border-default)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Pós-audiência
          </h2>
          <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
            {audiencia.processo?.numero ?? audiencia.processoId}
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3"
        >
          {erro ? (
            <p className="mb-2 text-xs text-[var(--urgencia-vencida-text)]">{erro}</p>
          ) : null}

          {audienciaAtrasada ? (
            <div
              role="alert"
              className="mb-3 rounded border border-amber-400/50 bg-amber-100/40 px-2 py-1.5 text-[11px] leading-snug text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
            >
              <strong>Atenção:</strong> esta audiência ocorreu há {diasDesdeAudiencia} dias.
              Confira a data antes de finalizar — registros muito antigos podem indicar audiência esquecida.
            </div>
          ) : null}

          <label className="mb-3 block text-xs text-[var(--color-text-secondary)]">
            Status da audiência *
            <select
              disabled={readOnly || salvando}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                if (e.target.value !== 'REALIZADA') {
                  setCenario('')
                  setHouvePendencia(false)
                }
              }}
              className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            >
              {STATUS_OPCOES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>

          {precisaMotivoCancelamento ? (
            <div className="mb-3 space-y-1">
              <label className="block text-xs text-[var(--color-text-secondary)]">
                Motivo do {status === 'CANCELADA' ? 'cancelamento' : 'adiamento'} *
                <select
                  required
                  disabled={readOnly || salvando}
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
                >
                  {MOTIVOS_CANCELAMENTO.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>
              <p className="text-[11px] text-[var(--color-text-tertiary)]">
                Para encerrar o processo por desistência do cliente, use <strong>“Desistir do Processo”</strong> no detalhe do processo — isto aqui apenas remove a audiência da agenda.
              </p>
            </div>
          ) : null}

          {status === 'REALIZADA' && varaEhFracionada ? (
            <fieldset className="mb-3 rounded border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/5 p-3">
              <legend className="px-1 text-xs font-semibold text-[var(--color-brand)]">
                Vara fracionada — resultado da sessão *
              </legend>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--color-text-primary)]">
                  <input
                    type="radio"
                    name="resultado-fracionada"
                    value="sem_acordo"
                    checked={resultadoFracionada === 'sem_acordo'}
                    disabled={readOnly || salvando}
                    onChange={() => setResultadoFracionada('sem_acordo')}
                    className="mt-0.5"
                  />
                  <span className="flex-1">
                    <span className="font-medium">Sem acordo — agendar instrução</span>
                    <span className="block text-[11px] text-[var(--color-text-secondary)]">
                      Cria automaticamente a próxima audiência de instrução na data informada abaixo
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--color-text-primary)]">
                  <input
                    type="radio"
                    name="resultado-fracionada"
                    value="com_acordo"
                    checked={resultadoFracionada === 'com_acordo'}
                    disabled={readOnly || salvando}
                    onChange={() => setResultadoFracionada('com_acordo')}
                    className="mt-0.5"
                  />
                  <span className="flex-1">
                    <span className="font-medium">Com acordo / encerrada</span>
                    <span className="block text-[11px] text-[var(--color-text-secondary)]">
                      Todos compareceram e a sessão foi concluída
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--color-text-primary)]">
                  <input
                    type="radio"
                    name="resultado-fracionada"
                    value="outro"
                    checked={resultadoFracionada === 'outro'}
                    disabled={readOnly || salvando}
                    onChange={() => setResultadoFracionada('outro')}
                    className="mt-0.5"
                  />
                  <span className="flex-1">
                    <span className="font-medium">Outro</span>
                    <span className="block text-[11px] text-[var(--color-text-secondary)]">
                      Revelia, só o advogado, documentação pendente, etc.
                    </span>
                  </span>
                </label>
              </div>
              {resultadoFracionada === 'outro' ? (
                <div className="mt-3 space-y-1.5 border-t border-[var(--color-border-default)] pt-3">
                  {CENARIO_OPCOES.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-start gap-2 text-sm text-[var(--color-text-primary)]"
                    >
                      <input
                        type="radio"
                        name="cenario-aud"
                        value={opt.value}
                        checked={cenario === opt.value}
                        disabled={readOnly || salvando}
                        onChange={() => setCenario(opt.value)}
                        className="mt-0.5"
                      />
                      <span className="flex-1">
                        <span className="font-medium">{opt.label}</span>
                        {opt.descricao ? (
                          <span className="block text-[11px] text-[var(--color-text-secondary)]">
                            {opt.descricao}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                  {cenario === 'SO_ADVOGADO' ? (
                    <label className="mt-3 block text-xs text-[var(--color-text-secondary)]">
                      Justificativa *
                      <textarea
                        required
                        rows={2}
                        disabled={readOnly || salvando}
                        value={cenarioObservacao}
                        onChange={(e) => setCenarioObservacao(e.target.value)}
                        placeholder="Ex.: cliente justificará por motivo médico"
                        className="mt-1 w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm"
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}
            </fieldset>
          ) : null}

          {status === 'REALIZADA' && varaEhMudaSala && !varaEhFracionada ? (
            <div role="alert" className="mb-3 rounded border border-amber-400 bg-amber-100 px-2 py-1.5 text-[11px] leading-snug text-amber-900 dark:border-amber-600/70 dark:bg-amber-900/50 dark:text-amber-100">
              <strong>Atenção — vara muda de sala:</strong> se não houve acordo na conciliação e a instrução continuar hoje, oriente o cliente a aguardar o link da nova sala virtual antes de encerrar a sessão.
            </div>
          ) : null}

          {status === 'REALIZADA' && varaEhCondicional && !varaEhFracionada ? (
            <fieldset className="mb-3 rounded border border-[var(--color-border-default)] p-3">
              <legend className="px-1 text-xs font-medium text-[var(--color-text-primary)]">
                As partes solicitaram AIJ?
              </legend>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="solicitou-aij" checked={solicitouAij === true}
                    disabled={readOnly || salvando}
                    onChange={() => { setSolicitouAij(true); setCenario('FRACIONADA') }} />
                  Sim — agendar instrução em nova data
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="solicitou-aij" checked={solicitouAij === false}
                    disabled={readOnly || salvando}
                    onChange={() => { setSolicitouAij(false); if (cenario === 'FRACIONADA') setCenario('') }} />
                  Não — encerrada nesta sessão
                </label>
              </div>
            </fieldset>
          ) : null}

          {status === 'REALIZADA' && !varaEhFracionada ? (
            <fieldset className="mb-3 rounded border border-[var(--color-border-default)] p-3">
              <legend className="px-1 text-xs font-medium text-[var(--color-text-primary)]">
                Cenário da audiência *
              </legend>
              <div className="space-y-1.5">
                {CENARIO_OPCOES.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-start gap-2 text-sm text-[var(--color-text-primary)]"
                  >
                    <input
                      type="radio"
                      name="cenario-aud"
                      value={opt.value}
                      checked={cenario === opt.value}
                      disabled={readOnly || salvando}
                      onChange={() => setCenario(opt.value)}
                      className="mt-0.5"
                    />
                    <span className="flex-1">
                      <span className="font-medium">{opt.label}</span>
                      {opt.descricao ? (
                        <span className="block text-[11px] text-[var(--color-text-secondary)]">
                          {opt.descricao}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
              {cenario === 'SO_ADVOGADO' ? (
                <label className="mt-3 block text-xs text-[var(--color-text-secondary)]">
                  Justificativa *
                  <textarea
                    required
                    rows={2}
                    disabled={readOnly || salvando}
                    value={cenarioObservacao}
                    onChange={(e) => setCenarioObservacao(e.target.value)}
                    placeholder="Ex.: cliente justificará por motivo médico"
                    className="mt-1 w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm"
                  />
                </label>
              ) : null}
            </fieldset>
          ) : null}


          {precisaNovaData ? (
            <div className="mb-3 grid grid-cols-2 gap-2">
              <label className="text-xs text-[var(--color-text-secondary)]">
                {cenario === 'FRACIONADA'
                  ? (varaEhFracionada ? 'Data da audiência de instrução *' : 'Data da continuação *')
                  : 'Nova data *'}
                <input
                  type="date"
                  required
                  disabled={readOnly || salvando}
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-[var(--color-text-secondary)]">
                {cenario === 'FRACIONADA' ? 'Hora' : 'Nova hora'}
                <input
                  type="time"
                  disabled={readOnly || salvando}
                  value={novaHora}
                  onChange={(e) => setNovaHora(e.target.value)}
                  className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
                />
              </label>
            </div>
          ) : null}

          {!precisaMotivoCancelamento ? (
            <label className="mb-3 block text-xs text-[var(--color-text-secondary)]">
              Escritório adversário
              <select
                disabled={readOnly || salvando}
                value={escritorioAdvId}
                onChange={(e) => setEscritorioAdvId(e.target.value)}
                className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
              >
                <option value="">— Não informado —</option>
                {adversarios.map((a) => (
                  <option key={a.id} value={a.id}>{a.nomeCanonico}</option>
                ))}
              </select>
            </label>
          ) : null}

          {status === 'REALIZADA' ? (
            <fieldset className="mb-3 rounded border border-[var(--color-border-default)] p-3">
              <legend className="px-1 text-xs font-medium text-[var(--color-text-primary)]">
                Houve pendência de documento?
              </legend>
              <div className="mb-2 flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="houvePend"
                    checked={!houvePendencia}
                    disabled={readOnly || salvando}
                    onChange={() => setHouvePendencia(false)}
                  />
                  Não
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="houvePend"
                    checked={houvePendencia}
                    disabled={readOnly || salvando}
                    onChange={() => setHouvePendencia(true)}
                  />
                  Sim
                </label>
              </div>
              {houvePendencia ? (
                <div className="space-y-2">
                  {pendencias.map((p, i) => (
                    <div
                      key={i}
                      className="grid gap-2 rounded bg-[var(--color-bg-subtle)] p-2"
                    >
                      <select
                        required
                        disabled={readOnly || salvando}
                        value={p.tipo}
                        onChange={(e) => {
                          const next = [...pendencias]
                          next[i] = { ...next[i]!, tipo: e.target.value }
                          setPendencias(next)
                        }}
                        className="rounded border border-[var(--color-border-default)] px-2 py-1 text-sm"
                      >
                        <option value="">Tipo…</option>
                        {tipoOpts.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={1}
                          placeholder="Dias úteis"
                          disabled={readOnly || salvando}
                          value={p.diasUteis}
                          onChange={(e) => {
                            const next = [...pendencias]
                            next[i] = { ...next[i]!, diasUteis: e.target.value }
                            setPendencias(next)
                          }}
                          className="rounded border border-[var(--color-border-default)] px-2 py-1 text-sm"
                        />
                        <input
                          type="date"
                          title="Data limite (opcional)"
                          disabled={readOnly || salvando}
                          value={p.dataLimite}
                          onChange={(e) => {
                            const next = [...pendencias]
                            next[i] = { ...next[i]!, dataLimite: e.target.value }
                            setPendencias(next)
                          }}
                          className="rounded border border-[var(--color-border-default)] px-2 py-1 text-sm"
                        />
                      </div>
                      <select
                        disabled={readOnly || salvando}
                        value={p.responsavel ?? 'ADV'}
                        onChange={(e) => {
                          const next = [...pendencias]
                          next[i] = { ...next[i]!, responsavel: e.target.value }
                          setPendencias(next)
                        }}
                        className="rounded border border-[var(--color-border-default)] px-2 py-1 text-sm"
                      >
                        {RESPONSAVEIS_OPCOES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {!readOnly ? (
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() => setPendencias((prev) => [...prev, emptyPendencia()])}
                      className="text-xs font-medium text-[var(--color-brand)]"
                    >
                      + Adicionar pendência
                    </button>
                  ) : null}
                </div>
              ) : null}
            </fieldset>
          ) : null}

          <label className="mb-3 block text-xs text-[var(--color-text-secondary)]">
            Observações da audiência *
            <textarea
              required
              minLength={10}
              rows={3}
              disabled={readOnly || salvando}
              value={obsPos}
              onChange={(e) => setObsPos(e.target.value)}
              placeholder="Relate o que ocorreu na sessão — quem falou, propostas de acordo, próximos passos. Não repita aqui o que já foi informado nos campos acima."
              className="mt-1 w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm"
            />
            <span className="mt-0.5 block text-[10px] text-[var(--color-text-secondary)]">
              {obsPos.trim().length}/10 caracteres
            </span>
          </label>

          <footer className="mt-auto flex gap-2 border-t border-[var(--color-border-default)] pt-3">
            <button
              type="submit"
              disabled={readOnly || salvando}
              className="rounded bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={fecharComConfirmacao}
              className="rounded border border-[var(--color-border-default)] px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          </footer>
        </form>
      </div>
    </>,
    document.body,
  )
}

/** @deprecated Use `PopUpPosAudiencia`. */
export const PosAudienciaDialog = PopUpPosAudiencia
