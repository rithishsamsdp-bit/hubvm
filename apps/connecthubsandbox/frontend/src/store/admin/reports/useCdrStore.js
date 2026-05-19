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
      const res = await telephonyaxios.post("/report/cdr/fetch", payload);
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
    const downloadUrl = `${base}/report/cdr/fetch/export?${params.toString()}`;
    window.open(downloadUrl, "_blank");
  },

  adminAiData: null,
  adminAiDataLoading: false,

  getAdminAiData: async (audioURL) => {
    if (!audioURL) {
      console.warn("Audio is not found.");
      set({ adminAiData: null });
      return;
    }

    set({ adminAiDataLoading: true });
    const API_URL =
      "https://api.deepgram.com/v1/listen?sentiment=true&smart_format=true&summarize=v2&language=en&model=nova";
    const headers = {
      Authorization: "Token b3f8e567d21715dcec6da09ff49a14f24016b653",
      "Content-Type": "application/json",
    };

    const data = { url: audioURL };

    try {

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(result);
      set({ adminAiData: result });

    } catch (error) {
      console.error("Deepgram Error:", error);
      set({ adminAiData: null });
    } finally {
      set({ adminAiDataLoading: false });
    }
  },

  clearAdminAiData: () => {
    set({ adminAiData: null });
  }
}));