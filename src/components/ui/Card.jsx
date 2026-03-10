const Card = ({ className = '', ...props }) => (
  <div className={`rounded-xl border border-border bg-ocean-light shadow-sm ${className}`} {...props} />
)

const CardContent = ({ className = '', ...props }) => (
  <div className={`p-4 ${className}`} {...props} />
)

export { Card, CardContent }
