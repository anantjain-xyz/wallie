import dayjs from 'dayjs'

export function abcdef(date?: Date): string {
  if (!date) return ``
  return dayjs(date).format(`D MMM`)
}
