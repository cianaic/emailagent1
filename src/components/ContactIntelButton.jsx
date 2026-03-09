import { Button } from './ui/Button'

const STAGES = {
  idle: { label: 'Scan Network', icon: '⊛' },
  scanning: { label: 'Scanning inbox...', icon: null },
  reading: { label: 'Reading conversations...', icon: null },
  classifying: { label: 'Classifying contacts...', icon: null },
  graphing: { label: 'Building graph...', icon: null },
  syncing: { label: 'Syncing to Notion...', icon: null },
  done: { label: 'Network mapped', icon: '✓' },
}

function ContactIntelButton({ stage = 'idle', progress, disabled, onClick }) {
  const { label, icon } = STAGES[stage] || STAGES.idle
  const isActive = stage !== 'idle' && stage !== 'done'

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={stage === 'done' ? 'ghost' : 'outline'}
        size="sm"
        disabled={disabled || isActive}
        onClick={onClick}
        className="relative gap-1.5"
      >
        {isActive ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-coral border-t-transparent" />
        ) : icon ? (
          <span className="text-sm">{icon}</span>
        ) : null}
        <span>{label}</span>
        {progress && isActive && (
          <span className="ml-1 text-text-muted">
            {progress}
          </span>
        )}
      </Button>
    </div>
  )
}

export default ContactIntelButton
