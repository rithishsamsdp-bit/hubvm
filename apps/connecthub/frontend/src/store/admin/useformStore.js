import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../useToastStore.js";

export const useformStore = create((set) => ({
  formListData: [],
  formListCount: 0,
  isFormLoading: false,

  getFormList: async ({ pageSize, offset, sortField, sortOrder, searchString }) => {
    set({ isFormLoading: true });

    const data = {
      limit: pageSize,
      offset,
      sortField,
      sortOrder,
      searchString: searchString || "",
    };

    try {
      const res = await telephonyaxios.post("/telephony/formbuilder/select", data);
      set({
        formListData: res.data?.data || [],
        formListCount: res.data?.totalCount || 0,

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
      set({ isFormLoading: false });
    }
  },

  createnewform: async (formData) => {
    try {
      const res = await telephonyaxios.post("/telephony/formbuilder/create", formData);
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
    } 
  },

  deleteForm: async (formId) => {
    set({ isFormLoading: true });
    const data = { f_formId: formId };
    try {
      const res = await telephonyaxios.post("/telephony/formbuilder/delete", data);
      set((state) => ({
        formListData: state.formListData.filter(form => form.f_formId !== formId),
        formListCount: state.formListCount - 1
      }));
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
      set({ isFormLoading: false });
    }
  },
}));