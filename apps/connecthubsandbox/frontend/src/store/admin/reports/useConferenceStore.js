import { create } from "zustand";
import telephonyaxios from "../../../services/reportsaxios.js";

export const useConferenceStore = create((set) => ({
    fetchConferenceData: [],
    fetchConferenceCount: 0,
    isfetchLoading: false,

    getConferenceData: async (
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
            type: 'fetch',
        };



        try {
            const res = await telephonyaxios.post("/report/conference/fetch", payload);
            console.log(res);
            set({
                fetchConferenceData: res.data?.data?.records || [],
                fetchConferenceCount: res.data?.data?.totalRecordsCount || 0,
            });
        } catch (error) {
            console.error("Failed to fetch CDR data:", error);

            throw error;
        } finally {
            set({ isfetchLoading: false });
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
            type: 'export',
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
        const downloadUrl = `${base}/report/conference/fetch/export?${params.toString()}`;
        window.open(downloadUrl, "_blank");
    }
}));
