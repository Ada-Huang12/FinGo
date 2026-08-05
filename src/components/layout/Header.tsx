import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Icon } from '../ui/Icon'

const nav = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/bills', label: 'Bills', icon: 'calendar_month' },
  { to: '/goals', label: 'Goals', icon: 'flag' },
  { to: '/social', label: 'Social', icon: 'group' },
]

export function Header() {
  const { user, signOut } = useAuth()
  const first = user?.full_name?.split(' ')[0] ?? 'there'

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-fingo-green to-emerald-600 text-white shadow-[0_8px_16px_-8px_rgba(34,197,94,0.8)]">
            <Icon name="savings" className="text-[1.5rem]" filled />
          </div>
          <div>
            <p className="font-display text-xl font-extrabold tracking-tight text-fingo-ink">
              Fin<span className="text-fingo-green">Go</span>
            </p>
            <p className="text-xs text-fingo-muted">Hey {first} 👋</p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-full px-3.5 py-2 font-display text-sm font-semibold transition ${
                  isActive
                    ? 'bg-fingo-green-soft text-fingo-green-dark'
                    : 'text-fingo-muted hover:bg-slate-100 hover:text-fingo-ink'
                }`
              }
            >
              <Icon name={item.icon} className="text-[1.15rem]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            <Icon name="logout" className="text-[1.1rem]" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-between">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold ${
                isActive ? 'text-fingo-green' : 'text-fingo-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`grid h-9 w-9 place-items-center rounded-2xl ${
                    isActive ? 'bg-fingo-green-soft shadow-sm' : ''
                  }`}
                >
                  <Icon name={item.icon} filled={isActive} />
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
