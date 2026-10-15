import { useEffect, useRef, useState } from 'react'
import { CircleCheck, ImageOff, RotateCcw, Upload } from 'lucide-react'
import { api } from '../api'
import { REASONS, categoryName } from '../lib/format'
import Evidence from '../components/Evidence'
import { Empty, ErrorBox, Modal, PendingNote } from '../components/ui'

const MAX_GRAMS = 50000

export default function WasteReceiver({ names }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [grams, setGrams] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [apiError, setApiError] = useState(null)
  const [result, setResult] = useState(null) // last response from the backend
  const [message, setMessage] = useState(null) // { kind: 'saved' | 'pending', text }
  const [uploadFailed, setUploadFailed] = useState(null) // error text when the photo did not upload
  const fileInput = useRef(null)

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  function pickFile(f) {
    if (!f) return
    if (!/^image\/(jpeg|png)$/.test(f.type)) {
      setErrors((e) => ({ ...e, file: 'Choose a JPG or PNG photo.' }))
      return
    }
    setErrors((e) => ({ ...e, file: '' }))
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function clearPhoto() {
    setFile(null)
    setPreview('')
    if (fileInput.current) fileInput.current.value = ''
  }

  function resetForm() {
    clearPhoto()
    setGrams('')
    setReason('')
  }

  async function submit(e) {
    e.preventDefault()
    const g = Number(grams)
    const errs = {}
    if (!file) errs.file = 'Add a photo of the waste.'
    if (!grams || !(g > 0)) errs.grams = 'Enter a weight above 0 g.'
    else if (g > MAX_GRAMS) errs.grams = `Enter a weight up to ${MAX_GRAMS.toLocaleString()} g.`
    if (!reason) errs.reason = 'Choose a reason.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    send()
  }

  // The backend answers 400 "Image upload failed ... Please re-upload the photo." when the photo
  // could not be stored. Nothing is saved then, so the same photo can be sent again.
  function isUploadFailure(err) {
    return err?.status === 400 && /upload/i.test(err.message || '')
  }

  async function send() {
    const g = Number(grams)
    setBusy(true)
    setApiError(null)
    setMessage(null)
    try {
      const res = await api.recordDisposal({ file, weightGrams: g, reason })
      // Two outcomes only: auto accept, or (confidence below the threshold) sent for manual review.
      setUploadFailed(null)
      setResult(res)
      // The result panel shows its own "pending manual review" note, so only a saved result needs a message.
      setMessage(res.action_routing_decision === 'AUTO_ACCEPT' ? { kind: 'saved', text: `Saved. ${foodList(res, names)} recorded.` } : null)
      resetForm()
    } catch (err) {
      if (isUploadFailure(err)) setUploadFailed(err.message)
      else {
        setUploadFailed(null)
        setApiError(err)
      }
    } finally {
      setBusy(false)
    }
  }

  const totals = result && {
    weight_g: result.summary.total_weight_grams,
    cost: result.summary.total_financial_loss_myr,
    co2: result.summary.carbon_impact_co2_kg,
  }

  return (
    <div className="grid grid-cols-[minmax(300px,420px)_minmax(0,1fr)] items-start gap-[18px] max-lg:grid-cols-1">
      <form className="panel flex flex-col gap-4" onSubmit={submit} noValidate>
        <h2 className="text-[16px]">New disposal</h2>

        <div>
          <span className="label mb-1.5">Waste photo</span>
          <label
            className="block cursor-pointer rounded-xl border-[1.5px] border-dashed border-ctl bg-white px-4 py-5 text-center text-muted hover:border-accent hover:bg-accent-soft hover:text-accent"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              pickFile(e.dataTransfer.files[0])
            }}
          >
            {preview ? (
              <img src={preview} alt="Selected waste" className="mx-auto mb-2 max-h-40 rounded-lg" />
            ) : (
              <Upload className="mx-auto mb-1.5" size={22} />
            )}
            <span className="text-[14px]">{file ? `${file.name} (change)` : 'Choose or drop a JPG or PNG photo'}</span>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(e) => pickFile(e.target.files[0])} />
          </label>
          {errors.file && <p className="mt-1 text-[13px] text-bad">{errors.file}</p>}
        </div>

        <label className="label">
          Weight (g)
          <input
            type="number"
            inputMode="decimal"
            min="1"
            step="any"
            className="field"
            placeholder="e.g. 520"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
          />
          {errors.grams && <span className="text-[13px] text-bad">{errors.grams}</span>}
        </label>

        <label className="label">
          Waste reason
          <select className="field" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Choose a reason</option>
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          {errors.reason && <span className="text-[13px] text-bad">{errors.reason}</span>}
        </label>

        {apiError && <ErrorBox error={apiError} />}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Analysing…' : 'Analyse waste'}
        </button>
      </form>

      <div className="panel min-h-[340px]">
        {message && (
          <div className="mb-4">
            {message.kind === 'saved' ? (
              <div className="flex items-center gap-2 rounded-xl border border-good/30 bg-good-soft px-4 py-2.5 text-[14px] text-good">
                <CircleCheck size={18} />
                {message.text}
              </div>
            ) : (
              <PendingNote>{message.text}</PendingNote>
            )}
          </div>
        )}
        {result ? (
          <>
            <h2 className="mb-4 text-[16px]">Analysis result</h2>
            <Evidence
              snapshotUrl={result.snapshot_url}
              heatmapUrl={result.heatmap_url}
              breakdown={Object.fromEntries(
                Object.entries(result.density_breakdown || {}).map(([k, v]) => [k, { weight_g: v.weight_g, cost_myr: v.cost_myr, confidence: v.confidence }]),
              )}
              totals={totals}
              names={names}
              pending={result.action_routing_decision !== 'AUTO_ACCEPT'}
            />
          </>
        ) : (
          !message && (
            <Empty title="No analysis yet">
              Add a photo, weight and reason, then choose Analyse waste. The food found in the photo, with each weight, cost and AI
              confidence, appears here.
            </Empty>
          )
        )}
      </div>

      <Modal open={!!uploadFailed} onClose={() => setUploadFailed(null)} title="The photo did not upload">
        <div className="flex max-w-[560px] flex-col gap-4">
          <div className="flex items-start gap-3">
            {preview ? (
              <img src={preview} alt="Photo that did not upload" className="h-20 w-24 shrink-0 rounded-lg object-cover" />
            ) : (
              <ImageOff className="shrink-0 text-muted" size={28} />
            )}
            <div className="flex flex-col gap-1">
              <p className="text-[14px]">Nothing was saved. The weight ({grams} g) and reason ({reason}) are still filled in.</p>
              <p className="hint">This is usually a short connection problem. Try the same photo again, or choose a different one.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <button
              type="button"
              className="btn btn-primary inline-flex items-center justify-center gap-2"
              disabled={busy}
              onClick={() => send()}
            >
              <RotateCcw size={16} /> {busy ? 'Uploading…' : 'Upload again'}
            </button>
            <button
              type="button"
              className="btn inline-flex items-center justify-center gap-2"
              disabled={busy}
              onClick={() => {
                setUploadFailed(null)
                clearPhoto()
                fileInput.current?.click()
              }}
            >
              <Upload size={16} /> Choose another photo
            </button>
          </div>
          <details className="hint">
            <summary className="cursor-pointer">Error details</summary>
            <p className="mt-1 break-words">{uploadFailed}</p>
          </details>
        </div>
      </Modal>
    </div>
  )
}

function foodList(res, names) {
  const keys = Object.keys(res.density_breakdown || {})
  if (!keys.length) return 'The disposal was'
  const list = keys.map((k) => categoryName(k, names).toLowerCase())
  const text = list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : list[0]
  return text[0].toUpperCase() + text.slice(1)
}
