import type { ActiveSession, PracticeSection } from './types'

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h * 60 + m
}

export function formatClock(minutesFromMidnight: number): string {
  const normalized = ((minutesFromMidnight % 1440) + 1440) % 1440
  const h24 = Math.floor(normalized / 60)
  const m = Math.round(normalized % 60)
  const suffix = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

function clockSuffix(minutesFromMidnight: number): 'AM' | 'PM' {
  const normalized = ((minutesFromMidnight % 1440) + 1440) % 1440
  return normalized >= 720 ? 'PM' : 'AM'
}

/** Compact clock range, e.g. "9:05–9:10 AM" (drops the duplicate AM/PM when both ends share it). */
export function formatClockRange(startMinutes: number, endMinutes: number): string {
  const endLabel = formatClock(endMinutes)
  if (clockSuffix(startMinutes) === clockSuffix(endMinutes)) {
    const startCore = formatClock(startMinutes).replace(/\s?(AM|PM)$/, '')
    return `${startCore}–${endLabel}`
  }
  return `${formatClock(startMinutes)} – ${endLabel}`
}

export type PlannedSection = {
  section: PracticeSection
  startLabel: string
  endLabel: string
  rangeLabel: string
}

export function buildPlannedSchedule(startTime: string, sections: PracticeSection[]): PlannedSection[] {
  let cursor = parseTimeToMinutes(startTime)
  return sections.map(section => {
    const start = cursor
    const end = cursor + Number(section.minutes || 0)
    cursor = end
    return {
      section,
      startLabel: formatClock(start),
      endLabel: formatClock(end),
      rangeLabel: formatClockRange(start, end)
    }
  })
}

export function computeElapsedMs(session: ActiveSession, now: number): number {
  const pausedMs = session.pausedAt !== null ? now - session.pausedAt : 0
  const raw = now - session.startedAt - session.pausedAccumMs - pausedMs
  return raw + session.manualOffsetMs
}

export type LiveSection = {
  section: PracticeSection
  index: number
  startMs: number
  endMs: number
}

export function buildLiveSchedule(sections: PracticeSection[]): LiveSection[] {
  let cursor = 0
  return sections.map((section, index) => {
    const startMs = cursor
    const endMs = cursor + Number(section.minutes || 0) * 60_000
    cursor = endMs
    return { section, index, startMs, endMs }
  })
}

export function currentSectionIndex(elapsedMs: number, live: LiveSection[]): number {
  if (live.length === 0) return -1
  const found = live.findIndex(item => elapsedMs < item.endMs)
  if (found !== -1) return found
  return live.length - 1
}
