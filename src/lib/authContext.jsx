'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from './supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [providerToken, setProviderToken] = useState(null)
  const [loading, setLoading] = useState(supabaseConfigured)

  useEffect(() => {
    if (!supabaseConfigured) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setProviderToken(session?.provider_token ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      // provider_token is only available on initial sign-in; preserve it
      if (session?.provider_token) {
        setProviderToken(session.provider_token)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    if (!supabaseConfigured) {
      throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.')
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
