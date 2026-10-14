import { useCallback, useEffect, useRef, useState } from 'react'

// Loads data from the API whenever `key` changes.
// - key: a string that identifies the request (e.g. the filters); null means "do not load".
// - keepPrevious: keep showing the previous data while the new request is loading.
export function useApi(fetcher, key, { keepPrevious = true } = {}) {
  const fn = useRef(fetcher)
  useEffect(() => {
    fn.current = fetcher
  })
  const [nonce, setNonce] = useState(0)
  const [state, setState] = useState({ key: null, data: null, error: null })
  const fullKey = key === null ? null : `${key}#${nonce}`

  useEffect(() => {
    if (fullKey === null) return
    let alive = true
    fn.current().then(
      (data) => alive && setState({ key: fullKey, data, error: null }),
      (error) => alive && setState((s) => ({ key: fullKey, data: s.data, error })),
    )
    return () => {
      alive = false
    }
  }, [fullKey])

  const fresh = state.key === fullKey
  return {
    data: fresh || keepPrevious ? state.data : null,
    error: fresh ? state.error : null,
    loading: fullKey !== null && !fresh,
    reload: useCallback(() => setNonce((n) => n + 1), []),
  }
}
