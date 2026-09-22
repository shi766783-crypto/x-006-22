/**
 * Validation helpers for medication plan time points (HH:mm).
 * Shared by the plan form (interactive validation) and the plan
 * list (surfacing problems already persisted in old data).
 */

/** Strict HH:mm check (24h), e.g. "08:30". */
export function isValidTime(value: string): boolean {
  if (typeof value !== 'string') return false
  const m = /^(\d{2}):(\d{2})$/.exec(value.trim())
  if (!m) return false
  const h = Number(m[1])
  const min = Number(m[2])
  return h >= 0 && h <= 23 && min >= 0 && min <= 59
}

export interface TimeIssue {
  /** Indices of every row that shares the offending value (duplicates) or [i]. */
  indices: number[]
  kind: 'invalid' | 'duplicate'
  message: string
}

export interface TimeValidation {
  valid: boolean
  /** Per-row error message; undefined means the row is fine. */
  rowErrors: (string | undefined)[]
  issues: TimeIssue[]
  summary: string
}

/**
 * Validate a list of time inputs.
 * - at least one row must exist
 * - every row must be a valid HH:mm time
 * - values must be unique (all occurrences are flagged, not just the 2nd+)
 */
export function validateTimes(times: string[]): TimeValidation {
  const rowErrors: (string | undefined)[] = times.map(() => undefined)
  const issues: TimeIssue[] = []

  if (times.length === 0) {
    return {
      valid: false,
      rowErrors,
      issues: [],
      summary: '请至少保留一个服药时间点',
    }
  }

  // 1) invalid format
  times.forEach((t, i) => {
    if (!t.trim()) {
      rowErrors[i] = '请选择服药时间'
      issues.push({ indices: [i], kind: 'invalid', message: `第 ${i + 1} 个时间点未填写` })
    } else if (!isValidTime(t)) {
      rowErrors[i] = '时间格式不正确（应为 HH:mm）'
      issues.push({
        indices: [i],
        kind: 'invalid',
        message: `第 ${i + 1} 个时间点「${t}」格式不正确`,
      })
    }
  })

  // 2) duplicates (only among well-formed values)
  const groups = new Map<string, number[]>()
  times.forEach((t, i) => {
    if (!isValidTime(t)) return
    const key = t.trim()
    const list = groups.get(key)
    if (list) list.push(i)
    else groups.set(key, [i])
  })
  for (const [value, indices] of groups) {
    if (indices.length > 1) {
      const msg = `时间点 ${value} 重复了 ${indices.length} 次，请删除或修改重复项`
      for (const i of indices) rowErrors[i] = '与其他时间点重复'
      issues.push({ indices, kind: 'duplicate', message: msg })
    }
  }

  let summary = ''
  if (issues.length) {
    const first = issues[0]
    summary = first.kind === 'duplicate' && issues.length === 1
      ? first.message
      : `服药时间存在 ${issues.length} 处问题：${first.message}`
  }

  return { valid: issues.length === 0, rowErrors, issues, summary }
}

/** True when an already-saved plan carries invalid/duplicate times. */
export function findPlanTimeIssues(times: string[] | undefined): TimeIssue[] {
  if (!times || times.length === 0) {
    return [{ indices: [], kind: 'invalid', message: '该计划没有服药时间点' }]
  }
  return validateTimes(times).issues
}

/**
 * Normalize time inputs before persistence:
 * keep only valid, unique times, sorted chronologically.
 */
export function normalizeTimes(times: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of times) {
    if (!isValidTime(t)) continue
    const v = t.trim()
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out.sort()
}

const DEFAULT_TIMES = ['08:00', '12:00', '18:00', '21:00']

/** Suggest a default time not already used by the form. */
export function suggestTime(existing: string[]): string {
  const used = new Set(existing.filter(isValidTime).map((t) => t.trim()))
  const candidate = DEFAULT_TIMES.find((t) => !used.has(t))
  if (candidate) return candidate
  // fall back to the next free hour
  for (let h = 7; h <= 22; h++) {
    const v = `${String(h).padStart(2, '0')}:00`
    if (!used.has(v)) return v
  }
  return '08:00'
}
