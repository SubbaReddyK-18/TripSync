import { create } from 'zustand'
import * as expensesApi from '../api/expenses'

const useExpenseStore = create((set) => ({
  expenses: [],
  filters: {},
  isLoading: false,

  fetchExpenses: async (tripId, filters = {}) => {
    set({ isLoading: true, filters })
    try {
      const { data } = await expensesApi.getExpenses(tripId, filters)
      set({ expenses: data.data.expenses, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  clearExpenses: () => set({ expenses: [], filters: {} }),
}))

export default useExpenseStore
