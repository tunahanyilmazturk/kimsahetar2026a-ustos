import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-linear-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-400 active:from-indigo-600 active:to-purple-600',
  secondary:
    'bg-slate-800 text-slate-100 ring-1 ring-slate-700 hover:bg-slate-700 active:bg-slate-900',
  ghost:
    'bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-slate-100 active:bg-slate-800',
  danger:
    'bg-linear-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/25 hover:from-rose-500 hover:to-red-500 active:from-rose-700 active:to-red-700',
  success:
    'bg-linear-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-green-400 active:from-emerald-600 active:to-green-600',
}

const SIZES: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5 rounded-lg gap-1.5',
  md: 'text-base px-4 py-2.5 rounded-xl gap-2',
  lg: 'text-lg px-6 py-3.5 rounded-2xl gap-2.5',
}

/** Dokunmatik için min 44x44 — `size` ne olursa olsun min-height garantili. */
const BASE =
  'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none ' +
  'min-h-11 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth, loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading && (
        <span
          className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
          aria-hidden
        />
      )}
      {children}
    </button>
  )
})
