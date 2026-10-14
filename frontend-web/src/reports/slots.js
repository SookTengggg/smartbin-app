import { longDate, shortDate } from '../lib/format'

// A report row is a day ("2026-10-14") or, in a "today" report, an hour ("09:00").
export const isHour = (data) => data.unit === 'hour'
export const hourSpan = (h) => `${h} to ${String(parseInt(h, 10) + 1).padStart(2, '0')}:00`
export const slotLong = (data, key) => (isHour(data) ? hourSpan(key) : longDate(key))
export const slotShort = (data, key) => (isHour(data) ? key : shortDate(key))
export const slotWord = (data) => (isHour(data) ? 'hour' : 'day')
