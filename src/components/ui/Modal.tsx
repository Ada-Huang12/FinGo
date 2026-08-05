import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
  size,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  /** Overrides `wide` when set. */
  size?: 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={`animate-pop relative max-h-[min(90vh,720px)] w-full overflow-y-auto ${
          size === 'xl'
            ? 'max-w-3xl'
            : size === 'lg' || wide
              ? 'max-w-lg'
              : 'max-w-md'
        } rounded-3xl bg-white p-5 shadow-2xl sm:p-6`}
        role="dialog"
        aria-modal
        aria-labelledby="modal-title"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="modal-title" className="font-display text-xl font-bold text-fingo-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
