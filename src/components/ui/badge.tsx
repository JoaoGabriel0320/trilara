import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 dark:focus:ring-offset-ink-900',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-brand-600 text-white hover:bg-brand-600/80',
        secondary:
          'border-transparent bg-ink-100 text-ink-700 hover:bg-ink-100/80 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-800/80',
        destructive:
          'border-transparent bg-rose-600 text-white hover:bg-rose-600/80',
        outline: 'border-ink-200 text-ink-900 dark:border-ink-700 dark:text-ink-50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
