import { useState } from 'react'
import { api } from '../api'
import { useApi } from '../lib/useApi'
import FilterBar from '../components/FilterBar'
import { CategoryDonut, ReasonList, TrendBars } from '../components/charts'
import { trendSeries } from '../lib/chartData'
import { Empty, ErrorBox, PendingNote, Spinner } from '../components/ui'
import { REASONS, daysInRange, kg, previousLabel } from '../lib/format'
import ReportModal from '../reports/ReportModal'
import { ESG_CONFIG } from '../lib/esgConfig'

function Kpi({ label, value, unit, prefix, change, prevLabel, note }) {
  // Less waste than before is good (green); more is bad (red).
  const tone = change > 0 ? 'bad' : change < 0 ? 'good' : null
  return (
    <div
      className={`rounded-[14px] border bg-panel px-5 py-4 shadow-panel ${
        tone === 'bad' ? 'border-bad/40 bg-[linear-gradient(180deg,#FFF5F6,#fff)]' : tone === 'good' ? 'border-good/40 bg-[linear-gradient(180deg,#F1FBF4,#fff)]' : 'border-line'
      }`}
    >
      <div className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-muted">{label}</div>
      <div className="mt-1.5 font-head text-[30px] font-semibold">
        {prefix && <span className="mr-1.5 text-[16px] font-medium text-muted">{prefix}</span>}
        {value}
        {unit && <span className="ml-1.5 text-[15px] font-medium text-muted">{unit}</span>}
      </div>
      {change !== undefined ? (
        <div className={`text-[13.5px] ${tone === 'bad' ? 'text-bad' : tone === 'good' ? 'text-good' : 'text-muted'}`}>
          {change > 0 ? '+' : ''}
          {Number(change).toFixed(1)}% vs {prevLabel}
        </div>
      ) : (
        <div className="hint">{note}</div>
      )}
    </div>
  )
}

export default function Dashboard({ filter, setFilter, names }) {
  const { data, error, loading, reload: load } = useApi(() => api.dashboard(filter), JSON.stringify(filter))
  const [reason, setReason] = useState('')
  const [esgPeriod, setEsgPeriod] = useState('fy') // ESG report: financial year to date, or the date range above
  const [showBursa, setShowBursa] = useState(ESG_CONFIG.showBursa) // Bursa Malaysia codes, for listed companies
  const [report, setReport] = useState(null) // 'esg' | 'cost'

  const k = data?.kpi_cards
  const charts = data?.charts
  const days = daysInRange(filter)
  const hourly = filter.range === 'today'
  const series = trendSeries(days, charts?.daily_trends, { hourly })
  // The reason list has no cost of its own, so it is the sum of its foods' cost.
  const reasons = REASONS.map((r) => {
    const hit = charts?.root_cause_analysis?.find((x) => x.reason === r) || { reason: r, count: 0, weight_kg: 0, foods: [] }
    return { ...hit, cost_myr: (hit.foods || []).reduce((s, f) => s + (Number(f.cost_myr) || 0), 0) }
  })
  const pending = k?.pending_review_notice
  // The backend renamed total_weight_kg to total_waste_weight_kg; accept both.
  const totalKg = k ? Number(k.total_waste_weight_kg ?? k.total_weight_kg ?? 0) : 0
  const hasData = totalKg > 0

  return (
    <>
      <FilterBar filter={filter} onChange={setFilter} />
      {error && (
        <div className="mb-4">
          <ErrorBox error={error} onRetry={load} />
        </div>
      )}
      {loading && !data && <Spinner label="Loading dashboard…" />}

      {data && (
        <div className={`flex flex-col gap-[18px] transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {pending?.count > 0 && (
            <PendingNote>
              {pending.count} {pending.count === 1 ? 'disposal' : 'disposals'} ({kg(pending.weight_kg)} kg) {pending.count === 1 ? 'is' : 'are'} waiting
              for manual review and {pending.count === 1 ? 'is' : 'are'} not included in the figures on this page.
            </PendingNote>
          )}

          <div className="grid grid-cols-3 gap-[18px] max-lg:grid-cols-1">
            <Kpi label="Total weight" value={kg(totalKg, 1)} unit="kg" change={k.weight_growth_percentage} prevLabel={previousLabel(filter)} />
            <Kpi label="Total money lost" prefix="RM" value={Number(k.total_profit_leakage_myr).toFixed(2)} change={k.cost_growth_percentage} prevLabel={previousLabel(filter)} />
            <Kpi label="Carbon footprint" value={kg(k.total_carbon_impact_co2_kg, 1)} unit="kg CO2e" note="Estimated at 0.70 kg CO2e per kg of food waste sent to landfill" />
          </div>

          <section className="panel">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[16px]">Waste trend</h2>
              <span className="hint">{hourly ? 'Each bar is one hour today. ' : ''}Point at a bar to see its weight, cost and foods</span>
            </div>
            {hasData ? (
              <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
                <TrendBars data={series} dataKey="weight_kg" title="Weight thrown away" yLabel="Weight (kg)" from="#F7C948" to="#D99400" id="gW" names={names} />
                <TrendBars data={series} dataKey="cost_myr" title="Money lost" yLabel="Cost (RM)" from="#EE6A55" to="#B3261E" id="gC" names={names} />
              </div>
            ) : (
              <Empty title="No verified waste in this period">Choose a longer date range, or log a disposal on the Waste receiver page.</Empty>
            )}
          </section>

          <div className="grid grid-cols-2 gap-[18px] max-lg:grid-cols-1">
            <section className="panel">
              <h2 className="mb-4 text-[16px]">Waste by food category</h2>
              {hasData ? <CategoryDonut shares={charts.taxonomy_category_share} names={names} /> : <Empty title="No data yet" />}
            </section>
            <section className="panel">
              <h2 className="mb-1 text-[16px]">Why food was thrown away</h2>
              <p className="hint mb-3">Number of disposals for each reason. Select a reason to see which foods were thrown away.</p>
              {hasData ? <ReasonList rows={reasons} names={names} /> : <Empty title="No data yet" />}
            </section>
          </div>

          <section className="panel">
            <h2 className="mb-4 text-[16px]">Reports</h2>
            <div className="mb-4 flex flex-wrap items-end gap-4">
              <label className="label">
                Waste reason
                <select className="field w-56" value={reason} onChange={(e) => setReason(e.target.value)}>
                  <option value="">All reasons</option>
                  {REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="label">
                ESG report period
                <select className="field w-64" value={esgPeriod} onChange={(e) => setEsgPeriod(e.target.value)}>
                  <option value="fy">Financial year to date</option>
                  <option value="range">Date range at the top of this page</option>
                </select>
              </label>
              <label className="flex h-[38px] cursor-pointer items-center gap-2 rounded-lg border border-ctl bg-white px-3 text-[14px] hover:border-accent">
                <input type="checkbox" className="h-4 w-4 accent-[#047857]" checked={showBursa} onChange={(e) => setShowBursa(e.target.checked)} />
                Include Bursa Malaysia codes
                <span className="hint">(listed companies)</span>
              </label>
              <p className="hint max-w-md pb-2">
                Both reports use this waste reason. The cost report uses the date range at the top. The ESG report uses the financial year unless you
                choose the date range.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
              <ReportCard
                title="ESG report"
                text="Scope 3 Category 5 emissions, food waste metrics with the previous period, methodology and disclosure index."
                onOpen={() => setReport('esg')}
                button="Preview ESG report"
              />
              <ReportCard
                title="Cost analysis report"
                text="Summary figures, charts, and cost tables by food, reason and day."
                onOpen={() => setReport('cost')}
                button="Preview cost analysis report"
              />
            </div>
          </section>
        </div>
      )}

      <ReportModal kind={report} onClose={() => setReport(null)} filter={filter} reason={reason} names={names} esgPeriod={esgPeriod} showBursa={showBursa} />
    </>
  )
}

function ReportCard({ title, text, onOpen, button }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-panel2 px-[18px] py-4">
      <h3 className="text-[15px]">{title}</h3>
      <p className="hint">{text}</p>
      <button className="btn btn-primary" onClick={onOpen}>
        {button}
      </button>
    </div>
  )
}
