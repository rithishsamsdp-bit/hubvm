import { create } from "zustand";
import telephonyaxios from "../../../services/reportsaxios.js";

export const useVoiceMail = create((set) => ({
    voiceMailData: [],
    voiceMailCount: 0,
    voiceMailLoading: false,

    getVoiceMail: async (pageSize, offset, searchString, startDate, endDate) => {
        set({ voiceMailLoading: true });

        const data = {
            limit: pageSize,
            offset: offset,
            search: searchString,
            sortField:"c_callDateTime",
            sortOrder:"DESC",
            calldatestart: startDate,
            calldateend: endDate
        };
        try {
            const res = await telephonyaxios.post("/report/voicemail/agent/fetch", data);
            set({
                voiceMailData: res.data.data.totalRecords,
                voiceMailCount: res.data.data.totalRecordsCount
            })
        } catch (error) {
            console.error("Failed to fetch loginlogout data:", error);
        } finally {
            set({ voiceMailLoading: false });
        }
    }
})) 