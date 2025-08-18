import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility for localStorage with error handling
export function getLocalStorageItem(key: string, defaultValue: any = null) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

export function setLocalStorageItem(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('Failed to save to localStorage:', error)
  }
}

// Utility for analytics tracking
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  // In production, this would integrate with your analytics service
  console.log('Analytics Event:', { eventName, properties, timestamp: Date.now() })
}

// Utility for error boundary
export class ErrorBoundary extends Error {
  constructor(message: string, public context?: string) {
    super(message)
    this.name = 'ErrorBoundary'
  }
}