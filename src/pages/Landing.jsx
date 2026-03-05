import { useAuth } from '../lib/authContext'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
      </svg>
    ),
    title: 'Deep Contact Intelligence',
    desc: 'Your assistant runs an industry-leading scan of your Gmail history, building a rich context map of every relationship — who they are, how you interact, and how quickly you respond.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
    title: 'Smart Email Triage',
    desc: 'Automatically categorizes your inbox by relationship context, urgency, and your response patterns. Newsletter noise is carved out. Important messages surface instantly.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
    title: 'Calendar-Aware Actions',
    desc: 'Much of email work is really calendar work. Your assistant understands scheduling context and can draft replies, propose times, and manage your availability.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
    title: 'Works on Your Existing Client',
    desc: "Keep using Gmail as-is. This isn't another email client — it's the powerful automation layer that works behind the scenes on your actual inbox and calendar.",
  },
]

export default function Landing() {
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/onboarding')
  }, [user, navigate])

  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <span className="font-semibold text-lg text-text">ChiefMail</span>
        </div>
        <button
          onClick={signInWithGoogle}
          className="text-sm font-medium text-coral hover:text-coral-dark transition-colors cursor-pointer"
        >
          Sign in
        </button>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white border border-border px-4 py-1.5 text-sm text-text-muted mb-8">
          <svg className="w-4 h-4 text-coral" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          Lightning fast email & calendar agent
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-text tracking-tight leading-tight mb-6">
          Lightning fast<br />
          <span className="text-coral">email & calendar agent</span>
        </h1>

        <p className="text-lg text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          An AI assistant that learns more about you in 2 days than a human executive assistant would in 2 years.
          It scans your entire email history, builds deep relationship context, and powerfully automates actions on your actual inbox.
        </p>

        <button
          onClick={signInWithGoogle}
          className="inline-flex items-center gap-3 bg-text text-white rounded-full px-8 py-4 text-base font-medium hover:bg-gray-800 transition-colors cursor-pointer shadow-lg shadow-gray-900/10"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-xs text-text-muted mt-4">
          We request Gmail & Calendar access to power your AI assistant
        </p>
      </section>

      {/* Visual — Contact Network */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="relative bg-white rounded-2xl border border-border shadow-sm p-8 overflow-hidden min-h-[320px] flex items-center justify-center">
          <NetworkVisualization />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-text text-center mb-12">
          What your AI Chief of Staff does
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-border p-6">
              <div className="w-10 h-10 rounded-lg bg-coral/10 text-coral flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-text mb-2">{f.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-border">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold text-text text-center mb-12">
            Set up in 3 minutes
          </h2>
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {[
              { step: '1', title: 'Connect Google', desc: 'Sign in and grant Gmail & Calendar access with one click.' },
              { step: '2', title: 'Meet your assistant', desc: 'Choose a name and personality. Make it yours.' },
              { step: '3', title: 'Training scan', desc: 'Your assistant scans your email history to deeply understand your world.' },
            ].map((s) => (
              <div key={s.step}>
                <div className="w-10 h-10 rounded-full bg-coral text-white font-bold flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-text mb-2">{s.title}</h3>
                <p className="text-sm text-text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-text mb-4">
          Stop managing your inbox.<br />Start delegating it.
        </h2>
        <p className="text-text-muted mb-8">
          Your AI Chief of Staff is ready to start learning.
        </p>
        <button
          onClick={signInWithGoogle}
          className="inline-flex items-center gap-3 bg-coral text-white rounded-full px-8 py-4 text-base font-medium hover:bg-coral-dark transition-colors cursor-pointer"
        >
          Get started — it's free
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center text-xs text-text-muted">
        ChiefMail &middot; Lightning fast email & calendar agent
      </footer>
    </div>
  )
}


function NetworkVisualization() {
  const nodes = [
    { id: 'you', label: 'You', x: 50, y: 50, size: 28, color: '#cd6f47' },
    { id: 'n1', label: 'Sarah K.', x: 22, y: 25, size: 18, color: '#6366f1' },
    { id: 'n2', label: 'Mike R.', x: 78, y: 22, size: 16, color: '#8b5cf6' },
    { id: 'n3', label: 'Lisa T.', x: 15, y: 70, size: 14, color: '#06b6d4' },
    { id: 'n4', label: 'James P.', x: 82, y: 68, size: 17, color: '#10b981' },
    { id: 'n5', label: 'Anna W.', x: 35, y: 82, size: 13, color: '#f59e0b' },
    { id: 'n6', label: 'Tom B.', x: 68, y: 85, size: 12, color: '#ef4444' },
    { id: 'n7', label: 'Dev Team', x: 88, y: 42, size: 15, color: '#8b5cf6' },
    { id: 'n8', label: 'Board', x: 10, y: 45, size: 14, color: '#6366f1' },
    { id: 'n9', label: 'Investors', x: 38, y: 15, size: 15, color: '#10b981' },
    { id: 'n10', label: 'Partners', x: 65, y: 48, size: 13, color: '#06b6d4' },
  ]

  const edges = [
    ['you', 'n1'], ['you', 'n2'], ['you', 'n3'], ['you', 'n4'],
    ['you', 'n5'], ['you', 'n7'], ['you', 'n8'], ['you', 'n9'],
    ['you', 'n10'], ['n1', 'n9'], ['n2', 'n7'], ['n3', 'n5'],
    ['n4', 'n6'], ['n4', 'n7'], ['n8', 'n1'], ['n9', 'n2'],
    ['n10', 'n4'], ['n5', 'n6'],
  ]

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]))

  return (
    <div className="relative w-full" style={{ paddingBottom: '56%' }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {/* Edges */}
        {edges.map(([from, to], i) => {
          const a = nodeMap[from]
          const b = nodeMap[to]
          return (
            <line
              key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#e5e5e0" strokeWidth="0.3" opacity="0.6"
            />
          )
        })}
        {/* Nodes */}
        {nodes.map((n) => (
          <g key={n.id}>
            <circle
              cx={n.x} cy={n.y} r={n.size / 10}
              fill={n.color} opacity="0.15"
            />
            <circle
              cx={n.x} cy={n.y} r={n.size / 16}
              fill={n.color}
            />
            <text
              x={n.x} y={n.y + n.size / 10 + 2.5}
              textAnchor="middle" fontSize="2.2" fill="#6b7280" fontWeight="500"
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="absolute bottom-4 left-4 text-xs text-text-muted bg-cream/80 backdrop-blur px-3 py-1.5 rounded-full">
        Your AI-mapped contact network
      </div>
    </div>
  )
}
