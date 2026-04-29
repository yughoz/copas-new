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

    // Check if session exists
    let session
    try {
      session = await pb.collection('clipboard_sessions').getFirstListItem(`sort_id="${sort_id}"`)
      // Update existing session
      await pb.collection('clipboard_sessions').update(session.id, {
        item_count: limitedItems.length,
        last_accessed: new Date().toISOString()
      })
    } catch {
      // Session doesn't exist, create it
      await pb.collection('clipboard_sessions').create({
        sort_id,
        item_count: limitedItems.length,
        last_accessed: new Date().toISOString()
      })
    }

    // Delete existing items for this sort_id
    const existingItems = await pb.collection('clipboard_items').getFullList({
      filter: `sort_id="${sort_id}"`
    })
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
      const session = await pb.collection('clipboard_sessions').getFirstListItem(`sort_id="${sort_id}"`)
      await pb.collection('clipboard_sessions').update(session.id, {
        last_accessed: new Date().toISOString()
      })
    } catch {
      // Session not found
    }

    // Fetch items sorted by position
    const data = await pb.collection('clipboard_items').getFullList({
      filter: `sort_id="${sort_id}"`,
      sort: 'position'
    })

    if (!data || data.length === 0) {
      return undefined
    }

    return data.map(item => item.content)
  } catch (error) {
    console.error('Failed to fetch data from PocketBase:', error)
    return undefined
  }
}

export async function removeSortId(sort_id: string): Promise<void> {
  try {
    // Delete all items for this sort_id
    const existingItems = await pb.collection('clipboard_items').getFullList({
      filter: `sort_id="${sort_id}"`
    })
    for (const item of existingItems) {
      await pb.collection('clipboard_items').delete(item.id)
    }

    // Delete the session
    try {
      const session = await pb.collection('clipboard_sessions').getFirstListItem(`sort_id="${sort_id}"`)
      await pb.collection('clipboard_sessions').delete(session.id)
    } catch {
      // Session not found
    }
  } catch (error) {
    console.error('Failed to remove sort_id from PocketBase:', error)
    throw error
  }
}

export async function generateNextIdFromPocketBase(): Promise<string> {
  try {
    // Get all sessions sorted by sort_id desc
    const sessions = await pb.collection('clipboard_sessions').getFullList({
      sort: '-created'
    })

    let maxCounter = 0
    if (sessions.length > 0) {
      for (const s of sessions) {
        const val = parseInt(s.sort_id, 36) || 0
        if (val > maxCounter) maxCounter = val
      }
    }

    const nextCounter = maxCounter + 1
    const newId = nextCounter.toString(36)

    // Create a new session to ensure uniqueness
    await pb.collection('clipboard_sessions').create({
      sort_id: newId,
      item_count: 0,
      last_accessed: new Date().toISOString()
    })

    return newId
  } catch (error) {
    console.error('Failed to generate ID from PocketBase:', error)
    return '1'
  }
}
