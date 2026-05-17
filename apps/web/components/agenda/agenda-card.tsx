'use client'

import { useState } from 'react'
import { PosAudienciaDialog } from '@/components/audiencias/pos-audiencia-dialog'
import type { Audiencia } from '@/lib/types'

function horaExibicao(hora: string | null | undefined): string {
  if (!hora?.trim()) return '—'
  const m = hora.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)/)
  if (m) return `${m[1]!.padStart(2, '0')}:${m[2]}`
  return hora.trim().slice(0, 5)
}

function digitosTel(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\D/g, '')
}

function waHref(digits: string): string | null {
  if (digits.length < 10) return null
  const d = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${d}`
}

function telHref(digits: string): string | null {
  if (digits.length < 10) return null
  const d = digits.startsWith('55') ? digits : `55${digits}`
  return `tel:+${d}`
}

const Divisor = () => <div className="my-2.5 border-t border-[var(--color-border-default)]" aria-hidden />

type Props = {
  audiencia: Audiencia
  readOnly?: boolean
  onUpdated: () => void
}

export function AgendaCard({ audiencia: a, readOnly, onUpdated }: Props) {
  const p = a.processo
  const telDigits = digitosTel(p?.telefone)
  const wa = waHref(telDigits)
  const tel = telHref(telDigits)

  const tipoUp = (a.tipo ?? '').toUpperCase()
  const virtual = tipoUp.includes('VIRTUAL') || tipoUp.includes('VIDEO')

  const cabecaPartes = [horaExibicao(a.hora), a.status]
  if (virtual) cabecaPartes.push('VIRTUAL')

  const vara = p?.vara?.trim() || '—'
  const tipo = (p?.tipoAudiencia ?? a.tipo ?? '').toString().trim()
  const varaLinha = tipo ? `${vara}  ·  Tipo: ${tipo.toUpperCase()}` : vara

  const qualidade = p?.qualidadeCaso?.trim()

  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <article className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-3 shadow-sm">
        <header className="font-mono text-sm font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">
          {cabecaPartes.join('  ·  ')}
        </header>

        <Divisor />

        <div className="space-y-1">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Cliente
            </span>
            <span className="text-[var(--color-text-primary)]">
              {(p?.clienteNome ?? '').toUpperCase() || '—'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 text-sm">
            <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Tel
            </span>
            <span className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--color-text-primary)]">
              {p?.telefone?.trim() || '—'}
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer"
                  className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-brand)] hover:bg-[var(--color-bg-hover)]">
                  Whatsapp
                </a>
              )}
              {tel && (
                <a href={tel}
                  className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-brand)] hover:bg-[var(--color-bg-hover)]">
                  Ligar
                </a>
              )}
            </span>
          </div>
        </div>

        <Divisor />

        <div className="space-y-1">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Réu</span>
            <span>{p?.reuTexto ?? '—'}</span>
          </div>
          <div className="flex items-baseline gap-2 text-sm">
            <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Escrit.</span>
            <span className={a.escritorioAdversarioNome ? '' : 'italic text-[var(--color-text-secondary)]'}>
              {a.escritorioAdversarioNome ?? '[+ preencher escritório adversário]'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 text-sm">
            <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Matéria</span>
            <span>{p?.materia ?? '—'}</span>
          </div>
          <div className="flex items-baseline gap-2 text-sm">
            <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Vara</span>
            <span>{varaLinha}</span>
          </div>
        </div>

        {(qualidade || a.obsPre?.trim() || a.link?.trim()) && (
          <>
            <Divisor />
            <div className="space-y-1">
              {qualidade && (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  📋 <span className="font-semibold">SITUAÇÃO:</span> {qualidade.toUpperCase()}
                </p>
              )}
              {a.obsPre?.trim() && (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  📝 <span className="font-semibold">OBS PRÉ:</span> {a.obsPre.trim()}
                </p>
              )}
              {a.link?.trim() && (
                <p className="text-xs">
                  🔗 <span className="font-semibold text-[var(--color-text-tertiary)]">LINK:</span>{' '}
                  <a href={a.link.trim()} target="_blank" rel="noopener noreferrer"
                    className="text-[var(--color-brand)] underline">
                    Abrir reunião
                  </a>
                </p>
              )}
            </div>
          </>
        )}

        <Divisor />

        <p className="text-xs text-[var(--color-text-secondary)]">
          <span className="font-semibold text-[var(--color-text-tertiary)]">Pautista:</span>{' '}
          {a.pautista?.trim() || '—'}
          <span className="mx-3 text-[var(--color-text-tertiary)]">·</span>
          <span className="font-semibold text-[var(--color-text-tertiary)]">Login captação:</span>{' '}
          {p?.login?.trim() || '—'}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {a.status === 'AGENDADA' && !readOnly && (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
            >
              Finalizar audiência
            </button>
          )}
          <a
            href="/audiencias"
            className="rounded border border-[var(--color-border-default)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
          >
            Ver em Audiências
          </a>
        </div>
      </article>

      <PosAudienciaDialog
        open={dialogOpen}
        audiencia={a}
        readOnly={readOnly}
        onClose={() => setDialogOpen(false)}
        onSuccess={onUpdated}
      />
    </>
  )
}
