import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { devtools } from "zustand/middleware";
import apiaxios from "../../services/authaxios"; // Keep for other calls if needed
import whatsappaxios from "../../services/whatsappaxios"; // Import whatsappaxios
import { toast } from "../useToastStore.js";
export const useOnboard = create((set, get) => ({
  onboardData: [],
  onboardTotalCount: 0,
  isOnboardLoading: false,
  isWhatsAppLoading: false,
  modalLoading: false,
  companyUsers: [],
  companyUsersLoading: false,
  selectedCompanyId: null,
  selectedCompanyName: "",
  whatsAppAccounts: [], // New state for WhatsApp accounts

  getWhatsAppAccounts: async () => {
    set({ isWhatsAppLoading: true });
    try {
      const res = await whatsappaxios.post("/whatsapp/onboard/list", {
        limit: 1000,
        offset: 0,
        searchString: "",
        sortField: "w_createdOn",
        sortOrder: "DESC"
      });
      set({ whatsAppAccounts: res.data.data, isWhatsAppLoading: false });
    } catch (error) {
      console.error("Failed to fetch WhatsApp accounts", error);
      set({ isWhatsAppLoading: false });
      toast.error("Failed to fetch WhatsApp accounts");
    }
  },

  createWhatsAppAccount: async (data) => {
    set({ modalLoading: true });
    // Transform data to match backend DTO
    const payload = {
      w_accountId: data.w_accountId,
      w_whatsappNumber: data.w_whatsappNumber,
      w_phNumberId: data.w_phNumberId,
      w_apiKey: data.w_apiKey,
      w_wabaID: data.w_wabaID,
      w_amountDeduction: {
        service: data.service,
        utility: data.utility,
        marketing: data.marketing
      }
    };

    try {
      await whatsappaxios.post("/whatsapp/onboard/create", payload);
      toast.success("WhatsApp Account Created Successfully");
      set({ modalLoading: false });
      get().getWhatsAppAccounts(); // Refresh list
    } catch (error) {
      console.error("Failed to create WhatsApp account", error);
      set({ modalLoading: false });
      toast.error(error?.response?.data?.message || "Failed to create WhatsApp account");
    }
  },

  updateWhatsAppAccount: async (data) => {
    set({ modalLoading: true });
    // Transform data to match backend DTO
    const payload = {
      w_whatsappAccountId: data.w_whatsappAccountId, // Required for update
      w_accountId: data.w_accountId,
      w_whatsappNumber: data.w_whatsappNumber,
      w_phNumberId: data.w_phNumberId,
      w_apiKey: data.w_apiKey,
      w_wabaID: data.w_wabaID,
      w_amountDeduction: {
        service: data.service,
        utility: data.utility,
        marketing: data.marketing
      }
    };

    try {
      await whatsappaxios.put("/whatsapp/onboard/update", payload);
      toast.success("WhatsApp Account Updated Successfully");
      set({ modalLoading: false });
      get().getWhatsAppAccounts(); // Refresh list
    } catch (error) {
      console.error("Failed to update WhatsApp account", error);
      set({ modalLoading: false });
      toast.error(error?.response?.data?.message || "Failed to update WhatsApp account");
    }
  },


  getOnboard: async (pageSize, offset, sortField, sortOrder, searchString) => {
    set({ isOnboardLoading: true });
    const data =
    {
      limit: pageSize,
      offset: offset,
      sortField: sortField || "a_accountName",
      sortOrder: sortOrder || "DESC",
      searchString: searchString,
    };

    try {
      const res = await apiaxios.post("/onboarding/fetch", data);
      set({
        onboardData: res.data.data.totalRecords,
        onboardTotalCount: res.data.data.totalRecordsCount,
      });
      console.log(res);
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
      set({ isOnboardLoading: false });
    }
  },

  createOnboard: async (formdata) => {
    set({ modalLoading: true });
    const data = {
      accountname: formdata.custName,
      accountcode: formdata.acccode,
      salesrepname: formdata.salepersonname,
      accountcontactno: formdata.contact,
      accountmailid: formdata.mailid,
      accountdomainid: "",
      accountbusinessvertical: formdata.businessvertical,
      planname: formdata.plan,
      accountserviceregion: formdata.serviceRegion,
      accounttimezone: formdata.timezone
    }

    try {
      const res = await apiaxios.post("/onboarding/create", data);
      toast.success(res.data.message);
      return res;
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
      set({ modalLoading: false });
    }
  },
  getSelectLoading: false,

  getSelectedData: {},

  getSelectedid: async (id) => {
    set({ getSelectLoading: true });
    let data = {
      accountid: id
    }
    try {
      const res = await apiaxios.post(`/onboarding/accountdetails`, data);
      set({ getSelectedData: res.data.data });
      return res;
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
      set({ getSelectLoading: false });
    }
  },

  updateAccountField: (key, value) => {
    const prev = get().getSelectedData;
    set({
      getSelectedData: {
        ...prev,
        [key]: value,
      },
    });
  },

  updateFeature: (key, value) => {
    const prev = get().getSelectedData;

    if (!prev || typeof prev !== "object") return;

    // safely update nested structure
    set({
      getSelectedData: {
        ...prev,
        planDetails: {
          ...prev.planDetails,
          limits: {
            ...prev.planDetails?.limits,
            features: {
              ...prev.planDetails?.limits?.features,
              [key]: value,
            },
          },
        },
      },
    });
  },

  updateMenu: (name, value, role) => {
    const prev = get().getSelectedData;
    console.log(name, value, role);
    set({
      getSelectedData: {
        ...prev,
        planDetails: {
          ...prev.planDetails,
          roles: {
            ...prev.planDetails?.roles,
            [role]: {
              ...prev.planDetails?.roles?.[role],
              menu: {
                ...prev.planDetails?.roles?.[role]?.menu,
                [name]: value,
              },
            },
          },
        }
      }
    })
  },

  updatePermission: (role, resource, key, value) => {
    const prev = get().getSelectedData;
    set({
      getSelectedData: {
        ...prev,
        planDetails: {
          ...prev.planDetails,
          roles: {
            ...prev.planDetails?.roles,
            [role]: {
              ...prev.planDetails?.roles?.[role],
              permissions: {
                ...prev.planDetails?.roles?.[role]?.permissions,
                [resource]: {
                  ...prev.planDetails?.roles?.[role]?.permissions?.[resource],
                  [key]: value
                }
              }
            }
          }
        }
      }
    });
  },

  updateContactBook: (role, key, value) => {
    const prev = get().getSelectedData;
    set({
      getSelectedData: {
        ...prev,
        planDetails: {
          ...prev.planDetails,
          roles: {
            ...prev.planDetails?.roles,
            [role]: {
              ...prev.planDetails?.roles?.[role],
              contactbook: {
                ...prev.planDetails?.roles?.[role]?.contactbook,
                [key]: value
              }
            }
          }
        }
      }
    });
  },

  updateConversation: (role, key, value) => {
    const prev = get().getSelectedData;
    set({
      getSelectedData: {
        ...prev,
        planDetails: {
          ...prev.planDetails,
          roles: {
            ...prev.planDetails?.roles,
            [role]: {
              ...prev.planDetails?.roles?.[role],
              options: {
                ...prev.planDetails?.roles?.[role]?.options,
                conversation: {
                  ...prev.planDetails?.roles?.[role]?.options?.conversation,
                  [key]: value
                }
              }
            }
          }
        }
      }
    });
  },

  submitPlanDetails: async () => {
    set({ getSelectLoading: true });
    // Clone the data to avoid mutating the store state
    const data = { ...get().getSelectedData };

    // Ensure accounttimezone is populated
    data.accounttimezone = data.accounttimezone || data.accountTimeZone || "";

    // Strictly remove CamelCase field
    delete data.accountTimeZone;

    console.log("Submitting data (Backend skipped):", data);
    try {
      const res = await apiaxios.post(`/onboarding/updateaccountdetails`, data);
      // const res = { data: { message: "Account Details Updated Successfully (Backend Skipped)" } };
      toast.success(res.data?.data?.message || res.data?.message || "Account Details Updated Successfully");
      console.log(res);
      return res;
    } catch (error) {
      console.log(error)
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
      set({ getSelectLoading: false });
    }


  },
  validateAccountCode: async (code) => {
    try {
      const res = await apiaxios.post("/onboarding/validate", {
        accountcode: code,
        accountname: ""
      });
      return res.data.exists;
    } catch (err) {
      console.error("Validation error:", err);
      return false;
    }
  },
  getCompanyUsers: async (accountId, accountName, pageSize = 10, offset = 0, sortField = "", sortOrder = "", searchString = "") => {
    set({ companyUsersLoading: true, selectedCompanyId: accountId, selectedCompanyName: accountName });
    const data = {
      accountid: accountId,
      limit: pageSize,
      offset: offset,
      sortField: sortField || "m_createdOn",
      sortOrder: sortOrder || "DESC",
      searchString: searchString
    };

    try {
      const res = await apiaxios.post("/onboarding/companyusers", data);
      set({
        companyUsers: res.data.data.users || [],
        companyUsersTotalCount: res.data.data.totalCount || 0,
      });
      console.log(res);
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
      set({ companyUsers: [], companyUsersTotalCount: 0 });
    } finally {
      set({ companyUsersLoading: false });
    }
  },

  clearCompanyUsers: () => {
    set({ companyUsers: [], selectedCompanyId: null, selectedCompanyName: "" });
  }

}));
