import { useState } from 'react'
import { useApi } from '../lib/useApi'
import { createPortal } from 'react-dom'
import { Printer } from 'lucide-react'
import { ErrorBox, Modal, Spinner } from '../components/ui'
import { loadEsgReport, loadReport } from './reportData'
import { CostReport } from './Reports'
import { EsgReport } from './EsgReport'

function printRoot() {
  let el = document.getElementById('print-root')
  if (!el) {
    el = document.createElement('div')
    el.id = 'print-root'
    document.body.appendChild(el)
  }
  return el
}

// Preview of a report as an A4 sheet. "Print or save as PDF" uses the browser's print
// dialog (@media print), which keeps the text sharp and selectable in the PDF.
export default function ReportModal({ kind, onClose, filter, reason, names, esgPeriod = 'fy', showBursa = false }) {
  const [progress, setProgress] = useState('')
  const key = kind ? JSON.stringify([kind, filter, reason, kind === 'esg' ? esgPeriod : '']) : null
  const { data, error, reload } = useApi(
    () => (kind === 'esg' ? loadEsgReport(filter, reason, esgPeriod, setProgress) : loadReport(kind, filter, reason, setProgress)),
    key,
    { keepPrevious: false },
  )

  const title = kind === 'esg' ? 'ESG report' : 'Cost analysis report'
  // The print copy needs its own SVG gradient ids: the preview is hidden when printing,
  // and a hidden gradient would leave the printed bars blank.
  const makeSheet = (idPrefix) =>
    data && (kind === 'esg' ? <EsgReport data={data} names={names} showBursa={showBursa} /> : <CostReport data={data} names={names} idPrefix={idPrefix} />)
  const sheet = makeSheet('pv')

  return (
    <>
      <Modal open={!!kind} onClose={onClose} title={title} wide>
        {error && <ErrorBox error={error} onRetry={reload} />}
        {!data && !error && <Spinner label={progress || 'Preparing report…'} />}
        {data && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="hint">A4 portrait, {data.meta.period}. The browser splits it into pages when printing.</p>
              <button className="btn btn-primary inline-flex items-center gap-2" onClick={() => window.print()}>
                <Printer size={16} /> Print or save as PDF
              </button>
            </div>
            <div className="overflow-auto rounded-xl bg-[#55626B] p-5">{sheet}</div>
          </div>
        )}
      </Modal>
      {kind && data && createPortal(makeSheet('pr'), printRoot())}
    </>
  )
}
