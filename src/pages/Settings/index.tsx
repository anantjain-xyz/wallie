import { useUser } from '@clerk/clerk-react'
import { useCurrentUser } from '../../utils/userUtils'
import GitHubIntegration from './GitHubIntegration'
import AnthropicApiKey from './AnthropicApiKey'
import WorkspaceTierComponent from './WorkspaceTier'
import WorkspaceSettings from './WorkspaceSettings'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const Settings = () => {
  const { user } = useUser()
  const currentUserResult = useCurrentUser(user)
  const workspaceId = currentUserResult?.rows[0]?.workspace_id
  const [forceRefresh, setForceRefresh] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    if (searchParams.get('refresh') === 'true') {
      setForceRefresh(true)
      
      searchParams.delete('refresh')
      const newUrl = searchParams.toString() 
        ? `${window.location.pathname}?${searchParams.toString()}`
        : window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [location.search])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">Settings</h1>
        
        {/* Workspace Settings */}
        {workspaceId && <WorkspaceSettings workspaceId={workspaceId} />}
        
        {/* GitHub Integration */}
        {workspaceId && <GitHubIntegration workspaceId={workspaceId} />}
        
        {/* Workspace Tier - Display only */}
        {workspaceId && <WorkspaceTierComponent workspaceId={workspaceId} forceRefresh={forceRefresh} />}
        
        {/* Anthropic API Key */}
        {workspaceId && <AnthropicApiKey workspaceId={workspaceId} />}
      </div>
    </div>
  )
}

export default Settings
