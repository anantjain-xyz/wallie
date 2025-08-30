import { describe, it, expect, beforeEach, vi } from 'vitest'

// Ensure required env vars are present before module import
process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'test_key'
process.env.VITE_CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY || 'test_pub_key'

// Mocks that must be defined before importing the module under test
const getAuthMock = vi.fn()

// Mock Clerk backend
const clerkMock = {
  users: {
    getUser: vi.fn(),
  },
}

// Mock Supabase admin client with per-table behavior
const workspaceClient = {
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn(),
  upsert: vi.fn(),
}
const appUserClient = {
  upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
}
const supabaseAdminMock = {
  from: vi.fn((table: string) => {
    if (table === 'workspace') return workspaceClient as any
    if (table === 'app_user') return appUserClient as any
    return {} as any
  }),
}

// Mock modules used by the SUT
vi.mock('../supabase', () => ({
  supabaseAdmin: supabaseAdminMock,
}))
vi.mock('@hono/clerk-auth', () => ({
  getAuth: (c: unknown) => getAuthMock(c),
}))
vi.mock('@clerk/backend', () => ({
  createClerkClient: () => clerkMock,
}))

// Import SUT after mocks (use dynamic import to ensure env/mocks are applied before evaluation)
let _workspacesAppPromise: Promise<any> | null = null
async function getWorkspacesApp() {
  if (!_workspacesAppPromise) {
    _workspacesAppPromise = import('./workspaces').then(m => m.default)
  }
  return _workspacesAppPromise
}

async function postJSON(body: unknown) {
  const app = await getWorkspacesApp()
  return app.request('/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /workspaces - create workspace', () => {
  beforeEach(() => {
    // Do not restore mocks (would remove module mocks), only reset call history/implementations
    getAuthMock.mockReset()
    clerkMock.users.getUser.mockReset()
    workspaceClient.insert.mockReset().mockReturnThis()
    workspaceClient.select.mockReset().mockReturnThis()
    workspaceClient.single.mockReset()
    workspaceClient.upsert.mockReset()
    appUserClient.upsert.mockReset().mockResolvedValue({ data: null, error: null })
    supabaseAdminMock.from.mockReset().mockImplementation((table: string) => {
      if (table === 'workspace') return workspaceClient as any
      if (table === 'app_user') return appUserClient as any
      return {} as any
    })

    // Default: authenticated user
    getAuthMock.mockReturnValue({ userId: 'user_123' })
    // Default: Clerk user with email and profile info
    clerkMock.users.getUser.mockResolvedValue({
      emailAddresses: [{ emailAddress: 'jane@example.com' }],
      firstName: 'Jane',
      lastName: 'Doe',
      imageUrl: 'https://example.com/jane.png',
    })

    // Default: successful workspace insert
    workspaceClient.single.mockResolvedValue({
      data: { id: 'db-id', name: 'Acme', url: 'acme' },
      error: null,
    })
  })

  it('creates a workspace successfully (201)', async () => {
    const res = await postJSON({ name: 'Acme', url: 'acme' })
    expect(res.status).toBe(201)
    const json = await res.json()
    // Response shape
    expect(typeof json.id).toBe('string')
    expect(json.name).toBe('Acme')
    expect(json.url).toBe('acme')
    // DB interactions
    expect(workspaceClient.insert).toHaveBeenCalledTimes(1)
    expect(appUserClient.upsert).toHaveBeenCalled() // current user upsert
  })

  it('fails when unauthenticated (401)', async () => {
    getAuthMock.mockReturnValue(null)
    const res = await postJSON({ name: 'Acme', url: 'acme' })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toMatch(/unauthorized/i)
    // No DB interactions should happen
    expect(workspaceClient.insert).not.toHaveBeenCalled()
  })

  it('fails when name is missing (400)', async () => {
    const res = await postJSON({ url: 'acme' })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/name is required/i)
    expect(workspaceClient.insert).not.toHaveBeenCalled()
  })

  it('fails when url is missing (400)', async () => {
    const res = await postJSON({ name: 'Acme' })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/url is required/i)
    expect(workspaceClient.insert).not.toHaveBeenCalled()
  })

  it('fails when url slug is invalid (400)', async () => {
    const res = await postJSON({ name: 'Acme', url: 'Invalid Slug!' })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/invalid url/i)
    expect(workspaceClient.insert).not.toHaveBeenCalled()
  })

  it('fails when url slug is reserved (409)', async () => {
    const res = await postJSON({ name: 'Admin Team', url: 'admin' })
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/reserved/i)
    expect(workspaceClient.insert).not.toHaveBeenCalled()
  })

  it('fails when url is already in use (unique violation - 409)', async () => {
    // Simulate Supabase unique violation on insert
    workspaceClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "workspace_url_key"' },
    })
    const res = await postJSON({ name: 'Acme', url: 'acme' })
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already in use/i)
  })

  it('propagates generic insert error as 500', async () => {
    workspaceClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'XYZZY', message: 'some other error' },
    })
    const res = await postJSON({ name: 'Acme', url: 'acme' })
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toMatch(/failed to create workspace/i)
  })

  it('continues even if app_user upsert fails (still 201)', async () => {
    appUserClient.upsert.mockRejectedValueOnce(new Error('upsert failed'))
    const res = await postJSON({ name: 'Acme', url: 'acme' })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.url).toBe('acme')
    expect(workspaceClient.insert).toHaveBeenCalled()
    expect(appUserClient.upsert).toHaveBeenCalled()
  })

  it('fails when user email is missing (400)', async () => {
    clerkMock.users.getUser.mockResolvedValueOnce({
      emailAddresses: [],
      firstName: 'Jane',
      lastName: 'Doe',
      imageUrl: 'https://example.com/jane.png',
    })
    const res = await postJSON({ name: 'Acme', url: 'acme' })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/unable to determine user email/i)
    expect(workspaceClient.insert).not.toHaveBeenCalled()
  })
})