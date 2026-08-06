import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  localCompleteOnboarding,
  localCurrentProfile,
  localSignIn,
  localSignOut,
  localSignUp,
  localUpdateCoachPrefs,
} from '../lib/localStore'
import {
  defaultAvatarProfileFields,
  EMPTY_COACH_PREFS,
  normalizeCoachPrefs,
  type CoachPrefs,
  type Profile,
} from '../lib/types'
import { normalizeEquipped } from '../lib/avatarCatalog'

interface AuthContextValue {
  user: Profile | null
  loading: boolean
  mode: 'supabase' | 'local'
  signUp: (fullName: string, email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  saveCoachPrefs: (prefs: Partial<CoachPrefs>, options?: { complete?: boolean }) => Promise<void>
  completeOnboarding: () => Promise<void>
}

function displayNameFromAuthUser(meta: Record<string, unknown> | undefined, email: string) {
  const fullName = typeof meta?.full_name === 'string' ? meta.full_name.trim() : ''
  const name = typeof meta?.name === 'string' ? meta.name.trim() : ''
  return fullName || name || email.split('@')[0] || 'User'
}

const AuthContext = createContext<AuthContextValue | null>(null)

function coerceProfile(raw: Partial<Profile> & { id: string; email: string; full_name: string }): Profile {
  const defaults = defaultAvatarProfileFields()
  return {
    id: raw.id,
    email: raw.email,
    full_name: raw.full_name,
    avatar_url: raw.avatar_url ?? null,
    points: Number(raw.points ?? defaults.points),
    xp: Number(raw.xp ?? defaults.xp),
    avatar_skin: raw.avatar_skin ?? defaults.avatar_skin,
    avatar_equipped: normalizeEquipped(raw.avatar_equipped ?? defaults.avatar_equipped),
    owned_accessories: Array.isArray(raw.owned_accessories)
      ? raw.owned_accessories
      : defaults.owned_accessories,
    coach_prefs: normalizeCoachPrefs(raw.coach_prefs ?? EMPTY_COACH_PREFS),
    // Missing column / older rows → treat as complete so login isn't blocked.
    onboarding_completed: raw.onboarding_completed ?? true,
    created_at: raw.created_at ?? new Date().toISOString(),
  }
}

async function fetchSupabaseProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) {
    console.warn('Failed to load profile:', error.message)
    return null
  }
  if (!data) return null
  return coerceProfile(data as Profile)
}

async function ensureSupabaseProfile(
  userId: string,
  email: string,
  fullName: string,
): Promise<Profile> {
  const existing = await fetchSupabaseProfile(userId)
  if (existing) return existing

  const defaults = defaultAvatarProfileFields()
  if (!supabase) {
    return coerceProfile({
      id: userId,
      email,
      full_name: fullName,
      avatar_url: null,
      ...defaults,
      coach_prefs: EMPTY_COACH_PREFS,
      onboarding_completed: false,
    })
  }

  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    full_name: fullName,
    points: defaults.points,
    xp: defaults.xp,
    avatar_skin: defaults.avatar_skin,
    avatar_equipped: defaults.avatar_equipped,
    owned_accessories: defaults.owned_accessories,
    coach_prefs: EMPTY_COACH_PREFS,
    onboarding_completed: false,
  })
  if (error) {
    console.warn('Failed to upsert profile:', error.message)
  }

  const created = await fetchSupabaseProfile(userId)
  if (created) return created

  return coerceProfile({
    id: userId,
    email,
    full_name: fullName,
    avatar_url: null,
    ...defaults,
    coach_prefs: EMPTY_COACH_PREFS,
    onboarding_completed: false,
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const mode: 'supabase' | 'local' = isSupabaseConfigured ? 'supabase' : 'local'

  const refreshProfile = useCallback(async () => {
    if (mode === 'local') {
      setUser(localCurrentProfile())
      return
    }
    if (!supabase) return
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      setUser(null)
      return
    }
    const email = data.user.email ?? ''
    const fullName = displayNameFromAuthUser(
      data.user.user_metadata as Record<string, unknown> | undefined,
      email,
    )
    const profile = await ensureSupabaseProfile(data.user.id, email, fullName)
    setUser(profile)
  }, [mode])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (mode === 'local') {
          if (mounted) setUser(localCurrentProfile())
        } else if (supabase) {
          const { data } = await supabase.auth.getSession()
          if (data.session?.user && mounted) {
            const email = data.session.user.email ?? ''
            const fullName = displayNameFromAuthUser(
              data.session.user.user_metadata as Record<string, unknown> | undefined,
              email,
            )
            const profile = await ensureSupabaseProfile(
              data.session.user.id,
              email,
              fullName,
            )
            setUser(profile)
          }
          supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!session?.user) {
              setUser(null)
              return
            }
            const email = session.user.email ?? ''
            const fullName = displayNameFromAuthUser(
              session.user.user_metadata as Record<string, unknown> | undefined,
              email,
            )
            const profile = await ensureSupabaseProfile(session.user.id, email, fullName)
            setUser(profile)
          })
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [mode])

  const signUp = useCallback(
    async (fullName: string, email: string, password: string) => {
      if (mode === 'local') {
        const profile = localSignUp(fullName, email, password)
        setUser(profile)
        return
      }
      if (!supabase) throw new Error('Supabase is not configured.')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error
      if (data.user) {
        const profile = await ensureSupabaseProfile(data.user.id, email, fullName)
        setUser(profile)
      }
    },
    [mode],
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (mode === 'local') {
        localSignIn(email, password)
        setUser(localCurrentProfile())
        return
      }
      if (!supabase) throw new Error('Supabase is not configured.')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      await refreshProfile()
    },
    [mode, refreshProfile],
  )

  const signInWithGoogle = useCallback(async () => {
    if (mode === 'local') {
      throw new Error('Google sign-in needs Supabase. Add your project URL and anon key to .env.local.')
    }
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('unsupported provider') || msg.includes('provider is not enabled')) {
        throw new Error(
          'Google sign-in is not enabled yet. In Supabase: Authentication → Providers → Google → enable it and paste your Google Client ID + Secret.',
        )
      }
      throw error
    }
  }, [mode])

  const saveCoachPrefs = useCallback(
    async (prefs: Partial<CoachPrefs>, options?: { complete?: boolean }) => {
      if (mode === 'local') {
        const profile = localUpdateCoachPrefs(prefs, options)
        setUser(profile)
        return
      }
      if (!supabase || !user) throw new Error('Not signed in.')
      const nextPrefs = normalizeCoachPrefs({ ...user.coach_prefs, ...prefs })
      const patch: Record<string, unknown> = { coach_prefs: nextPrefs }
      if (options?.complete) patch.onboarding_completed = true
      const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
      if (error) throw error
      setUser({
        ...user,
        coach_prefs: nextPrefs,
        onboarding_completed: options?.complete ? true : user.onboarding_completed,
      })
    },
    [mode, user],
  )

  const completeOnboarding = useCallback(async () => {
    if (mode === 'local') {
      setUser(localCompleteOnboarding())
      return
    }
    if (!supabase || !user) throw new Error('Not signed in.')
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id)
    if (error) throw error
    setUser({ ...user, onboarding_completed: true })
  }, [mode, user])

  const signOut = useCallback(async () => {
    if (mode === 'local') {
      localSignOut()
      setUser(null)
      return
    }
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
  }, [mode])

  const value = useMemo(
    () => ({
      user,
      loading,
      mode,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      refreshProfile,
      saveCoachPrefs,
      completeOnboarding,
    }),
    [
      user,
      loading,
      mode,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      refreshProfile,
      saveCoachPrefs,
      completeOnboarding,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
