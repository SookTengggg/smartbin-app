import { CategoryDonut, ReasonBars, TrendBars } from '../components/charts'
import { CO2_PER_KG, categoryName, kg, rm } from '../lib/format'
import { isHour, slotLong, slotShort, slotWord } from './slots'

export function Header({ title, subtitle }) {
  return (
    <div className="mb-3 flex items-center gap-3 border-b border-[#C9D2D8] pb-3">
      <img src="/logo.png" alt="" className="h-11 w-11" />
      <div>
        <h1 className="m-0">{title}</h1>
        <p className="m-0 text-[10.5px] text-[#5A6770]">{subtitle}</p>
      </div>
    </div>
  )
}

export function Meta({ rows }) {
  return (
    <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-0.5 text-[11.5px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[#5A6770]">{k}</dt>
          <dd className="m-0 font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Footer({ meta, label }) {
  return (
    <div className="mt-4 flex justify-between border-t border-[#C9D2D8] pt-1.5 text-[9.5px] text-[#5A6770]">
      <span>{label}</span>
      <span>Generated {meta.generated}</span>
    </div>
  )
}

export function CostReport({ data, names, idPrefix = 'r' }) {
  const { meta } = data
  const chartData = data.days.map((d) => ({ ...d, label: slotShort(data, d.date) }))
  const xLabel = isHour(data) ? `Time of day, ${meta.period} (each bar is one hour)` : `Date, ${meta.period} (each bar is one day)`
  return (
    <div className="sheet">
      <Header title="Cost Analysis Report" subtitle="SmartBin food waste tracking" />
      <Meta
        rows={[
          ['Branch', meta.branch],
          ['Period', meta.period],
          ['Waste reason', meta.reason],
        ]}
      />
      <div className="rpk mb-3.5 grid-cols-3">
        <div>
          <span>Total weight</span>
          <b>{kg(data.totalKg)} kg</b>
        </div>
        <div>
          <span>Total cost</span>
          <b>{rm(data.totalCost)}</b>
        </div>
        <div>
          <span>Disposals</span>
          <b>{data.disposals}</b>
        </div>
      </div>

      {data.disposals === 0 ? (
        <p>No disposals match this period and waste reason.</p>
      ) : (
        <>
          <section>
            <h3>1. Charts</h3>
            <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-[11px]">
              <TrendBars data={chartData} dataKey="weight_kg" title="Weight thrown away" yLabel="Weight (kg)" xLabel={xLabel} from="#F7C948" to="#D99400" id={`${idPrefix}W`} staticSize={{ w: 330, h: 190 }} />
              <TrendBars data={chartData} dataKey="cost_myr" title="Money lost" yLabel="Cost (RM)" xLabel={xLabel} from="#EE6A55" to="#B3261E" id={`${idPrefix}C`} staticSize={{ w: 330, h: 190 }} />
              <figure className="m-0">
                <figcaption className="mb-2 text-[11px] font-semibold">Waste by food category (share of weight)</figcaption>
                <CategoryDonut shares={data.shares} names={names} size={112} compact />
              </figure>
              {!meta.reasonSet && (
                <figure className="m-0">
                  <figcaption className="mb-2 text-[11px] font-semibold">Why food was thrown away (number of disposals)</figcaption>
                  <ReasonBars rows={data.reasonRows} compact />
                </figure>
              )}
            </div>
          </section>

          <section>
            <h3>2. Cost by food</h3>
            <table className="rpt">
              <thead>
                <tr>
                  <th>Food category</th>
                  <th className="n">Weight (kg)</th>
                  <th className="n">Cost (RM)</th>
                  <th className="n">Share of cost</th>
                </tr>
              </thead>
              <tbody>
                {data.foodRows.map((f) => (
                  <tr key={f.key}>
                    <td>{categoryName(f.key, names)}</td>
                    <td className="n">{kg(f.weight_g / 1000)}</td>
                    <td className="n">{f.cost.toFixed(2)}</td>
                    <td className="n">{data.totalCost ? ((f.cost / data.totalCost) * 100).toFixed(1) : '0.0'}%</td>
                  </tr>
                ))}
                <tr className="tot">
                  <td>Total</td>
                  <td className="n">{kg(data.totalKg)}</td>
                  <td className="n">{data.totalCost.toFixed(2)}</td>
                  <td className="n">100.0%</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3>3. Cost by reason</h3>
            <table className="rpt">
              <thead>
                <tr>
                  <th>Reason</th>
                  <th className="n">Disposals</th>
                  <th className="n">Weight (kg)</th>
                  <th className="n">Cost (RM)</th>
                </tr>
              </thead>
              <tbody>
                {data.reasonRows
                  .filter((r) => r.count > 0)
                  .map((r) => (
                    <tr key={r.reason}>
                      <td>{r.reason}</td>
                      <td className="n">{r.count}</td>
                      <td className="n">{kg(r.weight_kg)}</td>
                      <td className="n">{r.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                <tr className="tot">
                  <td>Total</td>
                  <td className="n">{data.disposals}</td>
                  <td className="n">{kg(data.totalKg)}</td>
                  <td className="n">{data.totalCost.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="break-inside-auto!">
            <h3>4. Detail by {slotWord(data)}</h3>
            <table className="rpt">
              <thead>
                <tr>
                  <th>{isHour(data) ? 'Hour' : 'Date'}</th>
                  <th>Food category</th>
                  <th className="n">Weight (kg)</th>
                  <th className="n">Cost (RM)</th>
                  <th className="n">{isHour(data) ? 'Hour' : 'Day'} total (kg)</th>
                  <th className="n">{isHour(data) ? 'Hour' : 'Day'} total (RM)</th>
                </tr>
              </thead>
              <tbody>
                {data.dayRows.flatMap((d) =>
                  d.foods.map((f, i) => {
                    const last = i === d.foods.length - 1
                    return (
                      <tr key={d.date + f.key} style={i === 0 ? { borderTop: '1.5px solid #4B5963' } : undefined}>
                        <td className="font-medium">{i === 0 ? slotLong(data, d.date) : ''}</td>
                        <td>{categoryName(f.key, names)}</td>
                        <td className="n">{kg(f.weight_g / 1000)}</td>
                        <td className="n">{f.cost.toFixed(2)}</td>
                        <td className="n sub">{last ? kg(d.weight_kg) : ''}</td>
                        <td className="n sub">{last ? d.cost.toFixed(2) : ''}</td>
                      </tr>
                    )
                  }),
                )}
                <tr className="tot">
                  <td colSpan={4} className="text-right">
                    Total
                  </td>
                  <td className="n">{kg(data.totalKg)}</td>
                  <td className="n">{data.totalCost.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3>5. Data for ESG reporting</h3>
            <table className="rpt">
              <thead>
                <tr>
                  <th>Figure</th>
                  <th className="n">Value</th>
                  <th>How it is obtained</th>
                  <th>Data type</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Food waste generated</td>
                  <td className="n">{kg(data.totalKg)} kg</td>
                  <td>Weighed by the scale in the bin at each disposal</td>
                  <td>Measured</td>
                </tr>
                <tr>
                  <td>Estimated emissions from this food waste</td>
                  <td className="n">{kg(data.co2)} kg CO2e</td>
                  <td>Weight × {CO2_PER_KG} kg CO2e per kg (UK DESNZ 2026, food waste sent to landfill)</td>
                  <td>Estimated</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-1 text-[9.5px] text-[#5A6770]">
              The food waste weight is direct, measured data. A company can use it as activity data in its own ESG or sustainability report, under Scope 3
              Category 5 (waste generated in operations). The emission figure assumes all food waste goes to landfill. SmartBin measures food waste only,
              so this is not an ESG report.
            </p>
          </section>
        </>
      )}
      <p className="text-[9.5px] text-[#5A6770]">
        Cost is each food's weight multiplied by its price per 100 g. {isHour(data) ? 'Hours' : 'Days'} with no disposals are left out.
        {data.pending.count > 0 &&
          ` ${data.pending.count} disposal(s) (${kg(data.pending.weight_g / 1000)} kg) awaiting manual review are not included.`}
      </p>
      <Footer meta={meta} label={`SmartBin cost analysis report · ${meta.branch}, ${meta.period}`} />
    </div>
  )
}
