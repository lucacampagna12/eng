import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Check } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'

// ---------- Checkbox ----------
export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & { round?: boolean }
>(({ className, round, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer flex size-3.5 shrink-0 items-center justify-center border border-border-strong bg-transparent transition-colors duration-150 outline-none',
      'hover:border-subtle-foreground focus-visible:ring-2 focus-visible:ring-border-strong',
      'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      round ? 'rounded-full' : 'rounded-[4px]',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      <Check className="size-[70%]" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = 'Checkbox'

// ---------- Switch ----------
export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border border-transparent transition-colors duration-150 outline-none',
      'focus-visible:ring-2 focus-visible:ring-border-strong data-[state=checked]:bg-primary data-[state=unchecked]:bg-border-strong',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block size-3.5 rounded-full bg-background shadow transition-transform duration-150 data-[state=checked]:translate-x-[15px] data-[state=unchecked]:translate-x-px" />
  </SwitchPrimitive.Root>
))
Switch.displayName = 'Switch'

// ---------- Tooltip ----------
export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger
export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 rounded-md border border-border bg-elevated px-2 py-1 text-xs font-medium text-foreground shadow-popover',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = 'TooltipContent'

/** Convenience wrapper: <Hint label="...">{trigger}</Hint> */
export function Hint({
  label,
  side = 'top',
  children,
}: {
  label: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}

// ---------- Tabs ----------
export const Tabs = TabsPrimitive.Root
export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn('inline-flex items-center rounded-lg bg-elevated-hover p-1', className)} {...props} />
))
TabsList.displayName = 'TabsList'
export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md text-sm font-semibold text-muted-foreground transition-colors duration-150 outline-none',
      'hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = 'TabsTrigger'
export const TabsContent = TabsPrimitive.Content

// ---------- Input ----------
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-8 w-full rounded-md border border-border bg-elevated px-3 text-sm text-foreground transition-colors duration-150 outline-none',
        'placeholder:text-subtle-foreground hover:border-border-strong focus-visible:border-subtle-foreground',
        'disabled:cursor-not-allowed disabled:text-subtle-foreground disabled:hover:border-border',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-xs font-medium text-foreground', className)} {...props} />
}

export function Separator({ className, vertical }: { className?: string; vertical?: boolean }) {
  return <div role="separator" className={cn(vertical ? 'h-5 w-px' : 'h-px w-full', 'shrink-0 bg-border', className)} />
}
