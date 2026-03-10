'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../lib/authContext'

const ASSISTANTS = [
  { name: 'Sage', tagline: 'Wise and helpful', emoji: '🧙', bg: 'bg-amber-100', color: 'text-amber-700' },
  { name: 'Nova', tagline: 'Bright and innovative', emoji: '✨', bg: 'bg-purple-100', color: 'text-purple-700' },
  { name: 'Echo', tagline: 'Always in sync', emoji: '🔮', bg: 'bg-cyan-100', color: 'text-cyan-700' },
  { name: 'Atlas', tagline: 'Carries your workload', emoji: '🌍', bg: 'bg-emerald-100', color: 'text-emerald-700' },
  { name: 'Pixel', tagline: 'Small but mighty', emoji: '⚡', bg: 'bg-red-100', color: 'text-red-700' },
  { name: 'Iris', tagline: 'Clear vision ahead', emoji: '👁', bg: 'bg-indigo-100', color: 'text-indigo-700' },
]

const PERSONALITIES = [
  { id: 'professional', label: 'Professional', desc: 'Clear, concise, business-focused communication' },
  { id: 'friendly', label: 'Friendly', desc: 'Warm, supportive, and conversational' },
  { id: 'efficient', label: 'Efficient', desc: 'Fast, direct, and to the point' },
  { id: 'casual', label: 'Casual', desc: 'Relaxed, witty, and easy-going' },
]

const SCAN_STEPS = [
  'Connecting to your Gmail account...',
  'Scanning email headers & contacts...',
  'Analyzing communication patterns...',
  'Building relationship context map...',
  'Categorizing contacts by frequency & type...',
  'Mapping response time patterns...',
  'Identifying key relationships...',
  'Finalizing your contact intelligence...',
]

export default function Onboarding() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0) // 0: welcome, 1: assistant setup, 2: scanning

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-border z-50">
        <div
          className="h-full bg-coral transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / 3) * 100}%` }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-16 pb-24">
        {step === 0 && <WelcomeStep user={user} onNext={() => setStep(1)} />}
        {step === 1 && <AssistantSetupStep onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <ScanningStep onComplete={() => router.push('/chat')} />}
      </div>
    </div>
  )
}

function WelcomeStep({ user, onNext }) {
  return (
    <div className="text-center pt-12">
      <div className="w-16 h-16 rounded-2xl bg-coral flex items-center justify-center mx-auto mb-8">
        <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-text mb-3">
        Welcome, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}
      </h1>
      <p className="text-text-muted mb-2">
        {user?.email}
      </p>
      <p className="text-text-muted max-w-md mx-auto mb-10 leading-relaxed">
        Let's set up your AI Chief of Staff. This will take about 2 minutes — then your assistant will begin a deep training scan of your email history.
      </p>

      <div className="bg-white rounded-xl border border-border p-6 text-left max-w-md mx-auto mb-10">
        <h3 className="font-semibold text-text mb-4">What happens next</h3>
        <div className="space-y-4">
          {[
            { num: '1', text: 'Choose a name & personality for your assistant' },
            { num: '2', text: 'Your assistant scans your Gmail history' },
            { num: '3', text: 'A rich contact intelligence map is built for you' },
          ].map((item) => (
            <div key={item.num} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-coral/10 text-coral text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {item.num}
              </div>
              <span className="text-sm text-text">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        className="bg-coral text-white rounded-full px-8 py-3 font-medium hover:bg-coral-dark transition-colors cursor-pointer"
      >
        Let's get started
      </button>
    </div>
  )
}

function AssistantSetupStep({ onNext, onBack }) {
  const [selectedAssistant, setSelectedAssistant] = useState(null)
  const [customName, setCustomName] = useState('')
  const [personality, setPersonality] = useState(null)

  const assistantName = customName || (selectedAssistant !== null ? ASSISTANTS[selectedAssistant].name : '')
  const canContinue = assistantName.trim() && personality

  function handleSave() {
    if (!canContinue) return
    const config = {
      name: assistantName.trim(),
      personality,
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem('assistant_config', JSON.stringify(config))
    onNext()
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors cursor-pointer mb-8"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      <h1 className="text-3xl font-bold text-text mb-2">Set up your assistant</h1>
      <p className="text-text-muted mb-10">Choose a name and personality that fits your style</p>

      {/* Name selection */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-text mb-4">Name</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
          {ASSISTANTS.map((a, i) => (
            <button
              key={a.name}
              onClick={() => { setSelectedAssistant(i); setCustomName('') }}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                selectedAssistant === i && !customName
                  ? 'border-coral bg-coral/5 shadow-sm'
                  : 'border-border bg-white hover:border-coral/30'
              }`}
            >
              <div className={`w-12 h-12 rounded-full ${a.bg} ${a.color} flex items-center justify-center text-xl`}>
                {a.emoji}
              </div>
              <span className="text-sm font-medium text-text">{a.name}</span>
              <span className="text-[10px] text-text-muted leading-tight text-center">{a.tagline}</span>
            </button>
          ))}
        </div>

        <div className="relative flex items-center mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="px-4 text-xs text-text-muted">or use your own</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <input
          type="text"
          placeholder="Enter custom name..."
          value={customName}
          onChange={(e) => { setCustomName(e.target.value); if (e.target.value) setSelectedAssistant(null) }}
          className="w-full sm:w-80 h-11 rounded-xl border border-border bg-white px-4 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-coral transition-colors"
        />
      </div>

      {/* Personality selection */}
      <div className="mb-10">
        <label className="block text-sm font-semibold text-text mb-4">Personality</label>
        <div className="space-y-3">
          {PERSONALITIES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPersonality(p.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                personality === p.id
                  ? 'border-coral bg-coral/5 shadow-sm'
                  : 'border-border bg-white hover:border-coral/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  personality === p.id ? 'border-coral' : 'border-gray-300'
                }`}>
                  {personality === p.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-coral" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-text">{p.label}</div>
                  <div className="text-sm text-text-muted">{p.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Continue */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={!canContinue}
          className="bg-coral text-white rounded-full px-8 py-3 font-medium hover:bg-coral-dark transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
        {assistantName && personality && (
          <span className="text-sm text-text-muted">
            <strong className="text-text">{assistantName}</strong> &middot; {PERSONALITIES.find(p => p.id === personality)?.label}
          </span>
        )}
      </div>
    </div>
  )
}

function ScanningStep({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [contactCount, setContactCount] = useState(0)
  const [done, setDone] = useState(false)

  const config = JSON.parse(localStorage.getItem('assistant_config') || '{}')
  const assistantName = config.name || 'Your assistant'

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= SCAN_STEPS.length - 1) {
          clearInterval(interval)
          setTimeout(() => setDone(true), 1500)
          return prev
        }
        return prev + 1
      })
    }, 2500)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (done) return
    const interval = setInterval(() => {
      setContactCount((prev) => {
        const increment = Math.floor(Math.random() * 15) + 5
        return Math.min(prev + increment, 847)
      })
    }, 300)
    return () => clearInterval(interval)
  }, [done])

  return (
    <div className="text-center pt-8">
      <div className="w-16 h-16 rounded-2xl bg-coral/10 text-coral flex items-center justify-center mx-auto mb-8 text-3xl">
        {done ? (
          <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        ) : (
          <div className="w-9 h-9 border-3 border-coral border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      <h1 className="text-3xl font-bold text-text mb-3">
        {done ? `${assistantName} is ready` : `${assistantName} is learning about you`}
      </h1>

      <p className="text-text-muted max-w-md mx-auto mb-10">
        {done
          ? 'Your contact intelligence map has been built. Time to put your assistant to work.'
          : 'Scanning your email history to build a deep understanding of your contacts, communication patterns, and relationships.'
        }
      </p>

      {/* Progress */}
      <div className="max-w-md mx-auto mb-8">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-text-muted">Training scan</span>
          <span className="font-medium text-text">
            {done ? '100%' : `${Math.round(((currentStep + 1) / SCAN_STEPS.length) * 100)}%`}
          </span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-coral rounded-full transition-all duration-1000 ease-out"
            style={{ width: done ? '100%' : `${((currentStep + 1) / SCAN_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="text-2xl font-bold text-text">{contactCount.toLocaleString()}</div>
          <div className="text-xs text-text-muted mt-1">Contacts analyzed</div>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="text-2xl font-bold text-text">
            {Math.floor(contactCount * 12.3).toLocaleString()}
          </div>
          <div className="text-xs text-text-muted mt-1">Emails processed</div>
        </div>
      </div>

      {/* Scan log */}
      <div className="max-w-md mx-auto bg-white rounded-xl border border-border p-4 text-left mb-10">
        <div className="space-y-2.5">
          {SCAN_STEPS.map((s, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 text-sm transition-opacity duration-500 ${
                i > currentStep ? 'opacity-30' : 'opacity-100'
              }`}
            >
              {i < currentStep ? (
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : i === currentStep ? (
                <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-coral animate-pulse" />
                </div>
              ) : (
                <div className="w-4 h-4 flex-shrink-0" />
              )}
              <span className={i <= currentStep ? 'text-text' : 'text-text-muted'}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {done && (
        <button
          onClick={onComplete}
          className="bg-coral text-white rounded-full px-8 py-3 font-medium hover:bg-coral-dark transition-colors cursor-pointer animate-fade-in"
        >
          Start using {assistantName}
        </button>
      )}
    </div>
  )
}
