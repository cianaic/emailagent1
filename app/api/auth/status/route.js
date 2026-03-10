import { NextResponse } from 'next/server'

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ connected: false })
  }

  // If we have a Bearer token, Gmail is connected via Supabase OAuth
  return NextResponse.json({ connected: true })
}
