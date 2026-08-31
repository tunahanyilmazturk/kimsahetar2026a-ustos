import { type ReactNode, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Küçük ekranlarda full-screen, büyük ekranlarda merkez kart. */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Kapatma butonu gösterilmesin. */
  hideClose?: boolean
  /** Arka plan tıklayınca kapatma (varsayılan true). */
  closeOnBackdrop?: boolean
  className?: string
}

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
} as const

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  hideClose,
  closeOnBackdrop = true,
  className,
}: ModalProps) {
  // ESC ile kapat
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !hideClose) onClose()
    }
    window.addEventListener('keydown', onKey)
    // sayfa kaydırmayı engelle
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, hideClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => {
            if (closeOnBackdrop && e.target === e.currentTarget) onClose()
          }}
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/80" />

          {/* Kart */}
          <motion.div
            className={cn(
              'relative w-full bg-slate-900 ring-1 ring-slate-800 shadow-2xl',
              'rounded-t-3xl sm:rounded-2xl',
              'max-h-[92svh] flex flex-col',
              SIZES[size],
              className,
            )}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            {(title || !hideClose) && (
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800 shrink-0">
                <h2 className="text-lg font-semibold text-slate-100 truncate">{title}</h2>
                {!hideClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Kapat"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors min-h-11 min-w-11"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            <div className="min-w-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer && (
              <div className="shrink-0 border-t border-slate-800 px-5 py-3 flex items-center justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
