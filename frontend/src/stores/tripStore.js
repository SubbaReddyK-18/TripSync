import { create } from 'zustand'
import * as tripsApi from '../api/trips'

const useTripStore = create((set) => ({
  trips: [],
  activeTrip: null,
  members: [],
  activity: [],
  isLoading: false,

  fetchTrips: async () => {
    set({ isLoading: true })
    try {
      const { data } = await tripsApi.getTrips()
      set({ trips: data.data.trips, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  fetchTrip: async (id) => {
    set({ isLoading: true })
    try {
      const { data } = await tripsApi.getTrip(id)
      set({ activeTrip: data.data.trip, isLoading: false })
      return data.data.trip
    } catch {
      set({ isLoading: false })
      return null
    }
  },

  fetchMembers: async (tripId) => {
    try {
      const { data } = await tripsApi.getMembers(tripId)
      set({ members: data.data.members })
    } catch {}
  },

  fetchActivity: async (tripId) => {
    try {
      const { data } = await tripsApi.getActivity(tripId)
      set({ activity: data.data.activities })
    } catch {}
  },

  resetActive: () => set({ activeTrip: null, members: [], activity: [] }),
}))

export default useTripStore
