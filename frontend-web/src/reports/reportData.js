import { api, fetchAllLogs, mapLimit } from '../api'
import { CO2_PER_KG, REASONS, dateKey, daysInRange, nowStamp, rangeLabel } from '../lib/format'

// Builds the figures for the ESG and cost analysis reports.
// The backend has no report endpoint yet, so this reads the logs (and, for the cost report,
// each record's detail to get the per-food breakdown) and adds them up here.
export async function loadReport(kind, filter, reason, onProgress) {
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
