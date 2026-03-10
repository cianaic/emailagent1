'use client'

const Card = ({ className = '', ...props }) => (
  <div className={`rounded-xl border border-border bg-white shadow-sm ${className}`} {...props} />
)

const CardContent = ({ className = '', ...props }) => (
  <div className={`p-4 ${className}`} {...props} />
)

export { Card, CardContent }
