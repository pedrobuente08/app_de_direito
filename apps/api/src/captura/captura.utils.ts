/** Parseia OAB em UF + número (ex.: BA51204, 51204/BA, OAB/BA 51.204). */
export function parseOab(raw: string): { uf: string; numero: string } | null {
  const compact = raw.trim().toUpperCase().replace(/\s+/g, '').replace(/\./g, '');

  let m = compact.match(/^([A-Z]{2})(\d+)$/);
  if (m) return { uf: m[1]!, numero: m[2]! };

  m = compact.match(/^(\d+)[\/\-]([A-Z]{2})$/);
  if (m) return { uf: m[2]!, numero: m[1]! };

  m = compact.match(/^OAB\/?([A-Z]{2})(\d+)$/);
  if (m) return { uf: m[1]!, numero: m[2]! };

  m = compact.match(/^(\d+)([A-Z]{2})$/);
  if (m) return { uf: m[2]!, numero: m[1]! };

  return null;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Extrai texto plano resumido do HTML do DJEN. */
export function resumoDeTexto(html: string | undefined, max = 500): string | null {
  if (!html?.trim()) return null;
  const plain = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return null;
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}
