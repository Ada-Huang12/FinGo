import { Outlet } from 'react-router-dom'
import { DataProvider } from '../../contexts/DataContext'
import { AiCoachFab } from '../home/AiCoachFab'
import { BottomNav, Header } from './Header'

export function AppLayout() {
  return (
    <DataProvider>
      <div className="min-h-screen pb-24 md:pb-8">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
          <Outlet />
        </main>
        <BottomNav />
        <AiCoachFab />
      </div>
    </DataProvider>
  )
}
