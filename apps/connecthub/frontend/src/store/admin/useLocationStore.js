import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../../store/useToastStore.js";

export const useLocationStore = create((set) => ({
    totalLocation: [],
    totalLocationCount: 0,
    tlLocationLoading: false,
    allMemberList: [],
    allMemberListLoading: false,
    editLocationModalLoading: false,
    createLocationModalLoading: false,

    getLocation: async (pageSize, offset, searchString, sortField, sortOrder) => {
        set({ tlLocationLoading: true });
        const data = {
            limit: pageSize,
            offset,
            searchString,
            sortField: sortField || "l_locationName",
            sortOrder: sortOrder || "DESC",
        };

        try {
            const res = await telephonyaxios.post("/telephony/tlmapping/location/fetch", data);
            set({
                totalLocation: res.data.data.totalRecords,
                totalLocationCount: res.data.totalRecordsCount,
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
            set({ tlLocationLoading: false });
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

    createLocation: async (formData) => {
        set({ createLocationModalLoading: true });
        const data = {
            locationname: formData.locationname,
            memberids: formData.memberids,
        };
        try {
            const res = await telephonyaxios.post("/telephony/tlmapping/location/create", data);
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
            set({ createLocationModalLoading: false });
        }
    },

    editLocation: async (formData) => {
        set({ editLocationModalLoading: true });
        const data = {
            locationid: formData.locationid,
            locationname: formData.locationname,
            memberids: formData.memberids,
        };
        try {
            const res = await telephonyaxios.post("/telephony/tlmapping/location/update", data);
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
            set({ editLocationModalLoading: false });
        }
    },

    deleteLocation: async (locationid) => {
        set({ editLocationModalLoading: true });
        try {
            const res = await telephonyaxios.post("/telephony/tlmapping/location/delete", {
                locationid: locationid,
            });
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
            set({ editLocationModalLoading: false });
        }
    },

}));