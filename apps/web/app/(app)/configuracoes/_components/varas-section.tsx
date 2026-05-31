'use client'

import { useState } from 'react'
import type { VaraConfig } from '@/lib/types'

type Props = {
  varas: Record<string, VaraConfig>
  onChange: (v: Record<string, VaraConfig>) => void
}

export function VarasSection({ varas, onChange }: Props) {
  const [novaVara, setNovaVara] = useState('')
  const [novoTipo, setNovoTipo] = useState<'una' | 'fracionada'>('una')
  const [novaMudaSala, setNovaMudaSala] = useState(false)
  const [novaUnaCondicional, setNovaUnaCondicional] = useState(false)

  function add() {
    const nome = novaVara.trim().toUpperCase()
    if (!nome) return
    onChange({
      ...varas,
      [nome]: {
        tipo: novoTipo,
        ...(novaMudaSala ? { muda_sala: true } : {}),
        ...(novaUnaCondicional ? { una_condicional: true } : {}),
      },
    })
    setNovaVara('')
    setNovoTipo('una')
    setNovaMudaSala(false)
    setNovaUnaCondicional(false)
  }

  function remove(nome: string) {
    const next = { ...varas }
    delete next[nome]
    onChange(next)
  }

  function setTipo(nome: string, tipo: 'una' | 'fracionada') {
    const next = { ...varas[nome], tipo }
    if (tipo === 'fracionada') {
      delete next.muda_sala
      delete next.una_condicional
    }
    onChange({ ...varas, [nome]: next })
  }

  function toggle(nome: string, field: 'muda_sala' | 'una_condicional') {
    const cur = varas[nome]
    const updated = { ...cur }
    if (updated[field]) {
      delete updated[field]
    } else {
      updated[field] = true
    }
    onChange({ ...varas, [nome]: updated })
  }

  const entries = Object.entries(varas).sort(([a], [b]) =>
    a.localeCompare(b, 'pt-BR'),
  )

  return (
    <section className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Varas
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Mapeie cada vara para UNA ou FRACIONADA. Quando um processo é inserido
          com uma vara já mapeada, o tipo é preenchido automaticamente. Varas não
          mapeadas ficam em branco até o usuário preencher.
        </p>
      </div>

      {entries.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] text-left text-[var(--color-text-secondary)]">
                <th className="pb-1.5 pr-3 font-medium">Vara</th>
                <th className="pb-1.5 pr-3 font-medium">Tipo</th>
                <th className="pb-1.5 pr-3 text-center font-medium">Muda sala</th>
                <th className="pb-1.5 pr-3 text-center font-medium">UNA condicional</th>
                <th className="pb-1.5" />
              </tr>
            </thead>
            <tbody>
              {entries.map(([nome, cfg]) => (
                <tr
                  key={nome}
                  className="border-b border-[var(--color-border-default)] last:border-0"
                >
                  <td className="py-2 pr-3 font-mono font-medium text-[var(--color-text-primary)]">
                    {nome}
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      value={cfg.tipo}
                      onChange={(e) =>
                        setTipo(nome, e.target.value as 'una' | 'fracionada')
                      }
                      className="rounded border border-[var(--color-border-default)] px-1.5 py-0.5 text-xs"
                    >
                      <option value="una">UNA</option>
                      <option value="fracionada">FRACIONADA</option>
                    </select>
                  </td>
                  <td className="py-2 pr-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!cfg.muda_sala}
                      disabled={cfg.tipo === 'fracionada'}
                      onChange={() => toggle(nome, 'muda_sala')}
                      title="Cliente troca de sala virtual durante a instrução"
                    />
                  </td>
                  <td className="py-2 pr-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!cfg.una_condicional}
                      disabled={cfg.tipo === 'fracionada'}
                      onChange={() => toggle(nome, 'una_condicional')}
                      title="Vira FRACIONADA se ambas as partes pedirem AIJ"
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => remove(nome)}
                      className="text-[var(--color-text-tertiary)] hover:text-[var(--urgencia-vencida-text)]"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-tertiary)]">
          Nenhuma vara cadastrada. Adicione abaixo.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-[var(--color-border-default)] pt-3">
        <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
          Nome da vara
          <input
            value={novaVara}
            onChange={(e) => setNovaVara(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
            placeholder="1ª VARA CÍVEL DE SALVADOR"
            className="w-64 rounded border border-[var(--color-border-default)] px-2 py-1 text-xs font-mono uppercase focus:border-[var(--color-brand)] focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
          Tipo
          <select
            value={novoTipo}
            onChange={(e) => setNovoTipo(e.target.value as 'una' | 'fracionada')}
            className="rounded border border-[var(--color-border-default)] px-2 py-1 text-xs"
          >
            <option value="una">UNA</option>
            <option value="fracionada">FRACIONADA</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
          <input
            type="checkbox"
            checked={novaMudaSala}
            disabled={novoTipo === 'fracionada'}
            onChange={(e) => setNovaMudaSala(e.target.checked)}
          />
          Muda sala
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
          <input
            type="checkbox"
            checked={novaUnaCondicional}
            disabled={novoTipo === 'fracionada'}
            onChange={(e) => setNovaUnaCondicional(e.target.checked)}
          />
          UNA condicional
        </label>
        <button
          type="button"
          onClick={add}
          disabled={!novaVara.trim()}
          className="rounded bg-[var(--color-brand)] px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
        >
          Adicionar
        </button>
      </div>

      <p className="text-[11px] text-[var(--color-text-tertiary)]">
        <strong>Muda sala</strong> — varas UNA onde o cliente troca de sala virtual durante a instrução.
        &nbsp;|&nbsp;
        <strong>UNA condicional</strong> — varas normalmente UNA que viram FRACIONADAS se ambas as partes solicitarem AIJ.
      </p>
    </section>
  )
}
