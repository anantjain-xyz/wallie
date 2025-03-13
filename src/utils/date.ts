import dayjs from 'dayjs'

export function abc(date?: Date): string {
  if (!date) return ``
  return dayjs(date).format(`D MMM`)
}
