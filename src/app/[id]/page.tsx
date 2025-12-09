'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Copy, Moon, Sun, ArrowLeft, Plus, Trash2, Lock, Unlock, Eye, EyeOff } from 'lucide-react'
import { useTheme } from 'next-themes'
import { addDataCopas, fetchCopas, fetchSessionInfo, setPassword } from '@/lib/store'
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
  const [isLocked, setIsLocked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPasswordSettings, setShowPasswordSettings] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
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
      // First check if session exists and has password
      const sessionInfo = await fetchSessionInfo(sortId)

      if (!sessionInfo) {
        setIsValid(false)
        showNewToast('Invalid ID - no data found', 'error')
        setIsLoading(false)
        return
      }

      setIsValid(true)
      setCurrentPassword(sessionInfo.password)

      // Check if already authenticated via sessionStorage
      const savedAuth = typeof window !== 'undefined'
        ? sessionStorage.getItem(`copas_auth_${sortId}`)
        : null
      const isAlreadyAuthenticated = savedAuth === sessionInfo.password

      // If clipboard has password and user not authenticated
      if (sessionInfo.password && !isAlreadyAuthenticated && !isAuthenticated) {
        setIsLocked(true)
        setIsLoading(false)
        setTimeout(() => passwordInputRef.current?.focus(), 100)
        return
      }

      // Mark as authenticated if already verified
      if (isAlreadyAuthenticated) {
        setIsAuthenticated(true)
      }

      // Load clipboard data
      const data = await fetchCopas(sortId)
      setArrCopy(data || [])  // Set empty array if no items
    } catch (error) {
      setIsValid(false)
      showNewToast('Failed to load data', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const verifyPassword = async () => {
    if (passwordInput === currentPassword) {
      setIsAuthenticated(true)
      setIsLocked(false)
      setPasswordInput('')
      showNewToast('Password verified!', 'success')

      // Save to sessionStorage so user doesn't need to re-enter on reload
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`copas_auth_${sortId}`, passwordInput)
      }

      // Load data directly here instead of calling loadData 
      // because state updates are async
      setIsLoading(true)
      try {
        const data = await fetchCopas(sortId)
        setArrCopy(data || [])
      } catch (error) {
        showNewToast('Failed to load data', 'error')
      } finally {
        setIsLoading(false)
      }
    } else {
      showNewToast('Incorrect password', 'error')
      setPasswordInput('')
      passwordInputRef.current?.focus()
    }
  }

  const handleSetPassword = async () => {
    if (newPassword.length < 4 && newPassword.length > 0) {
      showNewToast('Password must be at least 4 characters', 'error')
      return
    }

    const passwordToSet = newPassword.length === 0 ? null : newPassword
    const success = await setPassword(sortId, passwordToSet)

    if (success) {
      setCurrentPassword(passwordToSet)
      setNewPassword('')
      setShowPasswordSettings(false)

      // Update sessionStorage
      if (typeof window !== 'undefined') {
        if (passwordToSet) {
          sessionStorage.setItem(`copas_auth_${sortId}`, passwordToSet)
        } else {
          sessionStorage.removeItem(`copas_auth_${sortId}`)
        }
      }

      if (passwordToSet) {
        setIsAuthenticated(true) // Keep authenticated after setting password
        showNewToast('Password has been set!', 'success')
      } else {
        showNewToast('Password has been removed', 'success')
      }
    } else {
      showNewToast('Failed to update password', 'error')
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
      textareaRef.current?.focus()
    } catch (error) {
      showNewToast('Failed to save data', 'error')
      setArrCopy(arrCopy) // Revert on error
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

  // Password Lock Screen
  if (isLocked && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
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

        <div className="text-center max-w-md mx-4 w-full">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-8">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              Password Protected
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              This clipboard is protected. Enter the password to access it.
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-6 font-mono">
              ID: {sortId}
            </p>

            <div className="space-y-4">
              <div className="relative">
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                  placeholder="Enter password"
                  className="w-full p-3 pr-10 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <button
                onClick={verifyPassword}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                Unlock Clipboard
              </button>

              <button
                onClick={goHome}
                className="w-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white py-2 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </button>
            </div>
          </div>
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
            className={`px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${toast.type === 'success'
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

        {/* Share URL Section */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
                Share this ultra-short link to access your clipboard:
              </p>
              <p className="text-lg text-blue-600 dark:text-blue-400 break-all font-mono font-bold">
                {typeof window !== 'undefined' ? `${window.location.origin}/${sortId}` : `/${sortId}`}
              </p>
            </div>
            <button
              onClick={async () => {
                const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${sortId}` : `/${sortId}`
                const result = await copyToClipboard(shareUrl)
                if (result.success) {
                  showNewToast('Share link copied!', 'success')
                } else {
                  showNewToast(result.error!, 'error')
                }
              }}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              aria-label="Copy share link"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Password Settings Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowPasswordSettings(!showPasswordSettings)}
            className="w-full p-4 bg-white dark:bg-zinc-800 rounded-lg shadow-lg flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors"
          >
            <div className="flex items-center gap-3">
              {currentPassword ? (
                <Lock className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <Unlock className="w-5 h-5 text-zinc-400" />
              )}
              <span className="font-medium text-zinc-900 dark:text-white">
                Password Protection
              </span>
              {currentPassword && (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                  Enabled
                </span>
              )}
            </div>
            <span className="text-zinc-400">
              {showPasswordSettings ? '▲' : '▼'}
            </span>
          </button>

          {showPasswordSettings && (
            <div className="mt-2 p-4 bg-white dark:bg-zinc-800 rounded-lg shadow-lg">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                {currentPassword
                  ? 'Change or remove the password for this clipboard.'
                  : 'Set a password to protect this clipboard. Leave empty to keep it public.'}
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={currentPassword ? 'New password (or empty to remove)' : 'Set password (min 4 chars)'}
                  className="flex-1 p-3 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                />
                <button
                  onClick={handleSetPassword}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  {currentPassword ? (newPassword ? 'Update' : 'Remove') : 'Set'}
                </button>
              </div>
              {currentPassword && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  ⚠️ Anyone with the password can access this clipboard
                </p>
              )}
            </div>
          )}
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