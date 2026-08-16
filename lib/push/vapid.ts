const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY?.trim() || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY?.trim() || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT?.trim() || 'mailto:ops@16bitweather.co'

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC || null
}

export function getVapidConfig(): {
  publicKey: string
  privateKey: string
  subject: string
} | null {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return null
  return { publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE, subject: VAPID_SUBJECT }
}
