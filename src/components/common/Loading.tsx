import { cn } from '../../utils/cn'

export function Loading({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-8', className)}>
      <span className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-indigo-400 animate-spin" />
      {label && <p className="text-sm text-slate-400">{label}</p>}
    </div>
  )
}

export function FullScreenLoading({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <span className="h-12 w-12 rounded-full border-4 border-slate-800 border-t-indigo-400 animate-spin" />
      {label && <p className="mt-4 text-slate-300">{label}</p>}
    </div>
  )
}
