'use client'

import { useState } from 'react'
import type { ComunicaRegra } from '@/lib/types'
import { FASE_OPCOES_CANONICAS, faseLabel } from '@/lib/fase-label'

const TIPOS_SUGERIDOS = [
  'INTIMAÇÃO',
  'CITAÇÃO',
  'DESPACHO',
  'DECISÃO',
  'SENTENÇA',
  'PAUTA DE AUDIÊNCIA',
  'ATO ORDINATÓRIO',
  'CERTIDÃO',
  'JUNTADA',
  'MANDADO',
]

type Props = {
  regras: Record<string, ComunicaRegra>
  tiposPendencia: string[]
  onChange: (regras: Record<string, ComunicaRegra>) => void
}

type FormState = {
  tipo: string
  criarPendencia: boolean
  tipoPendencia: string
  prazoDias: string
  sincAudiencia: boolean
  audienciaTipo: string
  avancarFase: string
}

const FORM_VAZIO: FormState = {
  tipo: '',
  criarPendencia: false,
  tipoPendencia: '',
  prazoDias: '',
  sincAudiencia: false,
  audienciaTipo: '',
  avancarFase: '',
}

function regraParaForm(tipo: string, r: ComunicaRegra): FormState {
  return {
    tipo,
    criarPendencia: r.criar_pendencia ?? false,
    tipoPendencia: r.tipo_pendencia ?? '',
    prazoDias: r.prazo_dias != null ? String(r.prazo_dias) : '',
    sincAudiencia: r.sincronizar_audiencia ?? false,
    audienciaTipo: r.audiencia_tipo ?? '',
    avancarFase: r.avancar_fase ?? '',
  }
}

export function RegrasComunicaSection({ regras, tiposPendencia, onChange }: Props) {
  const [form, setForm] = useState<FormState>(FORM_VAZIO)
  const [editandoTipo, setEditandoTipo] = useState<string | null>(null)
  const [aberto, setAberto] = useState(false)

  const tipos = Object.keys(regras).sort()

  function abrirAdicionar() {
    setForm(FORM_VAZIO)
    setEditandoTipo(null)
    setAberto(true)
  }

  function abrirEditar(tipo: string) {
    setForm(regraParaForm(tipo, regras[tipo]!))
    setEditandoTipo(tipo)
    setAberto(true)
  }

  function cancelar() {
    setAberto(false)
    setEditandoTipo(null)
    setForm(FORM_VAZIO)
  }

  function salvar() {
    const tipoKey = form.tipo.trim().toUpperCase()
    if (!tipoKey) return
    if (!form.criarPendencia && !form.sincAudiencia) return

    const regra: ComunicaRegra = {}
    if (form.criarPendencia && form.tipoPendencia.trim()) {
      regra.criar_pendencia = true
      regra.tipo_pendencia = form.tipoPendencia.trim()
      const dias = Number(form.prazoDias)
      if (dias > 0) regra.prazo_dias = dias
    }
    if (form.sincAudiencia) {
      regra.sincronizar_audiencia = true
      if (form.audienciaTipo.trim()) regra.audiencia_tipo = form.audienciaTipo.trim()
    }
    if (form.avancarFase.trim()) {
      regra.avancar_fase = form.avancarFase.trim()
    }

    const novas = { ...regras }
    if (editandoTipo && editandoTipo !== tipoKey) {
      delete novas[editandoTipo]
    }
    novas[tipoKey] = regra
    onChange(novas)
    cancelar()
  }

  function remover(tipo: string) {
    const novas = { ...regras }
    delete novas[tipo]
    onChange(novas)
  }

  function acaoLabel(r: ComunicaRegra): string {
    const partes: string[] = []
    if (r.criar_pendencia && r.tipo_pendencia) {
      const prazo = r.prazo_dias ? ` · ${r.prazo_dias}d` : ''
      partes.push(`Pendência → ${r.tipo_pendencia}${prazo}`)
    }
    if (r.sincronizar_audiencia) {
      partes.push(`Audiência${r.audiencia_tipo ? ` → ${r.audiencia_tipo}` : ''}`)
    }
    if (r.avancar_fase) {
      partes.push(`Fase → ${faseLabel(r.avancar_fase)}`)
    }
    return partes.join('  +  ') || '—'
  }

  const temAcao = form.criarPendencia || form.sincAudiencia || form.avancarFase.trim() !== ''
  const formValido =
    form.tipo.trim() !== '' &&
    temAcao &&
    (!form.criarPendencia || form.tipoPendencia.trim() !== '')

  return (
    <div className="mt-4 border-t border-[var(--color-border-default)] pt-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Regras de automação
          </h3>
          <p className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">
            Ação automática quando chega uma publicação do tipo configurado.
            Data e hora de audiência são extraídas do texto da publicação.
          </p>
        </div>
        {!aberto && (
          <button
            type="button"
            onClick={abrirAdicionar}
            className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
          >
            + Nova regra
          </button>
        )}
      </div>

      {/* Tabela de regras existentes */}
      {tipos.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-default)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)]">
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  Tipo de publicação
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  Ações automáticas
                </th>
                <th className="w-16 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {tipos.map((tipo, i) => (
                <tr
                  key={tipo}
                  className={
                    i < tipos.length - 1
                      ? 'border-b border-[var(--color-border-default)]'
                      : ''
                  }
                >
                  <td className="px-3 py-2.5 font-mono text-xs font-medium text-[var(--color-text-primary)]">
                    {tipo}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--color-text-secondary)]">
                    {acaoLabel(regras[tipo]!)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => abrirEditar(tipo)}
                        className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                        title="Editar"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => remover(tipo)}
                        className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-red-50 hover:text-red-600"
                        title="Remover"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tipos.length === 0 && !aberto && (
        <p className="mb-3 text-xs text-[var(--color-text-tertiary)]">
          Nenhuma regra configurada. Clique em &quot;+ Nova regra&quot; para adicionar.
        </p>
      )}

      {/* Formulário inline */}
      {aberto && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-4">
          <p className="mb-3 text-xs font-semibold text-[var(--color-text-primary)]">
            {editandoTipo ? `Editar regra — ${editandoTipo}` : 'Nova regra'}
          </p>

          {/* Tipo de publicação */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
              Tipo de publicação <span className="text-red-500">*</span>
            </label>
            <input
              list="tipos-sugeridos"
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value.toUpperCase() }))}
              placeholder="Ex: INTIMAÇÃO"
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 font-mono text-sm uppercase focus:border-[var(--color-brand)] focus:outline-none"
            />
            <datalist id="tipos-sugeridos">
              {TIPOS_SUGERIDOS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
              Deve coincidir exatamente com o campo &quot;tipo&quot; que chega na publicação do DJEN/Comunica.
            </p>
          </div>

          {/* Criar pendência */}
          <div className="mb-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.criarPendencia}
                onChange={(e) => setForm((f) => ({ ...f, criarPendencia: e.target.checked }))}
                className="h-4 w-4 rounded"
              />
              <span className="font-medium text-[var(--color-text-primary)]">Criar pendência</span>
            </label>

            {form.criarPendencia && (
              <div className="mt-2 ml-6 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  {tiposPendencia.length > 0 ? (
                    <select
                      value={form.tipoPendencia}
                      onChange={(e) => setForm((f) => ({ ...f, tipoPendencia: e.target.value }))}
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
                    >
                      <option value="">Selecionar…</option>
                      {tiposPendencia.map((tp) => (
                        <option key={tp} value={tp}>{tp}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={form.tipoPendencia}
                      onChange={(e) => setForm((f) => ({ ...f, tipoPendencia: e.target.value }))}
                      placeholder="MANIFESTAR"
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                    Prazo (dias)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.prazoDias}
                    onChange={(e) => setForm((f) => ({ ...f, prazoDias: e.target.value }))}
                    placeholder="5"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Avançar fase */}
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-primary)]">
              Avançar fase do processo
            </label>
            <select
              value={form.avancarFase}
              onChange={(e) => setForm((f) => ({ ...f, avancarFase: e.target.value }))}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
            >
              <option value="">— Não alterar —</option>
              {FASE_OPCOES_CANONICAS.map((f) => (
                <option key={f} value={f}>{faseLabel(f)}</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
              Quando configurado, a fase do processo é atualizada automaticamente ao receber este tipo de publicação.
            </p>
          </div>

          {/* Sincronizar audiência */}
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.sincAudiencia}
                onChange={(e) => setForm((f) => ({ ...f, sincAudiencia: e.target.checked }))}
                className="h-4 w-4 rounded"
              />
              <span className="font-medium text-[var(--color-text-primary)]">Criar audiência</span>
            </label>

            {form.sincAudiencia && (
              <div className="mt-2 ml-6">
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                    Tipo da audiência (opcional)
                  </label>
                  <input
                    value={form.audienciaTipo}
                    onChange={(e) => setForm((f) => ({ ...f, audienciaTipo: e.target.value }))}
                    placeholder="AUDIÊNCIA DE INSTRUÇÃO"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-[var(--color-text-tertiary)]">
                  Data e hora são extraídas automaticamente do texto da publicação.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={salvar}
              disabled={!formValido}
              className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-4 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-40"
            >
              {editandoTipo ? 'Salvar alterações' : 'Adicionar regra'}
            </button>
            <button
              type="button"
              onClick={cancelar}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-4 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
