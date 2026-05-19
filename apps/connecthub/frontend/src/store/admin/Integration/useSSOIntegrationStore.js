import { create } from "zustand";
import authaxios from "../../../services/authaxios.js";
import { toast } from "../../useToastStore.js";

export const useSSOIntegrationStore = create((set) => ({

    ssoConfigData: null,
    googleConfigData: null,

    createLoading: false,

    createSAMLConfig: async (formData, provider = 'azure') => {
        console.log('createSAMLConfig called with:', formData);
        set({ createLoading: true });

        try {
            // Prepare form data for submission
            const submitData = new FormData();
            submitData.append('domain', formData.domain);
            submitData.append('entityid', formData.azureEntityId || formData.entityId);
            submitData.append('loginurl', formData.ssoLoginUrl || formData.loginUrl);
            submitData.append('certificate', formData.certificate);
            submitData.append('provider', provider);

            console.log('Submitting to API:', {
                domain: formData.domain,
                entityid: formData.azureEntityId || formData.entityId,
                loginurl: formData.ssoLoginUrl || formData.loginUrl,
                certificateFile: formData.certificate.name,
                provider: provider
            });

            const res = await authaxios.post("/auth/saml/configure", submitData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('API Response:', res);
            toast.success(res.data.message || "SAML configuration created successfully");
            return res;
        } catch (error) {
            console.error('API Error:', error);
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
            throw error;
        } finally {
            set({ createLoading: false });
        }
    },

    getSAMLConfig: async (provider = 'azure') => {
        set({ createLoading: true });
        try {
            const res = await authaxios.get(`/auth/saml/configure?provider=${provider}`, {
                headers: {
                    Accept: "application/json",
                },
            });
            if (provider === 'google') {
                set({ googleConfigData: res.data });
            } else {
                set({ ssoConfigData: res.data });
            }
            return res.data;
        } catch (error) {
            console.error("Failed to fetch SAML config:", error);
            // If 404, it means no config exists, so ensure state is null
            if (error.response && error.response.status === 404) {
                if (provider === 'google') {
                    set({ googleConfigData: null });
                } else {
                    set({ ssoConfigData: null });
                }
            }
        } finally {
            set({ createLoading: false });
        }
    },

    disconnectSAMLConfig: async (provider = 'azure') => {
        set({ createLoading: true });
        try {
            const res = await authaxios.delete(`/auth/saml/configure?provider=${provider}`);
            if (provider === 'google') {
                set({ googleConfigData: null });
            } else {
                set({ ssoConfigData: null });
            }
            toast.success("Disconnected successfully");
            return res;
        } catch (error) {
            console.error("Failed to disconnect SAML:", error);
            toast.error(error?.response?.data?.message || "Failed to disconnect");
        } finally {
            set({ createLoading: false });
        }
    },

    updateSyncConfig: async (syncApis) => {
        set({ createLoading: true });
        try {
            console.log('Sending sync payload:', syncApis);
            const res = await authaxios.post("/auth/saml/sync", { sync_apis: syncApis });
            toast.success(res.data.message || "Synchronization APIs updated successfully");
            return res;
        } catch (error) {
            console.error("Failed to update sync config:", error);
            const message = error?.response?.data?.message || "Failed to update sync config";
            toast.error(message);
            throw error;
        } finally {
            set({ createLoading: false });
        }
    },
}));
