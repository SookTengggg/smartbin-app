// Every call to the SmartBin backend goes through this file.
// Set VITE_API_BASE_URL in .env.local to use a local backend (see .env.example).

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://smartbin-backend-xa6u.onrender.com').replace(/\/$/, '')

// The free Render server sleeps after 15 minutes idle and takes up to a minute to wake.
// Components can subscribe to know when a request is slow, to show a "waking up" notice.
const SLOW_MS = 4000
const listeners = new Set()
let pendingSlow = 0
export function onSlowChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
function setSlow(delta) {
  pendingSlow += delta
  listeners.forEach((fn) => fn(pendingSlow > 0))
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body, params, timeoutMs = 90000 } = {}) {
  const url = new URL(API_BASE + path)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }
  const ctrl = new AbortController()
  const kill = setTimeout(() => ctrl.abort(), timeoutMs)
  let slowFlagged = false
  const slowTimer = setTimeout(() => {
    slowFlagged = true
    setSlow(1)
  }, SLOW_MS)

  const headers = {}
  let payload = body
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  try {
    const res = await fetch(url, { method, body: payload, headers, signal: ctrl.signal })
    const text = await res.text()
    const data = text ? JSON.parse(text) : null
    if (!res.ok) {
      const detail = data && data.detail ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : res.statusText
      throw new ApiError(`Server error ${res.status}: ${detail}`, res.status)
    }
    return data
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err.name === 'AbortError') throw new ApiError('The server took too long to answer. Please try again.', 0)
    throw new ApiError('Cannot reach the server. Check your internet connection and try again.', 0)
  } finally {
    clearTimeout(kill)
    clearTimeout(slowTimer)
    if (slowFlagged) setSlow(-1)
  }
}

// Turns the global filter into the query parameters the backend expects.
export function rangeParams(filter) {
  const p = { range: filter.range, station: filter.station }
  if (filter.range === 'custom') {
    p.from = filter.from
    p.to = filter.to
  }
  return p
}

export const api = {
  health: () => request('/', { timeoutMs: 75000 }),

  // B.1 Waste receiver
  recordDisposal: ({ file, weightGrams, reason }) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('weight_grams', String(weightGrams))
    fd.append('waste_reason', reason)
    return request('/api/waste/disposal', { method: 'POST', body: fd, timeoutMs: 120000 })
  },

  // B.2 Analytics dashboard
  dashboard: (filter) => request('/api/analytics/dashboard', { params: rangeParams(filter) }),

  // B.3 Live log table: sorting, filters and paging
  logs: (filter, { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc', category, status } = {}) =>
    request('/api/waste/logs', {
      params: { ...rangeParams(filter), page, limit, sort_by: sortBy, sort_order: sortOrder, category, status },
    }),

  // B.4 Log detail pop-up
  logDetail: (eventId) => request(`/api/waste/logs/${encodeURIComponent(eventId)}`),

  // Report data for the ESG and cost analysis reports, in one call (routers/reports.py)
  report: (filter, reason) => request('/api/reports', { params: { ...rangeParams(filter), reason } }),

  // B.5 Admin pricing
  pricing: () => request('/api/config/pricing'),
  savePrices: (prices) => request('/api/config/pricing/batch', { method: 'PUT', body: { prices } }),
  addCategory: ({ key, name, price }) =>
    request('/api/config/pricing/category', {
      method: 'POST',
      body: { category_key: key, display_name: name, price_per_100g_myr: price },
    }),
}

// Fetches every log in the range (all pages). Used by the reports.
export async function fetchAllLogs(filter) {
  const first = await api.logs(filter, { page: 1, limit: 100 })
  const pages = [first]
  for (let p = 2; p <= (first.total_pages || 1); p++) {
    pages.push(await api.logs(filter, { page: p, limit: 100 }))
  }
  return pages.flatMap((pg) => pg.records || [])
}

// Runs async jobs with limited concurrency, so the server is not flooded.
export async function mapLimit(items, limit, fn, onProgress) {
  const out = new Array(items.length)
  let next = 0
  let done = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
      done++
      if (onProgress) onProgress(done, items.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}
