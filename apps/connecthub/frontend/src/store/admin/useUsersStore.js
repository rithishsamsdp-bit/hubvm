import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../../store/useToastStore.js";

export const useUsersStore = create((set) => ({
  userListData: [],
  userListDataCount: 0,
  isuserListDataLoading: false,

  getUsersList: async (
    pageSize,
    offset,
    sortField,
    sortOrder,
    searchString,
    roleFilter,
    memberMode,
    memberPlatform
  ) => {
    set({ isuserListDataLoading: true });

    const allowedSortFields = [
      "m_accountCode",
      "m_memberName",
      "m_memberPassword",
      "m_memberRole",
      "m_memberExtensionNo",
    ];
    const allowedSortOrders = ["ASC", "DESC"];

    const validatedSortField = allowedSortFields.includes(sortField)
      ? sortField
      : "m_memberName";
    const validatedSortOrder = allowedSortOrders.includes(sortOrder)
      ? sortOrder
      : "ASC";

    const data = {
      limit: pageSize,
      offset: offset,
      sortField: validatedSortField,
      sortOrder: validatedSortOrder,
      searchString: searchString || "",
      roleFilter: roleFilter || "",
      memberMode: memberMode || "",
      memberPlatform: memberPlatform || "",
      type: 'fetch'
    };

    console.log(data);
    try {
      const res = await telephonyaxios.post("/telephony/member/select", data);
      console.log(res.data);
      set({
        userListData: res.data.data || [],
        userListDataCount: res.data.recordsTotal || 0,
      });
      return res.data.data;
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to fetch users");
      set({ userListData: [], userListDataCount: 0 });
      return { userListData: [], userListDataCount: 0 };
    } finally {
      set({ isuserListDataLoading: false });
    }
  },

  isuserCreateLoading: false,
  createUser: async (userData) => {
    set({ isuserCreateLoading: true });
    console.log(userData);
    const data = { users: userData }
    try {
      const res = await telephonyaxios.post("/telephony/member/create", data);
      toast.success(res.data.message || "User created successfully");
      return res.data;
    } catch (error) {
      console.error("Failed to create user:", error);
      const message = error?.response?.data?.message || error?.message || "Failed to create user";
      toast.error(message);
      throw error;
    } finally {
      set({ isuserCreateLoading: false });
    }
  },

  isuserUpdateLoading: false,
  editUser: async (userData) => {
    set({ isuserUpdateLoading: true });
    try {
      console.log(userData);
      const res = await telephonyaxios.post("/telephony/member/update", userData);
      console.log(res.data);
      toast.success(res.data.message || "User updated successfully");
      return res.data;
    } catch (error) {
      console.error("Failed to update user:", error);
      const message = error?.response?.data?.message || error?.message || "Failed to update user";
      toast.error(message);
      throw error;
    } finally {
      set({ isuserUpdateLoading: false });
    }
  },

  deleteUser: async (id) => {
    set({ isuserListDataLoading: true });
    const data = { m_memberId: id };
    try {
      const res = await telephonyaxios.post("/telephony/member/delete", data);
      toast.success(res.data.message || "User deleted successfully");
      return res.data;
    } catch (error) {
      console.error("Failed to delete user:", error);
      const message = error?.response?.data?.message || error?.message || "Failed to delete user";
      toast.error(message);
      throw error;
    } finally {
      set({ isuserListDataLoading: false });
    }
  },

  uploadLoading: false,
  uploadFile: async (formData) => {
    set({ uploadLoading: true });
    try {
      const res = await telephonyaxios.post(
        "/telephony/member/createUserBulkCSV",
        formData
      );
      toast.success(res.data.message || "File uploaded successfully");
      return res.data;
    } catch (error) {
      console.error("Failed to upload user file:", error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Upload failed";
      toast.error(msg);
      throw new Error(msg);
    } finally {
      set({ uploadLoading: false });
    }
  },

  exportUsers: async (pageSize,
    offset,
    sortField,
    sortOrder,
    searchString,
    roleFilter,
    memberMode,
    memberPlatform) => {
    const allowedSortFields = [
      "m_accountCode",
      "m_memberName",
      "m_memberPassword",
      "m_memberRole",
      "m_memberExtensionNo",
    ];
    const allowedSortOrders = ["ASC", "DESC"];

    const validatedSortField = allowedSortFields.includes(sortField)
      ? sortField
      : "m_memberName";
    const validatedSortOrder = allowedSortOrders.includes(sortOrder)
      ? sortOrder
      : "ASC";

    const data = {
      limit: pageSize,
      offset: offset,
      sortField: validatedSortField,
      sortOrder: validatedSortOrder,
      searchString: searchString || "",
      roleFilter: roleFilter || "",
      memberMode: memberMode || "",
      memberPlatform: memberPlatform || "",
      type: 'export'
    };
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
    const downloadUrl = `${base}/telephony/member/select/export?${params.toString()}`;
    window.open(downloadUrl, "_blank");
  },

  editcallType: async (id, value) => {
    set({ isuserUpdateLoading: true });
    try {
      let data = {
        "m_memberId": id,
        "m_clicktocallType": value
      }
      console.log(data);
      const res = await telephonyaxios.post("/telephony/member/update/clicktocall", data);
      console.log(res.data);
      toast.success(res.data.message || "Call type updated successfully");
      return res.data;
    } catch (error) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Something went wrong";

      if (status) {
        toast.error(`Error ${status}: ${message}`);
      } else {
        toast.error(message);
      }
    } finally {
      set({ isuserUpdateLoading: false });
    }
  },

  update2FAStatus: async (id, value) => {
    set({ isuserUpdateLoading: true });
    try {
      let data = {
        "m_memberId": id,
        "m_member2FAStatus": value
      }
      const res = await telephonyaxios.post("/telephony/member/update/2fa/status", data);
      toast.success(res.data.message || `2FA ${value === "Active" ? "Enabled" : "Disabled"}`);
      return res.data;

    } catch (error) {
      const message = error?.response?.data?.message || "Failed to update 2FA status";
      toast.error(message);
    } finally {
      set({ isuserUpdateLoading: false });
    }
  }
}));
