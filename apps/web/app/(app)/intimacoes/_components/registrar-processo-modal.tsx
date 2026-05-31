'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { resolverComunicacao } from '@/lib/api'
import type { Comunicacao } from '@/lib/types'

const SISTEMAS = ['PJe', 'PROJUDI', 'ESAJ', 'TUCUJURIS', 'SAJ', 'OUTRO']

type Props = {
  comunicacao: Comunicacao
  materias?: string[]
  onClose: () => void
  onSuccess: () => void
}

export function RegistrarProcessoModal({
  comunicacao: com,
  materias = [],
  onClose,
  onSuccess,
}: Props) {
  const [numero, setNumero] = useState(com.numeroProcessoBruto ?? '')
  const [sistema, setSistema] = useState('')
  const [vara, setVara] = useState('')
  const [materia, setMateria] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [reuTexto, setReuTexto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!numero.trim()) { setErro('Número do processo é obrigatório.'); return }
    if (!sistema.trim()) { setErro('Sistema é obrigatório.'); return }
    setSalvando(true)
    try {
      await resolverComunicacao(com.id, {
        decisao: 'VINCULAR',
        dadosNovoProcesso: {
          numero: numero.trim(),
          sistema: sistema.trim(),
          vara: vara.trim() || null,
          materia: materia.trim() || null,
          clienteNome: clienteNome.trim() || null,
          reuTexto: reuTexto.trim() || null,
        },
      })
      onSuccess()
      onClose()
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleNaoENosso() {
    setSalvando(true)
    try {
      await resolverComunicacao(com.id, { decisao: 'NAO_E_NOSSO' })
      onSuccess()
      onClose()
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  if (typeof document === 'undefined') return null

  const dataFmt = com.dataDisponibilizacao
    ? new Date(com.dataDisponibilizacao).toLocaleDateString('pt-BR')
    : null

  return createPortal(
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-[60] bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-[61] flex max-h-[90vh] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-[var(--color-border-default)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Registrar processo
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            Publicação DJEN · OAB {com.oab}{dataFmt ? ` · ${dataFmt}` : ''}
          </p>
        </header>

        {/* Contexto da publicação */}
        <div className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-4 py-2.5">
          {com.tipo && (
            <span className="mr-2 inline-block rounded bg-[var(--color-brand)]/10 px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase text-[var(--color-brand)]">
              {com.tipo}
            </span>
          )}
          {com.resumo && (
            <p className="mt-1.5 line-clamp-3 text-[11px] leading-snug text-[var(--color-text-secondary)]">
              {com.resumo}
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3"
        >
          {erro && (
            <p className="mb-3 rounded bg-[var(--urgencia-vencida-bg)] px-2 py-1.5 text-xs text-[var(--urgencia-vencida-text)]">
              {erro}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
              Número do processo *
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                disabled={salvando}
                className="rounded border border-[var(--color-border-default)] px-2 py-1.5 font-mono text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
              Sistema *
              <input
                list="sistemas-list"
                value={sistema}
                onChange={(e) => setSistema(e.target.value)}
                disabled={salvando}
                placeholder="PJe, PROJUDI…"
                className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
              <datalist id="sistemas-list">
                {SISTEMAS.map((s) => <option key={s} value={s} />)}
              </datalist>
            </label>

            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
              Vara
              <input
                value={vara}
                onChange={(e) => setVara(e.target.value)}
                disabled={salvando}
                placeholder="1ª Vara Cível…"
                className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
              Matéria
              <input
                list="materias-list"
                value={materia}
                onChange={(e) => setMateria(e.target.value)}
                disabled={salvando}
                placeholder="CÍVEL, TRABALHISTA…"
                className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
              {materias.length > 0 && (
                <datalist id="materias-list">
                  {materias.map((m) => <option key={m} value={m} />)}
                </datalist>
              )}
            </label>

            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
              Nome do cliente
              <input
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                disabled={salvando}
                className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
              Réu / parte contrária
              <input
                value={reuTexto}
                onChange={(e) => setReuTexto(e.target.value)}
                disabled={salvando}
                className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
            </label>
          </div>

          <p className="mt-3 text-[11px] text-[var(--color-text-tertiary)]">
            Ao registrar, o processo é criado e as regras de automação (pendências e audiências) são disparadas automaticamente.
          </p>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleNaoENosso}
              disabled={salvando}
              className="text-xs text-[var(--color-text-tertiary)] underline hover:text-[var(--color-text-secondary)] disabled:opacity-40"
            >
              Não é nosso
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={salvando}
                className="rounded border border-[var(--color-border-default)] px-3 py-1.5 text-xs disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="rounded bg-[var(--color-brand)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-40"
              >
                {salvando ? 'Registrando…' : 'Registrar processo'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>,
    document.body,
  )
}
