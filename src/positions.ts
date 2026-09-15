export type PositionCode = '1' | '5' | '7' | '9' | '11'

export const POSITION_CODES: PositionCode[] = ['1', '5', '7', '9', '11']

export const POSITION_LABELS: Record<PositionCode, string> = {
  '1': 'GK',
  '5': 'D',
  '7': 'L',
  '9': 'R',
  '11': 'M'
}
