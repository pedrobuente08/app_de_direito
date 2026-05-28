'use client'

import { useEffect, useState } from 'react'
import { FamiliaTabs } from '@/components/ui/familia-tabs'
import { getEscritorioConfig, salvarEscritorioConfig } from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import { ComarcasSection } from './_components/comarcas-section'
import { UsuariosSection } from './_components/usuarios-section'

const CONFIG_TABS = [
  { id: 'geral', label: 'Geral' },
  { id: 'usuarios', label: 'Usuários' },
  { id: 'comarcas', label: 'Comarcas' },
  { id: 'materias', label: 'Matérias' },
  { id: 'dropdowns', label: 'Dropdowns' },
  { id: 'prazos', label: 'Prazos' },
  { id: 'transicoes', label: 'Transições' },
  { id: 'pendencias', label: 'Pendências' },
  { id: 'varas', label: 'Varas' },
  { id: 'provisao', label: 'Provisão' },
  { id: 'comunica', label: 'Comunica' },
] as const

type ConfigTab = (typeof CONFIG_TABS)[number]['id']

export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<ConfigTab>('geral')
  const [materiasRaw, setMateriasRaw] = useState('')
  const [faseInicial, setFaseInicial] = useState('')
  const [situacaoInicial, setSituacaoInicial] = useState('')
  const [ddSituacao, setDdSituacao] = useState('')
  const [ddSentenca, setDdSentenca] = useState('')
  const [ddFase, setDdFase] = useState('')
  const [transicoesFaseRaw, setTransicoesFaseRaw] = useState('')
  const [prazoAvaliar, setPrazoAvaliar] = useState('7')
  const [prazoElaborar, setPrazoElaborar] = useState('10')
  const [tiposPendenciaRaw, setTiposPendenciaRaw] = useState('')
  const [varasFracionadasRaw, setVarasFracionadasRaw] = useState('')
  const [varasMudaSalaRaw, setVarasMudaSalaRaw] = useState('')
  const [varasUnaCondicionalRaw, setVarasUnaCondicionalRaw] = useState('')
  const [fatoresProvisaoRaw, setFatoresProvisaoRaw] = useState('60\n85\n100')
  const [digestEnabled, setDigestEnabled] = useState(false)
  const [digestEmails, setDigestEmails] = useState('')
  const [digestDias, setDigestDias] = useState('1')
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
        setTiposPendenciaRaw((cfg.tipos_pendencia ?? []).join('\n'))
        setVarasFracionadasRaw((cfg.varas_fracionadas ?? []).join('\n'))
        setVarasMudaSalaRaw((cfg.varas_muda_sala ?? []).join('\n'))
        setVarasUnaCondicionalRaw((cfg.varas_una_condicional ?? []).join('\n'))
        setFatoresProvisaoRaw((cfg.fatores_provisao_pct ?? [60, 85, 100]).join('\n'))
        setDigestEnabled(cfg.comunica_digest?.enabled ?? false)
        setDigestEmails((cfg.comunica_digest?.emails ?? []).join('\n'))
        setDigestDias(String(cfg.comunica_digest?.dias ?? 1))
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
        tipos_pendencia: tiposPendenciaRaw
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        varas_fracionadas: varasFracionadasRaw
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        varas_muda_sala: varasMudaSalaRaw
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        varas_una_condicional: varasUnaCondicionalRaw
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        fatores_provisao_pct: fatoresProvisaoRaw
          .split('\n')
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n) && n > 0),
        comunica_digest: {
          enabled: digestEnabled,
          emails: digestEmails
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          dias: Number(digestDias) || 1,
        },
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

      <FamiliaTabs
        tabs={[...CONFIG_TABS]}
        activeId={aba}
        onChange={(id) => setAba(id as ConfigTab)}
      />

      <form onSubmit={handleSave} className="space-y-4">
        {aba === 'materias' && (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Matérias válidas
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                Uma por linha. A skill alerta quando extrai matéria fora desta lista.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const padrao = [
                  'BOA — SEM NADA',
                  'RUIM — CONTRATO ASSINADO',
                  'MEEIRA',
                  'MEEIRA — RG + SELFIE',
                  'RUIM',
                ]
                setDdSituacao(padrao.join('\n'))
                toast.success('Sugestão de situação (qualidade) aplicada no formulário — salve para gravar.')
              }}
              className="text-xs text-[var(--color-brand)] hover:underline"
            >
              Aplicar vocabulário sugerido (situação)
            </button>
          </div>
          <textarea
            rows={6}
            value={materiasRaw}
            onChange={(e) => setMateriasRaw(e.target.value)}
            placeholder={'NEGATIVAÇÃO\nCONTA CANCELADA\nEMBASA'}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 font-mono text-sm focus:border-[var(--color-brand)] focus:outline-none"
          />
        </section>
        )}

        {aba === 'dropdowns' && (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Dropdowns — Intimações
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Uma opção por linha. Situação = qualidade do processo na grade Intimações; Sentença = valores extras para resultado; Fase atual = chave UPPER_SNAKE_CASE (ex.: AGUARDANDO_AUDIENCIA).
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
                placeholder={'AGUARDANDO_AUDIENCIA\nAGUARDANDO_SENTENCA\nEM_RECURSO'}
                className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 font-mono text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
            </label>
          </div>
        </section>
        )}

        {aba === 'prazos' && (
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
        )}

        {aba === 'transicoes' && (
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
            placeholder={`{\n  "AGUARDANDO_AUDIENCIA": ["AGUARDANDO_SENTENCA", "EM_RECURSO"],\n  "AGUARDANDO_SENTENCA": ["AGUARDANDO_TRANSITO", "EM_RECURSO"]\n}`}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 font-mono text-sm focus:border-[var(--color-brand)] focus:outline-none"
          />
        </section>
        )}

        {aba === 'pendencias' && (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <h2 className="mb-2 text-sm font-semibold">Tipos de pendência (manual)</h2>
          <p className="mb-2 text-xs text-[var(--color-text-secondary)]">
            Uma por linha — sugeridos ao criar pendência em Intimações.
          </p>
          <textarea
            rows={5}
            value={tiposPendenciaRaw}
            onChange={(e) => setTiposPendenciaRaw(e.target.value)}
            placeholder={'MANIFESTAR\nJUNTAR DOCUMENTOS\nVERIFICAR SENTENÇA'}
            className="w-full rounded border px-2 py-1.5 font-mono text-sm"
          />
        </section>
        )}

        {aba === 'varas' && (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">
            Modalidade das varas
          </h2>
          <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
            Liste abaixo as varas que operam em modalidade <strong>FRACIONADA</strong> (conciliação e instrução em sessões separadas). Uma vara por linha. As demais são tratadas como <strong>UNA</strong>.<br />
            No pós-audiência, quando a vara do processo estiver nesta lista e não houver acordo, o sistema pré-seleciona automaticamente o cenário "Fracionada" e solicita apenas a data da próxima sessão de instrução.
          </p>
          <textarea
            rows={8}
            value={varasFracionadasRaw}
            onChange={(e) => setVarasFracionadasRaw(e.target.value)}
            placeholder={'1ª VARA CÍVEL DE SALVADOR\n2ª VARA DO JUIZADO ESPECIAL\n3ª VARA DE FAMÍLIA'}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 font-mono text-sm focus:border-[var(--color-brand)] focus:outline-none"
          />
          <p className="mt-1.5 text-[11px] text-[var(--color-text-tertiary)]">
            Comparação sem diferenciar maiúsculas/minúsculas. Use o nome exato como aparece no campo "Vara" das Intimações.
          </p>

          <div className="mt-4 border-t border-[var(--color-border-default)] pt-4">
            <h3 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">
              Varas que mudam de sala virtual (muda sala)
            </h3>
            <p className="mb-2 text-xs text-[var(--color-text-secondary)]">
              Varas UNA onde o cliente precisa trocar de sala virtual durante a instrução. Uma vara por linha. O sistema exibirá um alerta no card e no pós-audiência para orientar o cliente a aguardar o link da nova sala.
            </p>
            <textarea
              rows={5}
              value={varasMudaSalaRaw}
              onChange={(e) => setVarasMudaSalaRaw(e.target.value)}
              placeholder={'1ª VARA CÍVEL DE SALVADOR\n2ª VARA DO JUIZADO ESPECIAL'}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 font-mono text-sm focus:border-[var(--color-brand)] focus:outline-none"
            />
          </div>

          <div className="mt-4 border-t border-[var(--color-border-default)] pt-4">
            <h3 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">
              Varas UNA condicional (viram FRACIONADA se ambas as partes pedirem AIJ)
            </h3>
            <p className="mb-2 text-xs text-[var(--color-text-secondary)]">
              Varas normalmente UNA que se tornam FRACIONADAS se ambas as partes solicitarem AIJ (Audiência de Instrução e Julgamento). No pós-audiência, o sistema perguntará "As partes solicitaram AIJ?" e criará a audiência de instrução automaticamente se a resposta for sim.
            </p>
            <textarea
              rows={5}
              value={varasUnaCondicionalRaw}
              onChange={(e) => setVarasUnaCondicionalRaw(e.target.value)}
              placeholder={'3ª VARA DE FAMÍLIA\n4ª VARA CÍVEL'}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 font-mono text-sm focus:border-[var(--color-brand)] focus:outline-none"
            />
          </div>
        </section>
        )}

        {aba === 'provisao' && (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <h2 className="mb-2 text-sm font-semibold">Fatores de provisão (%)</h2>
          <textarea
            rows={3}
            value={fatoresProvisaoRaw}
            onChange={(e) => setFatoresProvisaoRaw(e.target.value)}
            className="w-full rounded border px-2 py-1.5 font-mono text-sm"
          />
        </section>
        )}

        {aba === 'comunica' && (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <h2 className="mb-2 text-sm font-semibold">Comunica — digest por e-mail</h2>
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={digestEnabled}
              onChange={(e) => setDigestEnabled(e.target.checked)}
            />
            Ativar resumo diário
          </label>
          <textarea
            rows={2}
            value={digestEmails}
            onChange={(e) => setDigestEmails(e.target.value)}
            placeholder="email@escritorio.com"
            className="mb-2 w-full rounded border px-2 py-1.5 text-sm"
          />
          <label className="text-xs text-[var(--color-text-secondary)]">
            Janela (dias)
            <input
              type="number"
              min={1}
              value={digestDias}
              onChange={(e) => setDigestDias(e.target.value)}
              className="ml-2 w-16 rounded border px-2 py-1 text-sm"
            />
          </label>
        </section>
        )}

        {aba === 'geral' && (
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
                placeholder="AGUARDANDO_AUDIENCIA"
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
        )}

        {aba === 'comarcas' && <ComarcasSection toast={toast} />}

        {aba === 'usuarios' && <UsuariosSection toast={toast} />}

        {aba !== 'usuarios' && aba !== 'comarcas' && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
            >
              {saving ? 'Salvando…' : 'Salvar configurações'}
            </button>
          </div>
        )}
      </form>

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
