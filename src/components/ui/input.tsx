// src/components/ui/input.tsx
//
// Adaptado do Input do shadcn/ui, com as escalas ink/brand do projeto no
// lugar das CSS variables de tema do shadcn.

import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 transition-colors placeholder:text-ink-400 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50',
      className
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export { Input }
