import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppLayout } from './components/layout/AppLayout'
import { HomePage } from './pages/HomePage'
import { BillsPage } from './pages/BillsPage'
import { GoalsPage } from './pages/GoalsPage'
import { SocialPage } from './pages/SocialPage'
import { AiCoachPage } from './pages/AiCoachPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { LoginPage, SignupPage, AuthCallbackPage } from './pages/AuthPages'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-fingo-muted">
        Loading FinGo…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function RequireOnboarding() {
  const { user } = useAuth()
  if (user && !user.onboarding_completed) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<RequireOnboarding />}>
            <Route element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="bills" element={<BillsPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="social" element={<SocialPage />} />
              <Route path="ai-coach" element={<AiCoachPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
