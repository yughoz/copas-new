'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Copy, Moon, Sun, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useTheme } from 'next-themes'
import { addDataCopas, fetchCopas } from '@/lib/store'
import { createToast, copyToClipboard, validateInput, isClipboardAvailable } from '@/lib/utils'
import { isValidId } from '@/lib/id-generator'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

export default function SharedCopasPage() {
  const [text, setText] = useState('')
  const [arrCopy, setArrCopy] = useState<string[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const params = useParams()
  const { theme, setTheme } = useTheme()
  const sortId = params.id as string

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [sortId])

  const loadData = async () => {
    if (!sortId) return

    // Validate ID format first
    if (!isValidId(sortId)) {
      setIsValid(false)
      setIsLoading(false)
      showNewToast('Invalid ID format', 'error')
      return
    }

    setIsLoading(true)
    try {
      const data = await fetchCopas(sortId)
      if (data) {
        setArrCopy(data)
        setIsValid(true)
      } else {
        setIsValid(false)
        showNewToast('Invalid ID - no data found', 'error')
      }
    } catch (error) {
      setIsValid(false)
      showNewToast('Failed to load data', 'error')
    } finally {
      setIsLoading(false)
    }
  }

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

  const addData = () => {
    const validation = validateInput(text)
    if (!validation.isValid) {
      showNewToast(validation.error!, 'error')
      return
    }

    const newArrCopy = [text, ...arrCopy].slice(0, 3)
    setArrCopy(newArrCopy)
    addDataCopas(sortId, newArrCopy)
    setText('')

    showNewToast('Text added successfully', 'success')
    textareaRef.current?.focus()
  }

  const copyItemToClipboard = async (item: string) => {
    const result = await copyToClipboard(item)
    if (result.success) {
      showNewToast('Copying to clipboard', 'success')
    } else {
      showNewToast(result.error!, 'error')
    }
  }

  const removeData = (index: number) => {
    const newArrCopy = arrCopy.filter((_, i) => i !== index)
    setArrCopy(newArrCopy)
    addDataCopas(sortId, newArrCopy)
    showNewToast('Item removed', 'success')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addData()
    }
  }

  const goHome = () => {
    router.push('/')
  }

  if (!mounted) return null

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Loading clipboard data...</p>
        </div>
      </div>
    )
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              Invalid Link
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              This clipboard link is invalid or has expired. No data was found for ID "<code className="bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-xs">{sortId}</code>".
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-6">
              Valid IDs contain only numbers and letters (0-9, a-z).
            </p>
          </div>
          <button
            onClick={goHome}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Create New Clipboard
          </button>
        </div>
      </div>
    )
  }

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
        <div className="mb-6">
          <button
            onClick={goHome}
            className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">
            Shared Clipboard
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Access and manage clipboard items from this shared link
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2 font-mono">
            ID: {sortId}
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="mb-4">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add text to this shared clipboard..."
              className="w-full h-32 p-4 border border-zinc-300 dark:border-zinc-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
              aria-label="Text input area"
            />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              Shift + Enter to add new line, Enter to submit
            </p>
          </div>

          <button
            onClick={addData}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add to Shared Clipboard
          </button>
        </div>

        {/* History Section */}
        {arrCopy.length > 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
              Clipboard Items (Newest First)
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
        ) : (
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-12 text-center">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Copy className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
              No items yet
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Be the first to add text to this shared clipboard!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}