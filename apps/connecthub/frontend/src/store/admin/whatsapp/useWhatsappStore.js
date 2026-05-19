import { create } from "zustand";
import whatsappaxios from "../../../services/whatsappaxios.js";
import { toast } from "../../../store/useToastStore.js";
export const useWhatsappStore = create((set) => ({
    getTemplatesLoading: false,
    templates: [],
    campaigns: [],
    totalCampaigns: 0,
    getCampaignsLoading: false,
    getCampaigns: async (pageSize, offset, searchString, sortField, sortOrder, startDate, endDate) => {
        set({ getCampaignsLoading: true });
        try {
            const res = await whatsappaxios.post("/whatsapp/fetch_campaign_report", {
                limit: pageSize,
                offset: offset,
                searchString: searchString,
                sortField: sortField,
                sortOrder: sortOrder,
                fromDate: startDate,
                toDate: endDate
            });
            if (res.data && res.data.data) {
                set({
                    campaigns: res.data.data.totalRecords || [],
                    totalCampaigns: res.data.data.totalRecordsCount || 0
                });
            }
        } catch (error) {
            console.error(error);
            const message = error?.response?.data?.message || "Failed to fetch campaigns";
            toast.error(message);
        } finally {
            set({ getCampaignsLoading: false });
        }
    },
    totalTemplates: 0,
    getTemplates: async (pageSize, offset, debouncedSearch, sortField, sortOrder, startDate,
        endDate) => {
        set({ getTemplatesLoading: true });
        let data = {
            limit: pageSize,
            offset: offset,
            searchString: debouncedSearch,
            sortField: sortField,
            sortOrder: sortOrder,
            fromDate: startDate,
            toDate: endDate
        };
        try {
            const res = await whatsappaxios.post("/whatsapp/fetch_whatsapp_template_report", data);
            // console.log(res);
            if (res.data && res.data.data) {
                set({
                    templates: res.data.data.totalRecords || [],
                    totalTemplates: res.data.data.totalRecordsCount || 0
                });
            }
        } catch (error) {
            const status = error?.response?.status;
            const message =
                error?.response?.data?.message ||
                "Something went wrong. Please try again later.";
            if (status) {
                toast.error(`Error ${status}: ${message}`);
            }
            else {
                toast.error(message);
            }
        } finally {
            set({ getTemplatesLoading: false });
        }
    },
    createTemplateLoading: false,
    createTemplate: async (templateData) => {
        console.log(templateData);
        set({ createTemplateLoading: true });
        const urlButtons = (templateData?.ctaButtons || []).filter((btn) => btn.action === "url");
        const callButtons = (templateData?.ctaButtons || []).filter(btn => btn.action === "call");
        const mediaType = templateData.mediaType === "image" ? "IMG" : templateData.mediaType === "video" ? "VIDEO" : templateData.mediaType === "document" ? "DOC" : "";
        const BtnType = templateData.buttonType === 'cta' ? 'CTA' : templateData.buttonType === 'quick' ? 'qr' : '';
        const formdata = new FormData();
        formdata.append("tempName", templateData.templateName || "");
        formdata.append("tempCategory", templateData.templateCategory || "");
        formdata.append("selectLan", "en_US");
        formdata.append("headerType", templateData.headerType || "");
        formdata.append("headerValue", templateData.headerTitle || "");
        formdata.append("mediaType", mediaType);
        formdata.append("mediaExtType", "");
        formdata.append("bodyContent", templateData.message || "");
        formdata.append("footerContent", templateData.footerText || "");
        formdata.append("btnType", BtnType);
        formdata.append("btnNameVm", urlButtons?.text || "");
        formdata.append("wUrl", urlButtons?.url || "");
        formdata.append("btnNameCpn", callButtons?.[0]?.text || "");
        formdata.append("phoneNum", callButtons?.[0]?.phones[0]?.number || "");
        formdata.append("Phone_Code", callButtons?.[0]?.phones[0]?.code || "");
        formdata.append("btn1", templateData.quickReplies[0]?.text || "");
        formdata.append("btn2", templateData.quickReplies[1]?.text || "");
        formdata.append("btn3", templateData.quickReplies[2]?.text || "");
        if (templateData?.mediaFile) {
            formdata.append("fileName", templateData.mediaFile.name);
            formdata.append("file", templateData.mediaFile, templateData.mediaFile.name);
        } else {
            formdata.append("fileName", "");
            formdata.append("file", new Blob([], { type: "application/octet-stream" }), "");
        }
        // console.log("📦 FormData values:");
        // for (let [key, value] of formdata.entries()) {
        //     console.log(`${key}:`, value);
        // }
        try {
            const res = await whatsappaxios.post("/whatsapp/create_whatsapp_template", formdata);
            console.log(res);
            toast.success(res.data.data.message || "Template created successfully");
            return res.data;
        } catch (error) {
            console.log(error)
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
        finally {
            set({ createTemplateLoading: false });
        }
    },


    sentWAMessageLoading: false,
    sentWAMessage: async (formData) => {
        set({ sentWAMessageLoading: true });


        try {
            const res = await whatsappaxios.post("/whatsapp/send_outbound_messages", formData);
            console.log(res);
            // toast.success(res.data.data.message || "Message sent successfully");
            return res.data;
        } catch (error) {
            console.log(error)
            const status = error?.response?.status;
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Something went wrong";
            if (status) {
                toast.error(`Error ${status}: ${message}`);
            }
            else {
                toast.error(message);
            }
        } finally {
            set({ sentWAMessageLoading: false });
        }
    },

    createCampaignLoading: false,
    createCampaign: async (campaignData) => {
        set({ createCampaignLoading: true });
        const formdata = new FormData();
        if (campaignData.file) {
            formdata.append("file", campaignData.file);
            formdata.append("fileName", campaignData.fileName || "sample data");
        }
        formdata.append("campaignName", campaignData.campaignName || "");
        formdata.append("campaignCategory", campaignData.campaignCategory || "");
        formdata.append("templateName", campaignData.templateName || "");
        formdata.append("templateId", campaignData.templateId || "");
        formdata.append("scheduleTime", campaignData.scheduleTime || "");
        formdata.append("duplicateRemovalStatus", campaignData.duplicateRemovalStatus || "No");
        formdata.append("audienceSource", campaignData.audienceSource || "file");
        if (campaignData.groupId) {
            formdata.append("groupId", campaignData.groupId);
        }

        // console.log("📦 Create Campaign Payload:");
        // for (let [key, value] of formdata.entries()) {
        //     console.log(`${key}:`, value);
        // }

        try {
            const res = await whatsappaxios.post("/whatsapp/create_campaign", formdata);
            // console.log(res);
            toast.success(res.data.message || "Campaign created successfully");
            return res.data;
        } catch (error) {
            console.log(error);
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
            return null; // Return null on error so component knows it failed
        } finally {
            set({ createCampaignLoading: false });
        }
    },

    dashboardStats: {
        counts: { totalRequest: 0, totalSent: 0, totalRead: 0, totalFailed: 0 },
        donutData: [],
        barData: []
    },
    getDashboardStatsLoading: false,
    getDashboardStats: async (startDate, endDate, campaignId, templateId) => {
        set({ getDashboardStatsLoading: true });
        try {
            const res = await whatsappaxios.post("/whatsapp/dashboard/stats", {
                startDate,
                endDate,
                campaignId,
                templateId
            });
            if (res.data && res.data.data) {
                set({ dashboardStats: res.data.data });
            }
        } catch (error) {
            console.error(error);
            const message = error?.response?.data?.message || "Failed to fetch dashboard stats";
            // Optional: toast.error(message); 
        } finally {
            set({ getDashboardStatsLoading: false });
        }
    },
    // Groups
    groups: [],
    totalGroups: 0,
    getGroupsLoading: false,
    createGroupLoading: false,
    deleteGroupLoading: false,
    getGroupContactsLoading: false,
    groupContacts: [],

    getGroups: async (limit, offset, search) => {
        set({ getGroupsLoading: true });
        try {
            const res = await whatsappaxios.get(`/whatsapp/group/list?limit=${limit}&offset=${offset}&search=${search}`);
            if (res.data) {
                set({
                    groups: res.data.groups || [],
                    totalGroups: res.data.total || 0
                });
            }
        } catch (error) {
            console.error("Error fetching groups:", error);
            toast.error("Failed to fetch groups");
        } finally {
            set({ getGroupsLoading: false });
        }
    },

    createGroup: async (formData) => {
        set({ createGroupLoading: true });
        try {
            await whatsappaxios.post("/whatsapp/group/create", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            toast.success("Group created successfully");
            return true;
        } catch (error) {
            console.error("Error creating group:", error);
            const msg = error.response?.data?.error || "Failed to create group";
            toast.error(msg);
            return false;
        } finally {
            set({ createGroupLoading: false });
        }
    },

    deleteGroup: async (groupId) => {
        set({ deleteGroupLoading: true });
        try {
            const res = await whatsappaxios.delete(`/whatsapp/group/delete?groupId=${groupId}`);
            if (res.status === 200) {
                toast.success("Group deleted successfully");
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error deleting group:", error);
            const msg = error.response?.data?.error || "Failed to delete group";
            toast.error(msg);
            return false;
        } finally {
            set({ deleteGroupLoading: false });
        }
    },

    getGroupContacts: async (groupId) => {
        set({ getGroupContactsLoading: true });
        try {
            const res = await whatsappaxios.get(`/whatsapp/group/contacts?groupId=${groupId}`);
            if (res.data && res.data.contacts) {
                set({ groupContacts: res.data.contacts });
                return res.data.contacts;
            }
            return [];
        } catch (error) {
            console.error("Error fetching group contacts:", error);
            toast.error("Failed to fetch group contacts");
            return [];
        } finally {
            set({ getGroupContactsLoading: false });
        }
    }
}));