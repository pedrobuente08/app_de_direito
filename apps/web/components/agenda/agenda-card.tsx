'use client'

import { useState } from 'react'
import { finalizarAudiencia } from '@/lib/api'
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

function Linha({
  label,
  valor,
  vazio,
  children,
}: {
  label: string
  valor?: string | null
  vazio?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
        {label}
      </span>
      {children ?? (
        <span className={valor?.trim() ? 'text-[var(--color-text-primary)]' : 'italic text-[var(--color-text-secondary)]'}>
          {valor?.trim() || (vazio ?? '—')}
        </span>
      )}
    </div>
  )
}

const STATUS_FINALIZAR = ['REALIZADA', 'CANCELADA', 'ADIADA', 'REDESIGNADA'] as const

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

  const [abrirFinalizar, setAbrirFinalizar] = useState(false)
  const [obsPos, setObsPos] = useState('')
  const [statusF, setStatusF] = useState<string>('REALIZADA')
  const [autorPresenca, setAutorPresenca] = useState('PRESENTE')
  const [motivoAusencia, setMotivoAusencia] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleFinalizar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    try {
      const body: {
        obsPos: string
        status?: string
        autorPresenca?: string
        motivoAusencia?: string
      } = { obsPos: obsPos.trim(), status: statusF }
      if (statusF === 'REALIZADA') {
        body.autorPresenca = autorPresenca
        if (autorPresenca === 'AUSENTE') body.motivoAusencia = motivoAusencia.trim()
      }
      await finalizarAudiencia(a.id, body)
      setAbrirFinalizar(false)
      setObsPos('')
      setStatusF('REALIZADA')
      setAutorPresenca('PRESENTE')
      setMotivoAusencia('')
      onUpdated()
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-3 shadow-sm">

      {/* Cabeçalho */}
      <header className="font-mono text-sm font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">
        {cabecaPartes.join('  ·  ')}
      </header>

      <Divisor />

      {/* Bloco cliente */}
      <div className="space-y-1">
        <Linha label="Cliente" valor={(p?.clienteNome ?? '').toUpperCase() || undefined} vazio="—" />
        <Linha label="Tel">
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
        </Linha>
      </div>

      <Divisor />

      {/* Bloco processo */}
      <div className="space-y-1">
        <Linha label="Réu" valor={p?.reuTexto} />
        <Linha label="Escrit."
          valor={a.escritorioAdversarioNome}
          vazio="[+ preencher escritório adversário]"
        />
        <Linha label="Matéria" valor={p?.materia} />
        <Linha label="Vara" valor={varaLinha} />
      </div>

      {(qualidade || a.obsPre?.trim() || a.link?.trim()) && (
        <>
          <Divisor />
          <div className="space-y-1">
            {qualidade && (
              <p className="text-xs text-[var(--color-text-secondary)]">
                📋 <span className="font-semibold">QUALIDADE:</span> {qualidade.toUpperCase()}
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

      {/* Pautista */}
      <p className="text-xs text-[var(--color-text-secondary)]">
        <span className="font-semibold text-[var(--color-text-tertiary)]">Pautista:</span>{' '}
        {a.pautista?.trim() || '—'}
        <span className="mx-3 text-[var(--color-text-tertiary)]">·</span>
        <span className="font-semibold text-[var(--color-text-tertiary)]">Login captação:</span>{' '}
        {p?.login?.trim() || '—'}
      </p>

      {/* Ações */}
      <div className="mt-3 flex flex-wrap gap-2">
        {a.status === 'AGENDADA' && !readOnly && (
          <button
            type="button"
            onClick={() => setAbrirFinalizar((v) => !v)}
            className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
          >
            Marcar como REALIZADA
          </button>
        )}
        <a
          href="/audiencias"
          className="rounded border border-[var(--color-border-default)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
        >
          Editar
        </a>
      </div>

      {/* Form de finalizar */}
      {abrirFinalizar && (
        <form
          onSubmit={handleFinalizar}
          className="mt-3 space-y-2 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-3"
        >
          <p className="text-xs font-medium text-[var(--color-text-primary)]">Finalizar audiência</p>
          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <label className="block text-[11px] text-[var(--color-text-secondary)]">
            Observações pós-audiência (obrigatório)
            <textarea
              required
              rows={2}
              value={obsPos}
              onChange={(e) => setObsPos(e.target.value)}
              className="mt-0.5 w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 py-1 text-sm"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <label className="text-[11px] text-[var(--color-text-secondary)]">
              Resultado
              <select
                value={statusF}
                onChange={(e) => setStatusF(e.target.value)}
                className="ml-1 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 py-1 text-sm"
              >
                {STATUS_FINALIZAR.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            {statusF === 'REALIZADA' && (
              <label className="text-[11px] text-[var(--color-text-secondary)]">
                Autor
                <select
                  value={autorPresenca}
                  onChange={(e) => setAutorPresenca(e.target.value)}
                  className="ml-1 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 py-1 text-sm"
                >
                  <option value="PRESENTE">Presente</option>
                  <option value="AUSENTE">Ausente</option>
                </select>
              </label>
            )}
          </div>

          {statusF === 'REALIZADA' && autorPresenca === 'AUSENTE' && (
            <label className="block text-[11px] text-[var(--color-text-secondary)]">
              Motivo da ausência
              <input
                required
                value={motivoAusencia}
                onChange={(e) => setMotivoAusencia(e.target.value)}
                className="mt-0.5 w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 py-1 text-sm"
              />
            </label>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={salvando}
              className="rounded bg-[var(--color-brand)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={() => setAbrirFinalizar(false)}
              className="text-xs text-[var(--color-text-secondary)] underline"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </article>
  )
}
