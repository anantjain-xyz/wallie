import { useUser } from '@clerk/clerk-react'
import { useLiveQuery } from '@electric-sql/pglite-react'

type User = ReturnType<typeof useUser>['user']

interface AppUser {
  id: string
  email: string
  workspace_id: string
}

export function useCurrentUser(user: User | null | undefined) {
  const email = user?.emailAddresses?.[0]?.emailAddress

  return useLiveQuery.sql<AppUser>`
    SELECT * 
    FROM app_user 
    WHERE email = ${email}
    LIMIT 1
  `
} 