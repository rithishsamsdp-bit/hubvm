import { create } from "zustand";
import telephonyaxios from "../../../services/reportsaxios.js";

export const useSuperAdminCdrStore = create((set) => ({
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
    endDate,
    dialMethod
  ) => {
    set({ isfetchLoading: true });

    const payload = {
      limit: pageSize,
      offset: offset,
      sortField: sortField || "c_callDateTime",
      sortOrder: sortOrder || "DESC",
      type: 'fetch',
    };

    if (searchString) payload.searchString = searchString;
    if (campaign) payload.campaignid = campaign;
    if (disposition) payload.calldisposition = disposition;
    if (agentDisposition) payload.agentdisposition = agentDisposition;
    if (direction) payload.calldirection = direction;
    if (callMode) payload.callmode = callMode;
    if (dialMethod) payload.dialmethod = dialMethod;
    if (startDate) payload.calldatestart = startDate;
    if (endDate) payload.calldateend = endDate;

    try {
      const res = await telephonyaxios.post("/report/global/cdr/fetch", payload);
      console.log(res.data);
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
  campaignLoading: false,

  getCampaignlist: async () => {
    set({ campaignLoading: true });
    try {
      const res = await telephonyaxios.get("/report/list/campaign");
      console.log("Campaign List:", res.data);
      set({
        fetchCampaignList: res.data?.data || [],
        campaignLoading: false,
      });
    } catch (error) {
      console.error("Failed to fetch campaign list:", error);
      set({
        fetchCampaignList: [],
        campaignLoading: false,
      });
    }
  },

  exportcdr: async (
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
    endDate,
    dialMethod
  ) => {
    const payload = {
      limit: pageSize,
      offset: offset,
      sortField: sortField || "c_callDateTime",
      sortOrder: sortOrder || "DESC",
      type: 'export'
    };

    if (searchString) payload.searchString = searchString;
    if (campaign) payload.campaignid = Number(campaign);
    if (disposition) payload.calldisposition = disposition;
    if (agentDisposition) payload.agentdisposition = agentDisposition;
    if (direction) payload.calldirection = direction;
    if (callMode) payload.callmode = callMode;
    if (dialMethod) payload.dialmethod = dialMethod;
    if (startDate) payload.calldatestart = startDate;
    if (endDate) payload.calldateend = endDate;

    const params = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, String(v)));
      } else {
        params.append(key, String(value));
      }
    });

    const base = (telephonyaxios?.defaults && telephonyaxios.defaults.baseURL) || import.meta.env.VITE_API_BASE || "";
    console.log(base);
    const downloadUrl = `${base}/report/global/cdr/fetch/export?${params.toString()}`;
    window.open(downloadUrl, "_blank");
  },
}));
