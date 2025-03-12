import { useState, useEffect } from 'react'

export interface UserPreferences {
  view_mode: 'list' | 'board'
  order_by: string
  order_direction: 'asc' | 'desc'
}

const STORAGE_KEY = 'wallie_user_preferences'

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  view_mode: 'list',
  order_by: 'priority',
  order_direction: 'desc'
}

export function useUserPreferences(): [
  UserPreferences,
  (preferences: Partial<UserPreferences>) => void
] {
  // Initialize state with preferences from localStorage or defaults
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const storedPreferences = localStorage.getItem(STORAGE_KEY)
      return storedPreferences 
        ? { ...DEFAULT_PREFERENCES, ...JSON.parse(storedPreferences) } 
        : DEFAULT_PREFERENCES
    } catch (error) {
      console.error('Error reading preferences from localStorage:', error)
      return DEFAULT_PREFERENCES
    }
  })

  // Update preferences in state and localStorage
  const updatePreferences = (newPreferences: Partial<UserPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPreferences }
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Error saving preferences to localStorage:', error)
      }
      
      return updated
    })
  }

  return [preferences, updatePreferences]
} 