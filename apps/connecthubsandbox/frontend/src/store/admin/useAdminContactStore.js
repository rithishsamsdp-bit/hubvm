import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../useToastStore.js";

export const useAdminContactStore = create((set) => ({
    contactData: [],
    contactTotalCount: 0,
    contactTotalFilterCount: 0,
    isContactLoading: false,
    contactCreationLoading: false,
    conversationChat: [],
    chatLoading: false,

    getContact: async (
        pageSize,
        offset,
        sortField,
        sortOrder,
        searchString,
        selectedChar
    ) => {
        set({ isContactLoading: true });
        let data = {
            limit: pageSize,
            offset: offset,
            searchString: searchString,
            sortString: selectedChar,
            sortField:
                sortField == null || sortField == "" ? "c_createdOn" : sortField,
            sortOrder: sortOrder == "" ? "DESC" : sortOrder,
        };


        try {
            const res = await telephonyaxios.post("/telephony/contact/admin/select", data);
            set({ contactData: res.data.data });
            set({ contactTotalCount: res.data.recordsTotal });
            set({ contactTotalFilterCount: res.data.recordsFiltered });
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
            set({ isContactLoading: false });
        }
    },
    createContact: async (formData) => {
        set({ contactCreationLoading: true });
        let data = {
            c_Name: formData.name,
            c_phoneNumber: formData.phone,
            c_mailId: formData.email,
            c_organizationName: formData.organization,
            c_address: formData.address,
            c_countryCode: formData.countryCode,
        };
        try {
            const res = await telephonyaxios.post("/telephony/contact/admin/create", data);
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
            set({ contactCreationLoading: false });
        }
    },
    editContact: async (formData) => {
        set({ contactCreationLoading: true });
        let data = {
            c_Id: `${formData.id}`,
            c_Name: formData.name,
            c_phoneNumber: formData.phone,
            c_mailId: formData.email,
            c_organizationName: formData.organization,
            c_countryCode: formData.countryCode,
            c_address: formData.address,
        };
        try {
            const res = await telephonyaxios.post("/telephony/contact/admin/update", data);
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
            set({ contactCreationLoading: false });
        }
    },
    deleteContact: async (id) => {
        set({ isContactLoading: true });
        let data = {
            c_Id: `${id}`,
        };
        try {
            const res = await telephonyaxios.post(`/telephony/contact/admin/delete`, data);
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
            set({ isContactLoading: false });
        }
    },
    getChatHistory: async (datas) => {
        set({ chatLoading: true });
        const data = {
            phoneno: datas.c_phoneNumber,
            countrycode: datas.c_countryCode,
        };
        try {
            // Reuse existing generic history endpoint which works for account-wide history
            const res = await telephonyaxios.post("/telephony/contact/history", data);
            set({ conversationChat: res.data.data });
        } catch (error) {
            // Suppress history not found error or handle gracefully? 
            // Original store just toasts error.
            const status = error?.response?.status;
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Something went wrong";

            if (status) {
                if (status !== 200) toast.error(`Error ${status}: ${message}`); // Status 200 sometimes has "history not found" in body? service raises 200 with detail "Not Found"?
            } else {
                toast.error(message);
            }

        } finally {
            set({ chatLoading: false });
        }
    },
}));
