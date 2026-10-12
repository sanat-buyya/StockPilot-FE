const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8090').replace(/\/$/, '')
const TOKEN_KEY = 'stockpilot.token'
export class ApiError extends Error {
  status
  code
  details
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
  /** Field-level validation messages keyed by field name. */
  get fieldErrors() {
    const out = {}
    if (Array.isArray(this.details)) {
      for (const d of this.details) {
        if (d && typeof d.field === 'string' && d.message && !out[d.field]) out[d.field] = d.message
      }
    }
    return out
  }
}
export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (t) => {
    try {
      localStorage.setItem(TOKEN_KEY, t)
    } catch {
      /* storage unavailable */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* storage unavailable */
    }
  },
}
let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn
}
export function qs(params) {
  if (!params) return ''
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}
export async function api(method, path, opts = {}) {
  const headers = { Accept: 'application/json', ...opts.headers }
  const token = tokenStore.get()
  if (token && opts.auth !== false) headers.Authorization = `Bearer ${token}`
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  let res
  try {
    res = await fetch(`${BASE}${path}${qs(opts.query)}`, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.')
  }
  if (res.status === 204) return undefined
  let json = null
  try {
    json = await res.json()
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) {
    const e = json?.error
    if (res.status === 401 && opts.auth !== false && token) onUnauthorized()
    throw new ApiError(res.status, e?.code ?? 'ERROR', e?.message ?? `Request failed (${res.status})`, e?.details)
  }
  return json
}
export const get = (path, query) => api('GET', path, { query }).then((r) => r.data)
export const getPaged = (path, query) => api('GET', path, { query })
export const post = (path, body, headers) => api('POST', path, { body: body ?? {}, headers }).then((r) => r.data)
export const patch = (path, body) => api('PATCH', path, { body }).then((r) => r.data)
export const del = (path) => api('DELETE', path)
