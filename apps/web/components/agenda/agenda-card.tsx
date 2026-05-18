'use client'

import { useState } from 'react'
import { PopUpPosAudiencia } from '@/components/popups/pos-audiencia'
import { Btn } from '@/components/ui/btn'
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

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

const Divisor = () => (
  <div className="my-2.5 border-t border-[var(--color-border-default)]" aria-hidden />
)

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
  const banca = a.escritorioAdversarioNome?.trim()

  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <article className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-3 shadow-[var(--shadow-sm)]">
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
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir WhatsApp"
                  className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[#25D366]/10 px-2 py-0.5 text-[11px] font-medium text-[#128C7E] hover:bg-[#25D366]/20"
                >
                  <IconWhatsApp />
                  WhatsApp
                </a>
              ) : null}
              {tel ? (
                <a
                  href={tel}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-brand)] hover:bg-[var(--color-bg-hover)]"
                >
                  Ligar
                </a>
              ) : null}
            </span>
          </div>
        </div>

        <Divisor />

        <div className="space-y-1">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Réu
            </span>
            <span>{p?.reuTexto ?? '—'}</span>
          </div>
          <div className="flex items-baseline gap-2 text-sm">
            <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Banca
            </span>
            <span className={banca ? 'font-medium text-[var(--color-text-primary)]' : 'italic text-[var(--color-text-secondary)]'}>
              {banca ?? 'Não informada'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 text-sm">
            <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Matéria
            </span>
            <span>{p?.materia ?? '—'}</span>
          </div>
          <div className="flex items-baseline gap-2 text-sm">
            <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Vara
            </span>
            <span>{varaLinha}</span>
          </div>
        </div>

        {(qualidade || a.obsPre?.trim() || a.link?.trim()) && (
          <>
            <Divisor />
            <div className="space-y-1">
              {qualidade && (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  <span className="font-semibold">Situação:</span> {qualidade.toUpperCase()}
                </p>
              )}
              {a.obsPre?.trim() && (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  <span className="font-semibold">Obs pré:</span> {a.obsPre.trim()}
                </p>
              )}
              {a.link?.trim() && (
                <p className="text-xs">
                  <span className="font-semibold text-[var(--color-text-tertiary)]">Link:</span>{' '}
                  <a
                    href={a.link.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-brand)] underline"
                  >
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
            <Btn variant="primary" className="!px-3 !py-1.5 text-xs" onClick={() => setDialogOpen(true)}>
              Marcar como REALIZADA
            </Btn>
          )}
          <a
            href="/audiencias"
            className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
          >
            Ver em Audiências
          </a>
        </div>
      </article>

      <PopUpPosAudiencia
        open={dialogOpen}
        audiencia={a}
        readOnly={readOnly}
        onClose={() => setDialogOpen(false)}
        onSuccess={onUpdated}
      />
    </>
  )
}
