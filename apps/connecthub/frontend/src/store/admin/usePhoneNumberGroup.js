import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../../store/useToastStore.js";

export const usePhoneNumberGroup = create((set) => ({

  phoneNumberGroupData: [],
  phoneNumberGroupCount: 0,
  phoneNumberGroupLoading: false,
  phoneNumberListLoading: false,
  phoneNumberList: [],
  PhoneNumberModalLoading: false,

  phoneNumberGroupfetch: async (pageSize, offset, searchString) => {
    set({ phoneNumberGroupLoading: true });
    let data = {
      "limit": pageSize,
      "offset": offset,
      "searchString": searchString,
    }
    try {
      const res = await telephonyaxios.post("/telephony/phonenumbergroup/fetch", data);
      set({ phoneNumberGroupData: res.data.data, phoneNumberGroupCount: res.data.recordsTotal });
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
      set({ phoneNumberGroupLoading: false });
    }
  },

  getCliID: async () => {
    set({ phoneNumberListLoading: true });
    try {
      const res = await telephonyaxios.post("/telephony/phonenumbergroup/fetchCliID");
      set({ phoneNumberList: res.data.data });
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
      set({ phoneNumberListLoading: false });
    }
  },

  createProcess: async (formdata) => {
    set({ PhoneNumberModalLoading: true });
    console.log(formdata)
    const data = {
      didGroupName: formdata.processName,
      cliID: (formdata.selectedCliIDs || []).map(Number),
      activeStatus: Number(formdata.status),
    }
    try {
      const res = await telephonyaxios.post("/telephony/phonenumbergroup/create", data);
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
      set({ PhoneNumberModalLoading: false });
    }
  },

  deleteProcess: async (id) => {
    set({ phoneNumberGroupLoading: true });
    try {
      const res = await telephonyaxios.post("/telephony/phonenumbergroup/delete", id);
      toast.success(res.data.message);
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
      set({ phoneNumberGroupLoading: false });
    }
  },

  editProcess: async (formdata) => {
    set({ PhoneNumberModalLoading: true });
    let data = {
      didnumberGroupId: formdata.id,
      didGroupName: formdata.processName,
      cliID: (formdata.selectedCliIDs || []).map(Number),
      activeStatus: Number(formdata.status),
    }
    try {
      const res = await telephonyaxios.post("/telephony/phonenumbergroup/update", data);
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
      set({ PhoneNumberModalLoading: false });
    }
  },
}));

