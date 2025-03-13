import dayjs from 'dayjs'

export function newFunctionNamenName(date?: Date): string {
  if (!date) return ``
  return dayjs(date).format(`D MMM`)
}
