import { FaseDerivada } from './fase-derivacao.constants';

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase();
}

/** Transições padrão quando `escritorio.config.transicoes_fase` não está definido. */
export const TRANSICOES_FASE_PADRAO: Record<string, string[]> = {
  [FaseDerivada.AGUARDANDO_AUDIENCIA]: [
    FaseDerivada.AGUARDANDO_SENTENCA,
    FaseDerivada.AGUARDANDO_PROCURACAO,
    FaseDerivada.EM_RECURSO,
    FaseDerivada.AGUARDANDO_ALVARA,
  ],
  [FaseDerivada.AGUARDANDO_SENTENCA]: [
    FaseDerivada.AGUARDANDO_TRANSITO,
    FaseDerivada.EM_RECURSO,
    FaseDerivada.AGUARDANDO_PROCURACAO,
    FaseDerivada.AGUARDANDO_ALVARA,
  ],
  [FaseDerivada.AGUARDANDO_TRANSITO]: [
    FaseDerivada.AGUARDANDO_ALVARA,
    FaseDerivada.EM_RECURSO,
  ],
  [FaseDerivada.AGUARDANDO_PROCURACAO]: [
    FaseDerivada.AGUARDANDO_SENTENCA,
    FaseDerivada.AGUARDANDO_ALVARA,
    FaseDerivada.EM_RECURSO,
  ],
  [FaseDerivada.EM_RECURSO]: [
    FaseDerivada.AGUARDANDO_SENTENCA,
    FaseDerivada.AGUARDANDO_TRANSITO,
    FaseDerivada.AGUARDANDO_ALVARA,
  ],
  [FaseDerivada.AGUARDANDO_ALVARA]: [FaseDerivada.EM_RECURSO],
};

export function transicaoFasePermitida(
  faseAnterior: string | null | undefined,
  faseNova: string,
  configMap?: Record<string, string[]> | null,
): boolean {
  const para = faseNova.trim();
  if (!para) {
    return false;
  }
  const de = (faseAnterior ?? '').trim();
  if (!de || norm(de) === norm(para)) {
    return true;
  }

  const map =
    configMap && Object.keys(configMap).length > 0
      ? configMap
      : TRANSICOES_FASE_PADRAO;

  const allowed = map[de] ?? map['*'];
  if (!allowed || allowed.length === 0) {
    return true;
  }

  const dest = norm(para);
  return allowed.some((a) => norm(a) === dest);
}
