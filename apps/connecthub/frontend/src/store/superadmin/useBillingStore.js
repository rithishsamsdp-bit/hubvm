import { create } from "zustand";
import authaxios from "../../services/authaxios";
import { toast } from "../useToastStore";

export const useBillingStore = create((set, get) => ({
    customers: [],
    isCustomersLoading: false,
    rechargedCustomers: [],
    isRechargedCustomersLoading: false,
    creditConf: null,
    isCreditConfLoading: false,
    isUpdating: false,

    // Billing Dashboard
    billingDashboard: null,
    isBillingDashboardLoading: false,

    fetchBillingDashboard: async () => {
        set({ isBillingDashboardLoading: true });
        try {
            const res = await authaxios.get("/billing/billconf/billingDashboard_details");
            set({ billingDashboard: res.data });
        } catch (error) {
            console.error(error);
            set({ billingDashboard: null });
        } finally {
            set({ isBillingDashboardLoading: false });
        }
    },


    fetchCustomers: async () => {
        set({ isCustomersLoading: true });
        try {
            const res = await authaxios.get("/billing/billconf/accounts");
            set({ customers: Array.isArray(res.data) ? res.data : [] });
        } catch (error) {
            console.error(error);
            set({ customers: [] });
        } finally {
            set({ isCustomersLoading: false });
        }
    },

    fetchRechargedCustomers: async (payload = {}) => {
        set({ isRechargedCustomersLoading: true });
        try {
            const res = await authaxios.post("/billing/billconf/billingConf_list", payload);

            const list =
                res.data?.data?.data ||
                res.data?.data ||
                res.data ||
                [];

            set({ rechargedCustomers: list });
        } catch (error) {
            console.error(error);
            set({ rechargedCustomers: [] });
        } finally {
            set({ isRechargedCustomersLoading: false });
        }
    },


    createBillingConfig: async (data) => {
        set({ isUpdating: true });
        try {
            await authaxios.post("/billing/billconf/creditConf", data);
            toast.success("Configuration created successfully");
            return true;
        } catch (error) {
            console.error(error);
            toast.error("Failed to create configuration");
            return false;
        } finally {
            set({ isUpdating: false });
        }
    },

    updateBillingConfig: async (id, data) => {
        set({ isUpdating: true });
        try {
            await authaxios.post(`/billing/billconf/updateconfig/${id}`, data);
            toast.success("Configuration updated successfully");
            return true;
        } catch (error) {
            console.error(error);
            toast.error("Failed to update configuration");
            return false;
        } finally {
            set({ isUpdating: false });
        }
    },

    // 🔥 NEW (IMPORTANT)
    calculateRecharge: async (payload) => {
        set({ isUpdating: true });
        try {
            const res = await authaxios.post("/billing/billconf/recharge", payload);
            toast.success("Account recharged successfully!");
            return res.data;
        } catch (error) {
            console.error(error);
            toast.error("Recharge failed");
            return null;
        } finally {
            set({ isUpdating: false });
        }
    },

    rechargeHistory: [],
    rechargeHistoryTotal: 0,
    isRechargeHistoryLoading: false,

    fetchRechargeHistory: async (payload = {
        limit: 20,
        offset: 0,
        searchString: "",
        dateFrom: null,
        dateTo: null,
        sortField: "b_creditCreatedOn",
        sortOrder: "DESC"
    }) => {
        set({ isRechargeHistoryLoading: true });
        try {
            const res = await authaxios.post("/billing/billconf/select_recharge_history", payload);
            const list = res.data?.data?.data || res.data?.data || res.data || [];
            const total = res.data?.data?.totalCount || res.data?.totalCount || list.length;
            set({ rechargeHistory: list, rechargeHistoryTotal: total });
        } catch (error) {
            console.error(error);
            set({ rechargeHistory: [], rechargeHistoryTotal: 0 });
        } finally {
            set({ isRechargeHistoryLoading: false });
        }
    },

    callDeductHistory: [],
    callDeductHistoryTotal: 0,
    isCallDeductHistoryLoading: false,

    fetchCallDeductHistory: async (payload = {
        limit: 20,
        offset: 0,
        searchString: "",
        dateFrom: null,
        dateTo: null,
        sortField: "created_at",
        sortOrder: "DESC"
    }) => {
        set({ isCallDeductHistoryLoading: true });
        try {
            const res = await authaxios.post("/billing/billconf/select_calldeduct_history", payload);
            const list = res.data?.data || res.data?.records || res.data || [];
            const total = res.data?.recordsTotal || list.length;
            set({ callDeductHistory: list, callDeductHistoryTotal: total });
        } catch (error) {
            console.error(error);
            set({ callDeductHistory: [], callDeductHistoryTotal: 0 });
        } finally {
            set({ isCallDeductHistoryLoading: false });
        }
    },

    exportRechargeHistory: async () => {
        const { rechargeHistory } = get();
        if (!rechargeHistory || rechargeHistory.length === 0) {
            toast.error("No data to export");
            return;
        }

        try {
            const headers = [
                "Date", "Transaction ID", "Account", "Recharge Amt",
                "TDS %", "TDS Amt", "GST Amt", "Total", "Payment By", "Description"
            ];

            const rows = rechargeHistory.map(row => [
                row.b_creditCreatedOn,
                row.b_transaction_id || "-",
                row.b_creditAccountName,
                row.b_credit_balance,
                row.b_tds_percent,
                row.b_tds_amount,
                row.b_gst_amount,
                row.b_total_amount,
                row.b_paymentDoneBy || "Super Admin",
                row.b_creditDescription || "-"
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map(r => r.map(v => `"${v}"`).join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Recharge_History_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("History exported successfully");
        } catch (error) {
            console.error(error);
            toast.error("Export failed");
        }
    }
}));