// Data store functions for Copas app
// Uses localStorage for persistence with auto-incrementing alphanumeric IDs

const STORAGE_KEY = 'copas-data'

export interface CopasData {
  [sort_id: string]: string[]
}

export function addDataCopas(sort_id: string, items: string[]): void {
  if (typeof window === 'undefined') return

  try {
    const existingData = localStorage.getItem(STORAGE_KEY)
    const data: CopasData = existingData ? JSON.parse(existingData) : {}

    // Keep only the newest 3 items
    const limitedItems = items.slice(0, 3)
    data[sort_id] = limitedItems

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save data to localStorage:', error)
  }
}

export function fetchCopas(sort_id: string): Promise<string[] | undefined> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(undefined)
      return
    }

    try {
      const existingData = localStorage.getItem(STORAGE_KEY)
      if (!existingData) {
        resolve(undefined)
        return
      }

      const data: CopasData = JSON.parse(existingData)
      resolve(data[sort_id])
    } catch (error) {
      console.error('Failed to fetch data from localStorage:', error)
      resolve(undefined)
    }
  })
}

export function removeSortId(sort_id: string): void {
  if (typeof window === 'undefined') return

  try {
    const existingData = localStorage.getItem(STORAGE_KEY)
    if (!existingData) return

    const data: CopasData = JSON.parse(existingData)
    delete data[sort_id]

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to remove sort_id from localStorage:', error)
  }
}