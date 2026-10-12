import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'
/** Runs an async loader whenever `deps` change; exposes loading/error and a manual reload. Ignores stale responses. */
export function useAsync(loader, deps) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const seq = useRef(0)
  useEffect(() => {
    const id = ++seq.current
    setLoading(true)
    setError(null)
    loader()
      .then((d) => {
        if (id === seq.current) setData(d)
      })
      .catch((e) => {
        if (id === seq.current) setError(e instanceof ApiError ? e.message : 'Something went wrong')
      })
      .finally(() => {
        if (id === seq.current) setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, loading, reload }
}
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
export const errorMessage = (e) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
