import { DayPicker, type DayPickerProps } from 'react-day-picker'
import { cn } from '@/lib/utils'

export function Calendar({ className, ...props }: DayPickerProps) {
  return <DayPicker weekStartsOn={1} showOutsideDays className={cn('p-2', className)} {...props} />
}
