import { useEffect, useRef } from 'react'
import { X, LoaderCircle, TriangleAlert } from 'lucide-react'
import { categoryColor, categoryName } from '../lib/format'

export function Modal({ open, onClose, title, children, wide = false, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'w-[min(1100px,calc(100vw-24px))]!' : ''} ${className}`}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="flex max-h-[calc(100vh-34px)] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
            <h2 className="text-[17px]">{title}</h2>
            <button className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div className="overflow-auto px-6 py-5">{children}</div>
        </div>
      )}
    </dialog>
  )
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted" role="status">
      <LoaderCircle size={18} className="animate-spin" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-bad/30 bg-bad-soft px-4 py-3 text-[14px] text-bad" role="alert">
      <TriangleAlert size={18} />
      <span className="flex-1">{error?.message || String(error)}</span>
      {onRetry && (
        <button className="btn h-8! text-ink" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function CategoryChip({ catKey, names }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-panel2 px-2 py-0.5 text-[12.5px]">
      <span className="h-2 w-2 rounded-full" style={{ background: categoryColor(catKey) }} />
      {categoryName(catKey, names)}
    </span>
  )
}

export function StatusBadge({ status }) {
  const pending = status === 'PENDING_REVIEW'
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12.5px] font-medium ${
        pending ? 'bg-[#FFF0CC] text-[#8A5200]' : 'bg-good-soft text-good'
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {pending ? 'Pending review' : 'Verified'}
    </span>
  )
}

export function PendingNote({ children }) {
  return (
    <div className="rounded-xl border border-warn-line bg-warn-bg px-4 py-2.5 text-[14px] text-warn-ink">{children}</div>
  )
}

export function Empty({ title, children }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-1.5 text-center text-muted">
      <h3 className="text-[15px] text-ink">{title}</h3>
      {children && <p className="max-w-md text-[14px]">{children}</p>}
    </div>
  )
}
