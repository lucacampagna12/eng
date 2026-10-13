import { ChevronDown } from 'lucide-react'
import * as React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  prefix?: React.ReactNode
}

/** Compact select built on DropdownMenu, styled like the app's inputs. */
export function SelectMenu({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className,
  id,
}: {
  value: string | undefined
  options: SelectOption[]
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  id?: string
}) {
  const current = options.find((o) => o.value === value)
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        id={id}
        className={cn(
          'flex h-8 w-full items-center gap-2 rounded-md border border-border bg-elevated px-3 text-left text-sm transition-colors duration-150 outline-none hover:border-border-strong focus-visible:border-subtle-foreground data-[state=open]:border-subtle-foreground',
          className,
        )}
      >
        {current?.prefix}
        <span className={cn('flex-1 truncate', !current && 'text-subtle-foreground')}>{current?.label ?? placeholder}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.prefix}
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
