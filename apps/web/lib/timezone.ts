/**
 * Helpers de timezone para o escritório.
 * O timezone é lido do config do escritório (EscritorioConfig.timezone).
 * Padrão: America/Sao_Paulo se não configurado.
 */

export const DEFAULT_TZ = 'America/Sao_Paulo'

export function resolveTimezone(tz: string | null | undefined): string {
  if (!tz?.trim()) return DEFAULT_TZ
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return tz
  } catch {
    return DEFAULT_TZ
  }
}

/** Formata uma data ISO (YYYY-MM-DD ou timestamp) no timezone do escritório. */
export function formatarData(
  value: string | null | undefined,
  tz: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  if (!value) return '—'
  try {
    const d = new Date(value.length === 10 ? `${value}T12:00:00` : value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleDateString('pt-BR', { ...opts, timeZone: resolveTimezone(tz) })
  } catch {
    return value
  }
}

/** Formata um timestamp ISO para data + hora no timezone do escritório. */
export function formatarDataHora(
  value: string | null | undefined,
  tz: string | null | undefined,
): string {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: resolveTimezone(tz),
    })
  } catch {
    return value
  }
}

/** Retorna a data de hoje no timezone do escritório como YYYY-MM-DD. */
export function hojeNoTimezone(tz: string | null | undefined): string {
  const tzResolvido = resolveTimezone(tz)
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: tzResolvido }).formatToParts(new Date())
  const y = partes.find((p) => p.type === 'year')?.value ?? ''
  const m = partes.find((p) => p.type === 'month')?.value ?? ''
  const d = partes.find((p) => p.type === 'day')?.value ?? ''
  return `${y}-${m}-${d}`
}
