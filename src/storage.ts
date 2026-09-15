import type { AppData, Player, PracticeSection } from './types'
import { POSITION_CODES } from './positions'

const STORAGE_KEY = 'soccer-practice-coach-v1'

export const defaultData: AppData = {
  players: [],
  practice: [
    {
      id: crypto.randomUUID(),
      title: 'Free dribble / arrive',
      minutes: 5,
      details: 'Everyone gets a ball. Let them dribble and get comfortable.',
      setup: 'No cones needed. One ball per player, scattered in the practice area.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Quick feet + ball touches',
      minutes: 5,
      details: 'Toe taps, foundations, pull-backs, inside/outside touches.',
      setup: 'No cones needed. Players stay spread out with their own ball.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Speed / cone race',
      minutes: 5,
      details: 'Short sprint or cone-and-back race. Keep it playful.',
      setup: '2 cones per lane, about 15 yards apart, set up in parallel lanes.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Cone dribbling',
      minutes: 10,
      details: 'Different paths, turns, both feet, control before speed.',
      setup: '4-6 cones per line, 2-3 yards apart, in straight or zigzag lines.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Passing',
      minutes: 8,
      details: 'Pairs or gates. Inside of foot, receive, then pass.',
      setup: 'Optional: 2 cones per pair set 1 yard apart as a passing gate.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Shooting',
      minutes: 7,
      details: 'Two stations if possible. Dribble in and shoot.',
      setup: 'Goals or cone-goals set up; 1-2 cones marking the dribble-in start point per station.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Sharks & Minnows',
      minutes: 8,
      details: 'Fun dribbling game. Watch control, confidence, and competitiveness.',
      setup: '4 cones marking the corners of a grid for the game area.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Scrimmage',
      minutes: 12,
      details: 'Mostly observe. Watch spacing, decision-making, effort, and defense.',
      setup: 'Goals set up at each end; cones marking sidelines if needed.'
    }
  ],
  practiceStartTime: '09:00',
  activeSession: null,
  game: null
}

export function loadData(): AppData {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return defaultData

  try {
    const parsed = JSON.parse(saved) as Partial<AppData> & {
      practice?: Array<Partial<PracticeSection>>
      players?: Array<Partial<Player>>
    }
    return {
      ...defaultData,
      ...parsed,
      practice: (parsed.practice ?? defaultData.practice).map(section => {
        const merged = { ...section }
        if (typeof merged.setup !== 'string') merged.setup = ''
        return merged as PracticeSection
      }),
      players: (parsed.players ?? defaultData.players).map(player => {
        const merged = { ...player }
        if (!Array.isArray(merged.positions)) merged.positions = [...POSITION_CODES]
        return merged as Player
      })
    }
  } catch {
    return defaultData
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function resetData() {
  localStorage.removeItem(STORAGE_KEY)
}
