'use client'

import { useAuth } from '@/lib/authContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Chat from '@/views/Chat'

export default function ChatPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return <Chat />
}
