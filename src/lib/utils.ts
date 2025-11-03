// Utility functions for Copas app

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

export function createToast(message: string, type: 'success' | 'error'): Toast {
  return {
    id: Math.random().toString(36).substr(2, 9),
    message,
    type
  }
}

export async function copyToClipboard(text: string): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Clipboard API not available' }
  }

  // Check if clipboard API is available
  if (!navigator.clipboard) {
    return fallbackCopyToClipboard(text)
  }

  try {
    await navigator.clipboard.writeText(text)
    return { success: true }
  } catch (error) {
    console.error('Clipboard API failed, trying fallback:', error)
    return fallbackCopyToClipboard(text)
  }
}

function fallbackCopyToClipboard(text: string): { success: boolean; error?: string } {
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (successful) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to copy text' }
    }
  } catch (error) {
    console.error('Fallback copy failed:', error)
    return {
      success: false,
      error: 'Copy failed - please copy manually'
    }
  }
}

export function validateInput(text: string): { isValid: boolean; error?: string } {
  if (!text.trim()) {
    return { isValid: false, error: 'Please input text to copy' }
  }

  if (text.length > 10000) {
    return { isValid: false, error: 'Text exceeds the maximum length of 10000 characters' }
  }

  return { isValid: true }
}

export async function pasteFromClipboard(): Promise<{ success: boolean; text?: string; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Clipboard API not available' }
  }

  // Check if clipboard API is available
  if (!navigator.clipboard) {
    return { success: false, error: 'Clipboard API not available in this browser' }
  }

  try {
    const text = await navigator.clipboard.readText()
    return { success: true, text }
  } catch (error) {
    console.error('Failed to read from clipboard:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Permission denied to access clipboard'
    }
  }
}

export function isClipboardAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return !!(navigator.clipboard && typeof navigator.clipboard.readText === 'function' && typeof navigator.clipboard.writeText === 'function')
}

