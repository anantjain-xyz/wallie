import { usePGlite } from '@electric-sql/pglite-react'
import type { useUser } from '@clerk/clerk-react'

type User = ReturnType<typeof useUser>['user']

interface AppUser {
  id: string
  email: string
  workspace_id: string
}

export async function getCurrentUserWorkspaceId(
  pg: ReturnType<typeof usePGlite>,
  user: User
): Promise<string> {
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    throw new Error('No authenticated user found')
  }

  const email = user.emailAddresses[0].emailAddress
  
  const result = await pg.query<AppUser>(`
    SELECT workspace_id 
    FROM app_user 
    WHERE email = $1
    LIMIT 1
  `, [email])

  if (!result.rows.length) {
    throw new Error('User not found in app_user table')
  }

  return result.rows[0].workspace_id
} 