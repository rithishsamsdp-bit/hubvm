import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../../store/useToastStore.js";
import { useConversationStore } from "./useConversationStore.js";
import { useAuthStore } from "../useAuthStore.js";

export const useSmsStore = create((set) => ({
    sentSmsLoading: false,

    sendSMSMessage: async (data, messageInput) => {
        set({ sentSmsLoading: true });
        try {
            const authUser = useAuthStore.getState().authUser;
            const agentExtension = authUser?.m_memberExtensionNo || "";

            const formData = new FormData();
            formData.append('dst', data.c_conversationPhoneNo);
            formData.append('agent', agentExtension);
            formData.append('message', messageInput || '');

            const res = await telephonyaxios.post("/telephony/sms/send_outbound_sms", formData);
            
            if (res.data?.statusCode === 200) {
                toast.success("SMS sent successfully");
                
                // If the response includes a message object, add it to chat
                if (res.data?.response) {
                    useConversationStore.getState().addChatMessage(res.data.response);
                } else {
                    // Fallback to manually adding a message if response doesn't have it
                    // (Though the API should ideally return the activity object)
                    const now = new Date().toISOString();
                    const manualMessage = {
                        activityTimestamp: now,
                        direction: "outbound",
                        channel: "SMS",
                        memberName: authUser?.m_memberName || "Agent",
                        details: {
                            m_receiveMsg: messageInput,
                            m_type: "text",
                            m_dst: data.c_conversationPhoneNo,
                            m_updatedStatus: { status: "sent" }
                        }
                    };
                    useConversationStore.getState().addChatMessage(manualMessage);
                }
                return { success: true, data: res.data };
            } else {
                toast.error(res.data?.body || "Failed to send SMS");
                return { success: false, error: res.data?.body };
            }
        } catch (error) {
            console.error("Error sending SMS:", error);
            const message = error?.response?.data?.message || error?.message || "Failed to send SMS";
            toast.error(message);
            return { success: false, error: message };
        } finally {
            set({ sentSmsLoading: false });
        }
    },
}));
