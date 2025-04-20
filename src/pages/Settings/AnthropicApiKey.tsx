import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { showError, showSuccess } from '../../utils/notification'

interface Secret {
  id: string
  key: string
  value_preview?: string
  created_by?: string
  workspace_id: string
  created: string
  modified: string
}

interface AnthropicApiKeyProps {
  workspaceId: string
}

const AnthropicApiKey = ({ workspaceId }: AnthropicApiKeyProps) => {
  const [apiKey, setApiKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [hasKey, setHasKey] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [keyDetails, setKeyDetails] = useState<Secret | null>(null)
  const { getToken } = useAuth()
  const { user } = useUser()

  // Get the API server URL from environment variables
  const API_SERVER_URL = import.meta.env.VITE_API_SERVER_URL
    ? new URL(import.meta.env.VITE_API_SERVER_URL).origin
    : `http://localhost:3003`

  // Check if the workspace has a key
  useEffect(() => {
    const checkKey = async () => {
      try {
        const token = await getToken()
        if (!token) {
          showError('Authentication error', 'Auth Failed')
          return
        }
        const response = await fetch(`${API_SERVER_URL}/secrets`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const secrets = await response.json()
          const anthropicKey = secrets.find((secret: Secret) => secret.key === 'ANTHROPIC_API_KEY')
          setHasKey(!!anthropicKey)
          if (anthropicKey) {
            setKeyDetails(anthropicKey)
          }
        }
      } catch (error) {
        console.error('Error checking API key:', error)
      }
    }
    if (workspaceId) {
      checkKey()
    }
  }, [workspaceId, getToken, API_SERVER_URL])

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      showError('API key cannot be empty', 'Validation Error')
      return
    }
    setIsSaving(true)
    try {
      const token = await getToken()
      if (!token) {
        showError('Authentication error', 'Auth Failed')
        setIsSaving(false)
        return
      }
      const response = await fetch(`${API_SERVER_URL}/secrets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          key: 'ANTHROPIC_API_KEY',
          value: apiKey.trim()
        })
      })
      if (!response.ok) {
        throw new Error('Failed to save API key')
      }
      const savedKey = await response.json()
      setKeyDetails(savedKey)
      setHasKey(true)
      setApiKey('')
      setShowKey(false)
      showSuccess('Anthropic API key saved successfully', 'Success')
    } catch (error) {
      console.error('Error saving API key:', error)
      showError('Failed to save API key', 'Error')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteApiKey = async () => {
    try {
      const token = await getToken()
      if (!token) {
        showError('Authentication error', 'Auth Failed')
        return
      }
      const response = await fetch(`${API_SERVER_URL}/secrets/ANTHROPIC_API_KEY`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) {
        throw new Error('Failed to delete API key')
      }
      setHasKey(false)
      setKeyDetails(null)
      showSuccess('Anthropic API key deleted successfully', 'Success')
    } catch (error) {
      console.error('Error deleting API key:', error)
      showError('Failed to delete API key', 'Error')
    }
  }

  // Find user full name and email from user ID
  const getUserEmail = (userId: string | undefined) => {
    if (!userId) return 'Unknown user'
    if (userId === user?.id) {
      const name = user.fullName || user.firstName || user.lastName || 'You'
      const email = user.primaryEmailAddress?.emailAddress || ''
      return email ? `${name} (${email})` : name
    }
    // For other users, show fallback (could be improved if you have a user map)
    return `User ${userId.substring(0, 8)}...`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white shadow rounded-lg mb-6">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Anthropic API Key</h2>
      </div>
      
      <div className="px-6 py-5 space-y-6">
        <p className="text-sm text-gray-500">
          Wallie uses Anthropic's models under the hood. You will need to provide your own API key for usage with this workspace. 
        </p>
        
        {hasKey ? (
          <div className="flex flex-col space-y-4">
            <div className="flex items-center">
              <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg className="h-4 w-4 text-green-500 mr-1" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l4 4 6-6" />
                </svg>
                Anthropic API key configured
              </span>
            </div>
            
            {keyDetails && (
              <div className="bg-gray-50 rounded p-4 text-sm">
                <div className="flex flex-wrap items-center space-x-6">
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Key:</span>
                    <span className="font-mono">{keyDetails.value_preview || '•••••••'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Added:</span>
                    <span>{formatDate(keyDetails.modified)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Set by:</span>
                    <span>{getUserEmail(keyDetails.created_by)}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center">
              <button
                type="button"
                onClick={deleteApiKey}
                className="inline-flex items-center px-3 py-2 border border-red-700 shadow-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Remove Anthropic API Key
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                Your Anthropic API Key
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type={showKey ? "text" : "password"}
                  name="apiKey"
                  id="apiKey"
                  className="block w-full pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md"
                  placeholder="sk-ant-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3 flex items-center bg-transparent text-gray-400"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Your API key is encrypted at rest at all times. You can get an API key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Anthropic's Console</a>.
              </p>
            </div>
            
            <div className="flex items-center">
              <button
                type="button"
                onClick={saveApiKey}
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save API Key'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AnthropicApiKey