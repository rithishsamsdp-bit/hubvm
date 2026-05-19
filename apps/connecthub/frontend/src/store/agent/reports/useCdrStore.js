import { create } from "zustand";
import telephonyaxios from "../../../services/reportsaxios.js";

export const useCdrStore = create((set) => ({
  fetchCdrData: [],
  fetchCdrCount: 0,
  isfetchLoading: false,

  getCdrData: async (
    pageSize,
    offset,
    sortField,
    sortOrder,
    searchString,
    campaign,
    disposition,
    callMode,
    agentDisposition,
    direction,
    startDate,
    endDate
  ) => {
    set({ isfetchLoading: true });

    const payload = {
      limit: pageSize,
      offset: offset,
      sortField: sortField || "c_callDateTime",
      sortOrder: sortOrder || "DESC",
    };

    if (searchString) payload.searchString = searchString;
    if (campaign?.length) payload.campaignid = campaign;
    if (disposition) payload.calldisposition = disposition;
    if (agentDisposition) payload.agentdisposition = agentDisposition;
    if (direction) payload.calldirection = direction;
    if (callMode) payload.callmode = callMode;
    if (startDate) payload.calldatestart = startDate;
    if (endDate) payload.calldateend = endDate;


    try {
      const res = await telephonyaxios.post("/report/cdr/fetch/agent", payload);
      set({
        fetchCdrData: res.data?.data?.totalRecords || [],
        fetchCdrCount: res.data?.data?.totalRecordsCount || 0,
        isfetchLoading: false,
      });
    } catch (error) {
      console.error("Failed to fetch CDR data:", error);
      set({
        fetchCdrData: [],
        fetchCdrCount: 0,
        isfetchLoading: false,
      });
      throw error;
    }
  },

  fetchCampaignList: [],
  isfetchLoading: false,
  getCampaignlist: async () => {
    set({ isfetchLoading: true });
    try {
      const res = await telephonyaxios.get("/report/list/campaign");
      set({
        fetchCampaignList: res.data?.data?.totalRecords || [],
        isfetchLoading: false,
      });
    } catch (error) {
      console.error("Failed to fetch CDR data:", error);
      set({
        fetchCampaignList: [],
        isfetchLoading: false,
      });
      throw error;
    }
  },
}));
