import dayjs from 'dayjs'

export function bat(date?: Date): string {
  if (!date) return ``
  return dayjs(date).format(`D MMM`)
}
