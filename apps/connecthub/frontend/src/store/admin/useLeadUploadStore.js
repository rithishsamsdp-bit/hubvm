import { create } from "zustand";
import { toast } from "../useToastStore.js";
import telephonyaxios from "../../services/telephonyaxios.js";

export const useLeadUploadStore = create((set, get) => ({
    campaigns: [],
    isLoading: false,

    fetchCampaigns: async () => {
        set({ isLoading: true });
        try {
            const data = {
                limit: 1000,
                offset: 0,
                searchString: "",
                sortField: "c_createdOn",
                sortOrder: "DESC",
            };
            const res = await telephonyaxios.post("telephony/campaign/select", data);
            set({ campaigns: res.data.data || [], isLoading: false });
        } catch (error) {
            const message = error?.response?.data?.message || "Failed to fetch campaigns";
            toast.error(message);
            set({ isLoading: false });
        }
    },

    uploadLeads: async (campaignId, file) => {
        if (!campaignId || !file) {
            toast.error("Please select a campaign and a file.");
            return false;
        }

        set({ isLoading: true });

        const formdata = new FormData();
        formdata.append("campaign_id", campaignId);
        formdata.append("file", file);

        try {
            // Using telephonyaxios for upload as well for consistency, 
            // but need to be careful with headers. 
            // Usually axios handles FormData content-type automatically.
            const response = await telephonyaxios.post("telephony/lead/upload", formdata);
            console.log(response.data);
            toast.success("File uploaded successfully");
            set({ isLoading: false });
            return true;
        } catch (error) {
            console.error(error);
            const message = error?.response?.data?.message || "Upload failed";
            toast.error(message);
            set({ isLoading: false });
            return false;
        }
    },

    downloadCsvFormat: async (campaignId) => {
        if (!campaignId) return;
        try {
            const response = await telephonyaxios.get(`telephony/formbuilder/form/csv?campid=${campaignId}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `campaign_${campaignId}_format.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error("Error downloading CSV format:", error);
            toast.error("Failed to download CSV format");
        }
    }
}));
