import { useEffect, useMemo, useState } from 'react'
import type { AppData, Player, PracticeSection, RatingCategory } from './types'
import { defaultData, loadData, resetData, saveData } from './storage'

type Tab = 'practice' | 'players' | 'evaluate' | 'settings'

const cloneDefaults = (): AppData => structuredClone(defaultData)

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [tab, setTab] = useState<Tab>('practice')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')

  useEffect(() => {
    saveData(data)
  }, [data])

  useEffect(() => {
    if (!selectedPlayerId && data.players.length > 0) {
      setSelectedPlayerId(data.players[0].id)
    }
    if (selectedPlayerId && !data.players.some(p => p.id === selectedPlayerId)) {
      setSelectedPlayerId(data.players[0]?.id ?? '')
    }
  }, [data.players, selectedPlayerId])

  const totalMinutes = useMemo(
    () => data.practice.reduce((sum, item) => sum + Number(item.minutes || 0), 0),
    [data.practice]
  )

  const selectedPlayer = data.players.find(p => p.id === selectedPlayerId)

  function updatePlayer(player: Player) {
    setData(current => ({
      ...current,
      players: current.players.map(p => p.id === player.id ? player : p)
    }))
  }

  function addPlayer() {
    const player: Player = {
      id: crypto.randomUUID(),
      name: '',
      grade: '',
      notes: ''
    }
    setData(current => ({
      ...current,
      players: [...current.players, player]
    }))
    setSelectedPlayerId(player.id)
  }

  function deletePlayer(id: string) {
    setData(current => {
      const ratings = { ...current.ratings }
      delete ratings[id]
      return {
        ...current,
        players: current.players.filter(p => p.id !== id),
        ratings
      }
    })
  }

  function addCategory() {
    const item: RatingCategory = {
      id: crypto.randomUUID(),
      name: 'New Category'
    }
    setData(current => ({ ...current, categories: [...current.categories, item] }))
  }

  function addPracticeSection() {
    const item: PracticeSection = {
      id: crypto.randomUUID(),
      title: 'New Section',
      minutes: 5,
      details: ''
    }
    setData(current => ({ ...current, practice: [...current.practice, item] }))
  }

  function setRating(playerId: string, categoryId: string, rating: number) {
    setData(current => ({
      ...current,
      ratings: {
        ...current.ratings,
        [playerId]: {
          ...(current.ratings[playerId] ?? {}),
          [categoryId]: rating
        }
      }
    }))
  }

  function playerAverage(playerId: string) {
    const values = data.categories
      .map(c => data.ratings[playerId]?.[c.id])
      .filter((v): v is number => typeof v === 'number')

    if (!values.length) return null
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  function handlePrint() {
    window.print()
  }

  function handleReset() {
    if (!window.confirm('Reset all players, ratings, and practice sections?')) return
    resetData()
    setData(cloneDefaults())
    setSelectedPlayerId('')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Soccer Practice Coach</h1>
          <p>Local-only practice planning and player notes</p>
        </div>
        <button className="secondary no-print" onClick={handlePrint}>Print</button>
      </header>

      <nav className="tabs no-print" aria-label="Main sections">
        <button className={tab === 'practice' ? 'active' : ''} onClick={() => setTab('practice')}>Practice</button>
        <button className={tab === 'players' ? 'active' : ''} onClick={() => setTab('players')}>Players</button>
        <button className={tab === 'evaluate' ? 'active' : ''} onClick={() => setTab('evaluate')}>Evaluate</button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Setup</button>
      </nav>

      <main>
        {tab === 'practice' && (
          <section>
            <div className="section-heading">
              <div>
                <h2>Practice Plan</h2>
                <p>{totalMinutes} total minutes</p>
              </div>
              <button className="primary no-print" onClick={addPracticeSection}>+ Add section</button>
            </div>

            <div className="practice-list">
              {data.practice.map((item, index) => (
                <article className="practice-card" key={item.id}>
                  <div className="time-badge">{item.minutes} min</div>
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
          </section>
        )}

        {tab === 'players' && (
          <section>
            <div className="section-heading">
              <div>
                <h2>Players</h2>
                <p>{data.players.length} players</p>
              </div>
              <button className="primary no-print" onClick={addPlayer}>+ Add player</button>
            </div>

            {data.players.length === 0 ? (
              <div className="empty-state">
                <strong>No players yet.</strong>
                <span>Add them here. Their names and notes stay in this browser only.</span>
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
                    <div className="player-card-footer">
                      <span>
                        Avg: {playerAverage(player.id)?.toFixed(1) ?? '—'}
                      </span>
                      <button className="danger-text no-print" onClick={() => deletePlayer(player.id)}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'evaluate' && (
          <section>
            <div className="section-heading">
              <div>
                <h2>Player Evaluation</h2>
                <p>Tap 1–5 for each category</p>
              </div>
            </div>

            {data.players.length === 0 ? (
              <div className="empty-state">
                <strong>Add players first.</strong>
                <span>Go to the Players tab and add your roster.</span>
              </div>
            ) : (
              <>
                <div className="player-picker no-print">
                  {data.players.map(player => (
                    <button
                      key={player.id}
                      className={selectedPlayerId === player.id ? 'selected' : ''}
                      onClick={() => setSelectedPlayerId(player.id)}
                    >
                      <span>{player.name || 'Unnamed player'}</span>
                      <small>{player.grade || 'No grade'} · {playerAverage(player.id)?.toFixed(1) ?? '—'}</small>
                    </button>
                  ))}
                </div>

                {selectedPlayer && (
                  <article className="evaluation-card">
                    <div className="evaluation-header">
                      <div>
                        <h3>{selectedPlayer.name || 'Unnamed player'}</h3>
                        <span>{selectedPlayer.grade || 'No grade set'}</span>
                      </div>
                      <strong>{playerAverage(selectedPlayer.id)?.toFixed(1) ?? '—'}</strong>
                    </div>

                    <div className="ratings-list">
                      {data.categories.map(category => {
                        const currentRating = data.ratings[selectedPlayer.id]?.[category.id]
                        return (
                          <div className="rating-row" key={category.id}>
                            <span>{category.name}</span>
                            <div className="rating-buttons">
                              {[1, 2, 3, 4, 5].map(value => (
                                <button
                                  key={value}
                                  className={currentRating === value ? 'chosen' : ''}
                                  onClick={() => setRating(selectedPlayer.id, category.id, value)}
                                  aria-label={`${category.name}: ${value}`}
                                >
                                  {value}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <label className="notes-area">
                      Notes
                      <textarea
                        value={selectedPlayer.notes}
                        placeholder="Fast, aggressive, good left foot, keeps head up..."
                        onChange={e => updatePlayer({ ...selectedPlayer, notes: e.target.value })}
                      />
                    </label>
                  </article>
                )}

                <div className="print-table-wrap">
                  <h3>Printable Evaluation Sheet</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Grade</th>
                        {data.categories.map(c => <th key={c.id}>{c.name}</th>)}
                        <th>Avg</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.players.map(player => (
                        <tr key={player.id}>
                          <td>{player.name}</td>
                          <td>{player.grade}</td>
                          {data.categories.map(c => (
                            <td key={c.id}>{data.ratings[player.id]?.[c.id] ?? ''}</td>
                          ))}
                          <td>{playerAverage(player.id)?.toFixed(1) ?? ''}</td>
                          <td>{player.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {tab === 'settings' && (
          <section>
            <div className="section-heading">
              <div>
                <h2>Setup</h2>
                <p>Customize what you want to evaluate</p>
              </div>
              <button className="primary no-print" onClick={addCategory}>+ Add category</button>
            </div>

            <div className="settings-card">
              <h3>Rating Categories</h3>
              {data.categories.map(category => (
                <div className="settings-row" key={category.id}>
                  <input
                    value={category.name}
                    onChange={e => {
                      const name = e.target.value
                      setData(current => ({
                        ...current,
                        categories: current.categories.map(c => c.id === category.id ? { ...c, name } : c)
                      }))
                    }}
                  />
                  <button
                    className="danger-text no-print"
                    onClick={() => setData(current => ({
                      ...current,
                      categories: current.categories.filter(c => c.id !== category.id)
                    }))}
                  >
                    Remove
                  </button>
                </div>
              ))}
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
    </div>
  )
}
