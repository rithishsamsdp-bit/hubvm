import { create } from "zustand";
import { useSocketStore } from "../useSocketStore.js";
import { useAuthStore } from "../useAuthStore.js";
import { toast } from "../useToastStore.js";
import { useDashboardStore } from "./useDashboardStore.js";
import { useConversationStore } from "./useConversationStore.js";
export const useAgentSocket = create((set, get) => ({
    subscribeTodata: () => {
        const socket = useSocketStore.getState().socket;
        if (!socket) return;

        const handleResponse = (data) => {
            if (data.action === 'force_logout') {
                const currentSessionId = useAuthStore.getState().sessionId;
                if (data.activeToken && data.activeToken === currentSessionId) {
                    console.log("Skipping force_logout: This tab is the new active session.");
                    return;
                }
                useAuthStore.getState().logout();
            } else if (data.action === 'CALLBACK') {
                useAuthStore.getState().addNotification(data);
                toast.success("You have a callback reminder");
                triggerNotification("Callback Reminder", `Callback for ${data.notificationData?.phonenumber} at ${data.notificationTime}`);
            } else if (data.action === 'MISSEDCALL') {
                const formatted = {
                    action: data.action,
                    phonenumber: data.notificationData?.phonenumber,
                    notificationTime: data.notificationTime
                };
                useAuthStore.getState().setMissedCallData(formatted);
                toast.success("You have a remainder for  missed call");
            }
            else if (data.action === "Whatsapp") {
                handleIncomingMessage(data);
            } else if (data.action === "SMS") {
                handleIncomingMessage(data);
            } else if (data.action === 'QUEUE_STATS') {
                console.log("Queue Update Received, fetching stats...");
                useDashboardStore.getState().getLiveQueueStats();
            } else {
                console.log(data);
            }
        };

        const triggerNotification = (title, body) => {
            console.log("Attempting to trigger notification:", title, body);
            console.log("Current Notification Permission:", Notification.permission);

            if (!("Notification" in window)) {
                console.warn("This browser does not support desktop notification");
                return;
            }

            if (Notification.permission === "granted") {
                try {
                    const notification = new Notification(title, {
                        body: body,
                        icon: "/favicon.png",
                        requireInteraction: true // Keep it on screen until user interacts
                    });
                    notification.onclick = () => {
                        window.focus();
                        notification.close();
                    };
                    console.log("Notification created successfully", notification);
                } catch (e) {
                    console.error("Notification creation failed:", e);
                }
            } else if (Notification.permission !== "denied") {
                console.log("Requesting notification permission...");
                Notification.requestPermission().then((permission) => {
                    console.log("Permission request result:", permission);
                    if (permission === "granted") {
                        try {
                            const notification = new Notification(title, {
                                body: body,
                                icon: "/favicon.png",
                            });
                            console.log("Notification created after permission grant");
                        } catch (e) {
                            console.error("Notification creation failed:", e);
                        }
                    } else {
                        console.warn("Notification permission was not granted.");
                        toast.error("Notifications are blocked. Please reset permissions in your address bar.");
                    }
                });
            } else {
                console.warn("Notification permission is denied.");
                toast.error("Notifications are blocked. Please reset permissions in your address bar.");
            }
        };

        const handleIncomingMessage = (data) => {
            console.log("incoming message", data.payload);

            const conversations = useConversationStore.getState().conversations;
            const conversationId = data.payload.conversationId;
            const isOutbound = data.payload.direction === "Outbound";
            const messageId = data.payload.details?.m_id;
            const updatedStatus = data.payload.details?.m_updatedStatus;
            const statusDetails = data.payload.details?.m_statusDetails;

            // Check if conversation exists in the sidebar (by conversationId or leadId)
            const leadId = data.payload.leadId;
            const conversationExists = conversations.some(
                conv => conv.c_conversationId === conversationId ||
                    (leadId && conv.c_leadId === leadId)
            );

            // If conversation doesn't exist, add it to the sidebar
            if (!conversationExists && conversationId) {
                const isInbound = data.payload.direction === "Inbound";
                const newConversation = {
                    c_conversationId: conversationId,
                    c_leadId: data.payload.leadId,
                    c_conversationPhoneNo: data.payload.details.m_src,
                    c_conversationChannel: data.payload.channel,
                    c_conversationType: data.payload.type,
                    c_conversationOwner: data.payload.details.m_dst,
                    c_conversationStatus: "Active",
                    c_contactName: data.payload.contactName || (isInbound ? data.payload.details.m_src : data.payload.memberName) || "Unknown",
                    c_createdOn: data.payload.activityTimestamp,
                    c_updatedOn: data.payload.activityTimestamp,
                };
                useConversationStore.getState().addConversation(newConversation);
                console.log("New conversation added to sidebar:", conversationId);
            }

            // Handle based on direction
            let selecteddata = useConversationStore.getState().selectedContact;

            // Check if selected contact matches this conversation (for both inbound and outbound)
            // Also ensure we are actually on the conversation page
            const isOnConversationPage = window.location.pathname === "/agent-conversation" || window.location.pathname === "/tl-conversation";
            const matchesSelectedContact = isOnConversationPage && selecteddata && (
                selecteddata.c_conversationPhoneNo == data.payload.details.m_src ||
                selecteddata.c_conversationPhoneNo == data.payload.details.m_dst
            );

            if (isOutbound && updatedStatus && matchesSelectedContact) {
                // Outbound message: check if message exists, if not add it first
                const chatData = useConversationStore.getState().conversationChat;
                let messageExists = false;

                Object.values(chatData).forEach(messages => {
                    if (messages.some(msg => msg.details?.m_id === messageId)) {
                        messageExists = true;
                    }
                });

                if (!messageExists) {
                    // First time seeing this message, add it
                    console.log("Adding outbound message:", messageId);
                    useConversationStore.getState().addChatMessage(data.payload);
                } else {
                    // Message exists, update status (include statusDetails for failed messages)
                    console.log("Updating message status:", messageId, updatedStatus);
                    useConversationStore.getState().updateMessageStatus(messageId, updatedStatus, statusDetails);
                }
            } else if (!isOutbound) {
                // Inbound message
                if (matchesSelectedContact) {
                    // Add to chat only if matches selected contact
                    useConversationStore.getState().addChatMessage(data.payload);
                }

                // Add to notification store so badge updates
                const senderMobile = data.payload.details?.m_src || "Unknown";
                const authStore = useAuthStore.getState();
                
                // Always trigger notification logic if not on the active conversation
                if (!matchesSelectedContact) {
                    console.log("Adding lively notification for inbound message");
                    const newNotification = {
                        notificationId: data.payload.conversationId || Date.now().toString(),
                        action: "INCOMINGSMS",
                        notificationTime: new Date().toLocaleString(),
                        isRead: false,
                        notificationData: {
                            phonenumber: senderMobile,
                            m_receiveMsg: data.payload.details?.m_receiveMsg,
                            ...data.payload
                        }
                    };
                    authStore.addNotification(newNotification);

                    // Trigger Browser Notification
                    const sender = data.payload.contactName || senderMobile;
                    const channel = data.payload.channel || "Message";
                    const messageBody = data.payload.details?.m_receiveMsg || data.payload.details?.m_mediaTextCaption || "New media message";

                    // Show in-app toast immediately
                    toast.info(`New ${channel} from ${sender}: ${messageBody.substring(0, 30)}${messageBody.length > 30 ? '...' : ''}`);

                    // Play notification sound
                    try {
                        const audio = new Audio("/sounds/notification.mp3");
                        audio.play().catch(e => console.error("Error playing sound:", e));
                    } catch (e) {
                        console.error("Audio playback failed:", e);
                    }

                    triggerNotification(`New ${channel} from ${sender}`, messageBody);
                }
            }
        };


        socket.on("response", handleResponse);
    },

    unsubscribeFromdata: () => {
        const socket = useSocketStore.getState().socket;
        if (!socket) return;
        socket.off("response");
    },
}));    