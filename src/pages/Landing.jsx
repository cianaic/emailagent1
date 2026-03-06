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

const QUICK_ACTIONS = [
  { icon: <SearchIcon />, label: 'Draft e-mails' },
  { icon: <FileIcon />, label: 'Find an important file' },
  { icon: <InboxIcon />, label: 'Organize inbox' },
  { icon: <SortIcon />, label: 'Sort by priority' },
]

export default function Landing() {
  const { user, signInWithGoogle, supabaseConfigured } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/onboarding')
  }, [user, navigate])

  return (
    <div className="min-h-screen bg-cream">
      {!supabaseConfigured && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-center text-sm text-red-700">
          <strong>Configuration required:</strong> Copy{' '}
          <code className="bg-red-100 px-1 rounded">.env.example</code> to{' '}
          <code className="bg-red-100 px-1 rounded">.env</code> and fill in your
          Supabase credentials, then restart the dev server.
        </div>
      )}

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <span className="font-serif text-2xl font-semibold text-text tracking-tight">ChiefMail</span>
        <div className="flex items-center gap-3">
          <button
            onClick={signInWithGoogle}
            className="text-sm font-medium text-text hover:text-text-muted transition-colors cursor-pointer px-4 py-2"
          >
            Log In
          </button>
          <button
            onClick={signInWithGoogle}
            className="text-sm font-medium text-white bg-text rounded-full px-5 py-2.5 hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Get started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 sm:pt-24 pb-12 text-center">
        <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-medium text-text tracking-tight leading-[1.05] mb-8">
          Emails so good,{' '}
          <br className="hidden sm:block" />
          you just press send!
        </h1>

        <p className="text-base sm:text-lg text-text-muted max-w-xl mx-auto mb-12 leading-relaxed">
          ChiefMail organizes your inbox, drafts responses and reacts to your emails with AI workflows.
        </p>

        {/* CTA Button */}
        <button
          onClick={signInWithGoogle}
          className="group inline-flex items-center gap-4 rounded-full pl-8 pr-2 py-2 text-base font-medium cursor-pointer transition-all"
          style={{
            background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 70%, #f5f0e8 100%)',
            color: '#fff',
          }}
        >
          <span>Get started for free</span>
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </span>
        </button>

        {/* Sits on top of */}
        <div className="flex items-center justify-center gap-3 mt-8 text-sm text-text-muted">
          <span>ChiefMail sits on top of</span>
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M22 6.25v11.5c0 1.24-1.01 2.25-2.25 2.25H4.25C3.01 20 2 18.99 2 17.75V6.25C2 5.01 3.01 4 4.25 4h15.5C20.99 4 22 5.01 22 6.25z" opacity="0.1"/>
            <path fill="#EA4335" d="M21.97 6.86L12 13.5 2.03 6.86A2.25 2.25 0 014.25 4h15.5c1.05 0 1.93.72 2.22 1.72v1.14z"/>
            <path fill="#34A853" d="M2 8.5v9.25C2 18.99 3.01 20 4.25 20H12V13.5L2 8.5z" opacity="0.8"/>
            <path fill="#4285F4" d="M22 8.5v9.25C22 18.99 20.99 20 19.75 20H12V13.5l10-5z" opacity="0.8"/>
            <path fill="#FBBC05" d="M12 13.5L2.03 6.86 2 8.5l10 5 10-5-.03-1.64L12 13.5z" opacity="0.6"/>
          </svg>
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15h-2v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3l-.5 3H13v6.95c5.05-.5 9-4.76 9-9.95z" opacity="0.2"/>
            <path fill="#4285F4" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
        </div>
      </section>

      {/* Quick action pills */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="flex flex-wrap justify-center gap-3">
          {QUICK_ACTIONS.map((action) => (
            <div
              key={action.label}
              className="inline-flex items-center gap-2.5 bg-white border border-border rounded-full px-5 py-2.5 text-sm text-text"
            >
              <span className="text-text-muted">{action.icon}</span>
              {action.label}
            </div>
          ))}
        </div>
      </section>

      {/* Gradient bar */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="flex gap-3 h-40 rounded-2xl overflow-hidden">
          <div className="flex-1 rounded-2xl" style={{ background: 'linear-gradient(180deg, #C4B5FD 0%, #DDD6FE 50%, #EDE9FE 100%)' }} />
          <div className="flex-1 rounded-2xl" style={{ background: 'linear-gradient(180deg, #FDE68A 0%, #FEF3C7 50%, #FFFBEB 100%)' }} />
          <div className="flex-1 rounded-2xl" style={{ background: 'linear-gradient(180deg, #C4B5FD 0%, #DDD6FE 50%, #EDE9FE 100%)' }} />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="font-serif text-3xl sm:text-4xl font-medium text-text text-center mb-4">
          What your AI Chief of Staff does
        </h2>
        <p className="text-text-muted text-center mb-14 max-w-lg mx-auto">
          An AI assistant that learns more about you in 2 days than a human executive assistant would in 2 years.
        </p>
        <div className="grid sm:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-border p-7">
              <div className="w-11 h-11 rounded-xl bg-cream text-text-muted flex items-center justify-center mb-5">
                {f.icon}
              </div>
              <h3 className="font-semibold text-text mb-2 text-base">{f.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-border">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-text text-center mb-14">
            Set up in 3 minutes
          </h2>
          <div className="grid sm:grid-cols-3 gap-10 text-center">
            {[
              { step: '1', title: 'Connect Google', desc: 'Sign in and grant Gmail & Calendar access with one click.' },
              { step: '2', title: 'Meet your assistant', desc: 'Choose a name and personality. Make it yours.' },
              { step: '3', title: 'Training scan', desc: 'Your assistant scans your email history to deeply understand your world.' },
            ].map((s) => (
              <div key={s.step}>
                <div className="w-11 h-11 rounded-full bg-text text-white font-semibold text-sm flex items-center justify-center mx-auto mb-5">
                  {s.step}
                </div>
                <h3 className="font-semibold text-text mb-2">{s.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="font-serif text-3xl sm:text-5xl font-medium text-text mb-5 leading-tight">
          Stop managing your inbox.<br />Start delegating it.
        </h2>
        <p className="text-text-muted mb-10 text-lg">
          Your AI Chief of Staff is ready to start learning.
        </p>
        <button
          onClick={signInWithGoogle}
          className="group inline-flex items-center gap-4 rounded-full pl-8 pr-2 py-2 text-base font-medium cursor-pointer transition-all"
          style={{
            background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 70%, #f5f0e8 100%)',
            color: '#fff',
          }}
        >
          <span>Get started — it's free</span>
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </span>
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center text-sm text-text-muted">
        ChiefMail &middot; Lightning fast email & calendar agent
      </footer>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

function InboxIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
    </svg>
  )
}
