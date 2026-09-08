/**
 * Escapa un campo para CSV.
 *
 * Además de las comillas, neutralizamos la "inyección de fórmulas": Excel y
 * Sheets ejecutan una celda que empieza por = + - @ o tab, así que un cliente
 * llamado `=HYPERLINK(...)` se convertiría en código al abrir el export.
 */
export type CsvValue = string | number | boolean | null | undefined;

export function csvField(value: CsvValue): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function csvRow(values: CsvValue[]): string {
  return values.map(csvField).join(',');
}

/** Quita CR/LF y comillas de un nombre de archivo para el header Content-Disposition. */
export function safeFileName(value: string): string {
  return value.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'archivo';
}
