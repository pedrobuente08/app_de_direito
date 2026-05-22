'use client'

import { useEffect, useState } from 'react'
import { getDashLitiganciaMaFe } from '@/lib/api'
import { faseLabel } from '@/lib/fase-label'
import { DashNav } from '../_components/dash-nav'

export default function DashLitiganciaMaFePage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashLitiganciaMaFe>> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDashLitiganciaMaFe()
      .then(setData)
      .catch((e) => setError((e as Error).message))
  }, [])

  return (
    <div className="animate-fade-in-up">
      <DashNav />
      <h1 className="text-lg font-semibold">Litigância de má-fé</h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Processos marcados com litigância de má-fé, agrupados por réu e vara.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-[var(--urgencia-vencida-text)]">{error}</p>
      ) : null}

      {data ? (
        <div className="mt-4 space-y-6">
          <p className="text-sm">
            Total: <strong>{data.total}</strong> processo(s)
          </p>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Por réu</h2>
            <ul className="space-y-1 text-sm">
              {data.porReu.map((g) => (
                <li key={g.reu}>
                  {g.reu}: {g.total}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Por vara</h2>
            <ul className="space-y-1 text-sm">
              {data.porVara.map((g) => (
                <li key={g.vara}>
                  {g.vara}: {g.total}
                </li>
              ))}
            </ul>
          </section>

          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-muted)]">
                <tr>
                  {['Processo', 'Cliente', 'Réu', 'Vara', 'Fase'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.processos.map((p) => (
                  <tr key={p.processoId} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{p.numero}</td>
                    <td className="px-3 py-2">{p.clienteNome ?? '—'}</td>
                    <td className="px-3 py-2">{p.reuTexto ?? '—'}</td>
                    <td className="px-3 py-2">{p.vara ?? '—'}</td>
                    <td className="px-3 py-2">{faseLabel(p.faseAtual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Carregando…</p>
      )}
    </div>
  )
}
