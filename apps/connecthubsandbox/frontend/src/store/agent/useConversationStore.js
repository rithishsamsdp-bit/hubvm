import { create } from "zustand";
import conversationaxios from "../../services/conversationaxios";
import telephonyaxios from "../../services/telephonyaxios.js";
import { useAuthStore } from "./../useAuthStore.js";

export const useConversationStore = create((set, get) => ({
  conversations: [],
  conversationChat: [],
  conversationLoading: false,
  chatLoading: false,
  formData: null,
  callStatus: true,
  breakStatus: "LOGIN",
  selectedCampaign: { label: "Individual", value: "0" },
  agentsData: [],
  agentsLoading: false,
  mergedConversations: {},
  selectedContact: null,
  breakStartTime: null,
  selectedNotes: null,
  getSelectedNotesLoading: false,
  predictiveLeadData: null,
  predictiveLeadLoading: false,
  pendingNotificationPhone: null,
  pendingHighlightedMessageId: null,
  pendingHighlightedMessageText: null,
  pendingHighlightedMessageTime: null,


  initializeCallStatus: () => {
    const savedStatus = localStorage.getItem("callStatus");
    const status = savedStatus ? JSON.parse(savedStatus) : true;
    set({ callStatus: status });
    get().updateReadyNotReady(status);
  },
  getConversations: async (limit = 20, offset = 0) => {
    if (offset === 0) set({ conversationLoading: true });

    const authUser = useAuthStore.getState().authUser;
    let data = {
      memberextensionno: authUser.m_memberExtensionNo,
      limit: limit,
      offset: offset
    };

    try {
      const currentConversations = get().conversations;
      const runtimeStateMap = {};

      if (currentConversations && Array.isArray(currentConversations)) {
        currentConversations.forEach(conv => {
          const key = conv.c_conversationId || conv.c_conversationPhoneNo;
          if (conv.startTime || conv.stopped !== undefined || conv.onHold !== undefined) {
            runtimeStateMap[key] = {
              startTime: conv.startTime,
              stopped: conv.stopped,
              duration: conv.duration,
              onHold: conv.onHold,
              holdStartTime: conv.holdStartTime,
              holdDuration: conv.holdDuration
            };
          }
        });
      }

      const res = await conversationaxios.post("/agent/conversation/list", data);
      const newConversationData = Array.isArray(res.data.data) ? res.data.data : [];

      const mergedConversations = get().mergedConversations;

      const processedNewConversations = newConversationData.map(newConv => {
        const isConferenceFromAPI = newConv.c_conversationType === "Conference Call";

        const processedConv = {
          ...newConv
        };

        if (isConferenceFromAPI && mergedConversations[newConv.c_conversationId]) {
          processedConv.isConferenceMerged = true;
          processedConv.mergedParticipants = mergedConversations[newConv.c_conversationId];
          processedConv.participantCount = processedConv.mergedParticipants.length;
        } else {
          const existingConv = currentConversations.find(
            existing => existing.c_conversationId === newConv.c_conversationId
          );
          if (existingConv && existingConv.isConferenceMerged) {
            processedConv.isConferenceMerged = existingConv.isConferenceMerged;
            processedConv.conferenceId = existingConv.conferenceId;
            processedConv.mergedParticipants = existingConv.mergedParticipants;
            processedConv.participantCount = existingConv.participantCount;
          }
        }

        // Restore runtime state
        const key = newConv.c_conversationId || newConv.c_conversationPhoneNo;
        const preservedState = runtimeStateMap[key] || {};

        return {
          ...processedConv,
          ...preservedState
        };
      });

      const filteredConversations = processedNewConversations.filter(conv => {
        const isMergedIntoAnother = Object.values(mergedConversations).some(mergedIds =>
          mergedIds.includes(conv.c_conversationId) && !conv.isConferenceMerged
        );
        return !isMergedIntoAnother;
      });

      // Filter out duplicates if offset > 0
      set((state) => {
        if (offset === 0) {
          // Preserve locally-added conversations (IDs starting with 'WA_' or 'SMS_')
          const localConversations = (state.conversations || []).filter(
            conv => conv.c_conversationId && (conv.c_conversationId.startsWith('WA_') || conv.c_conversationId.startsWith('SMS_'))
          );
          return { conversationLoading: false, conversations: [...localConversations, ...filteredConversations] };
        } else {
          // Append new data, filtering out duplicates
          const existingIds = new Set(state.conversations.map(c => c.c_conversationId));
          const uniqueNewConversations = filteredConversations.filter(c => !existingIds.has(c.c_conversationId));
          return {
            conversationLoading: false,
            conversations: [...state.conversations, ...uniqueNewConversations]
          };
        }
      });

      // Return true if we received full page, indicating potentially more data
      return newConversationData.length === limit;

    } catch (error) {
      console.log(error);
      set({ conversationLoading: false });
      return false;
    }
  },
  mergeConversationsToConference: async (payload, optimisticUpdate = false) => {
    try {
      const { conversationids, conferenceparticipants } = payload;
      const conferenceId = payload.callid || `conference_${Date.now()}`;

      set((state) => {
        const newMergedConversations = {
          ...state.mergedConversations,
          [conferenceId]: conversationids,
        };

        const updatedConversations = state.conversations.map(conv => {
          if (conversationids[0] === conv.c_conversationId) {
            return {
              ...conv,
              isConferenceMerged: true,
              conferenceId: conferenceId,
              mergedParticipants: conferenceparticipants,
              participantCount: conferenceparticipants.length,
            };
          }
          return conv;
        });

        const filteredConversations = updatedConversations.filter((conv) => {
          if (conversationids[0] === conv.c_conversationId) {
            return true;
          }
          return !conversationids.slice(1).includes(conv.c_conversationId);
        });

        return {
          mergedConversations: newMergedConversations,
          conversations: filteredConversations,
        };
      });

      if (!optimisticUpdate) {
        try {
          const res = await conversationaxios.post(
            "/agent/callevent/outbound/conference/merge",
            payload,
            {
              headers: {
                'Content-Type': 'application/json',
              }
            }
          );
          await get().getConversations();
          return res.data;
        } catch (apiError) {
          console.error("Status:", apiError.response?.status);
          throw apiError;
        }
      } else {
        return { success: true, message: "UI updated optimistically" };
      }
    } catch (error) {
      console.error("❌ Error in mergeConversationsToConference:", error);
      throw error;
    }
  },
  unmergeConference: (conferenceId) => {
    set((state) => {
      const mergedIds = state.mergedConversations[conferenceId];

      if (!mergedIds) {
        return state;
      }

      const newMergedConversations = { ...state.mergedConversations };
      delete newMergedConversations[conferenceId];

      const updatedConversations = state.conversations.map(conv => {
        if (conv.conferenceId === conferenceId) {
          const { isConferenceMerged, conferenceId: _, mergedParticipants, participantCount, ...rest } = conv;
          return rest;
        }
        return conv;
      });

      return {
        mergedConversations: newMergedConversations,
        conversations: updatedConversations,
      };
    });

    get().getConversations();
  },
  getChat: async (leadId, limit = 20, offset = 0) => {
    if (offset === 0) {
      set({ chatLoading: true });
    }

    let data = {
      leadid: leadId,
      limit: limit,
      offset: offset
    };

    try {
      const res = await conversationaxios.post("/agent/chat/history", data);
      const newChatData = res.data.data;

      set((state) => {
        if (offset === 0) {
          // If it's the first page, just replace the data
          return { conversationChat: newChatData };
        } else {
          // If it's paginated data, merge it
          const currentChat = state.conversationChat || {};
          const mergedChat = { ...currentChat };

          Object.entries(newChatData).forEach(([date, messages]) => {
            if (mergedChat[date]) {
              // Preventing duplicates if any overlap occurs is a good idea.
              const existingIds = new Set(mergedChat[date].map(m => m.details?.m_id || m.uniqueId || JSON.stringify(m)));
              const uniqueNewMessages = messages.filter(m => !existingIds.has(m.details?.m_id || m.uniqueId || JSON.stringify(m)));

              mergedChat[date] = [...uniqueNewMessages, ...mergedChat[date]];
            } else {
              // New date key found (older date), just add it
              mergedChat[date] = messages;
            }
          });

          return { conversationChat: mergedChat };
        }
      });

      return res.data.data; // Return data so UI knows if it got result
    } catch (error) {
      console.log(error);
      return null;
    } finally {
      if (offset === 0) {
        set({ chatLoading: false });
      }
    }
  },
  addChatMessage: (message) => {
    set((state) => {
      const dateKey = message.activityTimestamp.split("T")[0];

      // Handle case where conversationChat is undefined, null, or an empty array
      const currentChat = (state.conversationChat && typeof state.conversationChat === 'object' && !Array.isArray(state.conversationChat))
        ? state.conversationChat
        : {};
      const existing = currentChat[dateKey] || [];

      return {
        conversationChat: {
          ...currentChat,
          [dateKey]: [...existing, message],
        },
      };
    });
  },
  updateMessageStatus: (messageId, updatedStatus, statusDetails = null) => {
    set((state) => {
      const updatedChat = {};

      Object.entries(state.conversationChat).forEach(([dateKey, messages]) => {
        updatedChat[dateKey] = messages.map((msg) => {
          if (msg.details?.m_id === messageId) {
            return {
              ...msg,
              details: {
                ...msg.details,
                m_updatedStatus: updatedStatus,
                ...(statusDetails && { m_statusDetails: statusDetails }),
              },
            };
          }
          return msg;
        });
      });

      return { conversationChat: updatedChat };
    });
  },
  addConversation: (newConversation) => {
    set((state) => ({
      conversations: [...state.conversations, newConversation],
      conversationLoading: false,
    }));
  },
  selectContact: (newContact) => {
    set({ selectedContact: newContact })
  },
  setPendingNotificationPhone: (phone) => {
    set({ pendingNotificationPhone: phone })
  },
  setPendingHighlightedMessageId: (messageId) => {
    set({ pendingHighlightedMessageId: messageId })
  },
  setPendingHighlightedMessageText: (text) => {
    set({ pendingHighlightedMessageText: text })
  },
  setPendingHighlightedMessageTime: (time) => {
    set({ pendingHighlightedMessageTime: time })
  },
  fetchFollowupForm: async (leadId, campaignId, cliNumberId, callDirection, phoneNumber) => {
    try {
      const payload = {
        leadid: leadId,
        campaignid: campaignId || "0",
        clinumberid: "",
        calldirection: callDirection,
        phonenumber: String(phoneNumber)
      };

      const res = await conversationaxios.post("/agent/followup/fetch", payload);

      if (res.data && res.data.data && Object.keys(res.data.data).length > 0) {
        const followupData = res.data.data;

        const formElements = Object.entries(followupData).map(([label, fieldData]) => {
          if (fieldData && typeof fieldData === 'object') {
            return {
              id: fieldData.id || label,
              label: label,
              type: fieldData.type || 'Single Line Text field',
              defaultValue: fieldData.value || '',
              layout: fieldData.layout || { x: 0, y: 0, w: 4, h: 3 },
              ...(fieldData.options && { options: fieldData.options }),
              ...(fieldData.conditions && { conditions: fieldData.conditions })
            };
          }
          return null;
        }).filter(Boolean);

        const formPayload = {
          formTitle: 'Followup Form',
          elements: formElements
        };

        set({ formData: formPayload });

        return followupData;
      } else if (res.data && res.data.f_formPayload && Object.keys(res.data.f_formPayload).length > 0) {
        set({ formData: res.data.f_formPayload });
        return res.data.f_formPayload;
      } else {
        return await useConversationStore.getState().fetchFormByCampaign(campaignId);
      }
    } catch (error) {
      console.error("Error fetching followup form:", error);
      return await useConversationStore.getState().fetchFormByCampaign(campaignId);
    }
  },
  fetchFormByCampaign: async (campId) => {
    const validatedCampId = campId ? campId.toString() : "0";
    try {
      const res = await telephonyaxios.post("/telephony/formbuilder/getform", {
        campid: validatedCampId,
      });
      set({ formData: res.data.f_formPayload });
      return res.data.f_formPayload;
    } catch (error) {
      console.error("Error fetching form by campaign:", error);
      return null;
    }
  },
  clearFormData: () => {
    set({ formData: null });
  },
  updateReadyNotReady: async (status) => {
    set({ callStatus: status });
    localStorage.setItem("callStatus", JSON.stringify(status));
    try {
      const payload = {
        r_status: status ? "READY" : "NOTREADY",
        campId: localStorage.getItem("CampaignId") != null ? localStorage.getItem("CampaignId") : "0"
      };
      await conversationaxios.post("/agent/state/readynotready", payload);
    } catch (error) {
      console.error("API error (but UI already updated):", error);
    }
  },
  updateBreakStatus: async (newStatus) => {
    try {
      const statusToSet = newStatus === "Active" ? "LOGIN" : newStatus;
      const payload = { b_Break: newStatus === "Active" ? "None" : newStatus };

      await conversationaxios.post("/agent/state/break", payload);

      get().setBreakStatus(statusToSet);

      if (statusToSet !== "LOGIN") {
        await get().updateReadyNotReady(false);
      }

    } catch (error) {
      console.error("Break API error:", error);

      const statusToSet = newStatus === "Active" ? "LOGIN" : newStatus;
      get().setBreakStatus(statusToSet);

      if (statusToSet !== "LOGIN") {
        set({ callStatus: false });
        localStorage.setItem("callStatus", JSON.stringify(false));
      }
    }
  },
  updateCampaign: async (campName, campId) => {
    try {
      const payload = { campName, campId };
      await conversationaxios.post("/agent/state/changecampaign", payload);
      set({
        selectedCampaign: { label: campName, value: campId },
      });
      localStorage.setItem("c_campaignId", campId);
    } catch (error) {
      console.error("Error updating campaign:", error);
    }
  },
  endConversation: async (datas) => {
    try {
      const res = await conversationaxios.post("/agent/conversation/end", datas);
      return res;
    } catch (error) {
      console.log(error);
    } finally {
    }
  },
  getAgents: async () => {
    set({ agentsLoading: true });
    try {
      const res = await conversationaxios.get("/agent/list/members");

      if (res.data && res.data.data && Array.isArray(res.data.data)) {
        set({ agentsData: res.data.data });
        return res.data.data;
      } else {
        console.warn("Invalid agents data received:", res.data);
        set({ agentsData: [] });
        return [];
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
      set({ agentsData: [] });
      return [];
    } finally {
      set({ agentsLoading: false });
    }
  },
  getSelectedNotes: async (SelectedData) => {
    set({ getSelectedNotesLoading: true });
    let data = {
      callid: SelectedData.details.c_callId
    }
    try {
      const res = await conversationaxios.post("/agent/get/callfollowup", data);
      set({ selectedNotes: res.data.data });
    } catch (error) {
      set({ selectedNotes: null });
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
      set({ getSelectedNotesLoading: false });

    }
  },
  setBreakStatus: (status) =>
    set(() => {
      if (status !== "LOGIN") {
        return {
          breakStatus: status,
          breakStartTime: Date.now(),
        };
      } else {
        return {
          breakStatus: status,
          breakStartTime: null,
        };
      }
    }),
  fetchPredictiveLeadData: async (leadid, campaignid) => {
    set({ predictiveLeadLoading: true });
    try {
      const payload = {
        leadid: leadid,
        campaignid: campaignid
      };
      const res = await conversationaxios.post("/agent/followup/predictive/fetch", payload);

      if (res.data && res.data.data && Object.keys(res.data.data).length > 0) {
        const followupData = res.data.data;

        const formElements = Object.entries(followupData).map(([label, fieldData]) => {
          if (fieldData && typeof fieldData === 'object') {
            return {
              id: fieldData.id || label,
              label: label,
              type: fieldData.type || 'Single Line Text field',
              defaultValue: fieldData.value || '',
              layout: fieldData.layout || { x: 0, y: 0, w: 4, h: 3 },
              ...(fieldData.options && { options: fieldData.options }),
              ...(fieldData.conditions && { conditions: fieldData.conditions })
            };
          }
          return null;
        }).filter(Boolean);

        const formPayload = {
          formTitle: 'Predictive Followup Form',
          elements: formElements
        };

        set({ formData: formPayload, predictiveLeadData: null });
        return followupData;
      } else if (res.data && res.data.f_formPayload && Object.keys(res.data.f_formPayload).length > 0) {
        set({ formData: res.data.f_formPayload, predictiveLeadData: null });
        return res.data.f_formPayload;
      } else {
        set({ predictiveLeadData: null });
        return await useConversationStore.getState().fetchFormByCampaign(campaignid);
      }
    } catch (error) {
      console.error("Error fetching predictive lead form:", error);
      set({ predictiveLeadData: null });
      return await useConversationStore.getState().fetchFormByCampaign(campaignid);
    } finally {
      set({ predictiveLeadLoading: false });
    }
  },
  getBreakTimer: () => {
    const { breakStartTime } = get();
    if (!breakStartTime) return 0;
    return Math.floor((Date.now() - breakStartTime) / 1000);
  },

}));
