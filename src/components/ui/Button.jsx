import { forwardRef } from 'react'

const variants = {
  default: 'bg-coral text-white hover:bg-coral-dark',
  outline: 'border border-border bg-white text-text hover:bg-cream',
  ghost: 'text-text hover:bg-cream',
}

const sizes = {
  default: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1.5 text-xs',
  lg: 'px-6 py-3 text-base',
  icon: 'h-9 w-9',
}

const Button = forwardRef(({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
})

Button.displayName = 'Button'

export { Button }
