import { create } from "zustand";
import reportsaxios from "../../../services/reportsaxios.js";
import { toast } from "../../../store/useToastStore.js";

export const useSmsDLRReportStore = create((set) => ({
    isFetchLoading: false,
    fetchSmsDLRData: [],
    fetchSmsDLRCount: 0,

    getSmsDLRData: async (
        pageSize,
        offset,
        sortField,
        sortOrder,
        searchString,
        status,
        direction,
        startDate,
        endDate
    ) => {
        set({ isFetchLoading: true });
        try {
            const data = {
                limit: pageSize,
                offset: offset,
                sortField: sortField,
                sortOrder: sortOrder,
                search: searchString,
                status: status,
                direction: direction,
                fromDate: startDate,
                toDate: endDate,
                channel: "SMS"
            };
            const res = await reportsaxios.post("/report/sms_dlr_report", data);
            set({
                fetchSmsDLRData: res.data?.data?.records || [],
                fetchSmsDLRCount: res.data?.data?.total || 0,
            });
        } catch (error) {
            const status = error?.response?.status;
            const message =
                error?.response?.data?.message ||
                "Something went wrong. Please try again later.";
            if (status) {
                toast.error(`Error ${status}: ${message}`);
            } else {
                toast.error(message);
            }
            set({ fetchSmsDLRData: [], fetchSmsDLRCount: 0 });
        } finally {
            set({ isFetchLoading: false });
        }
    },

    exportSmsDLR: async (
        pageSize,
        offset,
        sortField,
        sortOrder,
        searchString,
        status,
        direction,
        startDate,
        endDate
    ) => {
        try {
            const data = {
                limit: pageSize,
                offset: offset,
                sortField: sortField,
                sortOrder: sortOrder,
                search: searchString,
                status: status,
                direction: direction,
                fromDate: startDate,
                toDate: endDate,
                export: true,
                channel: "SMS"
            };
            const res = await reportsaxios.post("/report/sms_dlr_report", data, {
                responseType: "blob",
            });

            const blob = new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `SMS_DLR_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success("Report exported successfully");
        } catch (error) {
            const status = error?.response?.status;
            const message =
                error?.response?.data?.message ||
                "Failed to export report. Please try again.";
            if (status) {
                toast.error(`Error ${status}: ${message}`);
            } else {
                toast.error(message);
            }
        }
    },
}));
