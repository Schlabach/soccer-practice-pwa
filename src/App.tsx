import { useMemo, useState, useEffect } from 'react'
import type { AppData, Player, PracticeSection } from './types'
import { defaultData, loadData, resetData, saveData } from './storage'
import { buildPlannedSchedule } from './schedule'
import { POSITION_CODES, POSITION_LABELS, type PositionCode } from './positions'
import ActivePractice from './ActivePractice'
import GameMode from './GameMode'

type Tab = 'practice' | 'active' | 'game' | 'players' | 'settings'

const TAB_LABELS: Record<Tab, string> = {
  practice: 'Practice',
  active: 'Active Practice',
  game: 'Game Mode',
  players: 'Players',
  settings: 'Setup'
}

const cloneDefaults = (): AppData => structuredClone(defaultData)

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [tab, setTab] = useState<Tab>('practice')
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    saveData(data)
  }, [data])

  const totalMinutes = useMemo(
    () => data.practice.reduce((sum, item) => sum + Number(item.minutes || 0), 0),
    [data.practice]
  )

  function updatePlayer(player: Player) {
    setData(current => ({
      ...current,
      players: current.players.map(p => p.id === player.id ? player : p)
    }))
  }

  function togglePlayerPosition(player: Player, position: PositionCode) {
    const positions = player.positions.includes(position)
      ? player.positions.filter(p => p !== position)
      : [...player.positions, position]
    updatePlayer({ ...player, positions })
  }

  function addPlayer() {
    const player: Player = {
      id: crypto.randomUUID(),
      name: '',
      grade: '',
      notes: '',
      positions: [...POSITION_CODES]
    }
    setData(current => ({
      ...current,
      players: [...current.players, player]
    }))
  }

  function deletePlayer(id: string) {
    setData(current => ({
      ...current,
      players: current.players.filter(p => p.id !== id)
    }))
  }

  function addPracticeSection() {
    const item: PracticeSection = {
      id: crypto.randomUUID(),
      title: 'New Section',
      minutes: 5,
      details: '',
      setup: ''
    }
    setData(current => ({ ...current, practice: [...current.practice, item] }))
  }

  const plannedSchedule = useMemo(
    () => buildPlannedSchedule(data.practiceStartTime, data.practice),
    [data.practiceStartTime, data.practice]
  )

  function handlePrint() {
    window.print()
  }

  function handleReset() {
    if (!window.confirm('Reset all players and practice sections?')) return
    resetData()
    setData(cloneDefaults())
  }

  function selectTab(next: Tab) {
    setTab(next)
    setNavOpen(false)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" />
          <h1>Soccer Coach</h1>
        </div>
        <details
          className="tabs-accordion no-print"
          open={navOpen}
          onToggle={e => setNavOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary aria-label="Menu">☰</summary>
          <nav className="tabs" aria-label="Main sections">
            {(Object.keys(TAB_LABELS) as Tab[]).map(key => (
              <button key={key} className={tab === key ? 'active' : ''} onClick={() => selectTab(key)}>
                {TAB_LABELS[key]}
              </button>
            ))}
          </nav>
        </details>
      </header>

      <main>
        {tab === 'practice' && (
          <section>
            <div className="section-heading">
              <div>
                <h2>Practice Plan</h2>
                <p>{totalMinutes} total minutes</p>
              </div>
            </div>

            <label className="start-time-row no-print">
              Practice start time
              <input
                type="time"
                value={data.practiceStartTime}
                onChange={e => {
                  const practiceStartTime = e.target.value
                  setData(current => ({ ...current, practiceStartTime }))
                }}
              />
            </label>

            {data.practice.length === 0 && (
              <div className="empty-state">
                <strong>No sections yet.</strong>
                <span>Add your first practice section below.</span>
                <button className="primary no-print" onClick={addPracticeSection}>+ Add section</button>
              </div>
            )}

            <div className="practice-list">
              {data.practice.map((item, index) => (
                <article className="practice-card" key={item.id}>
                  <div className="time-badge">
                    <span>{item.minutes} min</span>
                    <span className="clock-range">{plannedSchedule[index]?.rangeLabel}</span>
                  </div>
                  <div className="practice-content">
                    <input
                      className="title-input"
                      value={item.title}
                      onChange={e => {
                        const title = e.target.value
                        setData(current => ({
                          ...current,
                          practice: current.practice.map(p => p.id === item.id ? { ...p, title } : p)
                        }))
                      }}
                    />
                    <textarea
                      value={item.details}
                      placeholder="What are you doing in this section?"
                      onChange={e => {
                        const details = e.target.value
                        setData(current => ({
                          ...current,
                          practice: current.practice.map(p => p.id === item.id ? { ...p, details } : p)
                        }))
                      }}
                    />
                    <label className="setup-label">
                      Setup / equipment
                      <textarea
                        value={item.setup}
                        placeholder="What cones/equipment do you need, and how are they laid out?"
                        onChange={e => {
                          const setup = e.target.value
                          setData(current => ({
                            ...current,
                            practice: current.practice.map(p => p.id === item.id ? { ...p, setup } : p)
                          }))
                        }}
                      />
                    </label>
                  </div>
                  <div className="practice-actions no-print">
                    <label>
                      Minutes
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={item.minutes}
                        onChange={e => {
                          const minutes = Math.max(0, Math.min(60, Number(e.target.value)))
                          setData(current => ({
                            ...current,
                            practice: current.practice.map(p => p.id === item.id ? { ...p, minutes } : p)
                          }))
                        }}
                      />
                    </label>
                    <button
                      className="danger-text"
                      onClick={() => setData(current => ({
                        ...current,
                        practice: current.practice.filter(p => p.id !== item.id)
                      }))}
                    >
                      Remove
                    </button>
                  </div>
                  <span className="practice-number">{index + 1}</span>
                </article>
              ))}
            </div>

            {data.practice.length > 0 && (
              <div className="add-row no-print">
                <button className="primary" onClick={addPracticeSection}>+ Add section</button>
              </div>
            )}
          </section>
        )}

        {tab === 'active' && <ActivePractice data={data} setData={setData} />}

        {tab === 'game' && <GameMode data={data} setData={setData} />}

        {tab === 'players' && (
          <section>
            <div className="section-heading">
              <div>
                <h2>Players</h2>
                <p>{data.players.length} players</p>
              </div>
            </div>

            {data.players.length === 0 ? (
              <div className="empty-state">
                <strong>No players yet.</strong>
                <span>Add them here. Their names and notes stay in this browser only.</span>
                <button className="primary no-print" onClick={addPlayer}>+ Add player</button>
              </div>
            ) : (
              <div className="player-grid">
                {data.players.map(player => (
                  <article className="player-card" key={player.id}>
                    <label>
                      Name
                      <input
                        value={player.name}
                        placeholder="Player name"
                        onChange={e => updatePlayer({ ...player, name: e.target.value })}
                      />
                    </label>
                    <label>
                      Grade
                      <input
                        value={player.grade}
                        placeholder="1st / 2nd"
                        onChange={e => updatePlayer({ ...player, grade: e.target.value })}
                      />
                    </label>
                    <label>
                      Notes
                      <textarea
                        value={player.notes}
                        placeholder="Anything you want to remember..."
                        onChange={e => updatePlayer({ ...player, notes: e.target.value })}
                      />
                    </label>
                    <div className="position-picker">
                      <span className="position-picker-label">Can play</span>
                      <div className="position-chips">
                        {POSITION_CODES.map(position => (
                          <button
                            key={position}
                            type="button"
                            className={player.positions.includes(position) ? 'position-chip chosen' : 'position-chip'}
                            onClick={() => togglePlayerPosition(player, position)}
                          >
                            {position} · {POSITION_LABELS[position]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="player-card-footer">
                      <button className="danger-text no-print" onClick={() => deletePlayer(player.id)}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {data.players.length > 0 && (
              <div className="add-row no-print">
                <button className="primary" onClick={addPlayer}>+ Add player</button>
              </div>
            )}
          </section>
        )}

        {tab === 'settings' && (
          <section>
            <div className="section-heading">
              <div>
                <h2>Setup</h2>
                <p>App data and privacy</p>
              </div>
            </div>

            <div className="settings-card">
              <h3>Privacy / Storage</h3>
              <p>
                This app does not send player data anywhere. It uses localStorage in this browser.
                Clearing browser/site data will remove it.
              </p>
              <button className="danger no-print" onClick={handleReset}>Reset all local data</button>
            </div>
          </section>
        )}
      </main>

      <div className="bottom-actions no-print">
        <button className="secondary" onClick={handlePrint}>Print</button>
      </div>
    </div>
  )
}
