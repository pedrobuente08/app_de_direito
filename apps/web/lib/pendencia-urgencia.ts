export type UrgenciaPendencia = {
  bg: string
  text: string
  border: string
  label: string
  bucket: 'semPrazo' | 'vencidos' | 'urgente' | 'atencao' | 'normal'
}

export function urgenciaPendencia(dataLimite?: string | null): UrgenciaPendencia {
  if (!dataLimite) {
    return {
      bg: 'var(--urgencia-sem-prazo-bg)',
      text: 'var(--urgencia-sem-prazo-text)',
      border: 'var(--urgencia-sem-prazo-border)',
      label: 'Sem prazo',
      bucket: 'semPrazo',
    }
  }
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const limite = new Date(`${dataLimite}T00:00:00`)
  const dias = Math.floor((limite.getTime() - hoje.getTime()) / 86_400_000)
  if (dias < 0) {
    return {
      bg: 'var(--urgencia-vencida-bg)',
      text: 'var(--urgencia-vencida-text)',
      border: 'var(--urgencia-vencida-border)',
      label: 'Vencida',
      bucket: 'vencidos',
    }
  }
  if (dias <= 3) {
    return {
      bg: 'var(--urgencia-urgente-bg)',
      text: 'var(--urgencia-urgente-text)',
      border: 'var(--urgencia-urgente-border)',
      label: `${dias}d`,
      bucket: 'urgente',
    }
  }
  if (dias <= 7) {
    return {
      bg: 'var(--urgencia-atencao-bg)',
      text: 'var(--urgencia-atencao-text)',
      border: 'var(--urgencia-atencao-border)',
      label: `${dias}d`,
      bucket: 'atencao',
    }
  }
  return {
    bg: 'var(--urgencia-normal-bg)',
    text: 'var(--urgencia-normal-text)',
    border: 'var(--urgencia-normal-border)',
    label: `${dias}d`,
    bucket: 'normal',
  }
}

const ORIGEM_LABELS: Record<string, string> = {
  MANUAL_INTIMACOES: 'Intimações',
  POS_AUDIENCIA: 'Pós-audiência',
  COMUNICA: 'Comunica',
  IMPORT: 'Importação',
  MANUAL: 'Manual',
}

export function labelOrigemPendencia(origem: string): string {
  return ORIGEM_LABELS[origem] ?? origem.replace(/_/g, ' ')
}
