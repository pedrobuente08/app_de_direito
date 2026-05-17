'use client'

import { useEffect, useState } from 'react'
import { getEscritorioConfig, salvarEscritorioConfig } from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'

export default function ConfiguracoesPage() {
  const [materiasRaw, setMateriasRaw] = useState('')
  const [faseInicial, setFaseInicial] = useState('')
  const [situacaoInicial, setSituacaoInicial] = useState('')
  const [ddSituacao, setDdSituacao] = useState('')
  const [ddSentenca, setDdSentenca] = useState('')
  const [ddFase, setDdFase] = useState('')
  const [transicoesFaseRaw, setTransicoesFaseRaw] = useState('')
  const [prazoAvaliar, setPrazoAvaliar] = useState('7')
  const [prazoElaborar, setPrazoElaborar] = useState('10')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    async function load() {
      try {
        const cfg = await getEscritorioConfig()
        setMateriasRaw((cfg.materias_validas ?? []).join('\n'))
        setFaseInicial(cfg.fase_inicial ?? '')
        setSituacaoInicial(cfg.situacao_inicial ?? '')
        setDdSituacao((cfg.dropdowns_processo?.situacao ?? []).join('\n'))
        setDdSentenca((cfg.dropdowns_processo?.sentenca ?? []).join('\n'))
        setDdFase((cfg.dropdowns_processo?.fase_atual ?? []).join('\n'))
        setTransicoesFaseRaw(
          cfg.transicoes_fase && Object.keys(cfg.transicoes_fase).length > 0
            ? JSON.stringify(cfg.transicoes_fase, null, 2)
            : '',
        )
        setPrazoAvaliar(String(cfg.prazo_avaliacao_recurso_dias ?? 7))
        setPrazoElaborar(String(cfg.prazo_elaborar_recurso_dias ?? 10))
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      let transicoes_fase: Record<string, string[]> | undefined
      const tfTrim = transicoesFaseRaw.trim()
      if (tfTrim) {
        const parsed = JSON.parse(tfTrim) as unknown
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          throw new Error('Transições de fase: informe um objeto JSON válido.')
        }
        transicoes_fase = {}
        for (const [de, destinos] of Object.entries(parsed)) {
          if (!Array.isArray(destinos) || !destinos.every((d) => typeof d === 'string')) {
            throw new Error(
              `Transições de fase: "${de}" deve ser uma lista de strings (fases destino).`,
            )
          }
          transicoes_fase[de] = destinos.map((d) => d.trim()).filter(Boolean)
        }
      }

      await salvarEscritorioConfig({
        materias_validas: materiasRaw
          .split('\n')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
        fase_inicial: faseInicial,
        situacao_inicial: situacaoInicial,
        dropdowns_processo: {
          situacao: ddSituacao
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          sentenca: ddSentenca
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          fase_atual: ddFase
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        ...(transicoes_fase !== undefined ? { transicoes_fase } : {}),
        prazo_avaliacao_recurso_dias: Number(prazoAvaliar) || 7,
        prazo_elaborar_recurso_dias: Number(prazoElaborar) || 10,
      })
      toast.success('Configurações salvas.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded bg-[var(--color-bg-subtle)]" />
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

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Configurações do escritório
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Matérias, dropdowns e padrões da skill. Comarcas e aliases de login vêm dos cadastros Comarcas e Usuários.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Matérias válidas
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Uma por linha. A skill alerta quando extrai uma matéria fora desta lista.
            </p>
          </div>
          <textarea
            rows={6}
            value={materiasRaw}
            onChange={(e) => setMateriasRaw(e.target.value)}
            placeholder={'NEGATIVAÇÃO\nCONTA CANCELADA\nEMBASA'}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 font-mono text-sm focus:border-[var(--color-brand)] focus:outline-none"
          />
        </section>

        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Dropdowns — Intimações
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Uma opção por linha. Situação = qualidade do processo na grade Intimações; Sentença = valores extras para resultado; Fase atual = fase do processo.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
              Situação (qualidade do processo)
              <textarea
                rows={6}
                value={ddSituacao}
                onChange={(e) => setDdSituacao(e.target.value)}
                placeholder={'BOA — SEM NADA\nRUIM — CONTRATO ASSINADO\nMEEIRA'}
                className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 font-mono text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
              Sentença (extras na lista)
              <textarea
                rows={6}
                value={ddSentenca}
                onChange={(e) => setDdSentenca(e.target.value)}
                placeholder={'EX.: EXTINTO_SEM_JULGAMENTO_MERITO'}
                className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 font-mono text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
              <span className="text-[10px] leading-snug text-[var(--color-text-tertiary)]">
                A grade Intimações já traz opções padrão (Procedente, Improcedente, Parcial, Acordo…). Use este campo só para mais valores ou siglas do seu escritório.
              </span>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
              Fase atual
              <textarea
                rows={6}
                value={ddFase}
                onChange={(e) => setDdFase(e.target.value)}
                placeholder={'AUDIÊNCIA AGENDADA\nREVELIA DECRETADA'}
                className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 font-mono text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
            </label>
          </div>
        </section>

        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
            Prazos — recurso pós-improcedência
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
              Estado AVALIAR (dias)
              <input
                type="number"
                min={1}
                value={prazoAvaliar}
                onChange={(e) => setPrazoAvaliar(e.target.value)}
                className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
              Elaborar recurso ao RECORRER (dias)
              <input
                type="number"
                min={1}
                value={prazoElaborar}
                onChange={(e) => setPrazoElaborar(e.target.value)}
                className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm"
              />
            </label>
          </div>
        </section>

        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Transições de fase (máquina de estados)
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              JSON: chave = fase atual, valor = array de fases permitidas. Deixe vazio para usar o
              padrão do sistema. Use <code className="font-mono">*</code> como chave para destinos
              genéricos.
            </p>
          </div>
          <textarea
            rows={10}
            value={transicoesFaseRaw}
            onChange={(e) => setTransicoesFaseRaw(e.target.value)}
            placeholder={`{\n  "AGUARDANDO AUDIÊNCIA": ["AGUARDANDO SENTENÇA", "EM RECURSO"],\n  "AGUARDANDO SENTENÇA": ["AGUARDANDO TRÂNSITO", "EM RECURSO"]\n}`}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 font-mono text-sm focus:border-[var(--color-brand)] focus:outline-none"
          />
        </section>

        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
            Valores padrão da skill
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                Fase inicial
              </label>
              <input
                value={faseInicial}
                onChange={(e) => setFaseInicial(e.target.value)}
                placeholder="AUDIÊNCIA AGENDADA"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                Situação inicial
              </label>
              <input
                value={situacaoInicial}
                onChange={(e) => setSituacaoInicial(e.target.value)}
                placeholder="ATIVO"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar configurações'}
          </button>
        </div>
      </form>

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
