import { create } from "zustand";
import telephonyaxios from "../../../services/reportsaxios.js";

export const useLoginLoutStore = create((set) => ({
    loginlogoutData: [],
    loginlogoutCount: 0,
    loginlogoutLoading: false,

    getloginlogout: async (pageSize, offset, searchString, startDate, endDate) => {
        set({ loginlogoutLoading: true });

        const data = {
            limit: pageSize,
            offset: offset,
            search: searchString,
            calldatestart: startDate,
            calldateend: endDate,
            type: 'fetch'
        }
        console.log(data);
        try {
            const res = await telephonyaxios.post("/report/login/fetch", data);
            console.log(res);
            set({
                loginlogoutData: res.data.data.totalRecords,
                loginlogoutCount: res.data.data.totalRecordsCount
            })
        } catch (error) {
            console.error("Failed to fetch loginlogout data:", error);

        } finally {
            set({ loginlogoutLoading: false });

        }
    },
    exportloginlogout: (pageSize, offset, searchString, startDate, endDate) => {
        const data = {
            limit: pageSize,
            offset: offset,
            search: searchString,
            calldatestart: startDate,
            calldateend: endDate,
            type: 'export'
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
        const downloadUrl = `${base}/report/login/fetch/export?${params.toString()}`;
        window.open(downloadUrl, "_blank");
    }
})) 