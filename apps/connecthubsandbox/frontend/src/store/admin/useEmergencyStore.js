import { create } from "zustand";
import whatsappaxios from "../../services/whatsappaxios.js";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../useToastStore.js";

export const useEmergencyStore = create((set, get) => ({
    templates: [],
    groups: [],
    alerts: [],
    callFlows: [],
    cliNumbers: [],
    isLoadingTemplates: false,
    isLoadingGroups: false,
    isLoadingAlerts: false,
    isLoadingCallFlows: false,
    isLoadingCliNumbers: false,
    smsTemplates: [],
    isLoadingSmsTemplates: false,
    allLogs: [],
    allLogsCount: 0,
    isAllReportsLoading: false,
    dashboardStats: null,
    dashboardKpis: null,
    dashboardMissions: [],
    dashboardCharts: null,
    dashboardResponses: null,
    isLoadingKpis: false,
    isLoadingMissions: false,
    isLoadingCharts: false,
    isLoadingResponses: false,
    responseMembers: [],
    isFetchingResponseMembers: false,

    fetchCliNumbers: async () => {
        set({ isLoadingCliNumbers: true });
        try {
            const response = await telephonyaxios.post('/telephony/clinumber/fetch', {
                limit: 100,
                offset: 0,
                searchString: "",
                sortField: "c_clinumberName",
                sortOrder: "ASC"
            });
            if (response.data?.data?.totalRecords) {
                set({ cliNumbers: response.data.data.totalRecords });
            }
        } catch (error) {
            console.error("Error fetching CLI numbers:", error);
        } finally {
            set({ isLoadingCliNumbers: false });
        }
    },

    fetchCallFlows: async () => {
        set({ isLoadingCallFlows: true });
        try {
            const response = await telephonyaxios.post('/telephony/callflow/fetch', {
                limit: 100,
                offset: 0,
                searchString: "",
                sortField: "c_callflowId",
                sortOrder: "DESC"
            });
            if (response.data?.data?.totalRecords) {
                set({ callFlows: response.data.data.totalRecords });
            }
        } catch (error) {
            console.error("Error fetching call flows:", error);
        } finally {
            set({ isLoadingCallFlows: false });
        }
    },

    fetchSmsTemplates: async () => {
        set({ isLoadingSmsTemplates: true });
        try {
            const response = await telephonyaxios.get('/telephony/emergency/sms-templates');
            if (response.status === 200) {
                set({ smsTemplates: response.data.data || [] });
            }
        } catch (error) {
            console.error("Error fetching SMS templates:", error);
        } finally {
            set({ isLoadingSmsTemplates: false });
        }
    },

    fetchTemplates: async () => {
        set({ isLoadingTemplates: true });
        try {
            const response = await whatsappaxios.post('/whatsapp/fetch_whatsapp_template_report', {
                limit: 100,
                offset: 0,
                searchString: "",
                sortField: "",
                sortOrder: ""
            });
            if (response.data?.statusCode === 200) {
                set({ templates: response.data.data.totalRecords || [] });
            } else {
                toast.error("Failed to fetch templates");
            }
        } catch (error) {
            console.error("Error fetching templates:", error);
            toast.error("An error occurred while fetching templates");
        } finally {
            set({ isLoadingTemplates: false });
        }
    },

    fetchGroups: async () => {
        set({ isLoadingGroups: true });
        try {
            const response = await telephonyaxios.get('/telephony/emergency/group/list', {
                params: {
                    limit: 100,
                    offset: 0
                }
            });
            if (response.status === 200) {
                set({ groups: response.data.data || [] });
            }
        } catch (error) {
            console.error("Error fetching groups:", error);
            toast.error("An error occurred while fetching emergency groups");
        } finally {
            set({ isLoadingGroups: false });
        }
    },

    fetchGroupContacts: async (groupId) => {
        try {
            const response = await telephonyaxios.get(`/telephony/emergency/group/${groupId}/contacts`);
            if (response.status === 200) {
                return response.data.data || [];
            }
            return [];
        } catch (error) {
            console.error("Error fetching group contacts:", error);
            return [];
        }
    },

    fetchAlerts: async () => {
        set({ isLoadingAlerts: true });
        try {
            const response = await telephonyaxios.get('/telephony/emergency/list');
            if (response.status === 200) {
                const alerts = (response.data.data || []).map(a => ({
                    id: a.e_campaignId,
                    name: a.e_campaignName,
                    status: a.e_status,
                    priority: a.e_priority,
                    category: a.e_category,
                    launchedAt: a.e_createdOn,
                    scheduledAt: a.e_scheduleTime,
                    channels: a.channels || [],
                    stats: { reached: a.e_reachedLeads || 0, total: a.e_totalLeads || 100 }
                }));
                set({ alerts });
            }
        } catch (error) {
            console.error("Error fetching alerts:", error);
            toast.error("Failed to load alerts");
        } finally {
            set({ isLoadingAlerts: false });
        }
    },

    getCampaignDetails: async (campaignId) => {
        try {
            const response = await telephonyaxios.get(`/telephony/emergency/${campaignId}`);
            if (response.status === 200) {
                return response.data.data;
            }
            return null;
        } catch (error) {
            console.error("Error fetching campaign details:", error);
            toast.error("Failed to load campaign flow details");
            return null;
        }
    },

    createEmergencyCampaign: async (campaignData) => {
        try {
            const response = await telephonyaxios.post('/telephony/emergency/create', campaignData);
            if (response.status === 201) {
                return response.data; // Return the full response data
            } else {
                toast.error("Failed to launch campaign");
                return null;
            }
        } catch (error) {
            console.error("Error creating emergency campaign:", error);
            toast.error(error.response?.data?.detail || "Failed to create emergency campaign");
            return null;
        }
    },

    createGroup: async (groupData) => {
        try {
            const response = await telephonyaxios.post('/telephony/emergency/group/create', {
                name: groupData.name,
                contacts: groupData.contacts.map(c => ({
                    name: c.name,
                    phone: c.phone
                }))
            });
            if (response.status === 201) {
                toast.success("Group created successfully");
                return response.data; // Return data containing the group_id
            }
            return null;
        } catch (error) {
            console.error("Error creating group:", error);
            toast.error("Failed to create group");
            return null;
        }
    },

    updateGroup: async (groupId, groupData) => {
        try {
            const response = await telephonyaxios.put(`/telephony/emergency/group/${groupId}`, {
                name: groupData.name,
                contacts: groupData.contacts.map(c => ({
                    name: c.name,
                    phone: c.phone
                }))
            });
            if (response.status === 200) {
                toast.success("Group updated successfully");
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error updating group:", error);
            toast.error("Failed to update group");
            return false;
        }
    },

    deleteGroup: async (groupId) => {
        try {
            const response = await telephonyaxios.delete(`/telephony/emergency/group/${groupId}`);
            if (response.status === 200) {
                toast.success("Group deleted successfully");
                get().fetchGroups();
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error deleting group:", error);
            toast.error("Failed to delete group");
            return false;
        }
    },

    launchCampaign: async (campaignId) => {
        try {
            const response = await telephonyaxios.post(`/telephony/emergency/launch/${campaignId}`);
            if (response.status === 200) {
                toast.success("Emergency campaign triggered successfully");
                get().fetchAlerts();
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error launching campaign:", error);
            toast.error(error.response?.data?.message || "Failed to launch campaign");
            return false;
        }
    },

    previewTTS: async (text, language, voice) => {
        try {
            const response = await telephonyaxios.post('/telephony/emergency/preview_tts', {
                text,
                language,
                voice
            }, {
                responseType: 'blob' // Important to handle the binary audio stream
            });

            if (response.status === 200) {
                return URL.createObjectURL(response.data);
            }
            return null;
        } catch (error) {
            console.error("Error generating TTS preview:", error);
            toast.error("Failed to generate audio preview");
            return null;
        }
    },

    uploadAudio: async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await telephonyaxios.post('/telephony/emergency/upload_audio', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.status === 200) {
                toast.success("Audio uploaded successfully");
                return response.data;
            }
            return null;
        } catch (error) {
            console.error("Error uploading audio:", error);
            toast.error("Failed to upload audio file");
            return null;
        }
    },

    stopCampaign: async (campaignId) => {
        try {
            const response = await telephonyaxios.post(`/telephony/emergency/stop/${campaignId}`);
            if (response.status === 200) {
                toast.success("Campaign stop command sent");
                get().fetchAlerts();
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error stopping campaign:", error);
            toast.error(error.response?.data?.message || "Failed to stop campaign");
            return false;
        }
    },

    fetchCampaignReport: async (campaignId) => {
        try {
            const response = await telephonyaxios.get(`/telephony/emergency/report/${campaignId}`);
            if (response.status === 200) {
                return response.data.data;
            }
            return null;
        } catch (error) {
            console.error("Error fetching campaign report:", error);
            toast.error("Failed to load campaign report");
            return null;
        }
    },

    fetchAllReports: async (limit = 100, offset = 0, campaign_id = null, channel = null, disposition = null, startDate = null, endDate = null, response_label = null) => {
        set({ isAllReportsLoading: true });

        const formatDateToLocal = (date) => {
            if (!(date instanceof Date)) return date;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };

        try {
            const payload = {
                limit,
                offset,
                campaign_id: campaign_id === "" ? null : campaign_id ? parseInt(campaign_id, 10) : null,
                channel: channel === "" ? null : channel,
                disposition: disposition === "" ? null : disposition,
                response_label: response_label === "" ? null : response_label,
                start_date: formatDateToLocal(startDate),
                end_date: formatDateToLocal(endDate)
            };
            const response = await telephonyaxios.post('/telephony/emergency/report/all', payload);
            set({
                allLogs: response.data.data.logs || [],
                allLogsCount: response.data.data.total || 0,
                isAllReportsLoading: false
            });
        } catch (error) {
            console.error("Error fetching all reports:", error);
            set({ isAllReportsLoading: false });
        }
    },

    fetchDashboardData: async (campaignId = null) => {
        const params = campaignId ? { campaign_id: campaignId } : {};
        
        // Helper to update dashboard state partially
        const updatePartial = (key, data) => set((state) => ({
            dashboardStats: { ...(state.dashboardStats || {}), [key]: data }
        }));

        const fetchKpis = async () => {
            set({ isLoadingKpis: true });
            try {
                const res = await telephonyaxios.get('/telephony/emergency/dashboard/kpis', { params });
                if (res.status === 200) {
                    const data = res.data.data;
                    set({ dashboardKpis: data });
                    set((state) => ({ dashboardStats: { ...(state.dashboardStats || {}), ...data } }));
                }
            } finally { set({ isLoadingKpis: false }); }
        };

        const fetchMissions = async () => {
            set({ isLoadingMissions: true });
            try {
                const res = await telephonyaxios.get('/telephony/emergency/dashboard/recent-missions', { params });
                if (res.status === 200) {
                    set({ dashboardMissions: res.data.data });
                    updatePartial('recentMissions', res.data.data);
                }
            } finally { set({ isLoadingMissions: false }); }
        };

        const fetchCharts = async () => {
            set({ isLoadingCharts: true });
            try {
                const res = await telephonyaxios.get('/telephony/emergency/dashboard/charts', { params });
                if (res.status === 200) {
                    set({ dashboardCharts: res.data.data });
                    set((state) => ({ dashboardStats: { ...(state.dashboardStats || {}), ...res.data.data } }));
                }
            } finally { set({ isLoadingCharts: false }); }
        };

        const fetchResponses = async () => {
            set({ isLoadingResponses: true });
            try {
                const res = await telephonyaxios.get('/telephony/emergency/dashboard/responses', { params });
                if (res.status === 200) {
                    set({ dashboardResponses: res.data.data });
                    set((state) => ({ dashboardStats: { ...(state.dashboardStats || {}), ...res.data.data } }));
                }
            } finally { set({ isLoadingResponses: false }); }
        };

        // Fire all in parallel
        await Promise.all([
            fetchKpis(),
            fetchMissions(),
            fetchCharts(),
            fetchResponses()
        ]);
    },

    exportAllReports: async (campaignId = null, channel = null, disposition = null, startDate = null, endDate = null, response_label = null) => {
        const formatDateToLocal = (date) => {
            if (!(date instanceof Date) || isNaN(date.getTime())) return null;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };

        const queryParams = new URLSearchParams();

        // Only append if value exists and is not an empty string or null/undefined
        if (campaignId && campaignId !== "" && campaignId !== "null") {
            queryParams.append("campaign_id", campaignId);
        }
        if (channel && channel !== "") {
            queryParams.append("channel", channel);
        }
        if (disposition && disposition !== "") {
            queryParams.append("disposition", disposition);
        }
        if (response_label && response_label !== "") {
            queryParams.append("response_label", response_label);
        }

        const startStr = formatDateToLocal(startDate);
        if (startStr) queryParams.append("start_date", startStr);

        const endStr = formatDateToLocal(endDate);
        if (endStr) queryParams.append("end_date", endStr);

        const baseURL = telephonyaxios?.defaults?.baseURL || "";
        const downloadUrl = `${baseURL}/telephony/emergency/report/export?${queryParams.toString()}`;
        location.href = downloadUrl;
    },

    fetchResponseMembers: async (paramsOrText, campaignId = null) => {
        set({ isFetchingResponseMembers: true, responseMembers: [] });
        try {
            // Support both (text, id) and { response_text, campaign_id, ... }
            const isObject = paramsOrText && typeof paramsOrText === 'object';
            const response_text = isObject ? paramsOrText.response_text : paramsOrText;
            const final_campaign_id = isObject ? paramsOrText.campaign_id : campaignId;

            const response = await telephonyaxios.post('/telephony/emergency/dashboard/response-members', {
                response_text: String(response_text),
                campaign_id: final_campaign_id,
                limit: isObject && paramsOrText.limit ? paramsOrText.limit : 500,
                offset: isObject && paramsOrText.offset ? paramsOrText.offset : 0
            });
            if (response.status === 200) {
                set({ responseMembers: response.data.data || [] });
                return true;
            }
        } catch (error) {
            console.error("Error fetching response members:", error);
            toast.error("Failed to load response members");
        } finally {
            set({ isFetchingResponseMembers: false });
        }
        return false;
    }
}));
