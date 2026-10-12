import { useEffect, useState } from 'react'

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** Message from a serialised API error (what thunks reject with). */
export const errorMessage = (e) => e?.message ?? 'Something went wrong. Please try again.'
