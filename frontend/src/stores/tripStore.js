import { create } from 'zustand'
import * as tripsApi from '../api/trips'

const useTripStore = create((set) => ({
  trips: [],
  activeTrip: null,
  members: [],
  activity: [],
  loading: false,
  error: null,

  fetchTrips: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await tripsApi.getTrips()
      set({ trips: data.data.trips, loading: false })
    } catch (err) {
      set({ loading: false, error: err.response?.data?.error?.message || err.message || 'Failed to load trips' })
    }
  },

  fetchTrip: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data } = await tripsApi.getTrip(id)
      set({ activeTrip: data.data.trip, loading: false })
      return data.data.trip
    } catch (err) {
      set({ loading: false, error: err.response?.data?.error?.message || err.message || 'Failed to load trip' })
      return null
    }
  },

  fetchMembers: async (tripId) => {
    try {
      const { data } = await tripsApi.getMembers(tripId)
      set({ members: data.data.members })
    } catch (err) {
      set({ error: err.response?.data?.error?.message || err.message || 'Failed to load members' })
    }
  },

  fetchActivity: async (tripId) => {
    try {
      const { data } = await tripsApi.getActivity(tripId)
      set({ activity: data.data.activities })
    } catch (err) {
      set({ error: err.response?.data?.error?.message || err.message || 'Failed to load activity' })
    }
  },

  clearError: () => set({ error: null }),

  resetActive: () => set({ activeTrip: null, members: [], activity: [] }),
}))

export default useTripStore
