import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import type { Context } from 'hono'

// Hoisted mocks
const hoistedGetAuth = vi.hoisted(() => vi.fn((c: any) => c.var?.mockAuth ?? { userId: 'user_1' }))

vi.mock('@hono/clerk-auth', () => ({
  getAuth: hoistedGetAuth,
  clerkMiddleware: vi.fn(() => vi.fn()),
}))

// Mock supabase module before importing auth to avoid env checks
vi.mock('./supabase', () => {
  const buildSelect = (table: string) => ({
    eq: (_col: string, _val: any) => ({
      data: table === 'app_user' ? [{ workspace_id: 'ws_1' }] : [],
      error: null,
    }),
    contains: (_col: string, _val: any) => ({ data: [], error: null }),
    maybeSingle: () => ({ data: null, error: null }),
    single: () => ({ data: null, error: null }),
  }) as any

  const from = (table: string) => ({
    select: (_cols?: string) => buildSelect(table),
    upsert: (_val: any, _opts?: any) => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
  })

  return { supabaseAdmin: { from } }
})

// Mock Clerk backend to prevent real network calls
vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: {
      getUser: vi.fn().mockResolvedValue({
        id: 'user_1',
        emailAddresses: [{ emailAddress: 'test@example.com', verified: true, id: 'email_1' }],
        firstName: 'Test',
        lastName: 'User',
      }),
    },
  }),
}))

let validateWriteAuth: (c: Context) => Promise<Response | null>
let getWorkspaceIdFromUserSpy: ReturnType<typeof vi.spyOn>

function createCtx(body: unknown, auth: any = { userId: 'user_1' }): Context {
  const req = new Request('http://localhost/write', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
  const ctx = {
    req: {
      json: async () => await req.json(),
    },
    var: { mockAuth: auth },
  } as unknown as Context
  return ctx
}

describe('validateWriteAuth', () => {
  beforeAll(async () => {
    const mod = await import('./auth')
    validateWriteAuth = mod.validateWriteAuth
    getWorkspaceIdFromUserSpy = vi.spyOn(mod, 'getWorkspaceIdFromUser')
  })

  beforeEach(() => {
    vi.clearAllMocks()
    getWorkspaceIdFromUserSpy.mockResolvedValue('ws_1')
  })

  it('returns 401 when not authenticated', async () => {
    const res = await validateWriteAuth(createCtx({}, { userId: null }))
    expect(res).toBeInstanceOf(Response)
    if (res) expect(res.status).toBe(401)
  })

  it('allows when workspace ids match', async () => {
    const body = { issues: { workspace_id: 'ws_1' } }
    const res = await validateWriteAuth(createCtx(body))
    expect(res).toBeNull()
  })

  it('blocks when workspace ids differ for issues', async () => {
    const body = { issues: { workspace_id: 'ws_2' } }
    const res = await validateWriteAuth(createCtx(body))
    expect(res).toBeInstanceOf(Response)
    if (res) expect(res.status).toBe(401)
  })

  it('blocks when workspace ids differ for comments', async () => {
    const body = { comments: { workspace_id: 'ws_2' } }
    const res = await validateWriteAuth(createCtx(body))
    expect(res).toBeInstanceOf(Response)
    if (res) expect(res.status).toBe(401)
  })

  it('blocks when workspace ids differ for users', async () => {
    const body = { users: { workspace_id: 'ws_2' } }
    const res = await validateWriteAuth(createCtx(body))
    expect(res).toBeInstanceOf(Response)
    if (res) expect(res.status).toBe(401)
  })

  it('blocks when workspace ids differ for workspaces', async () => {
    const body = { workspaces: { id: 'ws_2' } }
    const res = await validateWriteAuth(createCtx(body))
    expect(res).toBeInstanceOf(Response)
    if (res) expect(res.status).toBe(401)
  })
})


