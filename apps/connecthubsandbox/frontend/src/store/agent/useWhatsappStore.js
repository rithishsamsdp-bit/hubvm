import { create } from "zustand";
import whatsappaxios from "../../services/whatsappaxios.js";
import { toast } from "../../store/useToastStore.js";
import { useAuthStore } from "../useAuthStore.js";
import { useConversationStore } from "./useConversationStore.js";

export const useWhatsappStore = create((set) => ({
    sentWAMessageLoading: false,
    templatesLoading: false,
    templates: [],

    sentWAMessage: async (formData, messageInput) => {
        set({ sentWAMessageLoading: true });
        try {
            const res = await whatsappaxios.post("/whatsapp/send_outbound_messages", formData);
            console.log(res);

            // Use the response data which includes m_id for socket status updates
            if (res.data?.response) {
                const responseData = res.data.response;
                const conversations = useConversationStore.getState().conversations;
                const conversationId = responseData.conversationId;
                const leadId = responseData.leadId;

                // Check if conversation exists (by conversationId or leadId)
                const conversationExists = conversations.some(
                    conv => conv.c_conversationId === conversationId ||
                        (leadId && conv.c_leadId === leadId)
                );

                // If conversation doesn't exist, add it to the sidebar
                if (!conversationExists && conversationId) {
                    const newConversation = {
                        c_conversationId: conversationId,
                        c_leadId: leadId,
                        c_conversationPhoneNo: responseData.details?.m_dst,
                        c_conversationChannel: responseData.channel,
                        c_conversationType: responseData.type,
                        c_conversationOwner: responseData.details?.m_src,
                        c_conversationStatus: "Active",
                        c_contactName: responseData.memberName || "Unknown",
                        c_createdOn: responseData.activityTimestamp,
                        c_updatedOn: responseData.activityTimestamp,
                        colour: "#25D366"
                    };
                    useConversationStore.getState().addConversation(newConversation);
                    console.log("New conversation added to sidebar:", conversationId);
                }

                useConversationStore.getState().addChatMessage(responseData);
                console.log("Message added to chat with m_id:", responseData.details?.m_id);
            }

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

    fetchWhatsappTemplates: async () => {
        set({ templatesLoading: true });
        try {
            const res = await whatsappaxios.post("/whatsapp/fetchWhatsappTemplateList");
            console.log("Templates fetched:", res.data);
            set({ templates: res.data?.templates || [] });
            return res.data?.templates || [];
        } catch (error) {
            console.log("Error fetching templates:", error);
            toast.error("Failed to fetch templates");
            set({ templates: [] });
            return [];
        } finally {
            set({ templatesLoading: false });
        }
    },

    sendManualTemplate: async (tempId, tempName, phoneNumber, agentExtension, variables = []) => {
        try {
            const res = await whatsappaxios.post("/whatsapp/sendManualTemplate", {
                tempId,
                tempName,
                phoneNumber,
                agentExtension,
                variables
            });
            console.log("Template sent:", res.data);
            if (res.data?.statusCode === 200) {
                // Add the template message to chat
                if (res.data?.response) {
                    useConversationStore.getState().addChatMessage(res.data.response);
                    console.log("Template message added to chat");
                }
                toast.success("Template sent successfully");
                return { success: true, data: res.data };
            } else {
                toast.error(res.data?.body || "Failed to send template");
                return { success: false, error: res.data?.body };
            }
        } catch (error) {
            console.log("Error sending template:", error);
            const message = error?.response?.data?.error || error?.message || "Failed to send template";
            toast.error(message);
            return { success: false, error: message };
        }
    },
}));