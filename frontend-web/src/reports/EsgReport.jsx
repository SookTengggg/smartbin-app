import { ESG_CONFIG, ROUTES } from '../lib/esgConfig'
import { MON_LONG, categoryName, kg, longDate } from '../lib/format'
import { Footer, Header, Meta } from './Reports'
import { isHour, slotLong } from './slots'

// ESG-ready data report: Scope 3 Category 5 (food waste).
// Figures come from the backend. Company settings and standard text come from lib/esgConfig.js.
// The report is always marked DRAFT: it supports a disclosure, it is not an audited report.

const C = ESG_CONFIG
const t3 = (kgValue) => (kgValue / 1000).toFixed(3)

function ToConfirm({ children }) {
  return (
    <span className="rounded-sm border-b border-dashed border-[#E1B95A] bg-[#FFF1C9] px-0.5 text-[#6E4A00]">
      <span className="mr-1 font-mono text-[8.5px] uppercase">To confirm:</span>
      {children}
    </span>
  )
}

function Pill({ tone, children }) {
  const cls = {
    ok: 'border-[#2F6B52] text-[#2F6B52]',
    part: 'border-[#E1B95A] bg-[#FFF1C9] text-[#6E4A00]',
    no: 'border-[#AEB9C0] text-[#7D8B86]',
  }[tone]
  return <span className={`inline-block whitespace-nowrap rounded-full border px-1.5 text-[9px] font-medium ${cls}`}>{children}</span>
}

function NoComp({ span = 1 }) {
  return (
    <td className="italic text-[#7D8B86]" colSpan={span}>
      No comparative
    </td>
  )
}

function Method({ k, title, cite, children }) {
  return (
    <div className="mb-2.5 grid grid-cols-[26px_1fr] gap-x-1 text-[10.5px] leading-[1.45]">
      <span className="font-mono text-[10px] text-[#2F6B52]">{k}</span>
      <div>
        <h4 className="m-0 mb-0.5 font-head text-[11px] font-semibold">{title}</h4>
        {children}
        <div className="mt-0.5 font-mono text-[8.5px] text-[#5A6770]">{cite}</div>
      </div>
    </div>
  )
}

// Rows of the timeline table: by hour (today), by day, or by month (more than 31 days).
function timeline(data) {
  const used = data.days.filter((d) => d.count > 0 || d.weight_kg > 0)
  if (isHour(data) || data.days.length <= 31) {
    return { unit: isHour(data) ? 'Hour' : 'Date', rows: used.map((d) => ({ label: slotLong(data, d.date), ...d })) }
  }
  const months = {}
  used.forEach((d) => {
    const m = (months[d.date.slice(0, 7)] ||= { label: '', count: 0, weight_kg: 0, co2: 0 })
    const [y, mo] = d.date.split('-').map(Number)
    m.label = `${MON_LONG[mo - 1]} ${y}`
    m.count += d.count
    m.weight_kg += d.weight_kg
    m.co2 += d.co2
  })
  return { unit: 'Month', rows: Object.values(months) }
}

export function EsgReport({ data, names, showBursa = C.showBursa }) {
  // Bursa code for a metric row, or a dash when the user leaves Bursa codes off.
  const bursa = (code) => (showBursa ? `Bursa ${code}` : '–')
  const { meta, esg } = data
  const route = C.disposalRoute ? ROUTES[C.disposalRoute] : null
  const routeLabel = route ? route.label : 'Not recorded (assumed landfill)'
  const diverted = route?.diverted ? data.totalKg : 0
  const disposal = data.totalKg - diverted
  const prev = esg.prev
  const has = esg.hasPrevious
  const pDiv = route?.diverted ? prev.totalKg : 0
  const change = has && prev.co2 > 0 ? ((data.co2 - prev.co2) / prev.co2) * 100 : null
  const sitesWithBin = new Set(C.bins.map((b) => b.site)).size
  const others = Math.max(0, C.kitchensTotal - sitesWithBin)
  const bins = C.bins.map((b) => `${b.site} (bin ${b.code})`).join(', ')
  const coverage = `${bins}, ${sitesWithBin} of ${C.kitchensTotal} ${C.kitchensTotal === 1 ? 'kitchen' : 'kitchens'} the company runs`
  const period = esg.periodType === 'fy' ? `${meta.period} (${esg.curShort}; the financial year ends ${longDate(esg.fy.end)})` : meta.period
  const routeStatus = route ? <Pill tone="ok">Reported</Pill> : <Pill tone="part">Assumed</Pill>
  const tl = timeline(data)
  const foods = data.foodRows || []
  const routeKnown = !!route

  return (
    <div className="sheet relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[120mm] left-1/2 -translate-x-1/2 -rotate-[30deg] font-head text-[110px] font-semibold tracking-[0.1em] text-[#C8321F] opacity-[0.06]"
      >
        DRAFT
      </div>

      <Header title="Food Waste Emissions Report" subtitle="ESG-ready data · Scope 3 Category 5 · Food waste" />
      <p className="-mt-1 mb-3 inline-block rounded border-[1.5px] border-[#C8321F] px-1.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-[#C8321F]">
        DRAFT · NOT AN AUDITED REPORT
      </p>

      <Meta
        rows={[
          ['Company', C.company],
          ['Kitchens covered', coverage],
          ['Reporting period', period],
          ['Comparative period', `${esg.prevText}${esg.periodType === 'fy' ? ` (${esg.prevShort})` : ''}${has ? '' : ' · no SmartBin data'}`],
          ['Disposal route', routeLabel],
          ['Waste reason', meta.reason],
          ['Data status', 'ESG-ready data to support disclosure. Not verified by a third party.'],
          ['Generated', meta.generated],
        ]}
      />

      <div className="rpk mb-3.5 grid-cols-3">
        <div>
          <span>Scope 3 Cat. 5</span>
          <b>{t3(data.co2)} tCO2e</b>
          <small className="block font-mono text-[9.5px] text-[#5A6770]">{kg(data.co2)} kg CO2e</small>
        </div>
        <div>
          <span>Food waste</span>
          <b>{t3(data.totalKg)} t</b>
          <small className="block font-mono text-[9.5px] text-[#5A6770]">{kg(data.totalKg)} kg, measured</small>
        </div>
        <div>
          <span>Diverted</span>
          <b>{data.totalKg ? ((diverted / data.totalKg) * 100).toFixed(1) : '0.0'}%</b>
          <small className="block font-mono text-[9.5px] text-[#5A6770]">{route ? route.label : 'route not recorded'}</small>
        </div>
      </div>

      <section>
        <h3>1. Greenhouse gas emissions</h3>
        <p className="mb-1.5">SmartBin measures emissions from food waste only. Scope 1, Scope 2 and other Scope 3 categories must come from other sources.</p>
        <table className="rpt">
          <thead>
            <tr>
              <th>Scope</th>
              <th>Category</th>
              <th className="n">{esg.curShort} (tCO2e)</th>
              <th className="n">{esg.prevShort} (tCO2e)</th>
              <th className="n">Change</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Scope 1</td>
              <td>Direct emissions</td>
              <td colSpan={3} className="italic text-[#7D8B86]">Not covered by SmartBin</td>
            </tr>
            <tr>
              <td>Scope 2</td>
              <td>Purchased energy</td>
              <td colSpan={3} className="italic text-[#7D8B86]">Not covered by SmartBin</td>
            </tr>
            <tr className="bg-[#EEF5F1] font-medium">
              <td>Scope 3</td>
              <td>Category 5: Waste generated in operations (food waste)</td>
              <td className="n">{t3(data.co2)}</td>
              {has ? <td className="n">{t3(prev.co2)}</td> : <NoComp />}
              <td className="n">{change === null ? '–' : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`}</td>
            </tr>
            <tr>
              <td>Scope 3</td>
              <td>Categories 1 to 4 and 6 to 15</td>
              <td colSpan={3} className="italic text-[#7D8B86]">Not measured by SmartBin</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-1 text-[9.5px] text-[#5A6770]">
          {has
            ? `Both periods use the same emission factor (${C.factor.version}), so the change comes from the amount of food waste, not from a factor update.`
            : `No comparative: SmartBin holds no data for ${esg.periodType === 'fy' ? esg.prevShort : 'the previous period'} (${esg.prevText}), so this is treated as the first reporting period.`}
        </p>
      </section>

      <section>
        <h3>2. Food waste metrics</h3>
        <table className="rpt">
          <thead>
            <tr>
              <th>Code</th>
              <th>Metric</th>
              <th className="n">{esg.curShort}</th>
              <th className="n">{esg.prevShort}</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{bursa('C10(a)')}</td>
              <td>Total waste generated (food waste only)</td>
              <td className="n">{t3(data.totalKg)} t</td>
              {has ? <td className="n">{t3(prev.totalKg)} t</td> : <NoComp />}
              <td>
                <Pill tone="part">Partial</Pill>
              </td>
            </tr>
            <tr>
              <td>{bursa('C10(a)(i)')}</td>
              <td>Total waste diverted from disposal</td>
              <td className="n">{t3(diverted)} t</td>
              {has ? <td className="n">{t3(pDiv)} t</td> : <NoComp />}
              <td>{routeStatus}</td>
            </tr>
            <tr>
              <td>{bursa('C10(a)(ii)')}</td>
              <td>Total waste directed to disposal</td>
              <td className="n">{t3(disposal)} t</td>
              {has ? <td className="n">{t3(prev.totalKg - pDiv)} t</td> : <NoComp />}
              <td>{routeStatus}</td>
            </tr>
            <tr>
              <td>FB-RN-150a.1 (1), (2)</td>
              <td>Total waste, percentage food waste</td>
              <td colSpan={2} className="italic text-[#7D8B86]">
                Not measured
              </td>
              <td>
                <Pill tone="no">Not reported</Pill>
              </td>
            </tr>
            <tr>
              <td>FB-RN-150a.1 (3)</td>
              <td>Percentage of food waste diverted</td>
              <td className="n">{data.totalKg ? ((diverted / data.totalKg) * 100).toFixed(1) : '0.0'}%</td>
              {has ? <td className="n">{prev.totalKg ? ((pDiv / prev.totalKg) * 100).toFixed(1) : '0.0'}%</td> : <NoComp />}
              <td>{routeStatus}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-1 text-[9.5px] text-[#5A6770]">
          Only the food waste stream is measured. Packaging and general waste do not pass through SmartBin. Diverted means food waste that is composted, used
          as animal feed or donated.{' '}
          {routeKnown
            ? 'The route comes from the company setting for each kitchen.'
            : 'The disposal route is not recorded, so all food waste is assumed to go to landfill and diversion is 0% (see 3.6).'}
        </p>
      </section>

      <section>
        <h3>2.1 Food waste by kitchen and disposal route</h3>
        <table className="rpt">
          <thead>
            <tr>
              <th>Kitchen</th>
              <th>Bin ID</th>
              <th>Disposal route</th>
              <th>Diverted</th>
              <th className="n">Food waste (t)</th>
              <th className="n">Factor (kg CO2e/kg)</th>
              <th className="n">tCO2e</th>
            </tr>
          </thead>
          <tbody>
            {C.bins.map((b) => (
              <tr key={b.code}>
                <td>{b.site}</td>
                <td>{b.code}</td>
                <td>{route ? route.label : 'Landfill (assumed)'}</td>
                <td>{route?.diverted ? 'Yes' : 'No'}</td>
                <td className="n">{t3(data.totalKg)}</td>
                <td className="n">{C.factor.value.toFixed(2)}</td>
                <td className="n">{t3(data.co2)}</td>
              </tr>
            ))}
            {others > 0 && (
              <tr>
                <td colSpan={7} className="italic text-[#7D8B86]">
                  {others} other {others === 1 ? 'kitchen has' : 'kitchens have'} no SmartBin and {others === 1 ? 'is' : 'are'} not included
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {data.disposals > 0 && foods.length > 0 && (
        <section>
          <h3>2.2 Food waste by category</h3>
          <table className="rpt">
            <thead>
              <tr>
                <th>Food category</th>
                <th className="n">Weight (kg)</th>
                <th className="n">Share</th>
                <th>Data type</th>
              </tr>
            </thead>
            <tbody>
              {[...foods]
                .sort((a, b) => b.weight_g - a.weight_g)
                .map((f) => (
                  <tr key={f.key}>
                    <td>{categoryName(f.key, names)}</td>
                    <td className="n">{kg(f.weight_g / 1000)}</td>
                    <td className="n">{data.totalKg ? ((f.weight_g / 1000 / data.totalKg) * 100).toFixed(1) : '0.0'}%</td>
                    <td>
                      <Pill tone="part">Estimated</Pill>
                    </td>
                  </tr>
                ))}
              <tr className="tot">
                <td>Total</td>
                <td className="n">{kg(data.totalKg)}</td>
                <td className="n">100.0%</td>
                <td>
                  <Pill tone="ok">Measured</Pill>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-1 text-[9.5px] text-[#5A6770]">
            The total is weighed by the bin&apos;s scale. The split between categories is estimated from the photo (see 3.4), so the category rows may not add
            up exactly to the total.
          </p>
        </section>
      )}

      <section className="break-inside-auto!">
        <h3>Food waste and emissions by {tl.unit.toLowerCase() === 'date' ? 'day' : tl.unit.toLowerCase()}</h3>
        {data.disposals === 0 ? (
          <p>No verified disposals match this period{meta.reasonSet ? ' and waste reason' : ''}.</p>
        ) : (
          <table className="rpt">
            <thead>
              <tr>
                <th>{tl.unit}</th>
                <th className="n">Disposals</th>
                <th className="n">Food waste (kg)</th>
                <th className="n">Emissions (kg CO2e)</th>
              </tr>
            </thead>
            <tbody>
              {tl.rows.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td className="n">{r.count}</td>
                  <td className="n">{kg(r.weight_kg)}</td>
                  <td className="n">{kg(r.co2)}</td>
                </tr>
              ))}
              <tr className="tot">
                <td>Total</td>
                <td className="n">{data.disposals}</td>
                <td className="n">{kg(data.totalKg)}</td>
                <td className="n">{kg(data.co2)}</td>
              </tr>
            </tbody>
          </table>
        )}
        <p className="mt-1 text-[9.5px] text-[#5A6770]">
          {data.pending.count > 0
            ? `Excluded: ${data.pending.count} ${data.pending.count === 1 ? 'disposal' : 'disposals'} (${kg(data.pending.weight_g / 1000)} kg) awaiting manual review. They are added once verified.`
            : 'No disposals are awaiting manual review in this period.'}{' '}
          {tl.unit === 'Month' ? 'Months' : tl.unit === 'Hour' ? 'Hours' : 'Days'} with no disposals are left out.
        </p>
      </section>

      <section className="break-inside-auto!">
        <h3>3. Methodology</h3>
        <Method k="3.1" title="Boundary, coverage and reporting period" cite="IFRS S1 para 20, 64">
          <p className="m-0">
            Covers {C.company}, {coverage}, measured by {C.bins.length} SmartBin{C.bins.length === 1 ? '' : 's'}, {period}.{' '}
            {others > 0 ? (
              <b>
                The other {others} {others === 1 ? 'kitchen is' : 'kitchens are'} not covered, so these figures are not company-wide totals.
              </b>
            ) : (
              'This is the only kitchen the company runs, so the figures cover the whole company.'
            )}
          </p>
          <p className="m-0">
            {esg.periodType === 'fy' ? (
              <>
                The period follows the company&apos;s financial year, which starts in {MON_LONG[C.fyStartMonth - 1]}.{' '}
                {!esg.fy.complete && <ToConfirm>This is year-to-date data. The annual disclosure must cover the full 12 months.</ToConfirm>}
              </>
            ) : (
              <ToConfirm>This report uses a dashboard date range, not the financial year. The annual disclosure must cover the full financial year.</ToConfirm>
            )}
          </p>
        </Method>

        <Method k="3.2" title="Metric definition" cite="IFRS S1 para 50(a); SASB FB-RN-150a.1">
          <ul className="my-0.5 list-disc pl-4">
            <li>
              Packaging, tissue and cutlery (the AI&apos;s non_food category) are{' '}
              {C.metric.excludeNonFood ? 'subtracted from the scale weight' : 'included in the scale weight; they are not subtracted yet'}.
            </li>
            <li>
              Inedible parts such as bones and peels are {C.metric.includeInedible ? 'included' : 'excluded'}. Soup, curry and sauce are{' '}
              {C.metric.includeLiquids ? 'included' : 'excluded'}.
            </li>
            <li>Records pending manual review are {C.metric.includePending ? 'included' : 'excluded until the AI support team verifies them'}.</li>
            <li>Diverted food waste is food waste that is composted, used as animal feed or donated.</li>
          </ul>
        </Method>

        <Method k="3.3" title="Measurement approach: weight" cite="IFRS S2 para 29(a)(iii)(1)">
          <p className="m-0">
            Each disposal is weighed by the {C.device.model} inside the bin and recorded with a timestamp and a photo. Scale accuracy:{' '}
            {C.device.accuracy || <ToConfirm>not recorded</ToConfirm>}. Last calibration: {C.device.lastCalibrated || <ToConfirm>not recorded</ToConfirm>}.
          </p>
        </Method>

        <Method k="3.4" title="Estimation method: food categories" cite="IFRS S1 para 77 to 78">
          <ul className="my-0.5 list-disc pl-4">
            <li>
              An AI model ({C.ai.model}) sorts the food in each photo into {C.ai.categories} categories.
            </li>
            <li>The measured total weight is split between categories by pixel area multiplied by a density factor (density table {C.ai.densityTable}).</li>
            <li>When the AI&apos;s calibrated confidence is below {C.ai.reviewThreshold}, the record is sent to the AI support team for manual labelling.</li>
            <li>Category weights are marked Estimated in 2.2. The total is marked Measured.</li>
          </ul>
        </Method>

        <Method k="3.5" title="Emission calculation" cite="IFRS S2 para 29(a)(iii), B29">
          <div className="my-1 border-l-[3px] border-[#2F6B52] bg-[#EEF5F1] px-2 py-1 font-mono text-[10px]">
            Scope 3 Category 5 (kg CO2e) = food waste (kg) × {C.factor.value} {C.factor.unit}
          </div>
          <ul className="my-0.5 list-disc pl-4">
            <li>
              Factor: {C.factor.source} ({C.factor.version}).
            </li>
            <li>Method: GHG Protocol Scope 3 Category 5, waste-type-specific method.</li>
            <li>Disposal route for this site: {routeLabel}.</li>
          </ul>
        </Method>

        <Method k="3.6" title="Assumptions and limitations" cite="IFRS S1 para 50(d), 77 to 78; IFRS S2 para B51">
          <ul className="my-0.5 list-disc pl-4">
            {C.factor.country !== 'MY' && <li>No published Malaysian emission factor for food waste was identified, so the {C.factor.country} factor is used as a proxy.</li>}
            {!routeKnown && <li>All food waste is assumed to go to landfill, because the disposal route is not recorded.</li>}
            <li>Category weights are estimated from the photo, not weighed separately.</li>
            <li>Waste that does not pass through the SmartBin, such as liquid poured into a sink, is not recorded.</li>
            {others > 0 && <li>Kitchens without a SmartBin are not estimated or extrapolated.</li>}
          </ul>
        </Method>

        <Method k="3.7" title="Data quality" cite="IFRS S2 para B40, B55 to B56">
          <p className="m-0 mb-1">
            {data.disposals > 0 && `100% of the reported weight (${kg(data.totalKg)} kg from ${data.disposals} disposals) is primary data from direct measurement. `}
            The emission factor is secondary data. No figure in this report has been verified by a third party.
          </p>
          <table className="rpt">
            <thead>
              <tr>
                <th>Input</th>
                <th>Source</th>
                <th>Measured or estimated</th>
                <th>Primary or secondary</th>
                <th>Checked</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total weight</td>
                <td>Scale in the bin</td>
                <td>Measured</td>
                <td>Primary</td>
                <td>Not third-party verified</td>
              </tr>
              <tr>
                <td>Food category split</td>
                <td>AI on the bin photo</td>
                <td>Estimated</td>
                <td>Primary (derived)</td>
                <td>Low-confidence records checked by people</td>
              </tr>
              <tr>
                <td>Disposal route</td>
                <td>Company setting</td>
                <td>{routeKnown ? 'Reported' : 'Assumed'}</td>
                <td>Primary</td>
                <td>Not verified</td>
              </tr>
              <tr>
                <td>Emission factor</td>
                <td>{C.factor.version}</td>
                <td>Published</td>
                <td>Secondary</td>
                <td>Government published</td>
              </tr>
            </tbody>
          </table>
        </Method>

        <Method k="3.8" title="Choice of method and changes" cite="IFRS S2 para 29(a)(iii)(2) to (3); IFRS S1 para B52">
          <p className="m-0">
            The DESNZ factor was chosen because it is government-published, updated yearly, and measures disposal emissions, which is what Category 5 covers.{' '}
            {has
              ? 'The comparative figures use the same factor, so both periods are like-for-like.'
              : 'This is the first reporting period, so no previously published figures needed restating.'}
          </p>
        </Method>
      </section>

      <section>
        <h3>4. Disclosure index</h3>
        <table className="rpt">
          <thead>
            <tr>
              <th>Framework</th>
              <th>Code</th>
              <th>Disclosure</th>
              <th>Section</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['SASB Restaurants', 'FB-RN-150a.1', 'Total waste, % food waste, % diverted', '2, 2.1', <Pill tone="part">Partial</Pill>],
              ['SASB Restaurants', 'FB-RN-150a.2', 'Packaging weight and recyclability', '–', <Pill tone="no">Not covered</Pill>],
              ...(showBursa
                ? [['Bursa Malaysia', 'C10(a), (i), (ii)', 'Waste generated, diverted, directed to disposal', '2, 2.1', <Pill tone="part">Partial</Pill>]]
                : []),
              ['IFRS S2', '29(a)(i)(3)', 'Scope 3 greenhouse gas emissions', '1', <Pill tone="part">Category 5 only</Pill>],
              ['IFRS S2', '29(a)(iii)', 'Measurement approach, inputs and assumptions', '3', <Pill tone="ok">Reported</Pill>],
              [
                'IFRS S1',
                'para 64',
                'Same reporting period as the financial statements',
                '3.1',
                esg.periodType === 'fy' ? <Pill tone={esg.fy.complete ? 'ok' : 'part'}>{esg.fy.complete ? 'Reported' : 'Year to date'}</Pill> : <Pill tone="no">Custom range</Pill>,
              ],
              ['IFRS S1', 'para 70', 'Comparative information for the previous period', '1, 2', has ? <Pill tone="ok">Reported</Pill> : <Pill tone="no">No comparative</Pill>],
            ].map(([a, b, c, d, e]) => (
              <tr key={a + b}>
                <td>{a}</td>
                <td>{b}</td>
                <td>{c}</td>
                <td>{d}</td>
                <td>{e}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3>5. References</h3>
        <ul className="m-0 list-none p-0 text-[9.5px] text-[#5A6770]">
          <li>Department for Energy Security and Net Zero. (2026). Greenhouse gas reporting: Conversion factors 2026 [Data set]. GOV.UK.</li>
          <li>World Resources Institute &amp; WBCSD. (2013). Technical guidance for calculating Scope 3 emissions (Version 1.0), Category 5.</li>
          <li>IFRS Foundation. (2023). IFRS S1 and IFRS S2. International Sustainability Standards Board.</li>
          <li>IFRS Foundation. (2023). SASB Standards: Restaurants (FB-RN).</li>
          {showBursa && <li>Bursa Malaysia. (2022). Sustainability reporting guide (3rd ed.).</li>}
        </ul>
      </section>

      <Footer meta={meta} label={`SmartBin ESG-ready data report · ${C.bins[0]?.site || meta.branch}, ${meta.period} · DRAFT`} />
    </div>
  )
}
