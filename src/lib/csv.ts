function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV com separador ';' e BOM (abre direto no Excel pt-BR). */
export function toCsv(header: string[], rows: string[][]): string {
  const lines = [header.map(csvCell).join(";")];
  for (const r of rows) lines.push(r.map(csvCell).join(";"));
  return "﻿" + lines.join("\r\n");
}
