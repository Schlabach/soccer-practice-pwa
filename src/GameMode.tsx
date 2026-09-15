import { useState } from 'react'
import type { AppData } from './types'
import { POSITION_CODES, POSITION_LABELS } from './positions'
import { generateGamePlan, swapAssignments, type SlotRef } from './gamePlan'

type Props = {
  data: AppData
  setData: React.Dispatch<React.SetStateAction<AppData>>
}

export default function GameMode({ data, setData }: Props) {
  const [rosterIds, setRosterIds] = useState<Set<string>>(
    () => new Set(data.game?.rosterIds ?? data.players.map(p => p.id))
  )
  const [selected, setSelected] = useState<{ periodIndex: number; slot: SlotRef } | null>(null)

  const playerName = (id: string) => data.players.find(p => p.id === id)?.name || 'Unnamed'

  function toggleRoster(id: string) {
    setRosterIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function generate() {
    const plan = generateGamePlan([...rosterIds], data.players)
    setSelected(null)
    setData(current => ({ ...current, game: plan }))
  }

  function handleSlotClick(periodIndex: number, slot: SlotRef) {
    if (!selected) {
      setSelected({ periodIndex, slot })
      return
    }
    if (selected.periodIndex === periodIndex && sameSlot(selected.slot, slot)) {
      setSelected(null)
      return
    }
    if (selected.periodIndex !== periodIndex) {
      setSelected({ periodIndex, slot })
      return
    }
    setData(current => current.game
      ? { ...current, game: swapAssignments(current.game, periodIndex, selected.slot, slot) }
      : current)
    setSelected(null)
  }

  function sameSlot(a: SlotRef, b: SlotRef): boolean {
    if (a.kind === 'field' && b.kind === 'field') return a.position === b.position
    if (a.kind === 'bench' && b.kind === 'bench') return a.playerId === b.playerId
    return false
  }

  const canGenerate = rosterIds.size >= 5

  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Game Mode</h2>
          <p>5v5 &middot; positions 1, 5, 7, 9, 11</p>
        </div>
        <button className="primary no-print" onClick={generate} disabled={!canGenerate}>
          {data.game ? 'Regenerate' : 'Generate lineup'}
        </button>
      </div>

      {data.players.length === 0 ? (
        <div className="empty-state">
          <strong>Add players first.</strong>
          <span>Go to the Players tab and add your roster.</span>
        </div>
      ) : (
        <>
          <div className="roster-picker no-print">
            <strong>Who's here today?</strong>
            <div className="roster-chips">
              {data.players.map(player => (
                <label key={player.id} className={rosterIds.has(player.id) ? 'roster-chip checked' : 'roster-chip'}>
                  <input
                    type="checkbox"
                    checked={rosterIds.has(player.id)}
                    onChange={() => toggleRoster(player.id)}
                  />
                  {player.name || 'Unnamed'}
                </label>
              ))}
            </div>
            {!canGenerate && <p className="notice-inline">Select at least 5 players to generate a lineup.</p>}
          </div>

          {data.game && data.game.periods.length > 0 && (
            <div className="game-periods">
              {data.game.periods.map((period, periodIndex) => (
                <article className="game-period-card" key={periodIndex}>
                  <h3>Period {periodIndex + 1}</h3>
                  <div className="field-grid">
                    {POSITION_CODES.map(position => {
                      const playerId = period.onField[position]
                      const slot: SlotRef = { kind: 'field', position }
                      const isSelected = !!selected && selected.periodIndex === periodIndex && sameSlot(selected.slot, slot)
                      return (
                        <button
                          key={position}
                          type="button"
                          className={isSelected ? 'field-slot selected' : 'field-slot'}
                          onClick={() => handleSlotClick(periodIndex, slot)}
                        >
                          <span className="field-slot-position">{position} &middot; {POSITION_LABELS[position]}</span>
                          <span className="field-slot-name">{playerId ? playerName(playerId) : '—'}</span>
                        </button>
                      )
                    })}
                  </div>
                  {period.bench.length > 0 && (
                    <div className="bench-row">
                      <span className="bench-label">Bench</span>
                      <div className="bench-chips">
                        {period.bench.map(id => {
                          const slot: SlotRef = { kind: 'bench', playerId: id }
                          const isSelected = !!selected && selected.periodIndex === periodIndex && sameSlot(selected.slot, slot)
                          return (
                            <button
                              key={id}
                              type="button"
                              className={isSelected ? 'bench-chip selected' : 'bench-chip'}
                              onClick={() => handleSlotClick(periodIndex, slot)}
                            >
                              {playerName(id)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
