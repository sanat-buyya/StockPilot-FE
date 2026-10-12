/** Money is kept as decimal strings from the API; arithmetic uses integer cents (never floats). */
export function toCents(value: string): number {
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim())
  if (!m) return NaN
  const cents = Number(m[2]) * 100 + Number((m[3] ?? '').padEnd(2, '0'))
  return m[1] ? -cents : cents
}

export function centsToString(cents: number): string {
  const abs = Math.abs(cents)
  return `${cents < 0 ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

export function formatMoney(value: string | number): string {
  const n = typeof value === 'number' ? value : Number(value)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number.isFinite(n) ? n : 0)
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export const REASON_LABELS: Record<string, string> = {
  received: 'Stock received',
  count_correction: 'Count correction',
  damaged: 'Damaged / lost',
  returned: 'Customer return',
  other: 'Other',
  initial_stock: 'Opening stock',
  order_reserve: 'Reserved by order',
  order_release: 'Released by cancelled order',
}

export const signed = (n: number) => (n > 0 ? `+${n}` : String(n))
