import { create } from "zustand";
import telephonyaxios from "../../../services/reportsaxios.js";

export const usePerformanceStore = create((set) => ({
    performanceData: [],
    performanceCount: 0,
    performanceLoading: false,

    getperformance: async (pageSize,
        offset, searchString, startDate,
        endDate) => {
        set({ performanceLoading: true });

        const data = {
            limit: pageSize,
            offset: offset,
            search: searchString,
            calldatestart: startDate,
            calldateend: endDate
        }

        try {
            const res = await telephonyaxios.post("/report/productionreport/fetch", data);
            console.log(res);
            set({
                performanceData: res.data.data.totalRecords,
                performanceCount: res.data.data.totalRecordsCount
            })
        } catch (error) {
            console.error("Failed to fetch Performance data:", error);

        } finally {
            set({ performanceLoading: false });

        }
    },

    exportperformance: (pageSize, offset, searchString, startDate, endDate) => {
        const data = {
            limit: pageSize,
            offset: offset,
            search: searchString,
            calldatestart: startDate,
            calldateend: endDate,
            type:'export'
        }
        const params = new URLSearchParams();
        Object.entries(data).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            if (Array.isArray(value)) {
                value.forEach(v => params.append(key, String(v)));
            } else {
                params.append(key, String(value));
            }
        });
        const base = (telephonyaxios?.defaults && telephonyaxios.defaults.baseURL) || import.meta.env.VITE_API_BASE || "";
        console.log(base);
        const downloadUrl = `${base}/report/productionreport/fetch/export?${params.toString()}`;
        window.open(downloadUrl, "_blank");
    }
})) 