import { ApiError, api, fetchAllLogs, mapLimit } from '../api'
import { trendSeries } from '../lib/chartData'
import { CO2_PER_KG, REASONS, addDays, dateKey, daysInRange, hoursForToday, keyOf, longDate, nowStamp, rangeLabel, timeOf } from '../lib/format'
import { ESG_CONFIG } from '../lib/esgConfig'

// ESG report: the chosen period plus the period before it, for the comparative column.
// esgPeriod: 'range' uses the dashboard's date range, 'fy' the financial year to date.
// Both are plain /api/reports calls (custom from/to dates), so no backend change is needed.
export async function loadEsgReport(filter, reason, esgPeriod, onProgress) {
  const today = dateKey(new Date())
  let cur = filter
  let prev
  let curShort = 'This period'
  let prevShort = 'Previous period'
  let fy = null

  if (esgPeriod === 'fy') {
    const m = String(ESG_CONFIG.fyStartMonth).padStart(2, '0')
    let year = Number(today.slice(0, 4))
    if (today < `${year}-${m}-01`) year -= 1
    const start = `${year}-${m}-01`
    const end = addDays(`${year + 1}-${m}-01`, -1)
    const name = (y) => (ESG_CONFIG.fyStartMonth === 1 ? `FY${y}` : `FY${y}/${String(y + 1).slice(2)}`)
    cur = { ...filter, range: 'custom', from: start, to: today }
    prev = { ...filter, range: 'custom', from: `${year - 1}-${m}-01`, to: addDays(start, -1) }
    curShort = `${name(year)} to date`
    prevShort = name(year - 1)
    fy = { name: name(year), start, end, complete: today >= end }
  } else {
    const days = daysInRange(filter)
    const prevEnd = addDays(days[0], -1)
    prev = { ...filter, range: 'custom', from: addDays(days[0], -days.length), to: prevEnd }
  }

  const data = await loadReport('esg', cur, reason, onProgress)
  onProgress?.('Reading the previous period…')
  let before = { disposals: 0, totalKg: 0, co2: 0, pending: { count: 0 } }
  try {
    before = fromReportEndpoint(await api.report(prev, reason), prev, reason)
  } catch (err) {
    // An older backend without /api/reports: show "No comparative" instead of failing the report.
    if (!(err instanceof ApiError && err.status === 404)) throw err
  }
  const hasPrevious = before.disposals > 0 || before.pending.count > 0

  return {
    ...data,
    esg: {
      periodType: esgPeriod === 'fy' ? 'fy' : 'range',
      fy,
      curShort,
      prevShort,
      prevText: `${longDate(prev.from)} to ${longDate(prev.to)}`,
      hasPrevious,
      prev: { totalKg: before.totalKg, co2: before.co2, disposals: before.disposals },
    },
  }
}

// Builds the figures for the ESG and cost analysis reports from GET /api/reports.
// If the backend on the server does not have that endpoint yet (404), it falls back to
// reading every log and adding them up here, which is much slower.
export async function loadReport(kind, filter, reason, onProgress) {
  onProgress?.('Reading report data…')
  try {
    const res = await api.report(filter, reason)
    const data = fromReportEndpoint(res, filter, reason)
    // /api/reports groups by day only, so a "today" report would have a single bar.
    // Split today into hours from the logs instead.
    return filter.range === 'today' ? withHours(data, kind, filter, reason, onProgress) : data
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return loadReportFromLogs(kind, filter, reason, onProgress)
    throw err
  }
}

function fromReportEndpoint(res, filter, reason) {
  const num = (v) => Number(v) || 0
  const foods = (list) =>
    (list || [])
      .map((f) => ({ key: keyOf(f.category), weight_g: num(f.weight_kg) * 1000, cost: num(f.cost_myr) }))
      .filter((f) => f.weight_g > 0)
      .sort((a, b) => b.cost - a.cost)

  const t = res.totals || {}
  const byDay = Object.fromEntries((res.by_day || []).map((d) => [d.date, d]))
  const days = daysInRange(filter)
  const foodRows = foods(res.by_food)
  const reasonList = res.by_reason || []

  return {
    unit: 'day',
    meta: {
      branch: filter.station,
      period: rangeLabel(filter),
      reason: reason || 'All reasons',
      reasonSet: !!reason,
      generated: nowStamp(),
    },
    disposals: num(t.disposals),
    totalKg: num(t.weight_kg),
    totalCost: num(t.cost_myr),
    co2: num(t.carbon_kg),
    pending: { count: num(res.pending?.count), weight_g: num(res.pending?.weight_kg) * 1000 },
    days: days.map((d) => ({
      date: d,
      weight_kg: num(byDay[d]?.weight_kg),
      cost_myr: num(byDay[d]?.cost_myr),
      co2: num(byDay[d]?.carbon_kg),
      count: num(byDay[d]?.count),
    })),
    shares: foodRows.map((f) => ({ category: f.key, weight_kg: f.weight_g / 1000, cost_myr: f.cost })),
    foodRows,
    reasonRows: REASONS.map((name) => {
      const r = reasonList.find((x) => x.reason === name) || {}
      return { reason: name, count: num(r.count), weight_kg: num(r.weight_kg), cost: num(r.cost_myr) }
    }),
    dayRows: (res.by_day || [])
      .filter((d) => num(d.count) > 0)
      .map((d) => ({ date: d.date, foods: foods(d.foods), weight_kg: num(d.weight_kg), cost: num(d.cost_myr) })),
  }
}

// The hour ("09:00") a disposal was logged, in Malaysia time.
const hourOf = (iso) => timeOf(iso).slice(0, 2) + ':00'

// Replaces the one-day rows of a "today" report with one row per hour.
// Totals, foods and reasons stay as /api/reports sent them.
async function withHours(data, kind, filter, reason, onProgress) {
  // All reasons: use the same hourly data as the dashboard's Waste trend chart, so the numbers match it exactly.
  // The dashboard endpoint has no waste reason filter, so with a reason chosen the hours are worked out from the logs.
  if (!reason) return hoursFromDashboard(data, filter, onProgress)
  return hoursFromLogs(data, kind, filter, reason, onProgress)
}

async function hoursFromDashboard(data, filter, onProgress) {
  onProgress?.('Reading today’s hourly figures…')
  const dash = await api.dashboard(filter)
  const series = trendSeries([], dash?.charts?.daily_trends, { hourly: true })
  return {
    ...data,
    unit: 'hour',
    days: series.map((h) => ({ date: h.date, weight_kg: h.weight_kg, cost_myr: h.cost_myr, co2: h.weight_kg * CO2_PER_KG, count: h.count })),
    dayRows: series
      .filter((h) => h.count > 0 || h.weight_kg > 0)
      .map((h) => ({
        date: h.date,
        foods: (h.foods || [])
          .map((f) => ({ key: keyOf(f.category), weight_g: (Number(f.weight_kg) || 0) * 1000, cost: Number(f.cost_myr) || 0 }))
          .filter((f) => f.weight_g > 0)
          .sort((a, b) => b.cost - a.cost),
        weight_kg: h.weight_kg,
        cost: h.cost_myr,
      })),
  }
}

async function hoursFromLogs(data, kind, filter, reason, onProgress) {
  onProgress?.('Reading today’s disposals…')
  const verified = (await fetchAllLogs(filter)).filter((r) => r.status === 'VERIFIED' && (!reason || r.waste_reason === reason))
  const byHour = {}
  verified.forEach((r) => {
    const h = (byHour[hourOf(r.timestamp_utc)] ||= { weight_g: 0, cost: 0, records: [] })
    h.weight_g += Number(r.total_weight_grams) || 0
    h.cost += Number(r.total_cost_myr) || 0
    h.records.push(r)
  })
  const hours = hoursForToday(Object.keys(byHour))
  const out = {
    ...data,
    unit: 'hour',
    days: hours.map((h) => ({
      date: h,
      weight_kg: (byHour[h]?.weight_g || 0) / 1000,
      cost_myr: byHour[h]?.cost || 0,
      co2: ((byHour[h]?.weight_g || 0) / 1000) * CO2_PER_KG,
      count: byHour[h]?.records.length || 0,
    })),
  }
  if (kind !== 'cost') return out

  // The cost report's detail table lists foods per hour, which needs each disposal's breakdown.
  const details = await mapLimit(verified, 6, (r) => api.logDetail(r.event_id), (done, total) =>
    onProgress?.(`Reading food breakdown ${done} of ${total}…`),
  )
  const breakdownOf = Object.fromEntries(verified.map((r, i) => [r.event_id, details[i]?.volumetric_composition?.breakdown || {}]))
  out.dayRows = hours
    .filter((h) => byHour[h])
    .map((h) => {
      const f = {}
      byHour[h].records.forEach((r) =>
        Object.entries(breakdownOf[r.event_id]).forEach(([cat, v]) => {
          const m = (f[cat] ||= { key: cat, weight_g: 0, cost: 0 })
          m.weight_g += Number(v.weight_g ?? v.calculated_weight_grams) || 0
          m.cost += Number(v.cost_myr ?? v.financial_cost_loss_myr) || 0
        }),
      )
      return {
        date: h,
        foods: Object.values(f).filter((x) => x.weight_g > 0).sort((a, b) => b.cost - a.cost),
        weight_kg: byHour[h].weight_g / 1000,
        cost: byHour[h].cost,
      }
    })
  return out
}

// Old way, kept as a fallback: reads the logs and each record's detail.
async function loadReportFromLogs(kind, filter, reason, onProgress) {
  onProgress?.('Reading disposals…')
  const all = (await fetchAllLogs(filter)).filter((r) => !reason || r.waste_reason === reason)
  const verified = all.filter((r) => r.status === 'VERIFIED')
  const pending = all.filter((r) => r.status === 'PENDING_REVIEW')

  const meta = {
    branch: filter.station,
    period: rangeLabel(filter),
    reason: reason || 'All reasons',
    reasonSet: !!reason,
    generated: nowStamp(),
  }
  const days = daysInRange(filter)
  const byDay = Object.fromEntries(days.map((d) => [d, { date: d, weight_g: 0, cost: 0, records: [] }]))
  verified.forEach((r) => {
    const d = byDay[dateKey(r.timestamp_utc)]
    if (!d) return
    d.weight_g += Number(r.total_weight_grams) || 0
    d.cost += Number(r.total_cost_myr) || 0
    d.records.push(r)
  })
  const totalG = verified.reduce((s, r) => s + (Number(r.total_weight_grams) || 0), 0)
  const totalCost = verified.reduce((s, r) => s + (Number(r.total_cost_myr) || 0), 0)
  const pendingInfo = { count: pending.length, weight_g: pending.reduce((s, r) => s + (Number(r.total_weight_grams) || 0), 0) }

  const base = {
    unit: 'day',
    meta,
    disposals: verified.length,
    totalKg: totalG / 1000,
    totalCost,
    co2: (totalG / 1000) * CO2_PER_KG,
    pending: pendingInfo,
    days: days.map((d) => ({
      date: d,
      weight_kg: byDay[d].weight_g / 1000,
      cost_myr: byDay[d].cost,
      co2: (byDay[d].weight_g / 1000) * CO2_PER_KG,
      count: byDay[d].records.length,
    })),
  }
  if (kind === 'esg') return base

  // Cost report: fetch each verified record's food breakdown.
  const details = await mapLimit(verified, 6, (r) => api.logDetail(r.event_id), (done, total) =>
    onProgress?.(`Reading food breakdown ${done} of ${total}…`),
  )
  const breakdownOf = Object.fromEntries(
    verified.map((r, i) => [r.event_id, details[i]?.volumetric_composition?.breakdown || {}]),
  )
  const addFood = (map, bd) => {
    Object.entries(bd).forEach(([cat, v]) => {
      const m = (map[cat] ||= { key: cat, weight_g: 0, cost: 0 })
      m.weight_g += Number(v.weight_g) || 0
      m.cost += Number(v.cost_myr) || 0
    })
    return map
  }

  const food = {}
  verified.forEach((r) => addFood(food, breakdownOf[r.event_id]))
  const foodRows = Object.values(food)
    .filter((f) => f.weight_g > 0)
    .sort((a, b) => b.cost - a.cost)

  const reasonRows = REASONS.map((name) => {
    const rs = verified.filter((r) => r.waste_reason === name)
    return {
      reason: name,
      count: rs.length,
      weight_kg: rs.reduce((s, r) => s + (Number(r.total_weight_grams) || 0), 0) / 1000,
      cost: rs.reduce((s, r) => s + (Number(r.total_cost_myr) || 0), 0),
    }
  })

  const dayRows = days
    .filter((d) => byDay[d].records.length)
    .map((d) => {
      const f = {}
      byDay[d].records.forEach((r) => addFood(f, breakdownOf[r.event_id]))
      return {
        date: d,
        foods: Object.values(f)
          .filter((x) => x.weight_g > 0)
          .sort((a, b) => b.cost - a.cost),
        weight_kg: byDay[d].weight_g / 1000,
        cost: byDay[d].cost,
      }
    })

  return {
    ...base,
    shares: foodRows.map((f) => ({ category: f.key, weight_kg: f.weight_g / 1000, cost_myr: f.cost })),
    foodRows,
    reasonRows,
    dayRows,
  }
}
