import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-700 text-white hover:bg-primary-800 shadow-sm hover:shadow focus-visible:ring-primary-400',
        secondary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow focus-visible:ring-primary-400',
        outline: 'border border-primary-300 bg-white text-primary-700 hover:bg-primary-50 hover:border-primary-400 focus-visible:ring-primary-400',
        ghost: 'text-primary-700 hover:bg-primary-50 hover:text-primary-800',
        danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow focus-visible:ring-red-400',
        success: 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow focus-visible:ring-green-400',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
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
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
