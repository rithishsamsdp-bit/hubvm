import { create } from "zustand";
import whatsappaxios from "../../../services/whatsappaxios.js";
import { toast } from "../../../store/useToastStore.js";

export const useDLRReportStore = create((set) => ({
    isFetchLoading: false,
    fetchDLRData: [],
    fetchDLRCount: 0,

    getDLRData: async (
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
            };
            const res = await whatsappaxios.post("/whatsapp/dlr_report", data);
            set({
                fetchDLRData: res.data?.data?.records || [],
                fetchDLRCount: res.data?.data?.total || 0,
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
            set({ fetchDLRData: [], fetchDLRCount: 0 });
        } finally {
            set({ isFetchLoading: false });
        }
    },

    exportDLR: async (
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
            };
            const res = await whatsappaxios.post("/whatsapp/dlr_report", data, {
                responseType: "blob",
            });

            const blob = new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `DLR_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
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
