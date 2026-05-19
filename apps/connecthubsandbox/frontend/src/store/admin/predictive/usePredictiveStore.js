import { create } from "zustand";
import telephonyaxios from "../../../services/telephonyaxios.js";
import reportsaxios from "../../../services/reportsaxios.js";
import { toast } from "../../../store/useToastStore.js";

export const usePredictiveStore = create((set) => ({
    // Lead & Campaign Management Loading States
    predictiveLoading: false,
    predictiveDashboardData: null,
    predictiveLeads: [],
    predictiveLeadsCount: 0,
    
    // Reporting Logic
    fetchCdrData: [],
    fetchCdrCount: 0,
    isfetchLoading: false,
    reportFilters: {
        searchString: "",
        disposition: "",
        campaignId: "",
        startDate: new Date(),
        endDate: new Date(),
    },

    setReportFilters: (filters) => set((state) => ({ 
        reportFilters: { ...state.reportFilters, ...filters } 
    })),

    getPredictiveDashboard: async (campaignId = null) => {
        set({ predictiveLoading: true });
        try {
            const url = campaignId && campaignId !== "All Campaigns" 
                ? `/telephony/campaign/predective/dashboard?campaign_id=${campaignId}`
                : "/telephony/campaign/predective/dashboard";
            const res = await telephonyaxios.get(url);
            set({ predictiveDashboardData: res.data.data });
            return res.data.data;
        } catch (error) {
            const message = error?.response?.data?.message || "Failed to fetch dashboard data";
            toast.error(message);
            return null;
        } finally {
            set({ predictiveLoading: false });
        }
    },

    getCampaignLeads: async (campaignid, limit = 100, offset = 0, searchString = "", status = "", lastResult = "") => {
        set({ predictiveLoading: true });
        try {
            const res = await telephonyaxios.post("/telephony/campaign/predective/campaignleads", { 
                campaignid,
                limit,
                offset,
                searchString,
                status,
                lastResult
            });
            set({ predictiveLeads: res.data.data.leads || [], predictiveLeadsCount: res.data.data.totalCount || 0 });
            return res.data.data;
        } catch (error) {
            const message = error?.response?.data?.message || "Failed to fetch leads";
            toast.error(message);
            return null;
        } finally {
            set({ predictiveLoading: false });
        }
    },

    startPredictiveCampaign: async (campid) => {
        try {
            const res = await telephonyaxios.post("/telephony/campaign/predective/campaignstart", { campid });
            toast.success(res.data.message);
            return res;
        } catch (error) {
            const message = error?.response?.data?.message || "Failed to start campaign";
            toast.error(message);
        }
    },

    stopPredictiveCampaign: async (campid) => {
        try {
            const res = await telephonyaxios.post("/telephony/campaign/predective/campaignstop", { campid });
            toast.success(res.data.message);
            return res;
        } catch (error) {
            const message = error?.response?.data?.message || "Failed to stop campaign";
            toast.error(message);
        }
    },

    // --- Report Specific Logic (Isolated from generic useCdrStore) ---

    getPredictiveReportData: async (
        pageSize,
        offset,
        sortField,
        sortOrder,
        searchString,
        startDate,
        endDate,
        disposition,
        campaignId
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
        if (startDate) payload.calldatestart = startDate;
        if (endDate) payload.calldateend = endDate;
        if (disposition) payload.calldisposition = disposition;
        if (campaignId) payload.campaignid = campaignId;

        try {
            const res = await reportsaxios.post("/report/predictive/cdr/fetch", payload);
            set({
                fetchCdrData: res.data?.data?.totalRecords || [],
                fetchCdrCount: res.data?.data?.totalRecordsCount || 0,
                isfetchLoading: false,
            });
        } catch (error) {
            console.error("Failed to fetch Predictive CDR data:", error);
            set({
                fetchCdrData: [],
                fetchCdrCount: 0,
                isfetchLoading: false,
            });
            throw error;
        }
    },

    exportPredictiveReport: async (
        pageSize,
        offset,
        sortField,
        sortOrder,
        searchString,
        startDate,
        endDate,
        disposition
    ) => {
        const payload = {
            limit: pageSize,
            offset: offset,
            sortField: sortField || "c_callDateTime",
            sortOrder: sortOrder || "DESC",
            type: 'export'
        };

        if (searchString) payload.searchString = searchString;
        if (startDate) payload.calldatestart = startDate;
        if (endDate) payload.calldateend = endDate;
        if (disposition) payload.calldisposition = disposition;

        const params = new URLSearchParams();
        Object.entries(payload).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            if (Array.isArray(value)) {
                value.forEach(v => params.append(key, String(v)));
            } else {
                params.append(key, String(value));
            }
        });

        const base = (reportsaxios?.defaults && reportsaxios.defaults.baseURL) || import.meta.env.VITE_API_BASE || "";
        const downloadUrl = `${base}/report/predictive/cdr/fetch/export?${params.toString()}`;
        window.open(downloadUrl, "_blank");
    },
}));
