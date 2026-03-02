import { forwardRef } from 'react'

const ScrollArea = forwardRef(({ className = '', children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`overflow-y-auto ${className}`}
      {...props}
    >
      {children}
    </div>
  )
})

ScrollArea.displayName = 'ScrollArea'

export { ScrollArea }
