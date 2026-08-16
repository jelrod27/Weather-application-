import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/push/vapid'

export async function GET(_request: NextRequest) {
  const key = getVapidPublicKey()
  if (!key) {
    return NextResponse.json({ error: 'Web push is not configured' }, { status: 404 })
  }
  return NextResponse.json({ publicKey: key })
}
