import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import Sidebar from './components/Sidebar'
import { PAGES } from './lib/nav'
import { api, onSlowChange } from './api'
import WasteReceiver from './pages/WasteReceiver'
import Dashboard from './pages/Dashboard'
import LiveLog from './pages/LiveLog'
import Admin from './pages/Admin'

function pageFromHash() {
  const id = window.location.hash.replace('#', '')
  return PAGES.some((p) => p.id === id) ? id : 'dashboard'
}

export default function App() {
  const [page, setPage] = useState(pageFromHash)
  const [filter, setFilter] = useState({ range: '7days', station: 'Main Kitchen', from: '', to: '' })
  const [pricing, setPricing] = useState([])
  const [health, setHealth] = useState('checking')
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => onSlowChange(setSlow), [])
  useEffect(() => {
    api
      .health()
      .then(() => setHealth('online'))
      .catch(() => setHealth('offline'))
  }, [])

  const loadPricing = useCallback(() => {
    return api
      .pricing()
      .then((rows) => {
        setPricing(rows || [])
        return rows
      })
      .catch(() => [])
  }, [])
  useEffect(() => {
    loadPricing()
  }, [loadPricing])

  // { category_key: display_name }, used everywhere a category is shown
  const names = Object.fromEntries(pricing.map((p) => [p.category_key, p.display_name]))
  const current = PAGES.find((p) => p.id === page)

  function navigate(id) {
    window.location.hash = id
    setPage(id)
  }

  return (
    <div className="grid min-h-full grid-cols-[240px_minmax(0,1fr)] max-md:grid-cols-1">
      <Sidebar page={page} onNavigate={navigate} />
      <main className="main-bg min-w-0 px-8 pt-7 pb-12 max-md:px-4">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="grad-text inline-block text-[27px]">{current.title}</h1>
            <p className="mt-1 text-muted">{current.sub}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 font-mono text-[12px] text-muted">
            <span
              className={`h-2 w-2 rounded-full ${
                health === 'online' ? 'bg-good' : health === 'offline' ? 'bg-bad' : 'animate-pulse bg-gold'
              }`}
            />
            {health === 'online' ? 'Server online' : health === 'offline' ? 'Server offline' : 'Connecting…'}
          </span>
        </div>

        {slow && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-[14px] text-muted" role="status">
            <LoaderCircle size={16} className="animate-spin" />
            The server is waking up. The first request after a quiet period can take up to a minute.
          </div>
        )}

        {page === 'receiver' && <WasteReceiver names={names} />}
        {page === 'dashboard' && <Dashboard filter={filter} setFilter={setFilter} names={names} />}
        {page === 'log' && <LiveLog filter={filter} setFilter={setFilter} names={names} pricing={pricing} />}
        {page === 'admin' && <Admin pricing={pricing} reload={loadPricing} />}
      </main>
    </div>
  )
}
