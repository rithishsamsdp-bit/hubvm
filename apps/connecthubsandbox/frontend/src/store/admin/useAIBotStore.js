import { create } from "zustand";
import { toast } from "../useToastStore.js";
import aiaxios from "../../services/aiaxios.js";

export const useAIBotStore = create((set, get) => ({
  // ── Bots ────────────────────────────────────────────────────────────────────
  botsLoading: false,
  botsData: [],

  getBots: async () => {
    set({ botsLoading: true });
    try {
      const res = await aiaxios.get("/api/ai/bots");
      set({ botsData: res.data });                         // ← .data
    } catch (error) {
      toast.error(error.message || "Failed to fetch bots");
    } finally {
      set({ botsLoading: false });
    }
  },

  createBotLoading: false,

  createBot: async (payload) => {
    set({ createBotLoading: true });
    try {
      const res = await aiaxios.post("/api/ai/bots", payload);
      toast.success("Bot published successfully!");
      set((state) => ({ botsData: [res.data, ...state.botsData] })); // ← .data
      return res.data;
    } catch (error) {
      toast.error(error.message || "Failed to publish bot");
      return null;
    } finally {
      set({ createBotLoading: false });
    }
  },

  updateBot: async (botId, payload) => {
    set({ createBotLoading: true });
    try {
      const res = await aiaxios.put(`/api/ai/bots/${botId}`, payload); // ← backticks
      toast.success("Bot updated successfully!");
      set((state) => ({
        botsData: state.botsData.map((b) => (b.id === botId ? res.data : b)),
      }));
      return res.data;
    } catch (error) {
      toast.error(error.message || "Failed to update bot");
      return null;
    } finally {
      set({ createBotLoading: false });
    }
  },

  deleteBot: async (botId) => {
    try {
      await aiaxios.delete(`/api/ai/bots/${botId}`);       // ← backticks
      toast.success("Bot deleted successfully!");
      set((state) => ({
        botsData: state.botsData.filter((b) => b.id !== botId),
      }));
    } catch (error) {
      toast.error(error.message || "Failed to delete bot");
    }
  },

  getBotById: async (botId) => {
    try {
      const res = await aiaxios.get(`/api/ai/bots/${botId}`); // ← backticks + .data
      return res.data;
    } catch (error) {
      toast.error(error.message || "Failed to fetch bot");
      return null;
    }
  },

  // ── Phone Numbers ───────────────────────────────────────────────────────────
  phoneNumbersLoading: false,
  phoneNumbersData: [],

  getPhoneNumbers: async () => {
    set({ phoneNumbersLoading: true });
    try {
      const res = await aiaxios.get("/api/ai/phone-numbers");
      set({ phoneNumbersData: res.data });                 // ← .data
    } catch (error) {
      toast.error(error.message || "Failed to fetch phone numbers");
    } finally {
      set({ phoneNumbersLoading: false });
    }
  },

  assignBot: async (phoneId, botId) => {
    try {
      const res = await aiaxios.put(`/api/ai/phone-numbers/${phoneId}/bot`, { // ← backticks
        bot_id: botId || null,
      });
      toast.success("Bot assigned successfully!");
      set((state) => ({
        phoneNumbersData: state.phoneNumbersData.map((p) =>
          p.id === phoneId ? res.data : p                  // ← .data
        ),
      }));
      return res.data;
    } catch (error) {
      toast.error(error.message || "Failed to assign bot");
      return null;
    }
  },

  // ── Call Records ────────────────────────────────────────────────────────────
  callsLoading: false,
  callsData: [],

  getCalls: async (botId = null) => {
    set({ callsLoading: true });
    try {
      const query = botId ? `?bot_id=${botId}` : "";
      const res = await aiaxios.get(`/api/ai/calls${query}`); // ← backticks + .data
      set({ callsData: res.data });
    } catch (error) {
      toast.error(error.message || "Failed to fetch call records");
    } finally {
      set({ callsLoading: false });
    }
  },

  getCallById: async (callId) => {
    try {
      const res = await aiaxios.get(`/api/ai/calls/${callId}`);
      return res.data;
    } catch (error) {
      toast.error(error.message || "Failed to fetch call details");
      return null;
    }
  },

  // ── Billing ─────────────────────────────────────────────────────────────────
  billingLoading: false,
  billingData: null,

  getBilling: async () => {
    set({ billingLoading: true });
    try {
      const res = await aiaxios.get("/api/ai/calls/billing");
      set({ billingData: res.data });                      // ← .data
    } catch (error) {
      toast.error(error.message || "Failed to fetch billing data");
    } finally {
      set({ billingLoading: false });
    }
  },
}));
