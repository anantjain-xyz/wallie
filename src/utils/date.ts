import dayjs from 'dayjs'

export function abcde(date?: Date): string {
  if (!date) return ``
  return dayjs(date).format(`D MMM`)
}
