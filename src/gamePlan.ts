import { POSITION_CODES, type PositionCode } from './positions'
import type { GamePeriodAssignment, GamePlan, Player } from './types'

const PERIODS = 4
const FIELD_SIZE = POSITION_CODES.length

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function eligiblePositions(player: Player | undefined): PositionCode[] {
  const positions = player?.positions
  return positions && positions.length > 0 ? positions : POSITION_CODES
}

function isEligible(player: Player | undefined, position: PositionCode): boolean {
  return eligiblePositions(player).includes(position)
}

/**
 * Finds a feasible player-to-position matching for the on-field group via
 * augmenting-path bipartite matching (Kuhn's algorithm), so a player who is only
 * eligible for a scarce position (e.g. goalie) is never crowded out by a fixed
 * assignment order. Within that constraint it prefers each player's least-played
 * eligible position, for variety across periods.
 */
function assignPositions(
  onFieldIds: string[],
  playersById: Map<string, Player>,
  positionPlayCount: Map<string, Map<PositionCode, number>>
): Record<PositionCode, string> {
  const positionToPlayer = new Map<PositionCode, string>()
  const playerToPosition = new Map<string, PositionCode>()

  function tryAssign(playerId: string, visited: Set<PositionCode>): boolean {
    const ordered = eligiblePositions(playersById.get(playerId))
      .filter(pos => POSITION_CODES.includes(pos))
      .sort((a, b) => positionPlayCount.get(playerId)!.get(a)! - positionPlayCount.get(playerId)!.get(b)!)

    for (const position of ordered) {
      if (visited.has(position)) continue
      visited.add(position)
      const occupant = positionToPlayer.get(position)
      if (!occupant || tryAssign(occupant, visited)) {
        positionToPlayer.set(position, playerId)
        playerToPosition.set(playerId, position)
        return true
      }
    }
    return false
  }

  const order = shuffle(onFieldIds).sort(
    (a, b) => eligiblePositions(playersById.get(a)).length - eligiblePositions(playersById.get(b)).length
  )
  for (const id of order) {
    tryAssign(id, new Set())
  }

  const onField: Record<PositionCode, string> = { '1': '', '5': '', '7': '', '9': '', '11': '' }
  for (const position of POSITION_CODES) {
    onField[position] = positionToPlayer.get(position) ?? ''
  }

  // Last-resort relaxation: if a perfect matching wasn't possible (e.g. nobody
  // on the field is eligible for a slot at all), fill remaining gaps with
  // whoever is left rather than leaving the slot empty.
  const unmatched = onFieldIds.filter(id => !playerToPosition.has(id))
  const emptySlots = POSITION_CODES.filter(pos => !onField[pos])
  emptySlots.forEach((pos, i) => {
    if (unmatched[i]) onField[pos] = unmatched[i]
  })

  return onField
}

/** How much a player deserves to sit next, given their bench quota so far. Higher = more deserving to bench. */
function benchUrgency(id: string, benchQuota: Map<string, number>, benchSoFar: Map<string, number>, remainingPeriods: number): number {
  return (benchQuota.get(id)! - benchSoFar.get(id)!) / remainingPeriods
}

/**
 * If the chosen on-field group leaves some position with zero eligible players
 * (most commonly goalie, since it's opt-in), swap in an eligible bench player
 * for the on-field player who least "deserves" to keep playing, so a real
 * lineup gap doesn't force an unwilling player into that slot.
 */
function repairForFeasibility(
  onField: string[],
  bench: string[],
  playersById: Map<string, Player>,
  benchQuota: Map<string, number>,
  benchSoFar: Map<string, number>,
  remainingPeriods: number
): { onField: string[]; bench: string[] } {
  let field = [...onField]
  let sitting = [...bench]

  for (const position of POSITION_CODES) {
    if (field.some(id => isEligible(playersById.get(id), position))) continue

    const eligibleBenched = sitting.filter(id => isEligible(playersById.get(id), position))
    if (eligibleBenched.length === 0) continue

    const playIn = eligibleBenched.sort(
      (a, b) => benchUrgency(a, benchQuota, benchSoFar, remainingPeriods) - benchUrgency(b, benchQuota, benchSoFar, remainingPeriods)
    )[0]
    const sitOut = [...field].sort(
      (a, b) => benchUrgency(b, benchQuota, benchSoFar, remainingPeriods) - benchUrgency(a, benchQuota, benchSoFar, remainingPeriods)
    )[0]

    field = field.filter(id => id !== sitOut).concat(playIn)
    sitting = sitting.filter(id => id !== playIn).concat(sitOut)
  }

  return { onField: field, bench: sitting }
}

export function generateGamePlan(rosterIds: string[], players: Player[], periods = PERIODS): GamePlan {
  if (rosterIds.length < FIELD_SIZE) {
    return { rosterIds, periods: [] }
  }

  const playersById = new Map(players.map(p => [p.id, p]))
  const n = rosterIds.length
  const benchPerPeriod = Math.max(0, n - FIELD_SIZE)
  const totalBenchSlots = periods * benchPerPeriod

  const baseBench = Math.floor(totalBenchSlots / n)
  const extraBenchCount = totalBenchSlots % n
  const shuffledForExtra = shuffle(rosterIds)
  const benchQuota = new Map<string, number>()
  rosterIds.forEach(id => {
    benchQuota.set(id, baseBench + (shuffledForExtra.indexOf(id) < extraBenchCount ? 1 : 0))
  })

  const benchSoFar = new Map<string, number>(rosterIds.map(id => [id, 0]))
  const positionPlayCount = new Map<string, Map<PositionCode, number>>(
    rosterIds.map(id => [id, new Map(POSITION_CODES.map(pos => [pos, 0]))])
  )

  const result: GamePeriodAssignment[] = []

  for (let periodIndex = 0; periodIndex < periods; periodIndex++) {
    const remainingPeriods = periods - periodIndex

    const benchCandidates = shuffle(rosterIds).sort(
      (a, b) => benchUrgency(b, benchQuota, benchSoFar, remainingPeriods) - benchUrgency(a, benchQuota, benchSoFar, remainingPeriods)
    )

    const initialBench = benchCandidates.slice(0, benchPerPeriod)
    const initialField = rosterIds.filter(id => !initialBench.includes(id))

    const { onField: fieldIds, bench } = benchPerPeriod > 0
      ? repairForFeasibility(initialField, initialBench, playersById, benchQuota, benchSoFar, remainingPeriods)
      : { onField: initialField, bench: initialBench }

    bench.forEach(id => benchSoFar.set(id, benchSoFar.get(id)! + 1))

    const onField = assignPositions(shuffle(fieldIds), playersById, positionPlayCount)
    for (const position of POSITION_CODES) {
      const id = onField[position]
      if (id) positionPlayCount.get(id)!.set(position, positionPlayCount.get(id)!.get(position)! + 1)
    }

    result.push({ onField, bench })
  }

  return { rosterIds, periods: result }
}

export type SlotRef =
  | { kind: 'field'; position: PositionCode }
  | { kind: 'bench'; playerId: string }

export function swapAssignments(plan: GamePlan, periodIndex: number, slotA: SlotRef, slotB: SlotRef): GamePlan {
  const period = plan.periods[periodIndex]
  if (!period) return plan

  const onField = { ...period.onField }
  const bench = [...period.bench]

  function readAndClear(slot: SlotRef): string {
    if (slot.kind === 'field') {
      const value = onField[slot.position]
      onField[slot.position] = ''
      return value
    }
    const index = bench.indexOf(slot.playerId)
    if (index === -1) return ''
    bench.splice(index, 1)
    return slot.playerId
  }

  function write(slot: SlotRef, playerId: string) {
    if (!playerId) return
    if (slot.kind === 'field') {
      onField[slot.position] = playerId
    } else {
      bench.push(playerId)
    }
  }

  const playerA = readAndClear(slotA)
  const playerB = readAndClear(slotB)
  write(slotA, playerB)
  write(slotB, playerA)

  const nextPeriods = [...plan.periods]
  nextPeriods[periodIndex] = { onField, bench }
  return { ...plan, periods: nextPeriods }
}
