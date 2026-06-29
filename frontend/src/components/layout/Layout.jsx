import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import useUiStore from '../../stores/uiStore'
import useAuthStore from '../../stores/authStore'
import UnverifiedBanner from './UnverifiedBanner'

export default function Layout() {
  const { user } = useAuthStore()
  const { sidebarOpen } = useUiStore()

  return (
    <div className="min-h-screen bg-primary flex relative">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        {user && user.is_verified === false && (
          <UnverifiedBanner />
        )}
        <Navbar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
