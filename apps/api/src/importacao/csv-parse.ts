function normalizeCsvHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

export function parseCsvSimple(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    return [];
  }
  const headers = lines[0].split(',').map(normalizeCsvHeader);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const row: Record<string, string> = {};
    headers.forEach((key, j) => {
      row[key] = (cols[j] ?? '').trim();
    });
    rows.push(row);
  }
  return rows;
}
