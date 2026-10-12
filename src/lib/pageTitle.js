// Ordered: first match wins, so more specific routes come first.
const TITLES = [
  [/^\/$/, 'Dashboard'],
  [/^\/products\/[^/]+$/, 'Product details'],
  [/^\/products\/?$/, 'Products'],
  [/^\/orders\/new\/?$/, 'New order'],
  [/^\/orders\/[^/]+$/, 'Order details'],
  [/^\/orders\/?$/, 'Orders'],
  [/^\/inventory\/?$/, 'Stock history'],
  [/^\/team\/?$/, 'Team'],
]

/** Name of the active page for the header, derived from the URL path. */
export function pageTitle(pathname) {
  return TITLES.find(([re]) => re.test(pathname))?.[1] ?? 'StockPilot'
}

/** Up to two initials for an avatar: "Olivia Owner" -> "OO", "sam" -> "S". */
export function initials(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}
