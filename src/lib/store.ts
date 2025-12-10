// Data store functions for Copas app
// Uses Supabase for persistence with auto-incrementing alphanumeric IDs

import { log } from 'console'
import { supabase } from './supabase'

export interface CopasData {
  [sort_id: string]: string[]
}

export interface SessionInfo {
  sort_id: string
  password: string | null
  item_count: number
}

export async function addDataCopas(sort_id: string, items: string[]): Promise<void> {
  try {
    // Keep only the newest 3 items
    const limitedItems = items.slice(0, 3)

    // Check if session exists first (use limit(1) to handle duplicates)
    const { data: existingSessions } = await supabase
      .from('clipboard_sessions')
      .select('sort_id')
      .eq('sort_id', sort_id)
      .limit(1)

    if (existingSessions && existingSessions.length > 0) {
      // Update existing session
      await supabase
        .from('clipboard_sessions')
        .update({
          item_count: limitedItems.length,
          last_accessed: new Date().toISOString()
        })
        .eq('sort_id', sort_id)
    } else {
      // Insert new session
      await supabase
        .from('clipboard_sessions')
        .insert({
          sort_id,
          item_count: limitedItems.length,
          last_accessed: new Date().toISOString()
        })
    }

    // Delete existing items for this sort_id
    await supabase
      .from('clipboard_items')
      .delete()
      .eq('sort_id', sort_id)

    // Insert new items
    if (limitedItems.length > 0) {
      const itemsToInsert = limitedItems.map((content, index) => ({
        sort_id,
        content,
        position: index
      }))

      const { error } = await supabase
        .from('clipboard_items')
        .insert(itemsToInsert)

      if (error) throw error
    }

    // Update session item count
    await supabase
      .from('clipboard_sessions')
      .update({
        item_count: limitedItems.length,
        last_accessed: new Date().toISOString()
      })
      .eq('sort_id', sort_id)

  } catch (error) {
    console.error('Failed to save data to Supabase:', error)
    throw error
  }
}

export async function fetchCopas(sort_id: string): Promise<string[] | undefined> {
  try {
    // Update last_accessed timestamp
    await supabase
      .from('clipboard_sessions')
      .update({ last_accessed: new Date().toISOString() })
      .eq('sort_id', sort_id)

    // Fetch items sorted by position
    const { data, error } = await supabase
      .from('clipboard_items')
      .select('content, position')
      .eq('sort_id', sort_id)
      .order('position', { ascending: true })

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return undefined
      }
      throw error
    }

    if (!data || data.length === 0) {
      return undefined
    }

    return data.map(item => item.content)
  } catch (error) {
    console.error('Failed to fetch data from Supabase:', error)
    return undefined
  }
}

export async function fetchSessionInfo(sort_id: string): Promise<SessionInfo | null> {
  try {
    const { data, error } = await supabase
      .from('clipboard_sessions')
      .select('*')
      .eq('sort_id', sort_id)
      .limit(1)

    if (error) {
      console.error('Error fetching session:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    const session = data[0]
    return {
      sort_id: session.sort_id,
      password: session.password || null,
      item_count: session.item_count || 0
    } as SessionInfo
  } catch (error) {
    console.error('Failed to fetch session info:', error)
    return null
  }
}

export async function setPassword(sort_id: string, password: string | null): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('clipboard_sessions')
      .update({ password })
      .eq('sort_id', sort_id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Failed to set password:', error)
    return false
  }
}

export async function removeSortId(sort_id: string): Promise<void> {
  try {
    // Delete all items for this sort_id
    await supabase
      .from('clipboard_items')
      .delete()
      .eq('sort_id', sort_id)

    // Delete the session
    await supabase
      .from('clipboard_sessions')
      .delete()
      .eq('sort_id', sort_id)

  } catch (error) {
    console.error('Failed to remove sort_id from Supabase:', error)
    throw error
  }
}

export async function generateNextIdFromSupabase(): Promise<string> {
  const handleCollision = async (baseId: string): Promise<string> => {
    // Strategy: Random ++ Count (clipboard_sessions)

    const { count: itemsCount } = await supabase
      .from('clipboard_items')
      .select('*', { count: 'exact', head: true })
      .eq('sort_id', baseId)

    if (itemsCount === 0) {
      console.log('Found empty session:', baseId);

      // It's empty, so we can reuse it!
      // Just update the last_accessed to claim it
      await supabase
        .from('clipboard_sessions')
        .update({ last_accessed: new Date().toISOString() })
        .eq('sort_id', baseId)

      return baseId
    }

    // 1. Get exact count of existing sessions
    console.log('Checking for collisions...')

    const { count } = await supabase
      .from('clipboard_sessions')
      .select('*', { count: 'exact', head: true })

    // 2. Add random buffer to count to jump ahead
    const currentCount = count || 0
    const randomBuffer = Math.floor(Math.random() * 9999) + 1
    const nextNumeric = currentCount + randomBuffer
    const nextId = nextNumeric.toString(36)

    console.log('Next ID:', nextId);

    // 3. Try insert
    const { error } = await supabase
      .from('clipboard_sessions')
      .insert({
        sort_id: nextId,
        item_count: 0,
        last_accessed: new Date().toISOString()
      })

    if (!error) return nextId

    // If still collision, recurse
    if (error.code === '23505') {
      // Check if the colliding ID has any items

      console.log('Found non-empty session:', nextId);

      // If not empty, try again with larger buffer
      const largerBuffer = Math.floor(Math.random() * 10000) + 1000
      const fallbackId = (currentCount + largerBuffer).toString(36)

      await supabase.from('clipboard_sessions').insert({
        sort_id: fallbackId,
        item_count: 0,
        last_accessed: new Date().toISOString()
      })
      return fallbackId
    }

    throw error
  }

  try {
    // 1. Try to get next ID from atomic counter via RPC
    const { data: nextValue, error: rpcError } = await supabase
      .rpc('increment_id_counter')

    if (!rpcError && typeof nextValue === 'number') {
      const newId = nextValue.toString(36)

      const { error: insertError } = await supabase
        .from('clipboard_sessions')
        .insert({
          sort_id: newId,
          item_count: 0,
          last_accessed: new Date().toISOString()
        })

      if (!insertError) {
        return newId
      }

      // Handle Collision for RPC path
      if (insertError.code === '23505') {
        console.warn(`Collision on RPC ID ${newId}, switching to Random+Count strategy`)
        return await handleCollision(newId)
      }
    } else {
      console.warn('RPC increment_id_counter failed or not found, falling back to manual calculation:', rpcError)
    }

    // 2. Fallback: Old method (find max existing ID)
    // Only runs if RPC fails
    const { data: existingSessions, error } = await supabase
      .from('clipboard_sessions')
      .select('sort_id')

    if (error) {
      console.error('Error fetching IDs:', error)
      return '1'
    }

    let maxCounter = 0
    if (existingSessions && existingSessions.length > 0) {
      for (const session of existingSessions) {
        const sortId = session.sort_id
        const numValue = parseInt(sortId, 36)
        if (!isNaN(numValue) && numValue.toString(36) === sortId) {
          if (numValue > maxCounter) {
            maxCounter = numValue
          }
        }
      }
    }

    // Try incrementing from max
    for (let attempt = 0; attempt < 5; attempt++) {
      const nextCounter = maxCounter + 1 + attempt
      const newId = nextCounter.toString(36)

      const { error: insertError } = await supabase
        .from('clipboard_sessions')
        .insert({
          sort_id: newId,
          item_count: 0,
          last_accessed: new Date().toISOString()
        })

      if (!insertError) {
        return newId
      }

      if (insertError.code === '23505') {
        // Switch to Count+Random immediately on collision
        console.warn(`Collision on fallback ID ${newId}, switching to Random+Count strategy`)
        return await handleCollision(newId)
      }
    }

    // Last resort
    return await handleCollision('fallback')

  } catch (error) {
    console.error('Failed to generate ID from Supabase:', error)
    return Math.random().toString(36).substring(2, 6)
  }
}