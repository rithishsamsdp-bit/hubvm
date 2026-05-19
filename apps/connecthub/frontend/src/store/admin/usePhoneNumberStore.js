import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../../store/useToastStore.js";

export const usePhoneNumberStore = create((set) => ({
  phoneNumberData: [],
  phoneNumberTotalCount: 0,
  phoneNumberLoading: false,
  editIdLoading: false,
  editIdData: {},
  callFlowLoading: false,
  callFlowData: [],
  agentsLoading: false,
  agentsData: [],
  locationsData: [],
  locationsLoading: false,


  getCliNumber: async (pageSize, offset, searchString, sortField, sortOrder) => {
    set({ phoneNumberLoading: true });
    const data = {
      limit: pageSize,
      offset: offset,
      searchString: searchString,
      sortField: sortField || "c_clinumberName",
      sortOrder: sortOrder || "DESC",
    };
    try {
      const res = await telephonyaxios.post("telephony/clinumber/fetch", data);
      set({
        phoneNumberData: res.data.data.totalRecords,
        phoneNumberTotalCount: res.data.data.totalRecordsCount,
      });
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
      set({ phoneNumberLoading: false });
    }
  },

  editCliNumber: async (formData) => {
    set({ editIdLoading: true });
    // Parse JSON safely
    const parseJson = (str) => {
      try {
        return str ? JSON.parse(str) : {};
      } catch (e) {
        toast.error("Invalid JSON in API Body");
        return {};
      }
    };

    const data = {
      clinumberid: formData.id,
      clinumbername: formData.clinumbername,
      clinumbermapname: formData.skillname,
      callflowid: formData.callflow,
      callflowname: formData.callflowName,
      locationid: formData.locationid || null,
      memberids: formData.agent,
      smsmembers: formData.inboundSmsAgent,
      smsmode: formData.smsMode,
      apiIntegration: formData.apiIntegration || (formData.api ? "Enable" : "Disable"),
      apis: formData.apis || [],
    };
    console.log("formData", formData);
    console.log("data", data);
    try {
      const res = await telephonyaxios.post("/telephony/clinumber/map", data);
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
      set({ editIdLoading: false });
    }
  },


  deleteCliNumber: async (id) => {
    set({ phoneNumberLoading: true });
    const data = {
      clinumberid: id,
    };
    try {
      const res = await telephonyaxios.post("/telephony/clinumber/delete", data);
      toast.success(res.data.message)
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
      set({ phoneNumberLoading: false });
    }
  },

  getEditIdData: async (id) => {
    set({ editIdLoading: true })
    const data = {
      clinumberid: id
    }
    try {
      const res = await telephonyaxios.post("/telephony/clinumber/get/clinumber", data);
      set({ editIdData: res.data.data[0] })
      return res
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
      set({ editIdLoading: false })
    }
  },

  getCallFlows: async () => {
    set({ callFlowLoading: true });
    try {
      const res = await telephonyaxios.get("/telephony/clinumber/list/callflows");
      set({ callFlowData: res.data.data })
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
      set({ callFlowLoading: false });
    }
  },

  getAgents: async () => {
    set({ agentsLoading: true });
    try {
      const res = await telephonyaxios.get("/telephony/clinumber/list/members");
      set({ agentsData: res.data.data })
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
      set({ agentsLoading: false });
    }
  },

  getLocations: async () => {
    set({ locationsLoading: true });
    try {
      const res = await telephonyaxios.get("/telephony/list/locations");
      set({ locationsData: res.data.data || [] });
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
      set({ locationsLoading: false });
    }
  },

  queueLoading: false,

  queueData: [],
  getQueue: async () => {
    set({ queueLoading: true });
    try {
      const res = await telephonyaxios.get("/telephony/list/queuegroups");
      console.log(res)
      set({ queueData: res.data.data })
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
      set({ queueLoading: false });
    }
  },

    NumberLoading: false,
  NumberData: [],
  getNumber: async () => {
    set({ NumberLoading: true });
    try {
      const res = await telephonyaxios.get("telephony/clinumber/list/phonenumbers");
      console.log(res)
      set({
        NumberData: res.data.data.totalRecords,
      });
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
      set({ NumberLoading: false });
    }
  },

  executionEventsData: [],
  executionEventsLoading: false,

  getExecutionEvents: async () => {
    set({ executionEventsLoading: true });
    try {
      let data = {
        "executioneventType": "CallEvents-CLINumber"
      }
      const res = await telephonyaxios.post(
        "/telephony/list/externalintegrationapi/executionevents",data );
      set({ executionEventsData: res.data.data || [] });
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
      set({ executionEventsLoading: false });
    }
  },

  apisData: [],
  apisLoading: false,

  getApis: async () => {
    set({ apisLoading: true });
    // Dummy data as requested
    const dummyData = [
      {
        apiId: 1,
        apiName: "Zoho CRM Lead Creation",
        apiURL: "https://www.zohoapis.com/crm/v2/Leads",
        method: "POST",
        headers: {
          "Authorization": "Zoho-oauthtoken 1000.xxxx",
          "Content-Type": "application/json"
        },
        jsonBody: {
          "data": [
            {
              "Last_Name": "Test User",
              "Phone": "9876543210"
            }
          ]
        }
      },
      {
        apiId: 2,
        apiName: "Slack Notification",
        apiURL: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        jsonBody: {
          "text": "New incoming call received!"
        }
      }
    ];

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ apisData: dummyData });
    } catch (error) {
       console.error("Error fetching APIs:", error);
       toast.error("Failed to load APIs");
    } finally {
      set({ apisLoading: false });
    }
  },

}));