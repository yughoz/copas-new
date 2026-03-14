// Data store functions for Copas app
// Uses PocketBase for persistence with auto-incrementing alphanumeric IDs

import { pb } from './pocketbase'

export interface CopasData {
  [sort_id: string]: string[]
}

export async function addDataCopas(sort_id: string, items: string[]): Promise<void> {
  try {
    // Keep only the newest 3 items
    const limitedItems = items.slice(0, 3)

    // First, ensure the session exists (upsert)
    try {
      await pb.collection('clipboard_sessions').create({
        sort_id,
        item_count: limitedItems.length,
        last_accessed: new Date().toISOString()
      })
    } catch (err: any) {
      // If already exists, update it
      if (err.status === 400) {
        const existing = await pb.collection('clipboard_sessions')
          .getFirstListItem(`sort_id="${sort_id}"`)
        
        await pb.collection('clipboard_sessions').update(existing.id, {
          item_count: limitedItems.length,
          last_accessed: new Date().toISOString()
        })
      } else {
        throw err
      }
    }

    // Delete existing items for this sort_id
    const existingItems = await pb.collection('clipboard_items')
      .getFullList({ filter: `sort_id="${sort_id}"` })
    
    for (const item of existingItems) {
      await pb.collection('clipboard_items').delete(item.id)
    }

    // Insert new items
    if (limitedItems.length > 0) {
      for (let index = 0; index < limitedItems.length; index++) {
        await pb.collection('clipboard_items').create({
          sort_id,
          content: limitedItems[index],
          position: index
        })
      }
    }

  } catch (error) {
    console.error('Failed to save data to PocketBase:', error)
    throw error
  }
}

export async function fetchCopas(sort_id: string): Promise<string[] | undefined> {
  try {
    // Update last_accessed timestamp
    try {
      const session = await pb.collection('clipboard_sessions')
        .getFirstListItem(`sort_id="${sort_id}"`)
      
      await pb.collection('clipboard_sessions').update(session.id, {
        last_accessed: new Date().toISOString()
      })
    } catch (err) {
      // Session doesn't exist yet, ignore
    }

    // Fetch items sorted by position
    const items = await pb.collection('clipboard_items')
      .getFullList({
        filter: `sort_id="${sort_id}"`,
        sort: 'position'
      })

    if (!items || items.length === 0) {
      return undefined
    }

    return items.map((item: any) => item.content)
  } catch (error) {
    console.error('Failed to fetch data from PocketBase:', error)
    return undefined
  }
}

export async function removeSortId(sort_id: string): Promise<void> {
  try {
    // Delete all items for this sort_id
    const items = await pb.collection('clipboard_items')
      .getFullList({ filter: `sort_id="${sort_id}"` })
    
    for (const item of items) {
      await pb.collection('clipboard_items').delete(item.id)
    }

    // Delete the session
    try {
      const session = await pb.collection('clipboard_sessions')
        .getFirstListItem(`sort_id="${sort_id}"`)
      
      await pb.collection('clipboard_sessions').delete(session.id)
    } catch (err) {
      // Session doesn't exist, ignore
    }

  } catch (error) {
    console.error('Failed to remove sort_id from PocketBase:', error)
    throw error
  }
}

export async function generateNextIdFromPocketBase(): Promise<string> {
  try {
    // Get all existing sessions sorted by sort_id descending
    const sessions = await pb.collection('clipboard_sessions')
      .getFullList({
        sort: '-sort_id',
        limit: 1
      })

    let maxCounter = 0
    if (sessions && sessions.length > 0) {
      const maxId = (sessions[0] as any).sort_id
      maxCounter = parseInt(maxId, 36) || 0
    }

    const nextCounter = maxCounter + 1
    const newId = nextCounter.toString(36) // Convert to base36

    // Try to create a new session with this ID to ensure uniqueness
    try {
      await pb.collection('clipboard_sessions').create({
        sort_id: newId,
        item_count: 0,
        last_accessed: new Date().toISOString()
      })
      return newId
    } catch (err: any) {
      // If insertion fails (ID collision), try with the next ID
      console.warn('ID collision detected, trying next ID:', err)
      return generateNextIdFromPocketBase() // Recursive call with next ID
    }
  } catch (error) {
    console.error('Failed to generate ID from PocketBase:', error)
    // Fallback to local generation
    return '1'
  }
}

// Legacy compatibility - keep same function names
export const generateNextIdFromSupabase = generateNextIdFromPocketBase
