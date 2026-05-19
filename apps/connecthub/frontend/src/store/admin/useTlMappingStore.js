import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../../store/useToastStore.js";

export const useTlMappingStore = create((set) => ({
    totalTl: [],
    totalTlCount: 0,
    tlMappingLoading: false,
    allMemberList: [],
    allMemberListLoading: false,
    editTlMappingModalLoading: false,

    getTlMapping: async (pageSize, offset, searchString, sortField, sortOrder) => {
        set({ tlMappingLoading: true });
        const data = {
            limit: pageSize,
            offset,
            searchString,
            sortField: sortField || "m_createdOn",
            sortOrder: sortOrder || "DESC",
        };

        try {
            const res = await telephonyaxios.post("/telephony/tlmapping/select", data);
            set({
                totalTl: res.data.data,
                totalTlCount: res.data.recordsTotal,
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
            set({ tlMappingLoading: false });
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

    editTlMapping: async (formData) => {
        set({ editTlMappingModalLoading: true });
        const data = {
            tlmemberid: formData.tlmemberid,
            memberids: formData.memberids,
        };
        try {
            const res = await telephonyaxios.post("/telephony/tlmapping/map", data);
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
            set({ editTlMappingModalLoading: false });
        }
    },

}));