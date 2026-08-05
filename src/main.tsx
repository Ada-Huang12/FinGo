import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import { applyThemeColors, getTheme, loadStoredThemeId } from './lib/themes'
import './index.css'

// Apply before first paint to avoid a flash of the default palette.
applyThemeColors(getTheme(loadStoredThemeId()))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
