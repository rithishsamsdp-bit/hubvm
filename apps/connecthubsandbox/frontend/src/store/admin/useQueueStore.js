import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../../store/useToastStore.js";

export const useQueueStore = create((set) => ({
  queueGroupData: [],
  queuegroupTotalCount: 0,
  queueGroupLoading: false,
  allMemberList: [],
  allMemberListLoading: false,
  createQueueModalLoading: false,

  getQueuegroup: async (pageSize, offset, searchString, sortField, sortOrder) => {
    set({ queueGroupLoading: true });
    const data = {
      limit: pageSize,
      offset,
      searchString,
      sortField: sortField || "q_queuegroupStatus",
      sortOrder: sortOrder || "DESC",
    };
    try {
      const res = await telephonyaxios.post("/telephony/queuegroup/fetch", data);
      set({
        queueGroupData: res.data.data.totalRecords,
        queuegroupTotalCount: res.data.data.totalRecordsCount,
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
      set({ queueGroupLoading: false });
    }
  },

  getAllMember: async () => {
    set({ allMemberListLoading: true });
    try {
      const res = await telephonyaxios.get("/telephony/queuegroup/list/members");
      set({ allMemberList: res.data.data });
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
      set({ allMemberListLoading: false });
    }
  },

  createQueuegroup: async (formData) => {
    set({ createQueueModalLoading: true });
    const data = {
      queuegroupname: formData.name,
      memberids: formData.memberids,
      queuegroupstrategy: formData.strategy,
      queuegrouptimeout: parseInt(formData.timeout),
      memberextensions: formData.extension,
      agentwaittime: parseInt(formData.agentwaittime),
    };
    try {
      const res = await telephonyaxios.post("/telephony/queuegroup/create", data);
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
      set({ createQueueModalLoading: false });
    }
  },

  editQueuegroup: async (formData) => {
    set({ createQueueModalLoading: true });
    const data = {
      queuegroupid: formData.id,
      queuegroupname: formData.name,
      queuegroupstrategy: formData.strategy,
      queuegrouptimeout: parseInt(formData.timeout),
      memberids: formData.memberids,
      memberextensions: formData.extension,
      agentwaittime: parseInt(formData.agentwaittime),
    };
    try {
      const res = await telephonyaxios.post("/telephony/queuegroup/update", data);
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
      set({ createQueueModalLoading: false });
    }
  },

  deleteQueuegroup: async (id) => {
    set({ queueGroupLoading: true });
    const data = { queuegroupid: id };
    try {
      const res = await telephonyaxios.post("/telephony/queuegroup/delete", data);
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
      set({ queueGroupLoading: false });
    }
  },
}));