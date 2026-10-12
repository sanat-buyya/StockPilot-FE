import axios from 'axios'

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8090').replace(/\/$/, '')
const TOKEN_KEY = 'stockpilot.token'

export class ApiError extends Error {
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
/** The store registers a handler here so a 401 anywhere logs the user out. */
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn
}

export const http = axios.create({
  baseURL: BASE,
  headers: { Accept: 'application/json' },
  timeout: 30000,
})

// Attach the bearer token to every request (unless the call opts out, e.g. login/register).
http.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token && !config.skipAuth) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Normalise every failure into an ApiError carrying the API's error code/message/details.
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.'))
    }
    const { status, data } = error.response
    const e = data?.error
    if (status === 401 && !error.config?.skipAuth && tokenStore.get()) onUnauthorized()
    return Promise.reject(new ApiError(status, e?.code ?? 'ERROR', e?.message ?? `Request failed (${status})`, e?.details))
  },
)

/** Drops empty filter values so they are not sent as `?q=&status=`. */
const clean = (params) =>
  params ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')) : undefined

export const get = (path, params) => http.get(path, { params: clean(params) }).then((r) => r.data.data)
export const getPaged = (path, params) => http.get(path, { params: clean(params) }).then((r) => r.data)
export const post = (path, body, { headers, skipAuth } = {}) => http.post(path, body ?? {}, { headers, skipAuth }).then((r) => r.data.data)
export const patch = (path, body) => http.patch(path, body).then((r) => r.data.data)
export const del = (path) => http.delete(path).then(() => undefined)

/** Plain-object form of an error, safe to keep in Redux (thunk rejections must be serialisable). */
export function serializeError(e) {
  if (e instanceof ApiError) {
    return { status: e.status, code: e.code, message: e.message, details: e.details, fieldErrors: e.fieldErrors }
  }
  return { status: 0, code: 'ERROR', message: 'Something went wrong. Please try again.', details: undefined, fieldErrors: {} }
}
