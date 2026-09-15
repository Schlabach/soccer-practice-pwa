import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppData } from './types'
import { buildLiveSchedule, computeElapsedMs, currentSectionIndex } from './schedule'
import { releaseWakeLock, requestNotificationPermission, requestWakeLock, showLocalNotification } from './notifications'

const PRE_ALERT_MS = 60_000

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

type Props = {
  data: AppData
  setData: React.Dispatch<React.SetStateAction<AppData>>
}

export default function ActivePractice({ data, setData }: Props) {
  const session = data.activeSession
  const live = useMemo(() => buildLiveSchedule(data.practice), [data.practice])

  const [now, setNow] = useState(() => Date.now())
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  )
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const seenRef = useRef<Set<string>>(new Set())
  const seededSessionRef = useRef<number | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && session && session.pausedAt === null) {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [session])

  const elapsedMs = session ? computeElapsedMs(session, now) : 0
  const currentIndex = session ? currentSectionIndex(elapsedMs, live) : -1

  useEffect(() => {
    if (!session) {
      seededSessionRef.current = null
      seenRef.current = new Set()
      return
    }
    if (seededSessionRef.current === session.startedAt) return
    seededSessionRef.current = session.startedAt
    const seedElapsed = computeElapsedMs(session, Date.now())
    const seen = new Set<string>()
    live.forEach(item => {
      if (seedElapsed >= item.endMs) seen.add(`${item.index}-end`)
      if (seedElapsed >= item.endMs - PRE_ALERT_MS) seen.add(`${item.index}-pre`)
    })
    seenRef.current = seen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.startedAt])

  useEffect(() => {
    if (!session || session.pausedAt !== null) return
    live.forEach(item => {
      const preKey = `${item.index}-pre`
      const endKey = `${item.index}-end`
      const next = live[item.index + 1]

      if (!seenRef.current.has(preKey) && elapsedMs >= item.endMs - PRE_ALERT_MS && elapsedMs < item.endMs) {
        seenRef.current.add(preKey)
        if (next) {
          showLocalNotification(
            'Get ready to switch',
            `Next: ${next.section.title}${next.section.setup ? ' — ' + next.section.setup : ''}`
          )
        }
      }

      if (!seenRef.current.has(endKey) && elapsedMs >= item.endMs) {
        seenRef.current.add(endKey)
        if (next) {
          showLocalNotification('Switch now', `Start: ${next.section.title}`)
        } else {
          showLocalNotification('Practice complete', 'That was the last section.')
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, session?.pausedAt])

  useEffect(() => {
    if (currentIndex === -1) return
    setExpanded(prev => {
      if (prev.has(currentIndex)) return prev
      const next = new Set(prev)
      next.add(currentIndex)
      return next
    })
  }, [currentIndex])

  function toggleExpanded(index: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  async function startSession() {
    const result = await requestNotificationPermission()
    setPermission(result)
    requestWakeLock()
    setData(current => ({
      ...current,
      activeSession: { startedAt: Date.now(), pausedAccumMs: 0, pausedAt: null, manualOffsetMs: 0 }
    }))
  }

  function pauseSession() {
    releaseWakeLock()
    setData(current => current.activeSession
      ? { ...current, activeSession: { ...current.activeSession, pausedAt: Date.now() } }
      : current)
  }

  function resumeSession() {
    requestWakeLock()
    setData(current => {
      if (!current.activeSession || current.activeSession.pausedAt === null) return current
      const pausedDuration = Date.now() - current.activeSession.pausedAt
      return {
        ...current,
        activeSession: {
          ...current.activeSession,
          pausedAccumMs: current.activeSession.pausedAccumMs + pausedDuration,
          pausedAt: null
        }
      }
    })
  }

  function endSession() {
    if (!window.confirm('End this practice session?')) return
    releaseWakeLock()
    setData(current => ({ ...current, activeSession: null }))
  }

  function skipToIndex(targetIndex: number) {
    if (!session) return
    const target = live[targetIndex]
    if (!target) return
    const liveNow = computeElapsedMs(session, Date.now())
    const delta = target.startMs - liveNow
    setData(current => current.activeSession
      ? { ...current, activeSession: { ...current.activeSession, manualOffsetMs: current.activeSession.manualOffsetMs + delta } }
      : current)
  }

  if (live.length === 0) {
    return (
      <section>
        <div className="section-heading">
          <div>
            <h2>Active Practice</h2>
            <p>Add sections in the Practice tab first.</p>
          </div>
        </div>
      </section>
    )
  }

  const isPaused = session?.pausedAt !== null && session?.pausedAt !== undefined
  const current = currentIndex >= 0 ? live[currentIndex] : undefined
  const next = currentIndex >= 0 ? live[currentIndex + 1] : undefined

  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Active Practice</h2>
          <p>{session ? (isPaused ? 'Paused' : 'Running') : 'Not started'}</p>
        </div>
        <div className="active-controls no-print">
          {!session && <button className="primary" onClick={startSession}>Start Practice</button>}
          {session && !isPaused && <button className="secondary" onClick={pauseSession}>Pause</button>}
          {session && isPaused && <button className="secondary" onClick={resumeSession}>Resume</button>}
          {session && <button className="danger-text" onClick={endSession}>End</button>}
        </div>
      </div>

      {session && permission !== 'granted' && (
        <div className="notice-banner">
          Phone alerts are off ({permission}). Enable notifications for this app/browser to get switch alerts.
        </div>
      )}

      {session && (
        <div className="notice-banner subtle">
          Keep this screen open during practice so alerts fire reliably.
        </div>
      )}

      {session && current && (
        <article className="current-section-card">
          <div className="current-section-header">
            <span className="current-label">Now</span>
            <span className="countdown">{formatCountdown(current.endMs - elapsedMs)}</span>
          </div>
          <h3>{current.section.title}</h3>
          {current.section.setup && <p className="setup-note">Setup: {current.section.setup}</p>}
        </article>
      )}

      {session && next && (
        <div className="up-next-banner">
          <strong>Up next:</strong> {next.section.title}
          {next.section.setup && <span> — Prep: {next.section.setup}</span>}
        </div>
      )}

      {session && !next && current && (
        <div className="up-next-banner">This is the last section.</div>
      )}

      <div className="active-list">
        {live.map(item => {
          const isCurrent = item.index === currentIndex
          return (
            <details
              key={item.section.id}
              className={isCurrent ? 'active-item current' : 'active-item'}
              open={expanded.has(item.index)}
              onToggle={e => {
                const isOpen = (e.target as HTMLDetailsElement).open
                if (isOpen !== expanded.has(item.index)) toggleExpanded(item.index)
              }}
            >
              <summary>
                <span>{item.section.title}</span>
                <span className="active-item-minutes">{item.section.minutes} min</span>
              </summary>
              {item.section.details && <p>{item.section.details}</p>}
              {item.section.setup && <p className="setup-note">Setup: {item.section.setup}</p>}
              {session && (
                <div className="active-item-actions no-print">
                  <button className="secondary" onClick={() => skipToIndex(item.index)}>Jump here</button>
                </div>
              )}
            </details>
          )
        })}
      </div>
    </section>
  )
}
