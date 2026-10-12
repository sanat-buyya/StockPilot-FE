const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8090').replace(/\/$/, '')
const TOKEN_KEY = 'stockpilot.token'

export interface FieldError { field: string; message: string }

export class ApiError extends Error {
  status: number
  code: string
  details: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
  /** Field-level validation messages keyed by field name. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {}
    if (Array.isArray(this.details)) {
      for (const d of this.details as FieldError[]) {
        if (d && typeof d.field === 'string' && d.message && !out[d.field]) out[d.field] = d.message
      }
    }
    return out
  }
}

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (t: string) => { try { localStorage.setItem(TOKEN_KEY, t) } catch { /* storage unavailable */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ } },
}

let onUnauthorized: () => void = () => {}
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }

type Query = Record<string, string | number | boolean | undefined | null>

export function qs(params?: Query): string {
  if (!params) return ''
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export async function api<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  opts: { body?: unknown; query?: Query; headers?: Record<string, string>; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers }
  const token = tokenStore.get()
  if (token && opts.auth !== false) headers.Authorization = `Bearer ${token}`
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(`${BASE}${path}${qs(opts.query)}`, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.')
  }

  if (res.status === 204) return undefined as T
  let json: any = null
  try { json = await res.json() } catch { /* empty or non-JSON body */ }

  if (!res.ok) {
    const e = json?.error
    if (res.status === 401 && opts.auth !== false && token) onUnauthorized()
    throw new ApiError(res.status, e?.code ?? 'ERROR', e?.message ?? `Request failed (${res.status})`, e?.details)
  }
  return json as T
}

export const get = <T>(path: string, query?: Query) => api<{ data: T }>('GET', path, { query }).then((r) => r.data)
export const getPaged = <T>(path: string, query?: Query) => api<{ data: T[]; meta: import('./types').PageMeta }>('GET', path, { query })
export const post = <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
  api<{ data: T }>('POST', path, { body: body ?? {}, headers }).then((r) => r.data)
export const patch = <T>(path: string, body: unknown) => api<{ data: T }>('PATCH', path, { body }).then((r) => r.data)
export const del = (path: string) => api<void>('DELETE', path)
