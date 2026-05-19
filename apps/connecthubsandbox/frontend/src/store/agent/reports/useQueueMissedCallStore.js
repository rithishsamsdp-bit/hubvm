import { create } from "zustand";
import telephonyaxios from "../../../services/reportsaxios.js";

export const useQueueMissedCallStore = create((set) => ({
    fetchqueuemissedcall: [],
    fetchCdrCount: 0,
    isfetchLoading: false,

    getqueuemissedcall: async (
        pageSize,
        offset,
        searchString,
        startDate,
        endDate
    ) => {
        set({ isfetchLoading: true });

        const payload = {
            limit: pageSize,
            offset: offset,
            search: searchString,
            calldatestart: startDate,
            calldateend: endDate,
            type: 'fetch'
        };

        try {
            const res = await telephonyaxios.post("/report/queuemissed/fetch", payload);
            console.log(res.data);
            set({
                fetchqueuemissedcall: res.data?.data?.records || [],
                fetchCdrCount: res.data?.data?.totalRecordsCount || 0,
                isfetchLoading: false,
            });
        } catch (error) {
            console.error("Failed to fetch queue missed call data:", error);
            set({
                fetchqueuemissedcall: [],
                fetchCdrCount: 0,
                isfetchLoading: false,
            });
            throw error;
        }
    },

    exportcdr: async (
        pageSize,
        offset,
        searchString,
        startDate,
        endDate
    ) => {

        const payload = {
            limit: pageSize,
            offset: offset,
            search: searchString,
            calldatestart: startDate,
            calldateend: endDate,
            type: 'export'
        };

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
        const downloadUrl = `${base}/report/queuemissed/fetch/export?${params.toString()}`;
        window.open(downloadUrl, "_blank");
    }
}));
