import { createContext, useContext } from 'react'

export type ToastType = 'success' | 'info' | 'warning' | 'error'

export interface Toast {
  id: number
  type: ToastType
  message: string
}

export interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
  error: (message: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast, ToastProvider içinde kullanılmalı')
  return ctx
}
