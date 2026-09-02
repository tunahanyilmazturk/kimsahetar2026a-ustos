import { useMemo, type ReactNode } from 'react'
import { ToastContext, type ToastContextValue } from './toast-context'

export function ToastProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ToastContextValue>(
    () => ({
      toast: () => undefined,
      success: () => undefined,
      info: () => undefined,
      warning: () => undefined,
      error: () => undefined,
    }),
    [],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}
