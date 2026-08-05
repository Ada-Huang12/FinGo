import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'

/** Floating AI Coach button fixed to the viewport (screen), home page only. */
export function AiCoachFab() {
  return createPortal(
    <Link
      to="/ai-coach"
      aria-label="Open AI Coach"
      className="group fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-fingo-blue to-blue-600 text-white shadow-[0_12px_28px_-8px_rgba(59,130,246,0.85)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(59,130,246,0.9)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fingo-blue md:bottom-6 md:right-6"
    >
      <Icon name="smart_toy" className="text-[1.65rem] transition group-hover:scale-110" filled />
      <span className="pointer-events-none absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-fingo-green text-[10px] font-extrabold text-white shadow-sm">
        AI
      </span>
    </Link>,
    document.body,
  )
}
