import dayjs from 'dayjs'

export function a(date?: Date): string {
  if (!date) return ``
  return dayjs(date).format(`D MMM`)
}
