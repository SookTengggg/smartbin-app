import { useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../api'
import { useApi } from '../lib/useApi'
import Evidence from '../components/Evidence'
import FilterBar from '../components/FilterBar'
import { CategoryChip, Empty, ErrorBox, Modal, Spinner, StatusBadge } from '../components/ui'
import { dateTimeOf, kg, keysFromSummary, longDate, dateKey, rm, timeOf } from '../lib/format'

const PER_PAGE = 10
// Columns the backend can sort by (database column names).
const SORTABLE = { time: 'created_at', weight: 'total_weight_grams', cost: 'total_financial_loss_myr', status: 'status' }

export default function LiveLog({ filter, setFilter, names, pricing }) {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState({ by: 'created_at', order: 'desc' })
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [openId, setOpenId] = useState(null)

  const query = { page, limit: PER_PAGE, sortBy: sort.by, sortOrder: sort.order, category, status }
  const { data, error, loading, reload: load } = useApi(() => api.logs(filter, query), JSON.stringify([filter, query]))

  // Any change to the filters or sorting goes back to page 1.
  function changeFilter(f) {
    setFilter(f)
    setPage(1)
  }
  function toggleSort(col) {
    const by = SORTABLE[col]
    setSort((s) => (s.by === by ? { by, order: s.order === 'desc' ? 'asc' : 'desc' } : { by, order: 'desc' }))
    setPage(1)
  }
  const head = { sort, onSort: toggleSort }

  const records = data?.records || []
  const total = data?.total_records || 0
  const pages = data?.total_pages || 1
  const first = total ? (page - 1) * PER_PAGE + 1 : 0
  const last = Math.min(page * PER_PAGE, total)
  const multiDay = filter.range !== 'today'

  return (
    <>
      <FilterBar filter={filter} onChange={changeFilter} />
      <section className="panel">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <label className="label">
            Food category
            <select className="field w-52" value={category} onChange={(e) => {
                setCategory(e.target.value)
                setPage(1)
              }}>
              <option value="">All categories</option>
              {pricing.map((p) => (
                <option key={p.category_key} value={p.category_key}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Status
            <select className="field w-44" value={status} onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}>
              <option value="">All statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING_REVIEW">Pending review</option>
            </select>
          </label>
          <p className="hint ml-auto pb-2">
            {total ? `Showing ${first} to ${last} of ${total}` : ''}
          </p>
        </div>

        {error && <ErrorBox error={error} onRetry={load} />}
        {loading && !data && <Spinner label="Loading disposals…" />}
        {data && (
          <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <table className="tbl min-w-[720px]">
              <thead>
                <tr>
                  <SortHead {...head} col="time">Time</SortHead>
                  <th>Food category</th>
                  <SortHead {...head} col="weight" className="n">
                    Total weight
                  </SortHead>
                  <SortHead {...head} col="cost" className="n">
                    Total cost
                  </SortHead>
                  <SortHead {...head} col="status">Status</SortHead>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const keys = keysFromSummary(r.summary_category)
                  return (
                    <tr
                      key={r.event_id}
                      className="click"
                      tabIndex={0}
                      onClick={() => setOpenId(r.event_id)}
                      onKeyDown={(e) => e.key === 'Enter' && setOpenId(r.event_id)}
                    >
                      <td className="num whitespace-nowrap">
                        {multiDay && <span className="text-muted">{longDate(dateKey(r.timestamp_utc))}, </span>}
                        {timeOf(r.timestamp_utc)}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {keys.length ? keys.map((k) => <CategoryChip key={k} catKey={k} names={names} />) : <span className="hint">Not labelled yet</span>}
                        </div>
                      </td>
                      <td className="n">{kg(r.total_weight_grams / 1000, 3)} kg</td>
                      <td className="n">{r.status === 'PENDING_REVIEW' ? '–' : rm(r.total_cost_myr)}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!records.length && <Empty title="No disposals match">Try a longer date range or clear the filters.</Empty>}
          </div>
        )}

        {pages > 1 && <Pager page={page} pages={pages} onPage={setPage} />}
        <p className="hint mt-3">Select a row to see the photo, the AI heatmap, and the weight, cost and AI confidence of each food.</p>
      </section>

      <DetailModal eventId={openId} onClose={() => setOpenId(null)} names={names} />
    </>
  )
}

function SortHead({ col, sort, onSort, children, className = '' }) {
  const on = sort.by === SORTABLE[col]
  const Icon = !on ? ArrowUpDown : sort.order === 'desc' ? ArrowDown : ArrowUp
  return (
    <th className={className} aria-sort={on ? (sort.order === 'desc' ? 'descending' : 'ascending') : 'none'}>
      <button
        className={`inline-flex items-center gap-1 hover:text-accent ${on ? 'text-ink' : ''} ${className.includes('n') ? 'flex-row-reverse' : ''}`}
        onClick={() => onSort(col)}
      >
        {children}
        <Icon size={13} />
      </button>
    </th>
  )
}

function Pager({ page, pages, onPage }) {
  // Show first, last, current and its neighbours, with gaps as "…".
  const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  const items = []
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) items.push('gap' + n)
    items.push(n)
  })
  return (
    <nav className="mt-4 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pages">
      <button className="btn h-9! px-2.5!" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
        <ChevronLeft size={16} />
      </button>
      {items.map((n) =>
        typeof n === 'string' ? (
          <span key={n} className="px-1 text-muted">
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => onPage(n)}
            aria-current={n === page ? 'page' : undefined}
            className={`btn num h-9! min-w-9 px-2.5! ${n === page ? 'border-accent! bg-accent-soft text-accent' : ''}`}
          >
            {n}
          </button>
        ),
      )}
      <button className="btn h-9! px-2.5!" disabled={page === pages} onClick={() => onPage(page + 1)} aria-label="Next page">
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}

function DetailModal({ eventId, onClose, names }) {
  const { data: detail, error } = useApi(() => api.logDetail(eventId), eventId, { keepPrevious: false })

  const pending = detail?.status === 'PENDING_REVIEW'
  return (
    <Modal open={!!eventId} onClose={onClose} title={detail ? `Disposal at ${dateTimeOf(detail.system_metadata.timestamp_utc)}` : 'Disposal'}>
      {error && <ErrorBox error={error} />}
      {!detail && !error && <Spinner />}
      {detail && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3 text-[14px]">
            <StatusBadge status={detail.status} />
            <span className="text-muted">Reason:</span>
            <span>{detail.summary.waste_reason}</span>
            <span className="num ml-auto text-[12px] text-muted">{detail.event_id}</span>
          </div>
          <Evidence
            snapshotUrl={detail.media.snapshot_url}
            heatmapUrl={detail.media.heatmap_url}
            breakdown={detail.volumetric_composition.breakdown}
            totals={{
              weight_g: detail.summary.total_weight_grams,
              cost: detail.summary.total_financial_loss_myr,
              co2: detail.summary.carbon_impact_co2_kg,
            }}
            names={names}
            pending={pending}
          />
        </div>
      )}
    </Modal>
  )
}
