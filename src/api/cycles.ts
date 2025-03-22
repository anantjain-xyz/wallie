import { usePGlite } from '@electric-sql/pglite-react'

export async function fetchCycles() {
  const pg = usePGlite()
  try {
    const result = await pg.query(`
      SELECT id, name, description, start_date, end_date, status
      FROM cycle
      WHERE deleted = false
      ORDER BY start_date DESC
    `)
    return result.rows
  } catch (error) {
    console.error('Error fetching cycles:', error)
    return []
  }
}

export async function createCycle(cycle: {
  name: string
  description?: string
  start_date?: string
  end_date?: string
  status: string
  workspace_id: string
  creator_id: string
}) {
  const pg = usePGlite()
  try {
    const { name, description, start_date, end_date, status, workspace_id, creator_id } = cycle
    const result = await pg.query(`
      INSERT INTO cycle (
        id, name, description, start_date, end_date, status, workspace_id, creator_id
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7
      )
      RETURNING id, name, description, start_date, end_date, status
    `, [name, description || null, start_date || null, end_date || null, status, workspace_id, creator_id])
    
    return result.rows[0]
  } catch (error) {
    console.error('Error creating cycle:', error)
    throw error
  }
}

export async function updateCycle(id: string, updates: {
  name?: string
  description?: string
  start_date?: string
  end_date?: string
  status?: string
}) {
  const pg = usePGlite()
  try {
    const { name, description, start_date, end_date, status } = updates
    
    // Build the SET clause dynamically based on provided updates
    const setClauses = []
    const params = []
    let paramIndex = 1
    
    if (name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`)
      params.push(name)
    }
    
    if (description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`)
      params.push(description)
    }
    
    if (start_date !== undefined) {
      setClauses.push(`start_date = $${paramIndex++}`)
      params.push(start_date)
    }
    
    if (end_date !== undefined) {
      setClauses.push(`end_date = $${paramIndex++}`)
      params.push(end_date)
    }
    
    if (status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`)
      params.push(status)
    }
    
    // Add the modified timestamp
    setClauses.push(`modified = NOW()`)
    
    // Add the id parameter
    params.push(id)
    
    const result = await pg.query(`
      UPDATE cycle
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, description, start_date, end_date, status
    `, params)
    
    return result.rows[0]
  } catch (error) {
    console.error('Error updating cycle:', error)
    throw error
  }
}

export async function deleteCycle(id: string) {
  const pg = usePGlite()
  try {
    await pg.query(`
      UPDATE cycle
      SET deleted = true, modified = NOW()
      WHERE id = $1
    `, [id])
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting cycle:', error)
    throw error
  }
}