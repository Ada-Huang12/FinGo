import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { PasswordInput } from '../components/ui/PasswordInput'

const AUTH_RETURN_KEY = 'fingo_auth_return'

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'object' && err && 'message' in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

function readAuthReturnPath() {
  try {
    const path = sessionStorage.getItem(AUTH_RETURN_KEY)
    if (path === '/signup' || path === '/login') return path
  } catch {
    /* ignore */
  }
  return '/login'
}

function rememberAuthReturnPath(path: '/login' | '/signup') {
  try {
    sessionStorage.setItem(AUTH_RETURN_KEY, path)
  } catch {
    /* ignore */
  }
}

function oauthErrorFromUrl() {
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const error =
    query.get('error_description') ||
    query.get('error') ||
    hash.get('error_description') ||
    hash.get('error')
  if (!error) return ''
  const normalized = decodeURIComponent(error.replace(/\+/g, ' '))
  if (normalized === 'access_denied' || normalized.toLowerCase().includes('access_denied')) {
    return 'Google sign-in was cancelled.'
  }
  return normalized
}

function GoogleGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
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

function GoogleAuthButton({
  label,
  disabled,
  returnTo,
  onError,
}: {
  label: string
  disabled?: boolean
  returnTo: '/login' | '/signup'
  onError: (message: string) => void
}) {
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)

  async function onClick() {
    onError('')
    setBusy(true)
    rememberAuthReturnPath(returnTo)
    try {
      await signInWithGoogle()
    } catch (err) {
      onError(errorMessage(err, 'Google sign-in failed.'))
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        className="w-full !bg-white !text-fingo-ink hover:!bg-slate-50"
        disabled={disabled || busy}
        onClick={() => void onClick()}
      >
        <GoogleGlyph />
        {busy ? 'Redirecting…' : label}
      </Button>
      {busy && (
        <button
          type="button"
          className="w-full text-center text-sm font-semibold text-fingo-muted hover:text-fingo-ink"
          onClick={() => setBusy(false)}
        >
          ← Back to sign in
        </button>
      )}
    </div>
  )
}

function AuthDivider() {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-semibold uppercase tracking-wide text-fingo-muted">or</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  )
}

export function AuthCallbackPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const oauthError = oauthErrorFromUrl()
  const [timedOut, setTimedOut] = useState(false)
  const returnTo = readAuthReturnPath()

  useEffect(() => {
    if (oauthError) return
    if (!loading && user) {
      navigate(user.onboarding_completed ? '/' : '/onboarding', { replace: true })
    }
  }, [oauthError, loading, user, navigate])

  useEffect(() => {
    if (oauthError || user) return
    const timer = window.setTimeout(() => setTimedOut(true), 8000)
    return () => window.clearTimeout(timer)
  }, [oauthError, user])

  const waiting = !oauthError && !timedOut && (loading || !user)

  return (
    <AuthShell
      title={oauthError ? 'Sign-in cancelled' : 'Finishing Google sign-in'}
      subtitle="Connecting your Google account to FinGo"
    >
      {waiting && <p className="mb-4 text-sm text-fingo-muted">One moment while we complete sign-in…</p>}
      {oauthError && <p className="mb-4 text-sm text-red-500">{oauthError}</p>}
      {timedOut && !oauthError && (
        <p className="mb-4 text-sm text-fingo-muted">
          This is taking longer than expected. You can go back and try again.
        </p>
      )}
      <Link
        to={returnTo}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-fingo-ink px-4 py-2.5 font-display text-sm font-bold text-white"
      >
        <Icon name="arrow_back" className="text-[1.1rem]" />
        Back to sign in
      </Link>
      {waiting && (
        <p className="mt-3 text-center text-xs text-fingo-muted">
          You can also use your browser’s back button to return to FinGo.
        </p>
      )}
    </AuthShell>
  )
}

export function LoginPage() {
  const { signIn, user, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && user) {
    return <Navigate to={user.onboarding_completed ? '/' : '/onboarding'} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(email.trim(), password)
      // Destination is handled by Navigate above after user state updates;
      // fall back in case state is already set.
      navigate('/')
    } catch (err) {
      setError(errorMessage(err, 'Login failed.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your personal financial habit tracker">
      <GoogleAuthButton
        label="Continue with Google"
        disabled={busy}
        returnTo="/login"
        onError={setError}
      />
      <AuthDivider />
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
          <PasswordInput
            label="Password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
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
  const { signUp, user, loading } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && user) {
    return <Navigate to={user.onboarding_completed ? '/' : '/onboarding'} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signUp(fullName.trim(), email.trim(), password)
      navigate('/onboarding')
    } catch (err) {
      setError(errorMessage(err, 'Sign up failed.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Create your FinGo" subtitle="Build better money habits with a playful coach">
      <GoogleAuthButton
        label="Sign up with Google"
        disabled={busy}
        returnTo="/signup"
        onError={setError}
      />
      <AuthDivider />
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
          <PasswordInput
            label="Password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
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
