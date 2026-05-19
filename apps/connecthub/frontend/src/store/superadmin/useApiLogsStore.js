import { create } from "zustand";
import authaxios from "../../services/authaxios.js";

export const useApiLogsStore = create((set) => ({
  logs: [],
  totalCount: 0,
  isLoading: false,

  fetchLogs: async ({
    limit,
    offset,
    account_id,
    pod_name,
    method,
    status_code,
    start_date,
    end_date,
  }) => {
    set({ isLoading: true });

    const payload = { limit, offset };
    if (account_id) payload.account_id = Number(account_id);
    if (pod_name) payload.pod_name = pod_name;
    if (method) payload.method = method;
    if (status_code) payload.status_code = Number(status_code);
    if (start_date) payload.start_date = start_date;
    if (end_date) payload.end_date = end_date;

    try {
      const res = await authaxios.post("/auth/apilogs/fetch", payload);
      set({
        logs: res.data?.data?.totalRecords || [],
        totalCount: res.data?.data?.totalRecordsCount || 0,
        isLoading: false,
      });
    } catch (err) {
      console.error("API Logs fetch error:", err);
      set({ logs: [], totalCount: 0, isLoading: false });
    }
  },
}));
