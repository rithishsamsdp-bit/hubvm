import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../../store/useToastStore.js";

export const useMembergroupStore = create((set) => ({
    membergroupData: [],

    membergroupTotalCount: 0,

    membergroupTotalFilterCount: 0,

    isMembergroupLoading: false,

    getMembergroup: async (pageSize, offset, searchString, sortField, sortOrder) => {
        set({ isMembergroupLoading: true });
        let data = {
            "limit": pageSize,
            "offset": offset,
            "searchString": searchString,
            "sortField": sortField == null || sortField == "" ? "m_membergroupName" : sortField,
            "sortOrder": sortOrder == "" ? "DESC" : sortOrder,
        }
        try {
            const res = await telephonyaxios.post('/telephony/membergroup/fetch', data);
            console.log(res)
            set({ membergroupData: res.data.data.totalRecords });
            set({ membergroupTotalCount: res.data.data.totalRecordsCount });
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
            set({ isMembergroupLoading: false });
        }

    },

    allMemberList: [],

    allMemberListLoading: false,

    getAllMember: async () => {
        set({ allMemberListLoading: true });
        try {
            const res = await telephonyaxios.get('/telephony/membergroup/list/members');
            console.log(res.data.data);
            set({ allMemberList: res.data.data })
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
            set({ allMemberListLoading: false })
        }
    },

    createMemberGroupModalLoading: false,

    createMembergroup: async (formData) => {
        set({ createMemberGroupModalLoading: true });
        let data = {
            membergroupname: formData.name,
            memberids: formData.memberids,
        }
        console.log(data);
        try {
            const res = await telephonyaxios.post('/telephony/membergroup/create', data);
            console.log(res.data);
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
            set({ createMemberGroupModalLoading: false });
        }
    },


    editMembergroup: async (formData) => {
        set({ createMemberGroupModalLoading: true });
        let data = {
            membergroupid: formData.id,
            membergroupname: formData.name,
            memberids: formData.memberids,
        }
        console.log(data);
        try {
            const res = await telephonyaxios.post('/telephony/membergroup/update', data);
            console.log(res.data);
            toast.success(res.data.message)
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
            set({ createMemberGroupModalLoading: false });
        }
    },

    deleteMembergroup: async (id) => {
        set({ isMembergroupLoading: true });
        let data = {
            membergroupid: id,
        }
        try {
            const res = await telephonyaxios.post(`/telephony/membergroup/delete`, data);
            console.log(res.data);
            toast.success(res.data.message)
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
            set({ isMembergroupLoading: false });
        }
    },
}));