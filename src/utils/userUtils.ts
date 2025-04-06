import { useUser } from '@clerk/clerk-react'
import { useLiveQuery } from '@electric-sql/pglite-react'
import { useState } from 'react'

type User = ReturnType<typeof useUser>['user']

interface AppUser {
  id: string
  email: string
  workspace_id: string
}

export function useCurrentUser(user: User | null | undefined) {
  const email = user?.emailAddresses?.[0]?.emailAddress
  const [queryEmail] = useState(email)

  return useLiveQuery.sql<AppUser>`
    SELECT * 
    FROM app_user 
    WHERE email = ${queryEmail}
    LIMIT 1
  `
}    