import { create } from "zustand";
import telephonyaxios from "../../../services/reportsaxios.js";

export const useEmailAutomationStore = create((set) => ({
  emailAutomations: [],
  totalCount: 0,
  isLoading: false,
  isCreating: false,
  isDeleting: false,
  isUpdating: false,

  // Fetch email automations
  fetchEmailAutomations: async (limit = 10, offset = 0, showLoading = true) => {
    if (showLoading) set({ isLoading: true });

    const payload = {
      limit: limit,
      offset: offset,
    };

    try {
      const res = await telephonyaxios.post("/report/mail/automation/fetch", payload);
      console.log("Email Automations:", res.data);
      set({
        emailAutomations: res.data?.data?.data || [],
        totalCount: res.data?.data?.totalRecordsCount || 0,
        isLoading: false,
      });
      return res.data;
    } catch (error) {
      console.error("Failed to fetch email automations:", error);
      set({
        emailAutomations: [],
        totalCount: 0,
        isLoading: false,
      });
      throw error;
    }
  },

  // Create email automation
  createEmailAutomation: async (automationData) => {
    set({ isCreating: true });

    const payload = {
      name: automationData.name,
      reportName: automationData.reportName,
      schedule: automationData.schedule,
      time: automationData.time,
      day: automationData.day || "",
      dataRange: automationData.dataRange || "",
      toEmail: automationData.toEmail,
      ccEmail: automationData.ccEmail || [],
      extensionFilter: automationData.extensionFilter || [],
      timezoneFilter: automationData.timezoneFilter || "",
      fieldsFilter: automationData.fieldsFilter || [],
    };

    try {
      const res = await telephonyaxios.post("/report/mail/automation/create", payload);
      console.log("Email Automation Created:", res.data);
      set({ isCreating: false });
      return res;
    } catch (error) {
      console.error("Failed to create email automation:", error);
      set({ isCreating: false });
      throw error;
    }
  },

  // Delete email automation
  deleteEmailAutomation: async (ma_id) => {
    set({ isDeleting: true });

    try {
      const res = await telephonyaxios.delete(`/report/mail/automation/delete/${ma_id}`);
      console.log("Email Automation Deleted:", res.data);

      set((state) => ({
        emailAutomations: state.emailAutomations.filter((item) => item.ma_id !== ma_id),
        totalCount: Math.max(0, state.totalCount - 1),
        isDeleting: false,
      }));

      return res;
    } catch (error) {
      console.error("Failed to delete email automation:", error);
      set({ isDeleting: false });
      throw error;
    }
  },

  // Update email automation
  updateEmailAutomation: async (ma_id, automationData) => {
    set({ isUpdating: true });

    const payload = {
      name: automationData.name,
      reportName: automationData.reportName,
      schedule: automationData.schedule,
      time: automationData.time,
      day: automationData.day || "",
      dataRange: automationData.dataRange || "",
      toEmail: automationData.toEmail,
      ccEmail: automationData.ccEmail || [],
      extensionFilter: automationData.extensionFilter || [],
      timezoneFilter: automationData.timezoneFilter || "",
      fieldsFilter: automationData.fieldsFilter || [],
      status: automationData.status || "ACTIVE"
    };

    try {
      const res = await telephonyaxios.put(`/report/mail/automation/update/${ma_id}`, payload);
      console.log("Email Automation Updated:", res.data);

      set((state) => ({
        emailAutomations: state.emailAutomations.map((item) =>
          item.ma_id === ma_id
            ? {
              ...item,
              ma_name: automationData.name,
              ma_reportName: automationData.reportName,
              ma_schedule: automationData.schedule,
              ma_time: automationData.time,
              ma_day: automationData.day || "",
              ma_dataRange: automationData.dataRange || "",
              ma_toEmail: automationData.toEmail,
              ma_ccEmail: automationData.ccEmail || [],
              ma_extensionFilter: automationData.extensionFilter || [],
              ma_timezoneFilter: automationData.timezoneFilter || "",
              ma_fieldsFilter: automationData.fieldsFilter || [],
              ma_status: automationData.status || "ACTIVE"
            }
            : item
        ),
        isUpdating: false,
      }));

      return res;
    } catch (error) {
      console.error("Failed to update email automation:", error);
      set({ isUpdating: false });
      throw error;
    }
  },

  // Toggle email automation status
  toggleEmailAutomationStatus: async (ma_id) => {
    try {
      const res = await telephonyaxios.patch(`/report/mail/automation/toggle-status/${ma_id}`);
      console.log("Email Automation Status Toggled:", res.data);

      set((state) => ({
        emailAutomations: state.emailAutomations.map((item) =>
          item.ma_id === ma_id
            ? { ...item, ma_status: res.data.status || item.ma_status }
            : item
        ),
      }));

      return res;
    } catch (error) {
      console.error("Failed to toggle email automation status:", error);
      throw error;
    }
  },
}));