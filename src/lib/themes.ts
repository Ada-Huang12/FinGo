export type ThemeId = 'forest' | 'ocean' | 'sunrise' | 'slate' | 'berry'

export interface ThemeColors {
  green: string
  greenDark: string
  greenSoft: string
  blue: string
  blueDark: string
  blueSoft: string
  bg: string
  /** Used for ambient body gradients */
  greenRgb: string
  blueRgb: string
}

export interface AppTheme {
  id: ThemeId
  name: string
  description: string
  swatch: [string, string]
  colors: ThemeColors
}

export const APP_THEMES: AppTheme[] = [
  {
    id: 'forest',
    name: 'Forest',
    description: 'Classic FinGo green & blue',
    swatch: ['#22c55e', '#3b82f6'],
    colors: {
      green: '#22c55e',
      greenDark: '#16a34a',
      greenSoft: '#dcfce7',
      blue: '#3b82f6',
      blueDark: '#2563eb',
      blueSoft: '#dbeafe',
      bg: '#f3f6f9',
      greenRgb: '34, 197, 94',
      blueRgb: '59, 130, 246',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Teal waves and sky',
    swatch: ['#14b8a6', '#0ea5e9'],
    colors: {
      green: '#14b8a6',
      greenDark: '#0f766e',
      greenSoft: '#ccfbf1',
      blue: '#0ea5e9',
      blueDark: '#0284c7',
      blueSoft: '#e0f2fe',
      bg: '#f0f9ff',
      greenRgb: '20, 184, 166',
      blueRgb: '14, 165, 233',
    },
  },
  {
    id: 'sunrise',
    name: 'Sunrise',
    description: 'Warm amber & coral',
    swatch: ['#f59e0b', '#f97316'],
    colors: {
      green: '#f59e0b',
      greenDark: '#d97706',
      greenSoft: '#fef3c7',
      blue: '#f97316',
      blueDark: '#ea580c',
      blueSoft: '#ffedd5',
      bg: '#fffbeb',
      greenRgb: '245, 158, 11',
      blueRgb: '249, 115, 22',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Cool gray & steel blue',
    swatch: ['#64748b', '#2563eb'],
    colors: {
      green: '#64748b',
      greenDark: '#475569',
      greenSoft: '#f1f5f9',
      blue: '#2563eb',
      blueDark: '#1d4ed8',
      blueSoft: '#dbeafe',
      bg: '#f8fafc',
      greenRgb: '100, 116, 139',
      blueRgb: '37, 99, 235',
    },
  },
  {
    id: 'berry',
    name: 'Berry',
    description: 'Fresh rose & mint',
    swatch: ['#10b981', '#e11d48'],
    colors: {
      green: '#10b981',
      greenDark: '#059669',
      greenSoft: '#d1fae5',
      blue: '#e11d48',
      blueDark: '#be123c',
      blueSoft: '#ffe4e6',
      bg: '#fdf2f8',
      greenRgb: '16, 185, 129',
      blueRgb: '225, 29, 72',
    },
  },
]

export const DEFAULT_THEME_ID: ThemeId = 'forest'

export function getTheme(id: string | null | undefined): AppTheme {
  return APP_THEMES.find((t) => t.id === id) ?? APP_THEMES[0]
}

export function applyThemeColors(theme: AppTheme) {
  const root = document.documentElement
  const c = theme.colors
  root.style.setProperty('--color-fingo-green', c.green)
  root.style.setProperty('--color-fingo-green-dark', c.greenDark)
  root.style.setProperty('--color-fingo-green-soft', c.greenSoft)
  root.style.setProperty('--color-fingo-blue', c.blue)
  root.style.setProperty('--color-fingo-blue-dark', c.blueDark)
  root.style.setProperty('--color-fingo-blue-soft', c.blueSoft)
  root.style.setProperty('--color-fingo-bg', c.bg)
  root.style.setProperty('--fingo-green-rgb', c.greenRgb)
  root.style.setProperty('--fingo-blue-rgb', c.blueRgb)
  root.dataset.theme = theme.id
}

const STORAGE_KEY = 'fingo.theme'

export function loadStoredThemeId(): ThemeId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && APP_THEMES.some((t) => t.id === raw)) return raw as ThemeId
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME_ID
}

export function storeThemeId(id: ThemeId) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}
