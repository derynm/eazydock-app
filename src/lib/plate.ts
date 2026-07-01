/** Strip separators and uppercase — keeps only A-Z 0-9. */
export function normalisePlate(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
