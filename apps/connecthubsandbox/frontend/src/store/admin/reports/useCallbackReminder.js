import { create } from "zustand";
import conversationaxios from "../../../services/conversationaxios";

export const useCallbackReminder = create((set) => ({
    callbackReminderData: [],
    callbackReminderCount: 0,
    callbackReminderLoading: false,

    getCallbackReminder: async (pageSize, offset, searchString, sortField, sortOrder, startDate, endDate) => {
        set({ callbackReminderLoading: true });

        const data = {
            limit: pageSize,
            offset: offset,
            searchString: searchString,
            sortField: sortField || "",
            sortOrder: sortOrder || "DESC",
            calldatestart: startDate,
            calldateend: endDate
        };
        
        console.log("Callback Reminder Request:", data);
        
        try {
            const res = await conversationaxios.post("/agent/callbackreminder/fetch", data);
            console.log("Callback Reminder Response:", res);
            
            set({
                callbackReminderData: res.data.data.records,
                callbackReminderCount: res.data.data.totalRecords
            });
        } catch (error) {
            console.error("Failed to fetch callback reminder data:", error);
        } finally {
            set({ callbackReminderLoading: false });
        }
    }
}));