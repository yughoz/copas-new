'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Plus, Trash2, Moon, Sun, RefreshCw } from 'lucide-react'
import { useTheme } from 'next-themes'
import { addDataCopas, fetchCopas, generateNextIdFromSupabase } from '@/lib/store'
import { createToast, copyToClipboard, validateInput, pasteFromClipboard, isClipboardAvailable } from '@/lib/utils'
import { getVersion } from '@/lib/version'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

interface Version {
  version: string
  buildDate: string
  changelog: string
}

export default function Home() {
  const [text, setText] = useState('')
  const [arrCopy, setArrCopy] = useState<string[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)
  const [sortId, setSortId] = useState<string>('')
  const [shareUrl, setShareUrl] = useState('')
  const [clipboardAvailable, setClipboardAvailable] = useState(false)
  const [version, setVersion] = useState<Version | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)

    // Check clipboard availability
    setClipboardAvailable(isClipboardAvailable())

    // Load version information
    const loadVersion = async () => {
      try {
        const versionData = await getVersion()
        setVersion(versionData)
      } catch (error) {
        console.error('Failed to load version:', error)
      }
    }

    // Generate next auto-increment ID from Supabase
    const initializeId = async () => {
      try {
        const newId = await generateNextIdFromSupabase()
        setSortId(newId)

        if (typeof window !== 'undefined') {
          setShareUrl(`${window.location.origin}/${newId}`)

          // Load existing data if any
          const data = await fetchCopas(newId)
          if (data) {
            setArrCopy(data)
          }
        }
      } catch (error) {
        console.error('Failed to initialize ID:', error)
        showNewToast('Failed to create new session', 'error')
      }
    }

    loadVersion()
    initializeId()
  }, [])

  const showNewToast = (message: string, type: 'success' | 'error') => {
    const newToast = createToast(message, type)
    setToasts(prev => [...prev, newToast])

    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== newToast.id))
    }, 3000)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const addData = async () => {
    const validation = validateInput(text)
    if (!validation.isValid) {
      showNewToast(validation.error!, 'error')
      return
    }

    const newArrCopy = [text, ...arrCopy].slice(0, 3)
    setArrCopy(newArrCopy)

    try {
      await addDataCopas(sortId, newArrCopy)
      setText('')
      showNewToast('Text added successfully', 'success')

      // Redirect to the share link URL after adding item
      if (window.location.pathname === '/' && sortId) {
        router.push(`/${sortId}`)
      }
    } catch (error) {
      showNewToast('Failed to save data', 'error')
      setArrCopy(arrCopy) // Revert on error
    }
  }

  const pasteAction = async () => {
    if (!clipboardAvailable) {
      showNewToast('Clipboard API not available in this browser', 'error')
      return
    }

    const result = await pasteFromClipboard()
    if (result.success && result.text) {
      setText(result.text)
      showNewToast('Text pasted from clipboard', 'success')
    } else {
      showNewToast(result.error || 'Failed to paste from clipboard', 'error')
    }
  }

  const copyItemToClipboard = async (item: string) => {
    const result = await copyToClipboard(item)
    if (result.success) {
      showNewToast('Copying to clipboard', 'success')
    } else {
      showNewToast(result.error!, 'error')
    }
  }

  const removeData = async (index: number) => {
    const newArrCopy = arrCopy.filter((_, i) => i !== index)
    setArrCopy(newArrCopy)

    try {
      await addDataCopas(sortId, newArrCopy)
      showNewToast('Item removed', 'success')
    } catch (error) {
      showNewToast('Failed to remove item', 'error')
      setArrCopy(arrCopy) // Revert on error
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addData()
    }
  }

  const copyShareUrl = async () => {
    const result = await copyToClipboard(shareUrl)
    if (result.success) {
      showNewToast('Share link copied to clipboard', 'success')
    } else {
      showNewToast(result.error!, 'error')
    }
  }

  const createNewId = async () => {
    try {
      const newId = await generateNextIdFromSupabase()
      setSortId(newId)
      setArrCopy([]) // Clear existing data
      setText('') // Clear input

      if (typeof window !== 'undefined') {
        setShareUrl(`${window.location.origin}/${newId}`)
      }

      showNewToast('New session created successfully', 'success')
      textareaRef.current?.focus()
    } catch (error) {
      console.error('Failed to create new ID:', error)
      showNewToast('Failed to create new session', 'error')
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 transition-colors">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-lg hover:shadow-xl transition-all"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-3 text-white/70 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">
            Copas (Copy Paste)
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Paste text once, copy it anywhere with a simple link
          </p>
          {sortId && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Your short ID:
              </span>
              <code className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">
                {sortId}
              </code>
              <button
                onClick={createNewId}
                className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded-md transition-colors"
                aria-label="Create new ID"
                title="Create new session"
              >
                <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          )}
        </div>

        {/* Share URL Section */}
        {shareUrl && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
                  Share this ultra-short link to access your clipboard:
                </p>
                <p className="text-lg text-blue-600 dark:text-blue-400 break-all font-mono font-bold">
                  {shareUrl}
                </p>
              </div>
              <button
                onClick={copyShareUrl}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                aria-label="Copy share link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="mb-4">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste or type your text here..."
              className="w-full h-32 p-4 border border-zinc-300 dark:border-zinc-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
              aria-label="Text input area"
            />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              Shift + Enter to add new line, Enter to submit
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={addData}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add to Clipboard
            </button>
            {clipboardAvailable && (
              <button
                onClick={pasteAction}
                className="bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Paste
              </button>
            )}
          </div>
        </div>

        {/* History Section */}
        {arrCopy.length > 0 && (
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
              Recent Items (Newest First)
            </h2>
            <div className="space-y-3">
              {arrCopy.map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-zinc-50 dark:bg-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words text-sm">
                        {item}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                        {item.length} characters
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => copyItemToClipboard(item)}
                        className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg transition-colors"
                        aria-label="Copy to clipboard"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeData(index)}
                        className="p-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer with Version */}
        <div className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-700">
          <div className="text-center">
            {version && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                <span className="font-medium">v{version.version}</span>
                <span className="text-zinc-400">•</span>
                <span>{version.buildDate}</span>
              </div>
            )}
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Made with ❤️ for easy clipboard sharing
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}