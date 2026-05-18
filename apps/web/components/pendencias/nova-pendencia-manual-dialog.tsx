'use client'

import { useEffect, useState } from 'react'
import { PopupFooterActions, PopupShell } from '@/components/popups/popup-shell'
import { FilterField, filterControlClass } from '@/components/ui/filter-bar'
import { criarPendencia, getEscritorioConfig, getProcessos } from '@/lib/api'
import type { Processo } from '@/lib/types'

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function NovaPendenciaManualDialog({ open, onClose, onSuccess }: Props) {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<Processo[]>([])
  const [buscando, setBuscando] = useState(false)
  const [processo, setProcesso] = useState<Processo | null>(null)
  const [tipo, setTipo] = useState('')
  const [dataLimite, setDataLimite] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [fila, setFila] = useState('')
  const [observacao, setObservacao] = useState('')
  const [tiposSugeridos, setTiposSugeridos] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setBusca('')
    setResultados([])
    setProcesso(null)
    setTipo('')
    setDataLimite('')
    setResponsavel('')
    setFila('')
    setObservacao('')
    setErro(null)
    getEscritorioConfig()
      .then((cfg) => setTiposSugeridos(cfg.tipos_pendencia ?? []))
      .catch(() => setTiposSugeridos([]))
  }, [open])

  useEffect(() => {
    if (!open || processo) return
    const q = busca.trim()
    if (q.length < 3) {
      setResultados([])
      return
    }
    const t = setTimeout(() => {
      setBuscando(true)
      getProcessos({ numero: q, page: 1, pageSize: 8 })
        .then((res) => setResultados(res.data))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false))
    }, 300)
    return () => clearTimeout(t)
  }, [busca, open, processo])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!processo) {
      setErro('Selecione um processo.')
      return
    }
    if (!tipo.trim()) {
      setErro('Informe o tipo.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await criarPendencia({
        processoId: processo.id,
        tipo: tipo.trim(),
        dataLimite: dataLimite.trim() || null,
        responsavel: responsavel.trim() || null,
        observacao: observacao.trim() || null,
        origem: 'MANUAL',
        fila: fila.trim() || null,
      })
      onSuccess()
      onClose()
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <PopupShell
      open={open}
      title="Nova pendência"
      subtitle="Busque o processo pelo número CNJ"
      onClose={onClose}
      footer={
        <PopupFooterActions
          formId="nova-pendencia-manual"
          onCancel={onClose}
          loading={salvando}
          confirmLabel="Criar pendência"
        />
      }
    >
      <form id="nova-pendencia-manual" onSubmit={handleSubmit} className="space-y-3">
        {erro ? <p className="text-xs text-[var(--urgencia-vencida-text)]">{erro}</p> : null}

        {!processo ? (
          <>
            <FilterField label="Nº processo">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Mín. 3 caracteres…"
                className={filterControlClass}
                autoFocus
              />
            </FilterField>
            {buscando ? (
              <p className="text-xs text-[var(--color-text-secondary)]">Buscando…</p>
            ) : null}
            {resultados.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto rounded border border-[var(--color-border-default)]">
                {resultados.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setProcesso(p)
                        setBusca('')
                        setResultados([])
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-hover)]"
                    >
                      <span className="font-mono text-xs">{p.numero}</span>
                      {p.clienteNome ? (
                        <span className="ml-2 text-[var(--color-text-secondary)]">
                          {p.clienteNome}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : busca.trim().length >= 3 && !buscando ? (
              <p className="text-xs text-[var(--color-text-secondary)]">
                Nenhum processo encontrado.
              </p>
            ) : null}
          </>
        ) : (
          <div className="flex items-center justify-between rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2">
            <div>
              <p className="font-mono text-xs font-medium">{processo.numero}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {processo.clienteNome ?? '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setProcesso(null)}
              className="text-xs text-[var(--color-brand)] hover:underline"
            >
              Trocar
            </button>
          </div>
        )}

        {processo ? (
          <>
            <FilterField label="Tipo *">
              <input
                required
                list="tipos-pendencia-manual"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className={filterControlClass}
              />
              {tiposSugeridos.length > 0 ? (
                <datalist id="tipos-pendencia-manual">
                  {tiposSugeridos.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              ) : null}
            </FilterField>
            <div className="grid grid-cols-2 gap-3">
              <FilterField label="Prazo">
                <input
                  type="date"
                  value={dataLimite}
                  onChange={(e) => setDataLimite(e.target.value)}
                  className={filterControlClass}
                />
              </FilterField>
              <FilterField label="Fila">
                <input
                  value={fila}
                  onChange={(e) => setFila(e.target.value)}
                  placeholder="Ex.: TELEMARKETING"
                  className={filterControlClass}
                />
              </FilterField>
            </div>
            <FilterField label="Responsável">
              <input
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className={filterControlClass}
              />
            </FilterField>
            <FilterField label="Observação">
              <textarea
                rows={2}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className={filterControlClass}
              />
            </FilterField>
          </>
        ) : null}
      </form>
    </PopupShell>
  )
}
