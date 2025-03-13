import dayjs from 'dayjs'

export function newFunctionName(date?: Date): string {
  if (!date) return ``
  return dayjs(date).format(`D MMM`)
}
