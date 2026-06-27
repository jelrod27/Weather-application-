'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/lib/auth'
import { useAuth } from '@/lib/auth'
import { updateProfile } from '@/lib/supabase/database'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'
import { User, Mail, Save, Loader2 } from 'lucide-react'
import Navigation from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}

function ProfileContent() {
  const { user, profile, profileLoading, refreshProfile } = useAuth()
  const { theme } = useTheme()
  const themeClasses = getComponentStyles(theme as ThemeType, 'auth')

  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (profile && !editing) {
      setUsername(profile.username || '')
      setFullName(profile.full_name || '')
    }
  }, [profile, editing])

  const handleSave = async () => {
    if (!user) return

    setLoading(true)
    setMessage('')
    setMessageType('success')

    try {
      const updates = {
        username: username?.trim() || null,
        full_name: fullName?.trim() || null,
      }

      const updatedProfile = await updateProfile(user.id, updates)

      if (updatedProfile) {
        await refreshProfile()
        setEditing(false)
        setMessageType('success')
        setMessage('Profile updated successfully.')
      } else {
        console.error('[profile]', 'updateProfile returned null - check database schema and RLS policies')
        setMessageType('error')
        setMessage('Failed to update profile. Please check your database configuration or try again later.')
      }
    } catch (error) {
      console.error('[profile]', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setMessageType('error')

      if (errorMessage.includes('permission') || errorMessage.includes('policy')) {
        setMessage('Permission denied. Please ensure you are logged in and have permission to update your profile.')
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setMessage('Network error. Please check your internet connection and try again.')
      } else {
        setMessage(`Unable to save profile: ${errorMessage}. Please try again or contact support if the issue persists.`)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-terminal-bg-primary">
        <Navigation />
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-terminal-accent" />
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Card className={`max-w-2xl mx-auto border-4 ${themeClasses.background} ${themeClasses.borderColor} ${themeClasses.glow}`}>
          <CardHeader className="text-center space-y-4 pb-8">
            <div className={`w-16 h-16 border-2 flex items-center justify-center mx-auto rounded-full ${themeClasses.accentBg} ${themeClasses.borderColor}`}>
              <User className="w-8 h-8 text-black" />
            </div>
            <div>
              <CardTitle className={`text-3xl font-bold uppercase tracking-wider font-mono ${themeClasses.text}`}>
                User Profile
              </CardTitle>
              <CardDescription className={`font-mono mt-2 ${themeClasses.secondary || themeClasses.text}`}>
                Update your display name and username. Weather units and saved locations live on the{' '}
                <Link href="/dashboard" className={`font-bold hover:underline ${themeClasses.accentText}`}>
                  dashboard
                </Link>
                .
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {message && (
              <div className={`p-4 border-2 text-sm font-mono rounded-md ${messageType === 'success'
                  ? 'border-green-500 bg-green-950/30 text-green-400'
                  : 'border-red-500 bg-red-950/30 text-red-400'
                }`}>
                {message}
              </div>
            )}

            {profileLoading && (
              <div className="flex items-center justify-center p-4 border-2 border-cyan-500/50 bg-cyan-950/20 rounded-md">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400 mr-2" />
                <span className="text-sm font-mono text-cyan-400">Loading profile data...</span>
              </div>
            )}

            <div className="space-y-2">
              <Label className={`text-xs font-mono font-bold uppercase ${themeClasses.text}`}>
                Email Address
              </Label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${themeClasses.secondary || themeClasses.text}`} />
                <Input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className={`pl-10 font-mono bg-transparent opacity-75 ${themeClasses.borderColor} ${themeClasses.text}`}
                />
              </div>
              <p className={`text-[10px] font-mono ${themeClasses.secondary || themeClasses.text}`}>
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label className={`text-xs font-mono font-bold uppercase ${themeClasses.text}`}>
                Username
              </Label>
              <div className="relative">
                <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${themeClasses.mutedText}`} />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!editing}
                  className={`pl-10 font-mono bg-transparent ${themeClasses.borderColor} ${themeClasses.text}`}
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className={`text-xs font-mono font-bold uppercase ${themeClasses.text}`}>
                Full Name
              </Label>
              <div className="relative">
                <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${themeClasses.mutedText}`} />
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!editing}
                  className={`pl-10 font-mono bg-transparent ${themeClasses.borderColor} ${themeClasses.text}`}
                  placeholder="Enter full name"
                />
              </div>
            </div>

            <div className="flex space-x-4 pt-4">
              {!editing ? (
                <Button
                  data-testid="profile-edit-button"
                  onClick={() => setEditing(true)}
                  className={`w-full font-mono font-bold uppercase tracking-wider ${themeClasses.accentBg} text-black hover:opacity-90`}
                >
                  <User className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex w-full gap-4">
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className={`flex-1 font-mono font-bold uppercase tracking-wider ${themeClasses.accentBg} text-black hover:opacity-90`}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false)
                      setUsername(profile?.username || '')
                      setFullName(profile?.full_name || '')
                    }}
                    className={`flex-1 font-mono font-bold uppercase tracking-wider ${themeClasses.borderColor} ${themeClasses.text} hover:bg-white/10`}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
