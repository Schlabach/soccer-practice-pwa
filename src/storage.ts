import type { AppData } from './types'

const STORAGE_KEY = 'soccer-practice-coach-v1'

export const defaultData: AppData = {
  players: [],
  categories: [
    { id: crypto.randomUUID(), name: 'Speed' },
    { id: crypto.randomUUID(), name: 'Ball Control' },
    { id: crypto.randomUUID(), name: 'Passing' },
    { id: crypto.randomUUID(), name: 'Shooting' },
    { id: crypto.randomUUID(), name: '1v1 / Defense' },
    { id: crypto.randomUUID(), name: 'Game Sense' },
    { id: crypto.randomUUID(), name: 'Effort' }
  ],
  practice: [
    {
      id: crypto.randomUUID(),
      title: 'Free dribble / arrive',
      minutes: 5,
      details: 'Everyone gets a ball. Let them dribble and get comfortable.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Quick feet + ball touches',
      minutes: 5,
      details: 'Toe taps, foundations, pull-backs, inside/outside touches.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Speed / cone race',
      minutes: 5,
      details: 'Short sprint or cone-and-back race. Keep it playful.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Cone dribbling',
      minutes: 10,
      details: 'Different paths, turns, both feet, control before speed.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Passing',
      minutes: 8,
      details: 'Pairs or gates. Inside of foot, receive, then pass.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Shooting',
      minutes: 7,
      details: 'Two stations if possible. Dribble in and shoot.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Sharks & Minnows',
      minutes: 8,
      details: 'Fun dribbling game. Watch control, confidence, and competitiveness.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Scrimmage',
      minutes: 12,
      details: 'Mostly observe. Watch spacing, decision-making, effort, and defense.'
    }
  ],
  ratings: {}
}

export function loadData(): AppData {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return defaultData

  try {
    return JSON.parse(saved) as AppData
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
