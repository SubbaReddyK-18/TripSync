import { create } from 'zustand'

const getInitialTheme = () => {
  const stored = localStorage.getItem('theme')
  if (stored) return stored === 'dark'
  return false
}

const defaultConfig = {
  allowRegistrations: true,
  enableTrips: true,
  enableExpenses: true,
  enableMemories: true,
  enablePlaces: true,
  enableSettlements: true,
}

const useUiStore = create((set) => ({
  sidebarOpen: false,
  notificationsOpen: false,
  activeModal: null,
  isDark: getInitialTheme(),
  systemConfig: { ...defaultConfig },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setNotificationsOpen: (open) => set({ notificationsOpen: open }),
  setActiveModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),

  setSystemConfig: (config) => set({ systemConfig: { ...defaultConfig, ...config } }),

  toggleTheme: () =>
    set((s) => {
      const next = !s.isDark
      localStorage.setItem('theme', next ? 'dark' : 'light')
      document.documentElement.classList.toggle('dark', next)
      return { isDark: next }
    }),

  initTheme: () => {
    const isDark = getInitialTheme()
    document.documentElement.classList.toggle('dark', isDark)
    set({ isDark })
  },
}))

export default useUiStore
