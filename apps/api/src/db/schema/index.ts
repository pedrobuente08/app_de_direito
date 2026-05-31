export * from './escritorio';
export * from './usuario';
export * from './refresh-token';
export * from './comarca';
export * from './reu';
export * from './reu-alias';
export * from './processo';
export * from './extracao-pendente';
export * from './pendencia';
export * from './escritorio-adversario';
export * from './advogado-adversario';
export * from './vara-documento-regra';
export * from './processo-reprotocolo';
export * from './notificacao';
export * from './feriado';
export * from './audiencia';
export * from './audiencia-ausente';
export * from './comunicacao';
export * from './oab-escuta';
export * from './capturas-log';
export * from './fontes-saude';
export * from './ai-usage';
export * from './ai-quota';
export * from './model-registry';
export * from './processo-procedente';
export * from './sentenca';
export * from './fase-historico';
export * from './improcedente';
export * from './audit-log';
export * from './password-reset-token';
export * from './platform-admin';

import { auditLog } from './audit-log';
import { audiencia, audienciaHistorico, audienciaLixeira } from './audiencia';
import { audienciaAusente } from './audiencia-ausente';
import { comarca } from './comarca';
import { capturasLog } from './capturas-log';
import { fontesSaude } from './fontes-saude';
import { aiUsage } from './ai-usage';
import { aiQuota } from './ai-quota';
import { modelRegistry } from './model-registry';
import { comunicacao } from './comunicacao';
import { escritorio } from './escritorio';
import {
  advogadoAdversario,
  advogadoAdversarioAlias,
} from './advogado-adversario';
import { feriado } from './feriado';
import { notificacao } from './notificacao';
import { processoReprotocolo } from './processo-reprotocolo';
import { varaDocumentoRegra } from './vara-documento-regra';
import { escritorioAdversario, escritorioAdversarioAlias } from './escritorio-adversario';
import { extracaoPendente } from './extracao-pendente';
import { faseHistorico } from './fase-historico';
import { improcedente } from './improcedente';
import { oabEscuta } from './oab-escuta';
import { passwordResetToken } from './password-reset-token';
import { platformAdmin } from './platform-admin';
import {
  pendencia,
  pendenciaHistorico,
  pendenciaProblema,
} from './pendencia';
import { processo } from './processo';
import { processoProcedente, procedenteTransicao } from './processo-procedente';
import { refreshTokens } from './refresh-token';
import { reu } from './reu';
import { reuAlias } from './reu-alias';
import { sentenca } from './sentenca';
import { usuario } from './usuario';

export const schema = {
  escritorio,
  usuario,
  refreshTokens,
  comarca,
  reu,
  reuAlias,
  processo,
  extracaoPendente,
  pendencia,
  pendenciaHistorico,
  pendenciaProblema,
  escritorioAdversario,
  escritorioAdversarioAlias,
  advogadoAdversario,
  advogadoAdversarioAlias,
  varaDocumentoRegra,
  processoReprotocolo,
  notificacao,
  feriado,
  audiencia,
  audienciaHistorico,
  audienciaLixeira,
  audienciaAusente,
  comunicacao,
  oabEscuta,
  capturasLog,
  fontesSaude,
  aiUsage,
  aiQuota,
  modelRegistry,
  processoProcedente,
  procedenteTransicao,
  sentenca,
  faseHistorico,
  improcedente,
  auditLog,
  passwordResetToken,
  platformAdmin,
};
