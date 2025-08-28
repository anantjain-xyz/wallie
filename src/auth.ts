import { useAuth } from '@clerk/clerk-react'
import { supabase } from './supabase'

export function useElectricAuth() {
  const { getToken } = useAuth()

  const getAuthHeaders = async () => {
    try {
      const token = await getToken()
      return {
        Authorization: `Bearer ${token}`,
      }
    } catch (error) {
      console.error('Failed to get auth token:', error)
      return {}
    }
  }

  return {
    getAuthHeaders,
  }
}

export function useSupabaseAuth() {
  const { getToken, userId } = useAuth()

  const getAuthHeaders = async () => {
    try {
      const token = await getToken()
      return {
        Authorization: `Bearer ${token}`,
      }
    } catch (error) {
      console.error('Failed to get auth token:', error)
      return {}
    }
  }

  const setSupabaseAuth = async () => {
    const token = await getToken()
    if (token) {
      try {
        ;(supabase as any).rest = (supabase as any).rest?.withHeaders?.({
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }) || (supabase as any).rest
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Could not set global auth header on Supabase client, proceeding without it')
      }
    }
  }

  return {
    getAuthHeaders,
    setSupabaseAuth,
    userId,
  }
}
