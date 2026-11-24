// src/components/ui/button.tsx
//
// Adaptado do Button do shadcn/ui. Duas diferenças de propósito:
// - Usa as escalas ink/brand do tailwind.config em vez das CSS variables de
//   tema do shadcn (bg-primary, text-muted-foreground...), que este projeto
//   não tem.
// - Não tem `asChild` (dispensa @radix-ui/react-slot). Para dar cara de botão
//   a um <Link>, use buttonVariants() direto no className.

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-brand-500 text-white hover:bg-brand-600',
        // Botão claro sobre fundo escuro — o da tela de login.
        claro: 'bg-ink-100 text-ink-900 hover:bg-white',
        outline:
          'border border-ink-200 bg-transparent hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800',
        ghost: 'hover:bg-ink-100 dark:hover:bg-white/5',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-9 px-3',
        lg: 'h-11 px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
