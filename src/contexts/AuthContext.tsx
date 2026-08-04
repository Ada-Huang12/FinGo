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
  localCurrentProfile,
  localSignIn,
  localSignOut,
  localSignUp,
} from '../lib/localStore'
import { defaultAvatarProfileFields, type Profile } from '../lib/types'
import { normalizeEquipped } from '../lib/avatarCatalog'

interface AuthContextValue {
  user: Profile | null
  loading: boolean
  mode: 'supabase' | 'local'
  signUp: (fullName: string, email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
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
    avatar_skin: raw.avatar_skin ?? defaults.avatar_skin,
    avatar_equipped: normalizeEquipped(raw.avatar_equipped ?? defaults.avatar_equipped),
    owned_accessories: Array.isArray(raw.owned_accessories)
      ? raw.owned_accessories
      : defaults.owned_accessories,
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
    })
  }

  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    full_name: fullName,
    points: defaults.points,
    avatar_skin: defaults.avatar_skin,
    avatar_equipped: defaults.avatar_equipped,
    owned_accessories: defaults.owned_accessories,
  })
  if (error) {
    console.warn('Failed to upsert profile:', error.message)
  }

  const created = await fetchSupabaseProfile(userId)
  if (created) return created

  // Last resort for UI continuity; friendships still need a real DB row.
  return coerceProfile({
    id: userId,
    email,
    full_name: fullName,
    avatar_url: null,
    ...defaults,
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
    const fullName =
      data.user.user_metadata?.full_name ?? email.split('@')[0] ?? 'User'
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
            const fullName =
              data.session.user.user_metadata?.full_name ??
              email.split('@')[0] ??
              'User'
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
            const fullName =
              session.user.user_metadata?.full_name ?? email.split('@')[0] ?? 'User'
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
        const profile = localSignIn(email, password)
        setUser(profile)
        return
      }
      if (!supabase) throw new Error('Supabase is not configured.')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      await refreshProfile()
    },
    [mode, refreshProfile],
  )

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
    () => ({ user, loading, mode, signUp, signIn, signOut, refreshProfile }),
    [user, loading, mode, signUp, signIn, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
