import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { categoryColor, categoryName, kg, pct, rm } from '../lib/format'
import { PendingNote } from './ui'

function Photo({ src, label }) {
  const [failed, setFailed] = useState(null)
  const ok = src && failed !== src
  return (
    <figure className="m-0">
      <figcaption className="mb-1.5 text-[12.5px] text-muted">{label}</figcaption>
      {ok ? (
        <img src={src} alt={label} onError={() => setFailed(src)} className="aspect-[4/3] w-full rounded-xl border border-line bg-panel2 object-cover" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-ctl text-muted">
          <ImageOff size={22} />
        </div>
      )}
    </figure>
  )
}

// Photo, heatmap, totals and the per-food breakdown for one disposal.
// breakdown: { category_key: { weight_g, cost_myr, confidence } }
export default function Evidence({ snapshotUrl, heatmapUrl, breakdown, totals, names, pending }) {
  const rows = Object.entries(breakdown || {})
    .filter(([, v]) => Number(v.weight_g) > 0)
    .sort((a, b) => b[1].weight_g - a[1].weight_g)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Photo src={snapshotUrl} label="Photo" />
        <Photo src={pending ? null : heatmapUrl} label="AI heatmap (where the AI looked)" />
      </div>

      <dl className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
        {[
          ['Total weight', `${kg(totals.weight_g / 1000, 3)} kg`],
          ['Total cost', pending ? '–' : rm(totals.cost)],
          ['Carbon footprint', pending ? '–' : `${kg(totals.co2, 2)} kg CO2e`],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-line bg-panel2 px-3.5 py-2.5">
            <dt className="text-[12px] text-muted">{l}</dt>
            <dd className="num m-0 text-[17px] font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      {pending ? (
        <PendingNote>
          Pending manual review. The AI was not confident enough about this photo, so it was sent to the AI team to label the food
          by hand. Cost and carbon are added, and it appears in the dashboard, once it is reviewed.
        </PendingNote>
      ) : (
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Food category</th>
                <th className="n">Weight</th>
                <th className="n">Cost</th>
                <th className="n">AI confidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([key, v]) => (
                <tr key={key}>
                  <td>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: categoryColor(key) }} />
                      {categoryName(key, names)}
                    </span>
                  </td>
                  <td className="n">{kg(v.weight_g / 1000, 3)} kg</td>
                  <td className="n">{rm(v.cost_myr)}</td>
                  <td className="n">{v.confidence ? pct(v.confidence * 100) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint mt-2">The scale measures the total weight. The weight of each food is estimated by the AI from the photo.</p>
        </div>
      )}
    </div>
  )
}
