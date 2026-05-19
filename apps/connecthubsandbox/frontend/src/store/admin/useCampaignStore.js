import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../../store/useToastStore.js";

export const useCampaignStore = create((set) => ({

    CampaignData: [],
    CampaignDataTotal: 0,
    CampaignTabelLoading: false,

    getMemberGroupsLoading: false,

    memberGroupData: [],

    getPhoneNumberGroupLoading: false,

    phoneNumberGroupData: [],

    getFromLoading: false,

    formDatas: [],

    createLoading: false,

    getEditDataLoading: false,

    editdata: [],

    editLoading: false,


    getCampaignData: async (pageSize, offset, searchString, sortField, sortOrder) => {
        set({ CampaignTabelLoading: true });
        const data = {
            limit: pageSize,
            offset: offset,
            searchString: searchString,
            sortField: sortField || "c_createdOn",
            sortOrder: sortOrder || "DESC",
        };
        try {
            const res = await telephonyaxios.post("/telephony/campaign/select", data);
            set({ CampaignData: res.data.data });
            console.log(res)
            set({ CampaignDataTotal: res.data.recordsTotal });
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
            set({ CampaignTabelLoading: false });
        }
    },

    getMemberGroups: async () => {
        set({ getMemberGroupsLoading: true });
        try {
            const res = await telephonyaxios.get("/telephony/campaign/list/membergroups");
            set({ memberGroupData: res.data.data });
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
            set({ getMemberGroupsLoading: false });
        }
    },

    getPhoneNumberGroup: async () => {
        set({ getPhoneNumberGroupLoading: true })
        try {
            const res = await telephonyaxios.post("/telephony/phonenumbergroup/fetch");
            set({ phoneNumberGroupData: res.data.data });
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
            set({ getPhoneNumberGroupLoading: false })

        }
    },

    getFrom: async () => {
        set({ getFromLoading: true })
        try {
            const res = await telephonyaxios.get("/telephony/campaign/list/form");
            set({ formDatas: res.data.data });
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
            set({ getFromLoading: false })
        }
    },

    createCampaign: async (formData) => {
        set({ createLoading: true })
        let data = {
            "campaignname": formData.Name,
            "membergroupids": formData.memberids,
            "cligroupId": formData.groupId,
            "formid": formData.formId,
            "dialerType": formData.dialerType,
            "campaignRules": formData.campaignRules
        }

        try {
            const res = await telephonyaxios.post("/telephony/campaign/create", data);
            console.log(res);
            toast.success(res.data.message)
            return res;
        } catch (error) {
            const status = error?.response?.status;
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.response?.data?.detail ||
                error?.message ||
                "Something went wrong";

            if (status) {
                toast.error(`Error ${status}: ${message}`);
            } else {
                toast.error(message);
            }

        } finally {
            set({ createLoading: false })
        }
    },

    deleteCampaign: async (id) => {
        set({ CampaignTabelLoading: true });
        let data = {
            campaignid: id,
        }
        try {
            const res = await telephonyaxios.post(`/telephony/campaign/delete`, data);
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
            set({ CampaignTabelLoading: false });
        }
    },

    getEditData: async (id) => {
        set({ getEditDataLoading: false });
        let data = {
            "campaignid": id
        }
        console.log(data)
        try {
            const res = await telephonyaxios.post(`/telephony/campaign/getedit`, data);
            console.log(res);
            set({ editdata: res.data.data[0] });
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
            set({ getEditDataLoading: false });
        }
    },

    submitedit: async (formData) => {
        set({ editLoading: true });
        let data = {
            "campaignid": formData.id,
            "campaignname": formData.Name,
            "membergroupids": formData.memberids,
            "cligroupId": formData.groupId,
            "formid": formData.formId,
            "dialerType": formData.dialerType,
            "campaignRules": formData.campaignRules
        }

        try {
            const res = await telephonyaxios.post("/telephony/campaign/update", data);
            console.log(res);
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
            set({ editLoading: false });
        }
    },

}));