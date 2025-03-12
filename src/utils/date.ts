import dayjs from 'dayjs'

export function bar(date?: Date): string {
  if (!date) return ``
  return dayjs(date).format(`D MMM`)
}
