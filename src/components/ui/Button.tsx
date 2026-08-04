import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'blue' | 'ghost' | 'danger'

const styles: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  blue: 'btn-blue',
  ghost:
    'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 font-display font-semibold text-fingo-muted hover:bg-slate-100',
  danger:
    'inline-flex items-center justify-center gap-2 rounded-full bg-red-500 px-4 py-2 font-display font-bold text-white shadow-[0_8px_16px_-8px_rgba(239,68,68,0.7)]',
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: Variant
}) {
  return (
    <button type={type} className={`${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
