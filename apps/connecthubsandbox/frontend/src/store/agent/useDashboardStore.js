import { create } from "zustand";
import conversationaxios from "../../services/conversationaxios";

export const useDashboardStore = create((set, get) => ({
  agentStats: null,
  liveQueueStats: null,
  chatLoading: true,
  getStats: async () => {
    set({ chatLoading: true });
    try {
      const res = await conversationaxios.get("/agent/dashboard/fetch");
      set({ agentStats: res.data.data });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      set({ agentStats: null });
    } finally {
      set({ chatLoading: false });
    }
  },
  getLiveQueueStats: async () => {
    try {
      const res = await conversationaxios.get("/agent/dashboard/live-queues");
      set({ liveQueueStats: res.data.data });
    } catch (error) {
      console.error("Error fetching live queues:", error);
    }
  },
}));