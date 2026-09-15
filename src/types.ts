import type { PositionCode } from './positions'

export type Player = {
  id: string
  name: string
  grade: string
  notes: string
  positions: PositionCode[]
}

export type PracticeSection = {
  id: string
  title: string
  minutes: number
  details: string
  setup: string
}

export type ActiveSession = {
  startedAt: number
  pausedAccumMs: number
  pausedAt: number | null
  manualOffsetMs: number
}

export type GamePeriodAssignment = {
  onField: Record<PositionCode, string>
  bench: string[]
}

export type GamePlan = {
  rosterIds: string[]
  periods: GamePeriodAssignment[]
}

export type AppData = {
  players: Player[]
  practice: PracticeSection[]
  practiceStartTime: string
  activeSession: ActiveSession | null
  game: GamePlan | null
}
