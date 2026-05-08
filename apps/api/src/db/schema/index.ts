export * from './escritorio';
export * from './usuario';
export * from './refresh-token';
export * from './comarca';
export * from './reu';
export * from './reu-alias';
export * from './processo';
export * from './extracao-pendente';
export * from './pendencia';
export * from './audiencia';
export * from './comunicacao';
export * from './oab-escuta';
export * from './processo-procedente';
export * from './audit-log';
export * from './password-reset-token';
export * from './platform-admin';

import { auditLog } from './audit-log';
import { audiencia, audienciaHistorico, audienciaLixeira } from './audiencia';
import { comarca } from './comarca';
import { comunicacao } from './comunicacao';
import { escritorio } from './escritorio';
import { extracaoPendente } from './extracao-pendente';
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
  audiencia,
  audienciaHistorico,
  audienciaLixeira,
  comunicacao,
  oabEscuta,
  processoProcedente,
  procedenteTransicao,
  auditLog,
  passwordResetToken,
  platformAdmin,
};
