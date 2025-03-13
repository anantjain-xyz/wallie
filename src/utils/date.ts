import dayjs from 'dayjs'

export function b(date?: Date): string {
  if (!date) return ``
  return dayjs(date).format(`D MMM`)
}
