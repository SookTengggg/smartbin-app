import { useEffect, useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { api } from '../api'
import { ErrorBox, Spinner } from '../components/ui'
import { categoryColor } from '../lib/format'

export default function Admin({ pricing, reload }) {
  // Only prices the user has edited are kept here; the rest come from the server.
  const [edits, setEdits] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState(null)
  const [triedLoad, setTriedLoad] = useState(false)

  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [addErr, setAddErr] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!pricing.length) reload().finally(() => setTriedLoad(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loaded = pricing.length > 0 || triedLoad
  const prices = Object.fromEntries(
    pricing.map((p) => [p.category_key, edits[p.category_key] ?? Number(p.price_per_100g_myr).toFixed(2)]),
  )

  const changed = pricing.filter((p) => Number(prices[p.category_key]) !== Number(p.price_per_100g_myr))
  const invalid = pricing.some((p) => {
    const v = prices[p.category_key]
    return v === '' || !(Number(v) >= 0)
  })

  async function save() {
    setSaving(true)
    setError(null)
    setSaved('')
    try {
      await api.savePrices(changed.map((p) => ({ category_key: p.category_key, price_per_100g_myr: Number(prices[p.category_key]) })))
      await reload()
      setEdits({})
      setSaved(`${changed.length} ${changed.length === 1 ? 'price' : 'prices'} saved.`)
    } catch (e) {
      setError(e)
    } finally {
      setSaving(false)
    }
  }

  async function add(e) {
    e.preventDefault()
    const name = newName.trim()
    const price = Number(newPrice)
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (!name) return setAddErr('Enter a category name.')
    if (newPrice === '' || !(price >= 0)) return setAddErr('Enter a price of 0 or more.')
    if (pricing.some((p) => p.category_key === key || p.display_name.toLowerCase() === name.toLowerCase()))
      return setAddErr('This category already exists.')
    setAddErr('')
    setAdding(true)
    try {
      await api.addCategory({ key, name, price })
      await reload()
      setNewName('')
      setNewPrice('')
      setSaved(`${name} added.`)
    } catch (err) {
      setAddErr(err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <section className="panel max-w-[780px]">
      <h2 className="mb-4 text-[16px]">Food prices</h2>
      {!loaded && <Spinner label="Loading prices…" />}
      {loaded && !pricing.length && <ErrorBox error={new Error('Could not load the price list.')} onRetry={reload} />}
      {pricing.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Food category</th>
                  <th className="n">Price per 100 g (RM)</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map((p) => (
                  <tr key={p.category_key}>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: categoryColor(p.category_key) }} />
                        {p.display_name}
                      </span>
                    </td>
                    <td className="n">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label={`Price per 100 g for ${p.display_name}`}
                        className="field num w-28 text-right"
                        value={prices[p.category_key] ?? ''}
                        onChange={(e) => {
                          setSaved('')
                          setEdits((s) => ({ ...s, [p.category_key]: e.target.value }))
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint mt-3">New prices apply to waste logged from now on.</p>
          {error && (
            <div className="mt-3">
              <ErrorBox error={error} />
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="btn btn-primary" disabled={saving || !changed.length || invalid} onClick={save}>
              {saving ? 'Saving…' : 'Save prices'}
            </button>
            {invalid && <span className="text-[13px] text-bad">Every price must be 0 or more.</span>}
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-[14px] text-good">
                <CircleCheck size={16} /> {saved}
              </span>
            )}
          </div>

          <form className="mt-6 border-t border-line pt-5" onSubmit={add} noValidate>
            <h3 className="mb-3 text-[15px]">Add a food category</h3>
            <div className="flex flex-wrap items-end gap-3">
              <label className="label">
                Category name
                <input className="field w-56" placeholder="e.g. Potato" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </label>
              <label className="label">
                Price per 100 g (RM)
                <input type="number" min="0" step="0.01" className="field w-36" placeholder="1.00" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              </label>
              <button className="btn" disabled={adding}>
                {adding ? 'Adding…' : 'Add category'}
              </button>
            </div>
            {addErr && <p className="mt-2 text-[13px] text-bad">{addErr}</p>}
          </form>
        </>
      )}
    </section>
  )
}
