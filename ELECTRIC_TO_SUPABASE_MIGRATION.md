# ElectricSQL to Supabase Migration Plan

## Overview

This document outlines the migration from ElectricSQL to direct Supabase usage. Since the PostgreSQL database is already hosted on Supabase (currently accessed through ElectricSQL), this migration primarily involves:

1. Removing the ElectricSQL sync layer
2. Connecting directly to Supabase
3. Replacing local PGlite with Supabase client
4. Implementing Supabase Realtime for live updates

## Current Architecture Analysis

### What We Have
- ✅ **Supabase-hosted PostgreSQL database** (major advantage!)
- ✅ **Complete database schema** already in Supabase
- ✅ **Clerk authentication** (compatible with Supabase RLS)
- ⚡ **ElectricSQL sync layer** (to be removed)
- ⚡ **PGlite local database** (to be replaced)
- ⚡ **Complex sync infrastructure** (proxy-server, write-server)

### ElectricSQL Components to Remove
- `@electric-sql/pglite` - Local Postgres database
- `@electric-sql/pglite-react` - React integration
- `@electric-sql/pglite-sync` - Sync capabilities
- Proxy server (`servers/proxy-server.ts`)
- Write server (`servers/write-server.ts`)
- ElectricSQL Docker service
- Complex sync logic in `src/sync.ts`

## Migration Plan

### Phase 1: Supabase Direct Connection

**1.1 Install Supabase Dependencies**
```bash
pnpm add @supabase/supabase-js
pnpm remove @electric-sql/pglite @electric-sql/pglite-react @electric-sql/pglite-repl @electric-sql/pglite-sync
```

**1.2 Create Supabase Client**
```typescript
// src/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Integrate with Clerk
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
})
```

**1.3 Environment Variables**
```bash
# Add to .env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Remove (no longer needed)
VITE_WRITE_SERVER_URL=http://localhost:3001
VITE_PROXY_SERVER_URL=http://localhost:3002
ELECTRIC_URL=http://localhost:3000
ELECTRIC_SECRET=development-electric-secret
```

### Phase 2: Database Schema Cleanup

**2.1 Clean Database Schema**

Good news! The server-side database schema in `db/migrations-server/` is already clean and doesn't contain ElectricSQL-specific sync columns. The ElectricSQL-specific columns (`synced`, `modified_columns`, `backup`, `sent_to_server`, `new`) only exist in the client-side PGlite database.

We can simply:
- ✅ Keep the existing clean Supabase schema as-is
- ✅ Delete the entire `db/migrations-client/` directory (no longer needed)
- ✅ Remove client-side migration logic from `src/migrations.ts`

**2.2 Setup Row Level Security (RLS)***

Enable RLS and create policies for each table:

```sql
-- Enable RLS
ALTER TABLE workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue ENABLE ROW LEVEL SECURITY;
-- ... for all tables

-- Example RLS policy for workspace access
CREATE POLICY "Users can access their workspace" ON workspace
    FOR ALL USING (
        auth.uid()::text IN (
            SELECT clerk_user_id FROM app_user 
            WHERE workspace_id = workspace.id
        )
    );
```

**2.3 Clean Up Files**

```bash
# Remove client-side migration directory (no longer needed)
rm -rf db/migrations-client/

# Remove migration logic file
rm src/migrations.ts
```

Note: No server-side trigger functions need to be removed since they were ElectricSQL client-side only.

### Phase 3: Replace Data Access Layer

**3.1 Replace PGlite with Supabase Client**

Update `src/App.tsx`:

```typescript
// Remove PGlite imports and providers
// Replace with Supabase context if needed

// Before: PGlite loaders
async function issueListLoader({ request }: { request: Request }) {
  await waitForInitialSyncDone()
  const pg = await pgPromise
  // ...
}

// After: Direct Supabase queries
async function issueListLoader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const filterState = getFilterStateFromSearchParams(url.searchParams)
  
  let query = supabase
    .from('issue')
    .select('*, workspace!inner(*), assignee:app_user(*)')
  
  // Apply filters based on filterState
  if (filterState.status) {
    query = query.eq('status', filterState.status)
  }
  
  const { data, error } = await query
  if (error) throw error
  
  return { issues: data, filterState }
}
```

**3.2 Replace Live Queries with Realtime**

```typescript
// src/hooks/useRealtimeQuery.ts
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export function useRealtimeQuery<T>(
  table: string, 
  query: any,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Initial fetch
    const fetchData = async () => {
      try {
        const { data: initialData, error } = await query
        if (error) throw error
        setData(initialData || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Setup realtime subscription
    const subscription = supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table },
        () => {
          // Refetch data on changes
          fetchData()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, dependencies)

  return { data, loading, error }
}
```

**3.3 Update Authentication Integration**

```typescript
// src/auth.ts - Updated for Supabase
import { useAuth } from '@clerk/clerk-react'
import { supabase } from './supabase'

export function useSupabaseAuth() {
  const { getToken, userId } = useAuth()
  
  const getAuthHeaders = async () => {
    try {
      const token = await getToken()
      return {
        'Authorization': `Bearer ${token}`
      }
    } catch (error) {
      console.error('Failed to get auth token:', error)
      return {}
    }
  }

  // Set auth token for Supabase RLS
  const setSupabaseAuth = async () => {
    const token = await getToken()
    if (token) {
      supabase.auth.setSession({
        access_token: token,
        refresh_token: '', // Not used with Clerk
        user: { id: userId! },
        token_type: 'bearer',
        expires_in: 3600
      })
    }
  }

  return {
    getAuthHeaders,
    setSupabaseAuth
  }
}
```

### Phase 4: Remove Sync Infrastructure

**4.1 Remove Sync-Related Files**
```bash
rm src/sync.ts
rm src/pglite.ts  
rm src/pglite-worker.ts
rm src/migrations.ts  # Already removed in Phase 2
rm servers/proxy-server.ts
rm servers/write-server.ts
rm -rf db/migrations-client/  # Already removed in Phase 2
```

**4.2 Update Docker Compose**
```yaml
# docker-compose.yml - Remove ElectricSQL service
services:
  postgres:
    # Keep if you want local development, otherwise remove entirely
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: wallie_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - 54321:5432
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**4.3 Update Package Scripts**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build", 
    "backend:up": "echo 'Using Supabase cloud database'",
    "backend:down": "echo 'Using Supabase cloud database'",
    "db:migrate": "echo 'Use Supabase dashboard or CLI for migrations'"
  }
}
```

### Phase 5: Update CRUD Operations

**5.1 Replace Transaction Utilities**

```typescript
// src/utils/supabaseUtils.ts
import { supabase } from '../supabase'

export async function createIssue(issueData: CreateIssueData) {
  const { data, error } = await supabase
    .from('issue')
    .insert({
      ...issueData,
      id: crypto.randomUUID(),
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateIssue(id: string, updates: Partial<Issue>) {
  const { data, error } = await supabase
    .from('issue')
    .update({
      ...updates, 
      modified: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteIssue(id: string) {
  // Soft delete by setting deleted flag
  const { error } = await supabase
    .from('issue')
    .update({ 
      deleted: true, 
      modified: new Date().toISOString() 
    })
    .eq('id', id)

  if (error) throw error
}
```

**5.2 Update Components**

Replace PGlite queries in components:

```typescript
// src/components/IssueModal.tsx - Example update
const { data: workspaces } = useRealtimeQuery(
  'workspace',
  supabase
    .from('workspace')
    .select('*')
    .eq('deleted', false)
)
```

### Phase 6: Testing & Polish

**6.1 Remove Loading States**
- Remove ElectricSQL sync status indicators
- Replace with standard Supabase loading states

**6.2 Error Handling**
- Update error handling for Supabase-specific errors
- Implement retry logic for failed operations

**6.3 Performance Optimization**
- Add appropriate indexes in Supabase dashboard
- Optimize queries and reduce over-fetching
- Implement pagination where needed

## Migration Benefits

### Immediate Benefits
- ✅ **Simplified Architecture**: Remove complex sync infrastructure
- ✅ **Better Performance**: Direct database access eliminates sync delays
- ✅ **Reduced Bundle Size**: Remove heavy PGlite dependencies (~2MB)
- ✅ **Easier Debugging**: Standard HTTP requests instead of sync magic
- ✅ **Built-in Features**: Leverage Supabase Auth, RLS, Functions, etc.

### Long-term Benefits  
- ✅ **Better Scalability**: Cloud-native architecture
- ✅ **Reduced Complexity**: Fewer moving parts to maintain
- ✅ **Community Support**: Large Supabase ecosystem
- ✅ **Future Features**: Easy access to Supabase AI, Edge Functions, etc.

## Migration Phases Overview

| Phase | Description |
|-------|-------------|
| 1 | Setup Supabase client and remove ElectricSQL deps |
| 2 | Clean up client-side files and setup RLS |
| 3 | Replace data access layer with Supabase |
| 4 | Remove sync infrastructure |  
| 5 | Update CRUD operations and components |
| 6 | Testing and polish |

## Risk Mitigation

### Data Safety
- ✅ Database already in Supabase (no data migration risk)
- ✅ Create database backup before schema changes
- ✅ Test RLS policies thoroughly before going live

### Performance Considerations  
- Monitor query performance vs. local PGlite
- Implement caching for frequently accessed data
- Use Supabase Edge Functions for complex operations if needed

### Offline Behavior
- ElectricSQL provided robust offline support
- Consider implementing service worker caching if offline support is critical
- Use optimistic updates for better UX

## Next Steps

1. **Start with Phase 1**: Install Supabase client and test basic connectivity
2. **Create RLS policies**: Critical for security with direct database access  
3. **Migrate one component at a time**: Reduce risk by incremental migration
4. **Test thoroughly**: Ensure all features work before removing ElectricSQL

This migration leverages your existing Supabase database setup to significantly simplify the process. The main work is replacing the client-side sync logic with direct Supabase calls.