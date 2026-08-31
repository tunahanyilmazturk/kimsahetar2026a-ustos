import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { ToastContext, type ToastType, type Toast, type ToastContextValue } from './toast-context'

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
  info: <Info className="h-5 w-5 text-blue-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-400" />,
  error: <XCircle className="h-5 w-5 text-rose-400" />,
}

const BORDERS: Record<ToastType, string> = {
  success: 'ring-emerald-500/40',
  info: 'ring-blue-500/40',
  warning: 'ring-amber-500/40',
  error: 'ring-rose-500/40',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, type, message }])
      // 3.5sn sonra otomatik kapat
      window.setTimeout(() => remove(id), 3500)
    },
    [remove],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (m) => toast(m, 'success'),
      info: (m) => toast(m, 'info'),
      warning: (m) => toast(m, 'warning'),
      error: (m) => toast(m, 'error'),
    }),
    [toast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast konteyneri — üst sağda, mobile üst orta */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 sm:left-auto sm:right-3 sm:translate-x-0 z-[100] flex flex-col gap-2 w-[calc(100%-1.5rem)] sm:w-96 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl bg-slate-900 px-4 py-3 ring-1 shadow-xl',
                BORDERS[t.type],
              )}
              role="status"
            >
              <span className="mt-0.5 shrink-0">{ICONS[t.type]}</span>
              <p className="flex-1 text-sm text-slate-100">{t.message}</p>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label="Kapat"
                className="shrink-0 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
