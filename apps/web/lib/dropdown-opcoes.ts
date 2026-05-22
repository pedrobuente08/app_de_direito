/** Valores canônicos de TIPO_CR (§12.5.A do V3). */
export const TIPO_CR_OPCOES = [
  'BOLETO',
  'CORRESPONDÊNCIA',
  'CONTA DE ÁGUA',
  'CONTA DE ENERGIA',
  'FAT. TELEFONE',
  'FAT. CARTÃO',
  'CONT. ALUGUEL',
] as const

export type TipoCr = (typeof TIPO_CR_OPCOES)[number]

/** Valores canônicos de tipo de audiência (§12 do V3). */
export const TIPO_AUDIENCIA_OPCOES = [
  'CONCILIACAO',
  'INSTRUCAO',
  'UNA',
  'MEDIACAO',
  'OUTRO',
] as const

export type TipoAudiencia = (typeof TIPO_AUDIENCIA_OPCOES)[number]

/** Valores padrão de qualidade do caso (§12.3 do V3). */
export const QUALIDADE_CASO_OPCOES_PADRAO = [
  'BOA — SEM NADA',
  'RUIM — CONTRATO ASSINADO',
  'MEEIRA',
  'MEEIRA — RG + SELFIE',
  'RUIM',
] as const

export type QualidadeCaso = (typeof QUALIDADE_CASO_OPCOES_PADRAO)[number]

/** Status possíveis de audiência. */
export const AUDIENCIA_STATUS_OPCOES = [
  'AGENDADA',
  'REALIZADA',
  'REDESIGNADA',
  'CANCELADA',
] as const

/** Resultado de pendência ao encerrar. */
export const PENDENCIA_RESULTADO_OPCOES = [
  'CUMPRIDA',
  'NAO_CUMPRIDA',
  'SEM_EXITO',
  'AUTOR_FALECIDO',
  'DEIXOU_DE_RESPONDER',
] as const

/** Origem de pendência. */
export const PENDENCIA_ORIGEM_OPCOES = [
  'POS_AUDIENCIA',
  'MANUAL_INTIMACOES',
  'COMUNICA',
  'CASCATA',
] as const

/** Família de procedentes. */
export const FAMILIA_SITUACAO_OPCOES = [
  'AGUARDAR_TRANSITO',
  'PEND_INTERNA',
  'EXEC_ATIVA',
  'AGUARDAR_PAGTO',
  'ENCERRADO',
] as const

/** Resultado de sentença — re-exportado para conveniência. */
export { SENTENCA_OPCOES_PADRAO, mergeSentencaOpcoes } from './sentenca-opcoes'

/** Re-exporta fases canônicas (UPPER_SNAKE_CASE) para dropdowns. */
export { FASE_OPCOES_CANONICAS, faseLabel, faseSelectOptions } from './fase-label'
