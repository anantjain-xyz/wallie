import classNames from 'classnames'
import { PriorityIcons, PriorityValue, PriorityColors } from '../types/types'

interface Props {
  priority: string
  className?: string
}

export default function PriorityIcon({ priority, className }: Props) {
  const classes = classNames(`w-4 h-4`, PriorityColors[priority.toLowerCase() as PriorityValue], className)
  const Icon = PriorityIcons[priority.toLowerCase() as PriorityValue]
  return <Icon className={classes}/>
}
