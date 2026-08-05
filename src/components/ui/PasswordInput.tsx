import { useState, type InputHTMLAttributes } from 'react'
import { Icon } from './Icon'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string
}

export function PasswordInput({ label, className = '', id, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const inputId = id ?? (label ? `password-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-semibold text-fingo-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={`input-field pr-12 ${className}`}
          type={visible ? 'text' : 'password'}
          autoComplete={props.autoComplete ?? 'current-password'}
          {...props}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-fingo-muted hover:bg-slate-200/70 hover:text-fingo-ink"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          tabIndex={0}
        >
          <Icon name={visible ? 'visibility_off' : 'visibility'} className="text-[1.25rem]" />
        </button>
      </div>
    </div>
  )
}
