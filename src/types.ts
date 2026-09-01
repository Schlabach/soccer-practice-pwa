export type Player = {
  id: string
  name: string
  grade: string
  notes: string
}

export type RatingCategory = {
  id: string
  name: string
}

export type PracticeSection = {
  id: string
  title: string
  minutes: number
  details: string
}

export type RatingsByPlayer = Record<string, Record<string, number>>

export type AppData = {
  players: Player[]
  categories: RatingCategory[]
  practice: PracticeSection[]
  ratings: RatingsByPlayer
}
