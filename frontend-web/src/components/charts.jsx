import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { kg, pct, rm } from '../lib/format'
import { donutSlices } from '../lib/chartData'

const AXIS = { fontSize: 11, fill: '#536571', fontFamily: 'IBM Plex Mono, monospace' }

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] shadow-panel">
      <div className="mb-1 font-medium">{d.label}</div>
      <div className="num">Weight: {kg(d.weight_kg)} kg</div>
      <div className="num">Cost: {rm(d.cost_myr)}</div>
    </div>
  )
}

// One measure per chart (weight or cost), one bar per day.
// static: fixed size without animation, for the printed report.
export function TrendBars({ data, dataKey, title, yLabel, from, to, id, staticSize }) {
  const chart = (
    <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }} width={staticSize?.w} height={staticSize?.h}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} stroke="#E2EAEE" />
      <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#B2C0C9' }} interval="preserveStartEnd" minTickGap={8} />
      <YAxis
        tick={AXIS}
        tickLine={false}
        axisLine={false}
        width={44}
        label={{ value: yLabel, angle: -90, position: 'insideLeft', style: { ...AXIS, textAnchor: 'middle' }, dx: 2 }}
      />
      {!staticSize && <Tooltip content={<TrendTooltip />} cursor={{ fill: 'rgba(4,120,87,0.06)' }} />}
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
      <ul className={`m-0 flex min-w-0 flex-1 list-none flex-col p-0 ${compact ? 'gap-0.5 text-[10.5px]' : 'gap-1.5 text-[14px]'}`}>
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className={`${compact ? 'h-2 w-2' : 'h-2.5 w-2.5'} shrink-0 rounded-full`} style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            <span className="num text-muted">{pct(s.pct)}</span>
          </li>
        ))}
      </ul>
    </div>
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
