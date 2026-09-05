"use client"

/**
 * 16-Bit Weather Platform - v1.0.0
 * 
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 * 
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 * 
 * BETA SOFTWARE NOTICE:
 * This software is in active development. Features may change.
 * Report issues: https://github.com/jelrod27/Weather-application-/issues
 */


import type { ErrorInfo, ReactNode } from "react";
import React, { Component } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Props {
  children?: ReactNode
  fallback?: ReactNode
  componentName?: string
  className?: string
  // theme removed - using dark theme only
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Log to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      try {
        // Dynamic import to avoid issues if Sentry isn't configured
        import('@sentry/nextjs').then((Sentry) => {
          Sentry.captureException(error, {
            contexts: {
              react: {
                componentStack: errorInfo.componentStack,
              },
            },
            tags: {
              errorBoundary: this.props.componentName || 'unknown',
            },
          })
        }).catch(() => {
          // Sentry not available, silently fail
        })
      } catch (sentryError) {
        // Sentry not configured, continue without logging
      }
    }

    this.setState({
      error,
      errorInfo
    })
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  private getThemeClasses() {
    return {
      container: 'bg-weather-bg-elev border-weather-border text-weather-text',
      button: 'bg-weather-primary text-weather-bg hover:bg-weather-primary/80',
      icon: 'text-weather-primary',
      text: 'text-weather-text'
    }
  }

  public render() {
    const { hasError, error } = this.state
    const { children, fallback, componentName, className } = this.props
    const themeClasses = this.getThemeClasses()

    if (hasError) {
      // Custom fallback UI
      if (fallback) {
        return fallback
      }

      // Default error UI
      return (
        <div className={cn(
          "flex flex-col items-center justify-center p-6 border-2 rounded-lg",
          "min-h-[200px] max-w-lg mx-auto font-mono",
          themeClasses.container,
          className
        )}>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className={cn("w-6 h-6", themeClasses.icon)} />
            <h2 className="text-lg font-bold uppercase tracking-wider">
              Component Error
            </h2>
          </div>
          
          <div className="text-center mb-6">
            <p className={cn("text-sm mb-2", themeClasses.text)}>
              {componentName ? `Error in ${componentName}` : 'Something went wrong'}
            </p>
            {error && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs opacity-70 hover:opacity-100">
                  Show Error Details
                </summary>
                <pre className="text-xs mt-2 p-2 bg-black/20 rounded overflow-auto max-h-32">
                  {error.message}
                </pre>
              </details>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded font-medium",
                "transition-colors duration-200 text-sm uppercase tracking-wider",
                themeClasses.button
              )}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <Link
              href="/"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded font-medium",
                "transition-colors duration-200 text-sm uppercase tracking-wider",
                "border-2 border-weather-border hover:bg-weather-bg-elev",
                themeClasses.text
              )}
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          </div>
        </div>
      )
    }

    return children
  }
}

// Higher-order component for easy wrapping
function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Safe render component for conditional rendering
function SafeRender({ 
  children, 
  fallback = null, 
  condition = true 
}: { 
  children: ReactNode
  fallback?: ReactNode
  condition?: boolean 
}) {
  try {
    return condition ? <>{children}</> : <>{fallback}</>
  } catch (error) {
    console.error('SafeRender error:', error)
    return <>{fallback}</>
  }
}

// Default export wrapper component for layout.tsx
export default function ErrorBoundaryWrapper({ 
  children 
}: { 
  children: ReactNode 
}) {
  return (
    <ErrorBoundary componentName="Root Layout">
      {children}
    </ErrorBoundary>
  )
}