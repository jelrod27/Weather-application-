'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'

function AuthResultContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { theme } = useTheme()
    const themeClasses = getComponentStyles(theme as ThemeType, 'auth')
    const [countdown, setCountdown] = useState(3)

    const success = searchParams.get('success') === 'true'
    const error = searchParams.get('error')
    const next = searchParams.get('next') || '/dashboard'

    useEffect(() => {
        if (success) {
            // Countdown and redirect on success
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer)
                        router.push(next)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)

            return () => clearInterval(timer)
        } else if (error) {
            // Redirect to login after showing error
            const timer = setTimeout(() => {
                router.push(`/auth?error=${encodeURIComponent(error)}`)
            }, 3000)

            return () => clearTimeout(timer)
        }
    }, [success, error, next, router])

    const isError = !!error

    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
            <div className={`text-center p-8 border-4 max-w-md w-full ${themeClasses.background} ${themeClasses.borderColor} ${themeClasses.glow}`}>
                {/* 16-Bit Weather Logo */}
                <div className="flex justify-center mb-6">
                    <div className={`w-24 h-24 flex items-center justify-center ${isError ? 'opacity-50' : ''}`}>
                        <Image
                            src="/logo-16bit-weather.svg"
                            alt="16-Bit Weather"
                            width={96}
                            height={96}
                            className={themeClasses.text}
                            style={{ filter: isError ? 'grayscale(1)' : 'none' }}
                            priority
                        />
                    </div>
                </div>

                <h1 className={`text-xl font-bold uppercase tracking-wider font-mono mb-4 ${isError ? 'text-red-400' : 'text-green-400'}`}>
                    {isError ? 'Authentication Failed' : 'Welcome to 16-Bit Weather!'}
                </h1>

                <p className={`text-sm font-mono mb-4 ${isError ? 'text-red-400' : themeClasses.secondary || themeClasses.text}`}>
                    {isError
                        ? 'Authentication failed. Redirecting to login...'
                        : `Authentication successful! Redirecting in ${countdown}...`}
                </p>

                {error && (
                    <div className={`text-xs font-mono text-red-400 mb-4 p-3 border-2 border-red-500 ${themeClasses.background}`}>
                        <strong>Error:</strong> {decodeURIComponent(error)}
                    </div>
                )}

                {success && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                        <span className="text-green-500 font-mono text-2xl">&#10003;</span>
                    </div>
                )}

                <div className={`text-xs font-mono mt-6 opacity-70 ${themeClasses.text}`}>
                    {isError ? 'Returning to login page...' : `Heading to ${next === '/dashboard' ? 'your dashboard' : next}...`}
                </div>
            </div>
        </div>
    )
}

function LoadingFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg, #0a0a0a)' }}>
            <div className="text-center p-8 border-4 max-w-md w-full bg-black border-green-500 shadow-lg shadow-green-500/20">
                <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 animate-pulse">
                        <Image
                            src="/logo-16bit-weather.svg"
                            alt="16-Bit Weather"
                            width={96}
                            height={96}
                            className="text-green-500"
                            priority
                        />
                    </div>
                </div>
                <h1 className="text-xl font-bold uppercase tracking-wider font-mono mb-4 text-green-500">
                    16-Bit Weather
                </h1>
                <p className="text-sm font-mono mb-4 text-green-400">
                    Processing...
                </p>
                <div className="mt-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-t-transparent border-green-500"></div>
                </div>
            </div>
        </div>
    )
}

export default function AuthResultPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <AuthResultContent />
        </Suspense>
    )
}
