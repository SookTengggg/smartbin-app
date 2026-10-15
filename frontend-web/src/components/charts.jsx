import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { kg, pct, rm } from '../lib/format'
import { donutSlices, foodsOf } from '../lib/chartData'

const AXIS = { fontSize: 11, fill: '#536571', fontFamily: 'IBM Plex Mono, monospace' }

// Printed charts are narrow, so a date label ("14 Oct") is drawn on two lines: day, then month.
function TwoLineTick({ x, y, payload }) {
  const [top, bottom] = String(payload.value).split(' ')
  return (
    <text x={x} y={y + 10} textAnchor="middle" fontSize={10.5} fill="#536571" fontFamily="IBM Plex Mono, monospace">
      <tspan x={x}>{top}</tspan>
      {bottom && (
        <tspan x={x} dy={11}>
          {bottom}
        </tspan>
      )}
    </text>
  )
}

// Weight and cost of each food, used in the trend tooltip and under each waste reason.
export function FoodBreakdown({ foods, names, dark = false, max = 6 }) {
  const rows = foodsOf(foods, names)
  if (!rows.length) return null
  const shown = rows.slice(0, max)
  const muted = dark ? 'text-[#9FB1BC]' : 'text-muted'
  return (
    <table className="w-full border-collapse text-[12.5px]">
      <thead>
        <tr className={`text-left text-[11px] uppercase tracking-[0.05em] ${muted}`}>
          <th className="py-0.5 pr-3 font-normal">Food</th>
          <th className="py-0.5 pr-3 text-right font-normal">kg</th>
          <th className="py-0.5 text-right font-normal">RM</th>
        </tr>
      </thead>
      <tbody>
        {shown.map((f) => (
          <tr key={f.key}>
            <td className="py-0.5 pr-3">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: f.color }} />
              {f.name}
            </td>
            <td className="num py-0.5 pr-3 text-right">{kg(f.weight_kg)}</td>
            <td className="num py-0.5 text-right">{f.cost_myr.toFixed(2)}</td>
          </tr>
        ))}
        {rows.length > max && (
          <tr>
            <td colSpan={3} className={`pt-0.5 ${muted}`}>
              and {rows.length - max} more
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

function TrendTooltip({ active, payload, names }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="min-w-[200px] max-w-[280px] rounded-xl bg-[#0B1319] px-3.5 py-3 text-[13px] text-[#E9F1F5] shadow-panel">
      <div className="mb-2 font-head text-[13.5px] font-semibold">{d.title || d.label}</div>
      <div className="num flex justify-between gap-3">
        <span className="font-body text-[#9FB1BC]">Weight</span>
        {kg(d.weight_kg)} kg
      </div>
      <div className="num flex justify-between gap-3">
        <span className="font-body text-[#9FB1BC]">Cost</span>
        {rm(d.cost_myr)}
      </div>
      {d.count > 0 && (
        <div className="num flex justify-between gap-3">
          <span className="font-body text-[#9FB1BC]">Disposals</span>
          {d.count}
        </div>
      )}
      {d.foods?.length > 0 && (
        <div className="mt-2 border-t border-[#24323D] pt-2">
          <FoodBreakdown foods={d.foods} names={names} dark />
        </div>
      )}
    </div>
  )
}

// One measure per chart (weight or cost), one bar per day (or per hour for "today").
// static: fixed size without animation, for the printed report.
export function TrendBars({ data, dataKey, title, yLabel, xLabel, from, to, id, staticSize, names }) {
  // The printed chart is small: label every bar up to 8 bars, otherwise about 7 evenly spaced labels.
  const tickInterval = staticSize ? (data.length <= 8 ? 0 : Math.ceil(data.length / 7) - 1) : 'preserveStartEnd'
  const twoLine = !!staticSize && data.some((d) => String(d.label).includes(' '))
  const chart = (
    <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: xLabel ? 16 : 4 }} width={staticSize?.w} height={staticSize?.h}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} stroke="#E2EAEE" />
      <XAxis
        dataKey="label"
        tick={twoLine ? <TwoLineTick /> : AXIS}
        height={twoLine ? 34 : 30}
        tickLine={false}
        axisLine={{ stroke: '#B2C0C9' }}
        interval={tickInterval}
        minTickGap={staticSize ? 2 : 8}
        label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -12, style: { fontSize: 11, fill: '#536571' } } : undefined}
      />
      <YAxis
        tick={AXIS}
        tickLine={false}
        axisLine={false}
        width={staticSize ? 54 : 44}
        label={{ value: yLabel, angle: -90, position: 'insideLeft', style: { ...AXIS, textAnchor: 'middle' }, dx: staticSize ? -2 : 2 }}
      />
      {!staticSize && <Tooltip content={<TrendTooltip names={names} />} cursor={{ fill: 'rgba(4,120,87,0.06)' }} />}
      <Bar dataKey={dataKey} fill={`url(#${id})`} radius={[4, 4, 0, 0]} maxBarSize={46} isAnimationActive={!staticSize} />
    </BarChart>
  )
  return (
    <figure className="m-0 min-w-0">
      <figcaption className={`mb-2 flex items-center gap-2 font-medium ${staticSize ? 'text-[11px] font-semibold' : 'text-[14px]'}`}>
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: to }} />
        {title}
      </figcaption>
      {staticSize ? chart : <ResponsiveContainer width="100%" height={240}>{chart}</ResponsiveContainer>}
    </figure>
  )
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] shadow-panel">
      <div className="mb-1 font-medium">{d.name}</div>
      <div className="num">
        {kg(d.weight_kg)} kg · {pct(d.pct)}
      </div>
      <div className="num">{rm(d.cost_myr)}</div>
    </div>
  )
}

export function CategoryDonut({ shares, names, size = 190, compact = false }) {
  const { slices, total } = donutSlices(shares, names)
  return (
    <div className={`flex items-center ${compact ? 'gap-4' : 'gap-6 max-sm:flex-col'}`}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <PieChart width={size} height={size}>
          <Pie
            data={slices}
            dataKey="weight_kg"
            nameKey="name"
            innerRadius={size * 0.32}
            outerRadius={size / 2 - 2}
            stroke="#fff"
            strokeWidth={2}
            isAnimationActive={!compact}
          >
            {slices.map((s) => (
              <Cell key={s.key} fill={s.color} />
            ))}
          </Pie>
          {!compact && <Tooltip content={<DonutTooltip />} />}
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <b className={`font-head ${compact ? 'text-[15px]' : 'text-[22px]'}`}>{kg(total, 1)}</b>
          <span className={`font-mono text-muted ${compact ? 'text-[9px]' : 'text-[11px]'}`}>kg total</span>
        </div>
      </div>
      {compact ? (
        <ul className="m-0 flex min-w-0 flex-1 list-none flex-col gap-0.5 p-0 text-[10.5px]">
          {slices.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              <span className="num text-muted">{pct(s.pct)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="min-w-0 flex-1 overflow-x-auto max-sm:w-full">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="pb-1.5 font-normal">Food</th>
                <th className="pb-1.5 pl-3 text-right font-normal">kg</th>
                <th className="pb-1.5 pl-3 text-right font-normal">RM</th>
                <th className="pb-1.5 pl-3 text-right font-normal">Share</th>
              </tr>
            </thead>
            <tbody>
              {slices.map((s) => (
                <tr key={s.key} className="border-t border-line">
                  <td className="py-1.5">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                      <span className="truncate">{s.name}</span>
                    </span>
                  </td>
                  <td className="num py-1.5 pl-3 text-right">{kg(s.weight_kg)}</td>
                  <td className="num py-1.5 pl-3 text-right">{Number(s.cost_myr || 0).toFixed(2)}</td>
                  <td className="num py-1.5 pl-3 text-right text-muted">{pct(s.pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Dashboard version: each reason opens to show which foods were thrown away for it, with weight and cost.
export function ReasonList({ rows, names }) {
  const [open, setOpen] = useState(null)
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[14px]">
      {rows.map((r) => {
        const isOpen = open === r.reason
        const canOpen = r.count > 0 && r.foods?.length > 0
        return (
          <li key={r.reason} className={`rounded-lg ${isOpen ? 'bg-hover' : ''}`}>
            <button
              type="button"
              disabled={!canOpen}
              onClick={() => setOpen(isOpen ? null : r.reason)}
              aria-expanded={canOpen ? isOpen : undefined}
              className="grid w-full grid-cols-[16px_150px_1fr_36px] items-center gap-3 rounded-lg px-1.5 py-1.5 text-left enabled:cursor-pointer enabled:hover:bg-hover max-sm:grid-cols-[16px_100px_1fr_30px]"
            >
              <ChevronRight size={14} className={`text-muted transition-transform ${isOpen ? 'rotate-90' : ''} ${canOpen ? '' : 'opacity-0'}`} />
              <span className="truncate">{r.reason}</span>
              <span className="h-3 overflow-hidden rounded-full bg-track">
                <span className="block h-full rounded-full bg-[linear-gradient(90deg,#F59E0B,#DC2626)]" style={{ width: `${(r.count / max) * 100}%` }} />
              </span>
              <span className="num text-right">{r.count}</span>
            </button>
            {isOpen && (
              <div className="px-3 pt-1 pb-3 pl-8">
                <p className="hint mb-1.5">
                  {kg(r.weight_kg)} kg in {r.count} {r.count === 1 ? 'disposal' : 'disposals'}
                  {r.cost_myr !== undefined ? `, ${rm(r.cost_myr)}` : ''}
                </p>
                <FoodBreakdown foods={r.foods} names={names} max={13} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function ReasonBars({ rows, compact = false }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <ul className={`m-0 flex list-none flex-col p-0 ${compact ? 'gap-1 text-[10.5px]' : 'gap-3 text-[14px]'}`}>
      {rows.map((r) => (
        <li
          key={r.reason}
          className={`grid items-center gap-3 ${compact ? 'grid-cols-[110px_1fr_24px]' : 'grid-cols-[160px_1fr_36px] max-sm:grid-cols-[110px_1fr_30px]'}`}
          title={`${r.reason}: ${r.count} disposals, ${kg(r.weight_kg)} kg`}
        >
          <span className="truncate">{r.reason}</span>
          <span className={`${compact ? 'h-2' : 'h-3'} overflow-hidden rounded-full bg-track`}>
            <span className="block h-full rounded-full bg-[linear-gradient(90deg,#F59E0B,#DC2626)]" style={{ width: `${(r.count / max) * 100}%` }} />
          </span>
          <span className="num text-right">{r.count}</span>
        </li>
      ))}
    </ul>
  )
}
