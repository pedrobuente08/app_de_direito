'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  criarParceiro,
  criarParceiroMateria,
  atualizarParceiro,
  deletarParceiro,
  deletarParceiroMateria,
  getParceiroMaterias,
  getParceiros,
} from '@/lib/api'
import type { Parceiro, ParceiroMateria } from '@/lib/types'

type Props = {
  toast: { success: (m: string) => void; error: (m: string) => void }
}

export function ParceirosSection({ toast }: Props) {
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [materias, setMaterias] = useState<ParceiroMateria[]>([])
  const [loading, setLoading] = useState(true)

  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<'PF' | 'ESCRITORIO'>('PF')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [comissao, setComissao] = useState('')
  const [corHex, setCorHex] = useState('#3B82F6')

  const [mapParceiroId, setMapParceiroId] = useState('')
  const [mapMateria, setMapMateria] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, m] = await Promise.all([getParceiros(), getParceiroMaterias()])
      setParceiros(p)
      setMaterias(m)
      if (!mapParceiroId && p[0]) setMapParceiroId(p[0].id)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCriarParceiro(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    try {
      await criarParceiro({
        nome: nome.trim(),
        tipo,
        cpfCnpj: cpfCnpj.trim() || undefined,
        comissaoPercentual: comissao.trim() || undefined,
        corHex: corHex || undefined,
      })
      toast.success('Parceiro criado.')
      setNome('')
      setCpfCnpj('')
      setComissao('')
      void load()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleMapMateria(e: React.FormEvent) {
    e.preventDefault()
    if (!mapParceiroId || !mapMateria.trim()) return
    try {
      await criarParceiroMateria({
        parceiroId: mapParceiroId,
        materia: mapMateria.trim(),
      })
      toast.success('Mapeamento salvo.')
      setMapMateria('')
      void load()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <section className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Parceiros (captação PRO)
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Cadastre captadores com comissão e cor na grid. Mapeie matérias para preenchimento
          automático na importação.
        </p>
      </div>

      <form
        onSubmit={handleCriarParceiro}
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
      >
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome *"
          className="rounded border px-2 py-1.5 text-sm"
        />
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as 'PF' | 'ESCRITORIO')}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="PF">Pessoa física</option>
          <option value="ESCRITORIO">Escritório</option>
        </select>
        <input
          value={cpfCnpj}
          onChange={(e) => setCpfCnpj(e.target.value)}
          placeholder="CPF/CNPJ"
          className="rounded border px-2 py-1.5 text-sm"
        />
        <input
          value={comissao}
          onChange={(e) => setComissao(e.target.value)}
          placeholder="Comissão % (ex: 30)"
          className="rounded border px-2 py-1.5 text-sm"
        />
        <label className="flex items-center gap-2 text-xs">
          Cor
          <input
            type="color"
            value={corHex}
            onChange={(e) => setCorHex(e.target.value)}
            className="h-8 w-12 cursor-pointer rounded border"
          />
          <span className="font-mono">{corHex}</span>
        </label>
        <button
          type="submit"
          className="rounded bg-[var(--color-brand)] px-3 py-1.5 text-sm font-medium text-white sm:col-span-2 lg:col-span-1"
        >
          Adicionar parceiro
        </button>
      </form>

      {loading ? (
        <p className="text-xs text-[var(--color-text-secondary)]">Carregando…</p>
      ) : parceiros.length === 0 ? (
        <p className="text-xs text-[var(--color-text-secondary)]">Nenhum parceiro cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-[var(--color-text-secondary)]">
                <th className="pb-1.5 pr-3">Nome</th>
                <th className="pb-1.5 pr-3">Tipo</th>
                <th className="pb-1.5 pr-3">Comissão</th>
                <th className="pb-1.5 pr-3">Cor</th>
                <th className="pb-1.5 pr-3">Ativo</th>
                <th className="pb-1.5" />
              </tr>
            </thead>
            <tbody>
              {parceiros.map((p) => (
                <tr key={p.id} className="border-b border-[var(--color-border-default)]">
                  <td className="py-2 pr-3 font-medium">{p.nome}</td>
                  <td className="py-2 pr-3">{p.tipo}</td>
                  <td className="py-2 pr-3">
                    {p.comissaoPercentual ? `${p.comissaoPercentual}%` : '—'}
                  </td>
                  <td className="py-2 pr-3">
                    {p.corHex ? (
                      <span
                        className="inline-block h-4 w-4 rounded border"
                        style={{ backgroundColor: p.corHex }}
                        title={p.corHex}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2 pr-3">{p.ativo ? 'Sim' : 'Não'}</td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      className="text-[var(--color-brand)] hover:underline"
                      onClick={async () => {
                        try {
                          await atualizarParceiro(p.id, { ativo: !p.ativo })
                          void load()
                        } catch (e) {
                          toast.error((e as Error).message)
                        }
                      }}
                    >
                      {p.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      className="ml-2 text-red-600 hover:underline"
                      onClick={async () => {
                        if (!window.confirm(`Excluir parceiro ${p.nome}?`)) return
                        try {
                          await deletarParceiro(p.id)
                          toast.success('Parceiro removido.')
                          void load()
                        } catch (e) {
                          toast.error((e as Error).message)
                        }
                      }}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-[var(--color-border-default)] pt-4">
        <h3 className="mb-2 text-sm font-semibold">Mapeamento matéria → parceiro</h3>
        <form onSubmit={handleMapMateria} className="flex flex-wrap gap-2">
          <select
            value={mapParceiroId}
            onChange={(e) => setMapParceiroId(e.target.value)}
            className="min-w-[10rem] rounded border px-2 py-1.5 text-sm"
          >
            <option value="">Parceiro…</option>
            {parceiros.filter((p) => p.ativo).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <input
            required
            value={mapMateria}
            onChange={(e) => setMapMateria(e.target.value)}
            placeholder="Nome da matéria (ex: INSS)"
            className="min-w-[12rem] flex-1 rounded border px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded border border-[var(--color-border-default)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg-hover)]"
          >
            Mapear
          </button>
        </form>
        {materias.length > 0 ? (
          <ul className="mt-3 space-y-1 text-xs">
            {materias.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded bg-[var(--color-bg-subtle)] px-2 py-1"
              >
                <span>
                  <strong>{m.materia}</strong>
                  {' → '}
                  {m.parceiroNome ??
                    parceiros.find((p) => p.id === m.parceiroId)?.nome ??
                    m.parceiroId.slice(0, 8)}
                </span>
                <button
                  type="button"
                  className="text-red-600 hover:underline"
                  onClick={async () => {
                    try {
                      await deletarParceiroMateria(m.id)
                      void load()
                    } catch (e) {
                      toast.error((e as Error).message)
                    }
                  }}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}
