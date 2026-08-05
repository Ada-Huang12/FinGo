import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  APP_THEMES,
  applyThemeColors,
  getTheme,
  loadStoredThemeId,
  storeThemeId,
  type AppTheme,
  type ThemeId,
} from '../lib/themes'

interface ThemeContextValue {
  themeId: ThemeId
  theme: AppTheme
  themes: AppTheme[]
  setThemeId: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => loadStoredThemeId())

  useEffect(() => {
    applyThemeColors(getTheme(themeId))
  }, [themeId])

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id)
    storeThemeId(id)
  }, [])

  const value = useMemo(
    () => ({
      themeId,
      theme: getTheme(themeId),
      themes: APP_THEMES,
      setThemeId,
    }),
    [themeId, setThemeId],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
