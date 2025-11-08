// Data store functions for Copas app
// Uses Supabase for persistence with auto-incrementing alphanumeric IDs

import { supabase } from './supabase'

export interface CopasData {
  [sort_id: string]: string[]
}

export async function addDataCopas(sort_id: string, items: string[]): Promise<void> {
  try {
    // Keep only the newest 3 items
    const limitedItems = items.slice(0, 3)

    // First, ensure the session exists
    await supabase
      .from('clipboard_sessions')
      .upsert({
        sort_id,
        item_count: limitedItems.length,
        last_accessed: new Date().toISOString()
      }, {
        onConflict: 'sort_id'
      })

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
  try {
    // Get the maximum numeric value from existing sort_ids
    const { data: existingSessions, error } = await supabase
      .from('clipboard_sessions')
      .select('sort_id')
      .order('sort_id', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error fetching max ID:', error)
      // Fallback to local generation if Supabase fails
      return '1'
    }

    let maxCounter = 0
    if (existingSessions && existingSessions.length > 0) {
      const maxId = existingSessions[0].sort_id
      maxCounter = parseInt(maxId, 36) || 0
    }

    const nextCounter = maxCounter + 1
    const newId = nextCounter.toString(36) // Convert to base36

    // Try to create a new session with this ID to ensure uniqueness
    const { error: insertError } = await supabase
      .from('clipboard_sessions')
      .insert({
        sort_id: newId,
        item_count: 0,
        last_accessed: new Date().toISOString()
      })

    if (insertError) {
      // If insertion fails, try with the next ID
      console.warn('ID collision detected, trying next ID:', insertError)
      return generateNextIdFromSupabase() // Recursive call with next ID
    }

    return newId
  } catch (error) {
    console.error('Failed to generate ID from Supabase:', error)
    // Fallback to local generation
    return '1'
  }
}