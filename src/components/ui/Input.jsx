'use client'

import { forwardRef } from 'react'

const Input = forwardRef(({ className = '', ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={`flex h-10 w-full rounded-full border border-border bg-white px-4 py-2 text-sm text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
})

Input.displayName = 'Input'

export { Input }
