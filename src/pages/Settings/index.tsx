import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery, usePGlite } from '@electric-sql/pglite-react'
import { useUser } from '@clerk/clerk-react'
import { useCurrentUser } from '../../utils/userUtils'
import { useDropzone } from 'react-dropzone'
import { uploadFileToS3 } from '../../utils/s3Upload'
import { showError, showInfo, showSuccess } from '../../utils/notification'
import GitHubIntegration from './GitHubIntegration'

const Settings = () => {
  const { user } = useUser()
  const currentUserResult = useCurrentUser(user)
  const workspaceId = currentUserResult?.rows[0]?.workspace_id
  const pg = usePGlite()

  const workspaceResults = useLiveQuery.sql<{ 
    id: string,
    name: string, 
    url: string,
    avatar_url: string | null,
    allowlisted_domains: string[]
  }>`
    SELECT id, name, url, avatar_url, allowlisted_domains FROM workspace WHERE id = ${workspaceId}
  `

  const workspace = workspaceResults?.rows[0]
  const [workspaceName, setWorkspaceName] = useState(workspace?.name || '')
  const [workspaceUrl, setWorkspaceUrl] = useState(workspace?.url || '')
  const [workspaceAvatarUrl, setWorkspaceAvatarUrl] = useState(workspace?.avatar_url || '')
  const [isUploading, setIsUploading] = useState(false)

  // Update state when workspace data is loaded
  useEffect(() => {
    if (workspace) {
      setWorkspaceName(workspace.name)
      setWorkspaceUrl(workspace.url)
      setWorkspaceAvatarUrl(workspace.avatar_url || '')
    }
  }, [workspace])

  const handleSaveWorkspace = async () => {
    if (!workspaceId) return

    try {
      await pg.sql`
        UPDATE workspace 
        SET name = ${workspaceName}, url = ${workspaceUrl}, modified = NOW()
        WHERE id = ${workspaceId}
      `
      showSuccess('Workspace settings saved successfully', 'Success')
    } catch (error) {
      console.error('Error updating workspace:', error)
      showError('Failed to save workspace settings', 'Error')
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !workspaceId) return

    const file = acceptedFiles[0]
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please upload an image file', 'Invalid File')
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('File size should be less than 5MB', 'File Too Large')
      return
    }

    setIsUploading(true)
    
    try {
      // Upload file to DigitalOcean Spaces
      const uploadedUrl = await uploadFileToS3(file, `${import.meta.env.VITE_ENV}/workspace-avatars`)
      
      // Update workspace with new avatar URL
      await pg.sql`
        UPDATE workspace 
        SET avatar_url = ${uploadedUrl}, modified = NOW()
        WHERE id = ${workspaceId}
      `
      
      setWorkspaceAvatarUrl(uploadedUrl)
      showSuccess('Logo uploaded successfully', 'Success')
    } catch (error) {
      console.error('Error uploading logo:', error)
      showError('Failed to upload logo', 'Error')
    } finally {
      setIsUploading(false)
    }
  }, [workspaceId, pg])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.svg']
    },
    maxFiles: 1,
    disabled: isUploading
  })

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Settings</h1>
        
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Workspace</h2>
          </div>
          
          <div className="px-6 py-5">
            <div className="grid grid-cols-1 gap-6">
              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo
                </label>
                <div className="flex items-center">
                  <div 
                    {...getRootProps()} 
                    className={`h-12 w-12 rounded overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer border-2 ${
                      isDragActive ? 'border-blue-500 border-dashed' : 'border-transparent'
                    } hover:border-gray-300 transition-colors`}
                  >
                    <input {...getInputProps()} />
                    {isUploading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-blue-500 border-gray-300"></div>
                    ) : workspaceAvatarUrl ? (
                      <img 
                        src={workspaceAvatarUrl} 
                        alt="Workspace logo" 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400 text-xl">W</span>
                    )}
                  </div>
                  <div className="ml-5">
                    <p className="mt-1 text-xs text-gray-500">
                      Click or drag and drop to upload
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              {/* URL */}
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                    wallie.app/
                  </span>
                  <input
                    type="text"
                    name="url"
                    id="url"
                    value={workspaceUrl}
                    onChange={(e) => setWorkspaceUrl(e.target.value)}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                type="button"
                onClick={handleSaveWorkspace}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
        
        {/* GitHub Integration */}
        {workspaceId && <GitHubIntegration workspaceId={workspaceId} />}
      </div>
    </div>
  )
}

export default Settings 