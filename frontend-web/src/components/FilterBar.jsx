import { useState } from 'react'
import { RANGE_OPTIONS, STATIONS, dateKey } from '../lib/format'

// Global filter: date range and kitchen. Used on the dashboard and the live log.
export default function FilterBar({ filter, onChange }) {
  const [today] = useState(() => dateKey(new Date()))
  const [from, setFrom] = useState(() => filter.from || dateKey(new Date(Date.now() - 6 * 864e5)))
  const [to, setTo] = useState(() => filter.to || dateKey(new Date()))
  const [err, setErr] = useState('')

  function setRange(range) {
    setErr('')
    if (range === 'custom') onChange({ ...filter, range, from, to })
    else onChange({ ...filter, range })
  }
  function applyCustom() {
    if (!from || !to) return setErr('Choose both dates.')
    if (from > to) return setErr('The start date must be before the end date.')
    setErr('')
    onChange({ ...filter, range: 'custom', from, to })
  }

  return (
    <div className="mb-[18px] flex flex-wrap items-end gap-4 rounded-[14px] border border-line bg-white/70 px-[18px] py-3.5 shadow-panel">
      <label className="label">
        Date range
        <select className="field w-44" value={filter.range} onChange={(e) => setRange(e.target.value)}>
          {RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {filter.range === 'custom' && (
        <>
          <label className="label">
            From
            <input type="date" className="field" value={from} max={today} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="label">
            To
            <input type="date" className="field" value={to} max={today} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button className="btn" onClick={applyCustom}>
            Apply
          </button>
        </>
      )}
      <label className="label">
        Kitchen
        <select className="field w-44" value={filter.station} onChange={(e) => onChange({ ...filter, station: e.target.value })}>
          {STATIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      {err && <p className="pb-2 text-[13px] text-bad">{err}</p>}
    </div>
  )
}
