// Auto-incrementing alphanumeric ID generator for Copas

const STORAGE_KEY = 'copas-id-counter'
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

export function generateNextId(): string {
  if (typeof window === 'undefined') {
    return '1'
  }

  try {
    const currentCounter = localStorage.getItem(STORAGE_KEY)
    let counter = currentCounter ? parseInt(currentCounter, 10) : 1

    const id = toBase36(counter)
    counter++

    localStorage.setItem(STORAGE_KEY, counter.toString())
    return id
  } catch (error) {
    console.error('Failed to generate ID:', error)
    return '1'
  }
}

function toBase36(num: number): string {
  if (num === 0) return '0'

  let result = ''
  while (num > 0) {
    result = ALPHABET[num % 36] + result
    num = Math.floor(num / 36)
  }
  return result
}

export function parseBase36(str: string): number {
  return parseInt(str, 36)
}

export function isValidId(id: string): boolean {
  return /^[0-9a-z]+$/i.test(id) && id.length > 0
}