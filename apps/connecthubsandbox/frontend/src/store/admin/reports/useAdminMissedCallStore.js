import { create } from "zustand";
import telephonyaxios from "../../../services/reportsaxios.js";

export const useAdminMissedCallStore = create((set) => ({
    fetchmissedcall: [],
    fetchCdrCount: 0,
    isfetchLoading: false,

    getmissedcall: async (
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
            calldatestart: startDate + ' 00:00:00',
            calldateend: endDate + ' 23:59:59',
            type: 'fetch'
        };

        try {
            const res = await telephonyaxios.post("/report/missedcalls/admin/fetch", payload);
            console.log(res.data);
            set({
                fetchmissedcall: res.data?.data?.totalRecords || [],
                fetchCdrCount: res.data?.data?.totalRecordsCount || 0,
                isfetchLoading: false,
            });
        } catch (error) {
            console.error("Failed to fetch missed call data:", error);
            set({
                fetchmissedcall: [],
                fetchCdrCount: 0,
                isfetchLoading: false,
            });
            throw error;
        }
    },

    exportmissedcall: async (
        pageSize,
        offset,
        searchString,
        startDate,
        endDate
    ) => {

        const payload = {
            limit: 100000,
            offset: 0,
            search: searchString,
            calldatestart: startDate + ' 00:00:00',
            calldateend: endDate + ' 23:59:59',
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
        const downloadUrl = `${base}/report/missedcalls/admin/fetch/export?${params.toString()}`;
        window.open(downloadUrl, "_blank");
    }
}));
