import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import type { Context } from 'hono'

// Hoisted mocks
const hoistedGetAuth = vi.hoisted(() => vi.fn((c: any) => c.var?.mockAuth ?? { userId: 'user_1' }))

vi.mock('@hono/clerk-auth', () => ({
  getAuth: hoistedGetAuth,
}))

// Mock supabase module before importing auth to avoid env checks
vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ data: [], error: null }),
      upsert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
    }),
  },
}))

let validateWriteAuth: (c: Context) => Promise<Response | null>
let getWorkspaceIdFromUser: (userId: string) => Promise<string | null>

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
    getWorkspaceIdFromUser = mod.getWorkspaceIdFromUser
  })

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getWorkspaceIdFromUser as unknown as vi.Mock).mockResolvedValue('ws_1')
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


