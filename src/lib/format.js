/** Money is kept as decimal strings from the API; arithmetic uses integer cents (never floats). */
export function toCents(value) {
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim())
  if (!m) return NaN
  const cents = Number(m[2]) * 100 + Number((m[3] ?? '').padEnd(2, '0'))
  return m[1] ? -cents : cents
}
export function centsToString(cents) {
  const abs = Math.abs(cents)
  return `${cents < 0 ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}
/** Business timezone: all dates are shown in India Standard Time. */
export const IST = 'Asia/Kolkata'

export function formatMoney(value) {
  const n = typeof value === 'number' ? value : Number(value)
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number.isFinite(n) ? n : 0)
}
export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: IST })
}
export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium', timeZone: IST })
}
export const REASON_LABELS = {
  received: 'Stock received',
  count_correction: 'Count correction',
  damaged: 'Damaged / lost',
  returned: 'Customer return',
  other: 'Other',
  initial_stock: 'Opening stock',
  order_reserve: 'Reserved by order',
  order_release: 'Released by cancelled order',
}
export const signed = (n) => (n > 0 ? `+${n}` : String(n))
