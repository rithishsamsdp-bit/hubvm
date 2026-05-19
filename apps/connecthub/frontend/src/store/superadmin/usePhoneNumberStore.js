import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../../store/useToastStore.js";

export const usePhoneNumberStore = create((set) => ({
  phoneNumberData: [],
  phoneNumberTotalCount: 0,
  phoneNumberLoading: false,
  allPeerList: [],
  allPeerListLoading: false,
  allAccountList: [],
  allAccountListLoading: false,
  modalLoading: false,
  uploadLoading: false,

  getCliNumber: async (
    pageSize,
    offset,
    searchString,
    sortField,
    sortOrder
  ) => {
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
      set({ phoneNumberData: res.data.data.totalRecords });
      set({ phoneNumberTotalCount: res.data.data.totalRecordsCount });
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

  getAllPeers: async () => {
    set({ allPeerListLoading: true });
    try {
      const res = await telephonyaxios.get("telephony/clinumber/list/peers");
      set({ allPeerList: res.data.data });
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
      set({ allPeerListLoading: false });
    }
  },

  getAllAccounts: async () => {
    set({ allAccountListLoading: true });
    try {
      const res = await telephonyaxios.get("telephony/clinumber/list/accounts");
      set({ allAccountList: res.data.data });
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
      set({ allAccountListLoading: false });
    }
  },

  createCliNumber: async (formData) => {
    set({ modalLoading: true });
    const data = {
      clinumbername: formData.number,
      clinumbertype: formData.type,
      clinumbercountrycode: formData.countryCode,
      clinumbercountryname: formData.countryName,
      clinumberstatus: formData.status,
      peerid: parseInt(formData.peerId),
      accountid: formData.accountId ? parseInt(formData.accountId) : null,
      accountno: formData.accountNo || null,
      accountprefix: formData.accountPrefix || null,
    };
    console.log(data);
    try {
      const res = await telephonyaxios.post(
        "/telephony/clinumber/create",
        data
      );
      toast.success(res.data?.success?.[0]?.message || "Operation completed successfully");
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

  editCliNumber: async ({ id, ...formData }) => {
    set({ modalLoading: true });
    const data = {
      clinumberid: id,
      clinumbername: formData.number,
      clinumbertype: formData.type,
      clinumbercountrycode: formData.countryCode,
      clinumbercountryname: formData.countryName,
      clinumberstatus: formData.status,
      peerid: parseInt(formData.peerId),
      accountid: formData.accountId ? parseInt(formData.accountId) : null,
      accountno: formData.accountNo || null,
      accountprefix: formData.accountPrefix || null,
    };
    try {
      const res = await telephonyaxios.post(
        "/telephony/clinumber/update",
        data
      );
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

  deleteCliNumber: async (id) => {
    set({ phoneNumberLoading: true });
    const data = {
      clinumberid: id,
    };
    try {
      const res = await telephonyaxios.post(
        "/telephony/clinumber/delete",
        data
      );
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
      set({ phoneNumberLoading: false });
    }
  },
  uploadFile: async (formData) => {
    set({ uploadLoading: true });
    try {
      const res = await telephonyaxios.post(
        "telephony/clinumber/bulkcreate",
        formData
      );
      return res.data; // let component use server message if needed
    } catch (error) {
      console.error("Failed to upload user file:", error);
      const msg =
        error?.response?.data?.message || error?.message || "Upload failed";
      throw new Error(msg);
    } finally {
      set({ uploadLoading: false });
    }
  },
}));
