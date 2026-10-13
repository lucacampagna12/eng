import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-border-strong disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:opacity-90',
        secondary: 'border border-border bg-elevated text-foreground hover:border-border-strong hover:bg-elevated-hover',
        ghost: 'text-muted-foreground hover:bg-hover hover:text-foreground',
        dashed:
          'border border-dashed border-border-strong text-muted-foreground hover:border-subtle-foreground hover:bg-hover hover:text-foreground',
        danger: 'bg-danger text-white hover:opacity-90',
      },
      size: {
        xs: 'h-6 rounded-md px-2 text-xs [&_svg]:size-3',
        sm: 'h-7 rounded-md px-2.5 text-xs [&_svg]:size-3.5',
        md: 'h-8 rounded-md px-3 text-sm [&_svg]:size-4',
        icon: 'size-8 rounded-md [&_svg]:size-4',
        'icon-sm': 'size-7 rounded-md [&_svg]:size-3.5',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, type = 'button', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp ref={ref} type={asChild ? undefined : type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  },
)
Button.displayName = 'Button'

export { buttonVariants }
