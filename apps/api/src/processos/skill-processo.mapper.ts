import type { SkillExtractResult } from '../skill/skill.service';

export function parseBrDate(v: unknown): string | null {
  if (v == null) {
    return null;
  }
  const s = String(v).trim();
  if (!s) {
    return null;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    return s;
  }
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) {
    return null;
  }
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function emptyToNull(v: unknown): string | null {
  if (v == null) {
    return null;
  }
  const s = String(v).trim();
  return s === '' ? null : s;
}

export function normalizeTime(v: unknown): string | null {
  const s = emptyToNull(v);
  if (!s) {
    return null;
  }
  return /^\d{2}:\d{2}$/.test(s) ? s : null;
}

export function textoResumoExtracao(r: SkillExtractResult): string {
  if (r.erro) {
    return String(r.erro).slice(0, 12000);
  }
  if (r.alerta) {
    return String(r.alerta).slice(0, 12000);
  }
  return '(extração sem texto bruto — ver resultado_skill)';
}
