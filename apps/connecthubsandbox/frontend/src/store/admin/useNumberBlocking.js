import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../../store/useToastStore.js";

export const useNumberBlockingStore = create((set) => ({
  blacklistData: [],
  blacklistTotalCount: 0,
  blacklistLoading: false,
  createBlacklistModalLoading: false,

  // Get all blacklist entries
  getBlacklist: async (limit, offset, searchString, sortField, sortOrder) => {
    set({ blacklistLoading: true });
    try {
      const response = await telephonyaxios.post("/telephony/blacklist/select", {
        limit,
        offset,
        searchString,
        sortField,
        sortOrder,
      });

      if (response.data) {
        set({
          blacklistData: response.data.data || [],
          blacklistTotalCount: response.data.recordsTotal || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching blacklist:", error);
      toast.error(error.response?.data?.message || "Failed to fetch blacklist");
      set({ blacklistData: [], blacklistTotalCount: 0 });
    } finally {
      set({ blacklistLoading: false });
    }
  },

  // Create new blacklist entry
  createBlacklist: async (data) => {
    set({ createBlacklistModalLoading: true });
    try {
      const response = await telephonyaxios.post("/telephony/blacklist/create", {
        p_blacklistNo: data.p_blacklistNo,
        p_blacklistDescription: data.p_blacklistDescription,
        p_blacklistCalltype: data.p_blacklistCalltype,
        p_blacklistStatus: data.p_blacklistStatus,
      });

      console.log(response);

      if (response.data.message) {
        toast.success(response.data.message);
        return response.data;
      }
    } catch (error) {
      console.log(error)
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Something went wrong";
      if (status) {
        toast.error(`Error ${status}: ${message}`);
      }
      else {
        toast.error(message);
      }
    } finally {
      set({ createBlacklistModalLoading: false });
    }
  },

  // Update existing blacklist entry
  editBlacklist: async (data) => {
    set({ createBlacklistModalLoading: true });
    try {
      const response = await telephonyaxios.post("/telephony/blacklist/update", {
        p_blacklistId: data.p_blacklistId,
        p_blacklistNo: data.p_blacklistNo,
        p_blacklistDescription: data.p_blacklistDescription,
        p_blacklistCalltype: data.p_blacklistCalltype,
        p_blacklistStatus: data.p_blacklistStatus,
      });

      if (response.data) {
        toast.success("Number blocking updated successfully");
        return response.data;
      }
    } catch (error) {
      console.error("Error updating blacklist:", error);
      toast.error(error.response?.data?.message || "Failed to update number blocking");
      throw error;
    } finally {
      set({ createBlacklistModalLoading: false });
    }
  },

  // Delete blacklist entry
  deleteBlacklist: async (id) => {
    try {
      const response = await telephonyaxios.post("/telephony/blacklist/delete", {
        p_blacklistId: id.toString(),
      });

      if (response.data) {
        toast.success("Number unblocked successfully");
        return response.data;
      }
    } catch (error) {
      console.error("Error deleting blacklist:", error);
      toast.error(error.response?.data?.message || "Failed to unblock number");
      throw error;
    }
  },
}));