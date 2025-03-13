import dayjs from 'dayjs'

export function cing {
  if (!date) return ``
  return dayjs(date).format(`D MMM`)
}
