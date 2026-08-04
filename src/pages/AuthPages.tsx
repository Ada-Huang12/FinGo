import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'object' && err && 'message' in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-fingo-green/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-fingo-blue/20 blur-3xl" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-fingo-green to-emerald-600 text-white shadow-[0_12px_28px_-10px_rgba(34,197,94,0.85)]">
            <Icon name="savings" className="text-[2rem]" filled />
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Fin<span className="text-fingo-green">Go</span>
          </h1>
          <p className="mt-2 text-fingo-muted">{subtitle}</p>
        </div>
        <Card className="p-6 sm:p-7">
          <h2 className="mb-4 font-display text-2xl font-bold">{title}</h2>
          {children}
        </Card>
      </div>
    </div>
  )
}

export function LoginPage() {
  const { signIn, user, loading, mode } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(email.trim(), password)
      navigate('/')
    } catch (err) {
      setError(errorMessage(err, 'Login failed.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your personal financial habit tracker">
      {mode === 'local' && (
        <div className="mb-4 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          Running in <strong>local demo mode</strong> (no Supabase credentials). Data is stored in this
          browser. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable
          multi-user cloud sync.
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-fingo-muted">Email</label>
          <input
            className="input-field"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-fingo-muted">Password</label>
          <input
            className="input-field"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" disabled={busy} type="submit">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-fingo-muted">
        New here?{' '}
        <Link to="/signup" className="font-bold text-fingo-green">
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}

export function SignupPage() {
  const { signUp, user, loading, mode } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signUp(fullName.trim(), email.trim(), password)
      navigate('/')
    } catch (err) {
      setError(errorMessage(err, 'Sign up failed.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Create your FinGo" subtitle="Build better money habits with a playful coach">
      {mode === 'local' && (
        <div className="mb-4 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          Local demo mode seeds realistic sample data for your new account only.
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-fingo-muted">Full name</label>
          <input
            className="input-field"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ada Lovelace"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-fingo-muted">Email</label>
          <input
            className="input-field"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-fingo-muted">Password</label>
          <input
            className="input-field"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" disabled={busy} type="submit">
          {busy ? 'Creating…' : 'Sign up'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-fingo-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-fingo-green">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
