import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import postgres from 'postgres'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getAuth } from '@hono/clerk-auth'
import { getWorkspaceIdFromUser } from '../auth'
import { EncryptionService } from './encryption'

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:password@localhost:54321/wallie'

// Create postgres connection
const sql = postgres(DATABASE_URL)

// Validate request schema
const secretSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1)
})

// Secret response type - never returns the value
const secretResponseSchema = z.object({
  id: z.string(),
  key: z.string(),
  workspace_id: z.string(),
  value_preview: z.string().optional(),
  created_by: z.string().optional(),
  created: z.string(),
  modified: z.string()
})

// Create a new Hono app for secrets
const app = new Hono()

// Get all secret keys (not values) for workspace
app.get('/', async (c) => {
  try {
    const auth = getAuth(c)
    if (!auth?.userId) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }

    const workspaceId = await getWorkspaceIdFromUser(auth.userId)
    if (!workspaceId) {
      throw new HTTPException(401, { message: 'Workspace not found' })
    }

    const secrets = await sql`
      SELECT id, key, workspace_id, value_preview, created_by, created, modified
      FROM workspace_secret
      WHERE workspace_id = ${workspaceId}
      ORDER BY key ASC
    `

    return c.json(secrets)
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Error fetching secrets:', error)
    throw new HTTPException(500, { message: 'Internal server error' })
  }
})

// Set a secret for workspace
app.post('/', async (c) => {
  try {
    const auth = getAuth(c)
    if (!auth?.userId) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }

    const workspaceId = await getWorkspaceIdFromUser(auth.userId)
    if (!workspaceId) {
      throw new HTTPException(401, { message: 'Workspace not found' })
    }

    const body = await c.req.json()
    const validatedBody = secretSchema.parse(body)

    const { key, value } = validatedBody

    // Extract the last 6 characters for the preview
    const valuePreview = value.length > 6 ? `...${value.slice(-6)}` : value

    // Encrypt the value before storing
    const encryptedValue = EncryptionService.encrypt(value)

    // Use upsert to either create or update the secret
    const result = await sql`
      INSERT INTO workspace_secret (
        id,
        workspace_id,
        key,
        value,
        value_preview,
        created_by,
        created,
        modified
      ) VALUES (
        ${uuidv4()},
        ${workspaceId},
        ${key},
        ${encryptedValue},
        ${valuePreview},
        ${auth.userId},
        NOW(),
        NOW()
      )
      ON CONFLICT (key, workspace_id) DO UPDATE SET
        value = ${encryptedValue},
        value_preview = ${valuePreview},
        created_by = ${auth.userId},
        modified = NOW()
      RETURNING id, key, workspace_id, value_preview, created_by, created, modified
    `

    if (!result.length) {
      throw new HTTPException(500, { message: 'Failed to save secret' })
    }

    return c.json(result[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400)
    }
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Error saving secret:', error)
    throw new HTTPException(500, { message: 'Internal server error' })
  }
})

// Delete a secret
app.delete('/:key', async (c) => {
  try {
    const auth = getAuth(c)
    if (!auth?.userId) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }

    const workspaceId = await getWorkspaceIdFromUser(auth.userId)
    if (!workspaceId) {
      throw new HTTPException(401, { message: 'Workspace not found' })
    }

    const key = c.req.param('key')
    if (!key) {
      throw new HTTPException(400, { message: 'Secret key is required' })
    }

    // Delete the secret
    const result = await sql`
      DELETE FROM workspace_secret
      WHERE workspace_id = ${workspaceId} AND key = ${key}
      RETURNING id
    `

    if (!result.length) {
      throw new HTTPException(404, { message: 'Secret not found' })
    }

    return c.json({ success: true })
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Error deleting secret:', error)
    throw new HTTPException(500, { message: 'Internal server error' })
  }
})

// Get a specific secret with its value (only used internally)
app.get('/:key/value', async (c) => {
  try {
    const auth = getAuth(c)
    if (!auth?.userId) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }

    const workspaceId = await getWorkspaceIdFromUser(auth.userId)
    if (!workspaceId) {
      throw new HTTPException(401, { message: 'Workspace not found' })
    }

    const key = c.req.param('key')
    if (!key) {
      throw new HTTPException(400, { message: 'Secret key is required' })
    }

    const secret = await sql`
      SELECT *
      FROM workspace_secret
      WHERE workspace_id = ${workspaceId} AND key = ${key}
    `

    if (!secret.length) {
      throw new HTTPException(404, { message: 'Secret not found' })
    }

    // Decrypt the value
    try {
      const decryptedSecret = {
        ...secret[0],
        value: EncryptionService.decrypt(secret[0].value)
      }
      return c.json(decryptedSecret)
    } catch (error) {
      console.error('Error decrypting secret:', error)
      throw new HTTPException(500, { message: 'Failed to decrypt secret' })
    }
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Error fetching secret:', error)
    throw new HTTPException(500, { message: 'Internal server error' })
  }
})

export default app