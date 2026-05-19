import { create } from "zustand";
import authaxios from "../../services/authaxios.js";

const useIpStore = create((set, get) => ({
  ipList: [],
  totalCount: 0,
  isLoading: false,
  error: null,

  // Fetch IP List
  fetchIpList: async (accountId, limit = 10, offset = 0, searchString = "") => {
    set({ isLoading: true, error: null });
    try {
      const response = await authaxios.post(
        '/onboarding/ip/list',
        {
          accountId,
          limit,
          offset,
          searchString,
        },
      );

      set({
        ipList: response.data.data,
        totalCount: response.data.totalCount,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching IP list:", error);
      set({
        isLoading: false,
        error: error.response?.data?.message || "Failed to fetch IP list",
      });
    }
  },

  // Create IP
  createIp: async (accountId, ipData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authaxios.post(
        '/onboarding/ip/create',
        {
          accountId,
          ...ipData,
        },
      );

      // Refresh list after creation
      const { fetchIpList } = get();
      // You might want to pass current pagination state here if available in store
      await fetchIpList(accountId);

      return response.data;
    } catch (error) {
      console.error("Error creating IP:", error);
      set({
        isLoading: false,
        error: error.response?.data?.message || "Failed to create IP",
      });
      throw error;
    }
  },

  // Delete IP
  deleteIp: async (id, accountId) => {
    set({ isLoading: true, error: null });
    try {
      await authaxios.delete(`/onboarding/ip/delete/${id}/${accountId}`);

      // Refresh list after deletion
      const { fetchIpList } = get();
      await fetchIpList(accountId);
    } catch (error) {
      console.error("Error deleting IP:", error);
      set({
        isLoading: false,
        error: error.response?.data?.message || "Failed to delete IP",
      });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useIpStore;
