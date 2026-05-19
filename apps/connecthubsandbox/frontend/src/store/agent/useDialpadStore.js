import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../useToastStore.js";

export const DialpadStore = create((set) => ({
  agentCampaignData: [],
  contactsData: [],
  getContactLoading: false,
  getCampaigns: async () => {
    try {
      const res = await telephonyaxios.get("telephony/campaign/list/agentcampaign");
      set({ agentCampaignData: res.data.data });
    } catch (error) {
      console.log(error);
    }
  },

  getContacts: async () => {
    set({ getContactLoading: true });
    try {
      const res = await telephonyaxios.post("/telephony/contact/list/select", {
        limit: 100,
        offset: 0,
        searchString: "",
      });
      set({ contactsData: res.data.data });
    } catch (error) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Something went wrong";

      if (status) {
        toast.error(`Error ${status}: ${message}`);
      } else {
        toast.error(message);
      }
    } finally {
      set({ getContactLoading: false });
    }
  },
}));
