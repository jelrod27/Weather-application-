import { Resend } from 'resend'

export interface ResendFromConfig {
  resend: Resend
  fromEmail: string
}

export function getResendFromConfig(): ResendFromConfig | null {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    return null
  }

  return { resend: new Resend(apiKey), fromEmail }
}
