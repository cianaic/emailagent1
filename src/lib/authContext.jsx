import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from './supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [providerToken, setProviderToken] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setProviderToken(session?.provider_token ?? null)
      setAccessToken(session?.access_token ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAccessToken(session?.access_token ?? null)
      // provider_token is only available on initial sign-in; preserve it
      if (session?.provider_token) {
        setProviderToken(session.provider_token)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    if (!supabaseConfigured) {
      throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.')
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
        redirectTo: `${window.location.origin}/onboarding`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) throw error
  }

  async function signOut() {
    if (!supabaseConfigured) return
    setProviderToken(null)
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Gmail is connected when we have a valid provider token from the Supabase OAuth session
  const gmailConnected = !!providerToken

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      providerToken,
      accessToken,
      gmailConnected,
      signInWithGoogle,
      signOut,
      supabaseConfigured,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
