import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { supabaseAdmin } from '../supabase'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getAuth } from '@hono/clerk-auth'
import { getWorkspaceIdFromUser } from '../auth'
import { EncryptionService } from './encryption'

// Using Supabase admin client for database operations

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

    const { data: secrets, error } = await supabaseAdmin
      .from('workspace_secret')
      .select('id, key, workspace_id, value_preview, created_by, created, modified')
      .eq('workspace_id', workspaceId)
      .order('key', { ascending: true })

    if (error) {
      throw error
    }

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
    const now = new Date().toISOString()
    const { data: result, error } = await supabaseAdmin
      .from('workspace_secret')
      .upsert(
        {
          id: uuidv4(),
          workspace_id: workspaceId,
          key,
          value: encryptedValue,
          value_preview: valuePreview,
          created_by: auth.userId!,
          created: now,
          modified: now,
        },
        { onConflict: 'key,workspace_id' }
      )
      .select('id, key, workspace_id, value_preview, created_by, created, modified')
      .single()

    if (error) {
      throw error
    }

    if (!result) {
      throw new HTTPException(500, { message: 'Failed to save secret' })
    }

    return c.json(result)
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
    const { data: result, error } = await supabaseAdmin
      .from('workspace_secret')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('key', key)
      .select('id')
      .single()

    if (error) {
      throw error
    }

    if (!result) {
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

    const { data: secret, error } = await supabaseAdmin
      .from('workspace_secret')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('key', key)
      .maybeSingle()

    if (error || !secret) {
      throw new HTTPException(404, { message: 'Secret not found' })
    }

    // Decrypt the value
    try {
      const decryptedSecret = {
        ...secret,
        value: EncryptionService.decrypt(secret.value)
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
