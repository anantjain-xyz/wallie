import dayjs from 'dayjs'

export function foo(date?: Date): string {
  if (!date) return ``
  return dayjs(date).format(`D MMM`)
}
