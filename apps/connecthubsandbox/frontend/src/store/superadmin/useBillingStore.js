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

    fetchCreditConf: async (accountId) => {
        set({ isCreditConfLoading: true });
        try {
            const res = await authaxios.get(`/billing/billconf/creditConf?accountId=${accountId}`);
            set({ creditConf: res.data });
        } catch (error) {
            console.error(error);
            set({ creditConf: null });
        } finally {
            set({ isCreditConfLoading: false });
        }
    },

    updateCreditConf: async (data) => {
        set({ isUpdating: true });
        try {
            await authaxios.post("/billing/billconf/creditConf", data);
            toast.success("Recharge success");
            return true;
        } catch (error) {
            toast.error("Failed");
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