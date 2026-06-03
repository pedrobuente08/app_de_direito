'use client'

import type { EscritorioAddonsConfig } from '@/lib/types'

const ADDON_KEYS: (keyof EscritorioAddonsConfig)[] = [
  'recursos_avancados',
  'workflows_raros',
  'captacao',
  'execucao_avancada',
  'justica_comum_pje',
]

const ADDON_DESCRICOES: Record<keyof EscritorioAddonsConfig, string> = {
  recursos_avancados: 'Embargos de declaração e decisões interlocutórias',
  workflows_raros: 'Tutela, autor falecido, sobrestamento e desistência formal',
  captacao: 'Parceiros, comissões e cores na grade',
  execucao_avancada: 'Astreintes, SISBAJUD e penhoras detalhadas',
  justica_comum_pje: 'Fluxos PJE completos (Justiça Comum)',
}

type Props = {
  addons: EscritorioAddonsConfig
  onChange: (addons: EscritorioAddonsConfig) => void
}

export function AddonsProSection({ addons, onChange }: Props) {
  function toggle(key: keyof EscritorioAddonsConfig) {
    onChange({ ...addons, [key]: !addons[key] })
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Add-ons PRO
        </h2>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
          Ative módulos contratados. Rotas e telas ficam ocultas quando desligados.
        </p>
      </div>
      <ul className="space-y-3">
        {ADDON_KEYS.map((key) => (
          <li
            key={key}
            className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-3 py-2.5"
          >
            <input
              id={`addon-${key}`}
              type="checkbox"
              checked={addons[key] === true}
              onChange={() => toggle(key)}
              className="mt-0.5 h-4 w-4 rounded"
            />
            <label htmlFor={`addon-${key}`} className="flex-1 cursor-pointer">
              <span className="block text-sm font-medium text-[var(--color-text-primary)]">
                {key.replace(/_/g, ' ')}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--color-text-secondary)]">
                {ADDON_DESCRICOES[key]}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
