function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayStr(): string {
  return toDateStr(new Date())
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  return `${toDateStr(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Whole days from today to the given date (negative = past/expired). */
export function daysUntil(dateStr: string): number {
  if (!dateStr) return 0
  const target = parseDate(dateStr).getTime()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((target - today) / 86400000)
}

export function daysBetween(a: string, b: string): number {
  const da = parseDate(a).getTime()
  const db = parseDate(b).getTime()
  return Math.round((db - da) / 86400000)
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** Strict 24h "HH:MM" check. */
export function isValidTime(time: string): boolean {
  return TIME_RE.test(time)
}

/** Values appearing more than once, in first-seen order. */
export function duplicateTimes(times: string[]): string[] {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const t of times) {
    if (!t) continue
    if (seen.has(t)) dupes.add(t)
    else seen.add(t)
  }
  return [...dupes]
}

export function lastNDates(n: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    out.push(toDateStr(d))
  }
  return out
}
