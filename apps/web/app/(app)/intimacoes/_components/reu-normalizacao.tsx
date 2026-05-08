'use client'

import { useEffect, useState } from 'react'
import { adicionarAliasReu, criarReu, getReus, sugerirMergeReu } from '@/lib/api'
import type { Processo, Reu } from '@/lib/types'

type Candidato = { id: string; nomeCanonico: string; score: number }

type Item = {
  reuTexto: string
  quantidadeProcessos: number
  candidato: Candidato | null
}

type Props = {
  processos: Processo[]
  onNormalized: () => void
}

function normStr(s: string) {
  return s.trim().toLowerCase()
}

function isCoberto(reuTexto: string, reus: Reu[]): boolean {
  const n = normStr(reuTexto)
  return reus.some(
    (r) =>
      normStr(r.nomeCanonico) === n ||
      r.aliases.some((a) => normStr(a) === n),
  )
}

export function ReuNormalizacao({ processos, onNormalized }: Props) {
  const [itens, setItens] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [criandoPara, setCriandoPara] = useState<string | null>(null)
  const [novoNome, setNovoNome] = useState<Record<string, string>>({})
  const [erros, setErros] = useState<Record<string, string>>({})

  useEffect(() => {
    if (processos.length === 0) {
      setLoading(false)
      return
    }

    async function load() {
      try {
        const reus = await getReus()

        // contagem por reuTexto
        const counts: Record<string, number> = {}
        for (const p of processos) {
          if (p.reuTexto) counts[p.reuTexto] = (counts[p.reuTexto] ?? 0) + 1
        }

        const naoCobertas = Object.keys(counts).filter(
          (t) => !isCoberto(t, reus),
        )

        const resultado = await Promise.all(
          naoCobertas.map(async (reuTexto) => {
            const candidatos = await sugerirMergeReu(reuTexto).catch(() => [])
            return {
              reuTexto,
              quantidadeProcessos: counts[reuTexto]!,
              candidato: candidatos[0] ?? null,
            }
          }),
        )

        setItens(resultado)
      } catch {
        // falha silenciosa — não bloqueia a página
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [processos])

  function removeItem(reuTexto: string) {
    setItens((prev) => prev.filter((i) => i.reuTexto !== reuTexto))
    onNormalized()
  }

  function setErro(reuTexto: string, msg: string) {
    setErros((prev) => ({ ...prev, [reuTexto]: msg }))
  }

  async function handleConfirmar(item: Item) {
    if (!item.candidato) return
    setProcessing(item.reuTexto)
    setErros((prev) => ({ ...prev, [item.reuTexto]: '' }))
    try {
      await adicionarAliasReu(item.candidato.id, item.reuTexto)
      removeItem(item.reuTexto)
    } catch (e) {
      setErro(item.reuTexto, (e as Error).message)
    } finally {
      setProcessing(null)
    }
  }

  async function handleCriar(item: Item) {
    const nome = (novoNome[item.reuTexto] ?? item.reuTexto).trim().toUpperCase()
    if (!nome) return
    setProcessing(item.reuTexto)
    setErros((prev) => ({ ...prev, [item.reuTexto]: '' }))
    try {
      await criarReu({ nomeCanonico: nome, aliases: [item.reuTexto] })
      removeItem(item.reuTexto)
      setCriandoPara(null)
    } catch (e) {
      setErro(item.reuTexto, (e as Error).message)
    } finally {
      setProcessing(null)
    }
  }

  function abrirCriacao(item: Item) {
    setCriandoPara(item.reuTexto)
    setNovoNome((prev) => ({
      ...prev,
      [item.reuTexto]: prev[item.reuTexto] ?? item.reuTexto,
    }))
  }

  if (loading || itens.length === 0) return null

  return (
    <div className="mb-5 overflow-hidden rounded-[var(--radius-md)] border border-[var(--urgencia-atencao-border)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between bg-[var(--urgencia-atencao-bg)] px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--urgencia-atencao-text)]">
            Réus para normalizar
          </span>
          <span className="rounded-full bg-[var(--urgencia-atencao-text)] px-2 py-0.5 text-[10px] font-bold text-white">
            {itens.length}
          </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[var(--urgencia-atencao-text)] transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="divide-y divide-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          {itens.map((item) => {
            const isProcessing = processing === item.reuTexto
            const estaCriando = criandoPara === item.reuTexto
            const erro = erros[item.reuTexto]

            return (
              <div key={item.reuTexto} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-sm text-[var(--color-text-primary)]">
                    &ldquo;{item.reuTexto}&rdquo;
                  </span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    {item.quantidadeProcessos} processo{item.quantidadeProcessos !== 1 ? 's' : ''}
                  </span>

                  {item.candidato && !estaCriando ? (
                    <>
                      <span className="text-[var(--color-text-tertiary)]">→</span>
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {item.candidato.nomeCanonico}
                      </span>
                      <span className="rounded-full bg-[var(--urgencia-normal-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--urgencia-normal-text)]">
                        {Math.round(item.candidato.score * 100)}%
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => handleConfirmar(item)}
                          disabled={isProcessing}
                          className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-1 text-xs font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
                        >
                          {isProcessing ? 'Confirmando…' : 'Confirmar'}
                        </button>
                        <button
                          onClick={() => abrirCriacao(item)}
                          disabled={isProcessing}
                          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:underline"
                        >
                          Criar novo réu
                        </button>
                      </div>
                    </>
                  ) : !estaCriando ? (
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-[var(--color-text-tertiary)]">sem correspondência</span>
                      <button
                        onClick={() => abrirCriacao(item)}
                        disabled={isProcessing}
                        className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-3 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                      >
                        Criar réu
                      </button>
                    </div>
                  ) : null}
                </div>

                {estaCriando && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      autoFocus
                      value={novoNome[item.reuTexto] ?? ''}
                      onChange={(e) =>
                        setNovoNome((prev) => ({ ...prev, [item.reuTexto]: e.target.value }))
                      }
                      placeholder="Nome canônico"
                      className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
                    />
                    <button
                      onClick={() => handleCriar(item)}
                      disabled={isProcessing}
                      className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
                    >
                      {isProcessing ? 'Criando…' : 'Criar'}
                    </button>
                    <button
                      onClick={() => setCriandoPara(null)}
                      disabled={isProcessing}
                      className="text-xs text-[var(--color-text-secondary)] hover:underline"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {erro && (
                  <p className="mt-1 text-xs text-[var(--urgencia-vencida-text)]">{erro}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
