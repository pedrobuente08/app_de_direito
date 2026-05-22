'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  criarComarca,
  deletarComarca,
  editarComarca,
  getComarcas,
  seedComarcasPadraoBa,
} from '@/lib/api'
import type { Comarca } from '@/lib/types'

type Props = {
  toast: { success: (m: string) => void; error: (m: string) => void }
}

export function ComarcasSection({ toast }: Props) {
  const [lista, setLista] = useState<Comarca[]>([])
  const [loading, setLoading] = useState(true)
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [abreviado, setAbreviado] = useState('')
  const [perfil, setPerfil] = useState<'DILIGENTE' | 'MENOS_DILIGENTE' | ''>('')
  const [exigeDoc, setExigeDoc] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setLista(await getComarcas())
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    try {
      await criarComarca({
        codigo,
        nome,
        abreviado,
        perfilDiligencia: perfil || undefined,
        exigeDocFrequente: exigeDoc,
      })
      toast.success('Comarca criada.')
      setCodigo('')
      setNome('')
      setAbreviado('')
      void load()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <section className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Comarcas</h2>
        <button
          type="button"
          className="text-xs text-[var(--color-brand)] hover:underline"
          onClick={async () => {
            try {
              await seedComarcasPadraoBa()
              toast.success('Seed BA aplicado.')
              void load()
            } catch (e) {
              toast.error((e as Error).message)
            }
          }}
        >
          Seed padrão BA
        </button>
      </div>

      <form onSubmit={handleCriar} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <input
          required
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Código"
          className="rounded border px-2 py-1.5 text-sm"
        />
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome"
          className="rounded border px-2 py-1.5 text-sm"
        />
        <input
          required
          value={abreviado}
          onChange={(e) => setAbreviado(e.target.value)}
          placeholder="Abreviado"
          className="rounded border px-2 py-1.5 text-sm"
        />
        <select
          value={perfil}
          onChange={(e) =>
            setPerfil(e.target.value as 'DILIGENTE' | 'MENOS_DILIGENTE' | '')
          }
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="">Perfil diligência (opcional)</option>
          <option value="DILIGENTE">Diligente</option>
          <option value="MENOS_DILIGENTE">Menos diligente</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={exigeDoc}
            onChange={(e) => setExigeDoc(e.target.checked)}
          />
          Exige documentação frequente
        </label>
        <button
          type="submit"
          className="rounded bg-[var(--color-brand)] px-3 py-1.5 text-sm text-white"
        >
          Adicionar
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--color-text-secondary)]">
              <th className="py-1">Código</th>
              <th>Nome</th>
              <th>Perfil</th>
              <th>Doc freq.</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <ComarcaRow
                key={c.id}
                comarca={c}
                onSave={async (patch) => {
                  await editarComarca(c.id, patch)
                  void load()
                }}
                onDelete={async () => {
                  await deletarComarca(c.id)
                  void load()
                }}
                toast={toast}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function ComarcaRow({
  comarca,
  onSave,
  onDelete,
  toast,
}: {
  comarca: Comarca
  onSave: (p: Partial<Comarca>) => Promise<void>
  onDelete: () => Promise<void>
  toast: { success: (m: string) => void; error: (m: string) => void }
}) {
  const [perfil, setPerfil] = useState(comarca.perfilDiligencia ?? '')
  const [exige, setExige] = useState(!!comarca.exigeDocFrequente)

  return (
    <tr className="border-t border-[var(--color-border-default)]">
      <td className="py-1.5 font-mono text-xs">{comarca.codigo}</td>
      <td>{comarca.nome}</td>
      <td>
        <select
          value={perfil}
          onChange={(e) => setPerfil(e.target.value)}
          className="rounded border px-1 py-0.5 text-xs"
        >
          <option value="">—</option>
          <option value="DILIGENTE">Diligente</option>
          <option value="MENOS_DILIGENTE">Menos diligente</option>
        </select>
      </td>
      <td>
        <input
          type="checkbox"
          checked={exige}
          onChange={(e) => setExige(e.target.checked)}
        />
      </td>
      <td className="text-right">
        <button
          type="button"
          className="mr-2 text-xs text-[var(--color-brand)] hover:underline"
          onClick={async () => {
            try {
              await onSave({
                perfilDiligencia:
                  (perfil as 'DILIGENTE' | 'MENOS_DILIGENTE') || null,
                exigeDocFrequente: exige,
              })
              toast.success('Comarca atualizada.')
            } catch (e) {
              toast.error((e as Error).message)
            }
          }}
        >
          Salvar
        </button>
        <button
          type="button"
          className="text-xs text-[var(--urgencia-vencida-text)] hover:underline"
          onClick={async () => {
            if (!confirm('Excluir comarca?')) return
            try {
              await onDelete()
              toast.success('Removida.')
            } catch (e) {
              toast.error((e as Error).message)
            }
          }}
        >
          Excluir
        </button>
      </td>
    </tr>
  )
}
