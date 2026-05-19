// useAuthStore.js
import { create } from "zustand";
import authaxios from "../services/authaxios.js";
import { callStore } from "./useCallStore.js";
import { useSocketStore } from "./useSocketStore.js";
import { useConversationStore } from "./agent/useConversationStore.js";
import conversationaxios from "../services/conversationaxios.js";
import { toast } from "./useToastStore.js";

const admin = [
  {
    id: "dashboard",
    icon: "dashboard",
    label: "Dashboard",
    route: "/admin-dashboard",
  },
  {
    id: "usercreation",
    icon: "usercreation",
    label: "User Creation",
    route: "/admin-users",
  },
  {
    id: "reports",
    icon: "report",
    label: "Reports",
    route: "/admin-reports",
  },
  {
    id: "phonenumber",
    icon: "phonenumber",
    label: "Phone Number",
    route: "/admin-phonenumber",
  },
  {
    id: "campaign",
    icon: "campaign",
    label: "Campaign",
    route: "/admin-campaign",
  },
  {
    id: "predictive",
    icon: "prediction",
    label: "Predictive",
    route: "/admin-predictive",
  },
  {
    id: "contactbook",
    icon: "contact",
    label: "Contact Book",
    route: "/admin-contactbook",
  },
  {
    id: "whatsapp",
    icon: "whatsapp",
    label: "Whatsapp",
    route: "/admin-whatsapp",
  },
  {
    id: "emailautomation",
    icon: "automation",
    label: "Email Automation",
    route: "/admin-email-automation",
  },
  {
    id: "emergency",
    icon: "emergency",
    label: "Emergency",
    route: "/admin-emergency",
  },
  {
    id: "integration",
    icon: "integration",
    label: "Integration",
    route: "/admin-integration",
  },
  {
    id: "ai",
    icon: "gen_ai",
    label: "AI Bot",
    route: "/admin-ai",
  },
  {
    id: "chat",
    icon: "sms",
    label: "Team Chat",
    route: "/chat",
  },
];

const superAdminMenu = [
  {
    id: "onboard",
    icon: "onboard",
    label: "Onboard",
    route: "/superadmin-onboard",
  },
  {
    id: "whatsapp",
    icon: "whatsapp",
    label: "WhatsApp Onboard",
    route: "/superadmin-whatsapp",
  },
  {
    id: "peer",
    icon: "peer",
    label: "Peer",
    route: "/superadmin-peer",
  },
  {
    id: "phonenumber",
    icon: "phonenumber",
    label: "Phone Number",
    route: "/superadmin-phonenumber",
  },
  {
    id: "reports",
    icon: "report",
    label: "Report",
    route: "/superadmin-reports",
  },
  {
    id: "billing",
    icon: "account_balance",
    label: "Billing",
    route: "/superadmin-billing",
  },
  {
    id: "apilogs",
    icon: "api",
    label: "API Logs",
    route: "/superadmin-apilogs",
  },
  {
    id: "chat",
    icon: "sms",
    label: "Team Chat",
    route: "/chat",
  },
];

const tlMenu = [
  {
    id: "dashboard",
    icon: "dashboard",
    label: "Dashboard",
    route: "/tl-dashboard",
  },
  {
    id: "reports",
    icon: "report",
    label: "Reports",
    route: "/tl-reports",
  },
  {
    id: "phonenumber",
    icon: "phonenumber",
    label: "Phone Number",
    route: "/tl-phonenumber",
  },
  {
    id: "campaign",
    icon: "campaign",
    label: "Campaign",
    route: "/tl-campaign",
  },
  {
    id: "whatsapp",
    icon: "whatsapp",
    label: "Whatsapp",
    route: "/tl-whatsapp",
  },
  {
    id: "chat",
    icon: "sms",
    label: "Team Chat",
    route: "/chat",
  },
];

const userMenu = [
  {
    id: "dashboard",
    icon: "dashboard",
    label: "Dashboard",
    route: "/agent-dashboard",
  },
  {
    id: "conversation",
    icon: "call",
    label: "Conversation",
    route: "/agent-conversation",
  },
  {
    id: "reports",
    icon: "report",
    label: "Reports",
    route: "/agent-reports",
  },
  {
    id: "contactbook",
    icon: "contact",
    label: "Contact Book",
    route: "/agent-contactbook",
  },
  {
    id: "chat",
    icon: "sms",
    label: "Team Chat",
    route: "/chat",
  },
];

export const useAuthStore = create((set, get) => ({
  authUser: null,
  authRole: null,
  authName: null,
  authExtension: null,
  authPlan: null,
  accountCode: null,
  menus: [],
  isLoggingIn: false,
  isCheckingAuth: true,
  notificationData: [],
  missedCallData: [],
  notificationLoading: false,
  missedCallLoading: false,
  loginData: null,
  sessionId: localStorage.getItem("sessionId") || null,
  sessionPollingEnabled: true,

  setSessionId: (id) => {
    localStorage.setItem("sessionId", id);
    set({ sessionId: id });
  },


  addNotification: (newItem) =>
    set((state) => ({
      notificationData: [newItem, ...state.notificationData],
    })),

  setMissedCallData: (newItem) =>
    set((state) => ({
      missedCallData: [newItem, ...state.missedCallData],
    })),

  clearNotifications: (type) => {
    if (type === "notification") set({ notificationData: [] });
    if (type === "missedcall") set({ missedCallData: [] });
  },

  checkSessionStatus: async () => {
    try {
      const res = await authaxios.get("/auth/session/status");
      if (res.data.polling_enabled === false) {
        set({ sessionPollingEnabled: false });
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        get().logout();
      }
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await authaxios.post('/auth/login', data);

      if (res.data.message === "Duplicate Session Detected") {
        set({ isLoggingIn: false });
        return { success: false, duplicateSession: true, sessionData: res.data.session, userData: res.data.data, message: res.data.message };
      }

      if (res.data.message === "Two Factor Authentication Required") {
        const initialMemberDetails = res.data.data;

        try {
          const otpGenRes = await authaxios.post('/auth/otp/generate', {
            memberdetails: initialMemberDetails,
            authenticationtype: "email"
          });

          // Use the memberdetails returned from the generation API as requested
          set({ loginData: otpGenRes.data.memberdetails || initialMemberDetails });

        } catch (otpError) {
          console.error("Failed to generate OTP:", otpError);
          toast.error("Failed to send verification code. Please try again.");
          set({ isLoggingIn: false });
          return { success: false, message: "Failed to send verification code" };
        }

        set({ isLoggingIn: false });
        return { success: false, message: res.data.message, twoFactor: true };
      }

      set({ authUser: res.data.data });
      set({ authRole: res.data.data.m_memberRole });
      set({ authName: res.data.data.m_memberName || "UnKnown" });
      set({ authExtension: res.data.data.m_memberExtensionNo });
      set({ authPlan: res.data.data.m_memberplanDetails });
      set({ accountCode: res.data.data.m_accountCode });
      get().getMenus();

      if (res.data.data.m_memberRole === "USER" || res.data.data.m_memberRole === "ADMIN" || res.data.data.m_memberRole === "TL") {
        callStore.getState().initUA();

        setTimeout(() => {
          useConversationStore.getState().updateReadyNotReady(true);
        }, 1000);

        const CampaignId = res.data.data.m_campaignId;
        if (CampaignId) {
          localStorage.setItem("CampaignId", CampaignId);
          useConversationStore.getState().fetchFormByCampaign(CampaignId);
        }
      }

      if (res.data.data.m_memberRole === 'ADMIN' || res.data.data.m_memberRole === 'TL') {
        useSocketStore.getState().connectAdminDashboardSocket();
      }

      if (res.data.data.m_memberRole === 'USER') {
        get().fetchNotifications(res.data.data.m_memberExtensionNo, ["CALLBACK", "INCOMINGSMS"], 20, 0);
        get().fetchNotifications(res.data.data.m_memberExtensionNo, ["MISSEDCALL"], 20, 0);
      }

      toast.success(res.data.message);
      return { success: true, message: res.data.message };
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
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    } finally {
      set({ isLoggingIn: false });
    }
  },

  verifyLoginOTP: async (otp) => {
    set({ isLoggingIn: true });
    try {
      const memberDetails = get().loginData;
      const res = await authaxios.post('/auth/otp/verify', {
        memberdetails: memberDetails,
        otp: otp
      });

      set({ authUser: res.data.data });
      set({ authRole: res.data.data.m_memberRole });
      set({ authName: res.data.data.m_memberName || "UnKnown" });
      set({ authExtension: res.data.data.m_memberExtensionNo });
      set({ authPlan: res.data.data.m_memberplanDetails });
      set({ accountCode: res.data.data.m_accountCode });
      get().getMenus();

      if (res.data.data.m_memberRole === "USER" || res.data.data.m_memberRole === "ADMIN" || res.data.data.m_memberRole === "TL") {
        callStore.getState().initUA();

        setTimeout(() => {
          useConversationStore.getState().updateReadyNotReady(true);
        }, 1000);

        const CampaignId = res.data.data.m_campaignId;
        if (CampaignId) {
          localStorage.setItem("CampaignId", CampaignId);
          useConversationStore.getState().fetchFormByCampaign(CampaignId);
        }
      }

      if (res.data.data.m_memberRole === 'ADMIN' || res.data.data.m_memberRole === 'TL') {
        useSocketStore.getState().connectAdminDashboardSocket();
      }

      if (res.data.data.m_memberRole === 'USER') {
        get().fetchNotifications(res.data.data.m_memberExtensionNo, ["CALLBACK", "INCOMINGSMS"], 20, 0);
        get().fetchNotifications(res.data.data.m_memberExtensionNo, ["MISSEDCALL"], 20, 0);
      }

      toast.success(res.data.message);
      return { success: true, message: res.data.message };
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
      return { success: false, message: error.response?.data?.message || 'Verification failed' };
    } finally {
      set({ isLoggingIn: false });
    }
  },

  resendOTP: async () => {
    const memberDetails = get().loginData;
    if (!memberDetails) return { success: false, message: "No login data found" };

    try {
      const res = await authaxios.post('/auth/otp/generate', {
        memberdetails: memberDetails,
        authenticationtype: "email"
      });

      set({ loginData: res.data.memberdetails || memberDetails });
      toast.success(res.data.message || "Verification code resent.");
      return { success: true };
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast.error("Failed to resend verification code.");
      return { success: false };
    }
  },



  setAuthRole: (userRole) => set({ authRole: userRole }),


  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      const res = await authaxios.post("/auth/refresh");
      set({ authUser: res.data.data });
      set({ authRole: res.data.data.m_memberRole });
      set({ authName: res.data.data.m_memberName || "UnKnown" });
      set({ authExtension: res.data.data.m_memberExtensionNo });
      set({ authPlan: res.data.data.m_memberplanDetails });
      set({ accountCode: res.data.data.m_accountCode });
      get().getMenus();

      if (res.data.data.m_memberRole === "USER" || res.data.data.m_memberRole === "ADMIN" || res.data.data.m_memberRole === "TL") {
        callStore.getState().initUA();
        useConversationStore.getState().initializeCallStatus();
        const CampaignId = localStorage.getItem("CampaignId");
        if (CampaignId) {
          useConversationStore.getState().fetchFormByCampaign(CampaignId);
        }
      }

      if (res.data.data.m_memberRole === 'ADMIN' || res.data.data.m_memberRole === 'TL') {
        useSocketStore.getState().connectAdminDashboardSocket();
      }
      if (res.data.data.m_memberRole === 'USER') {
        get().fetchNotifications(res.data.data.m_memberExtensionNo, ["CALLBACK", "INCOMINGSMS"], 20, 0);
        get().fetchNotifications(res.data.data.m_memberExtensionNo, ["MISSEDCALL"], 20, 0);
      }
    } catch (error) {
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  fetchNotifications: async (extensionNo, type, limit = 20, offset = 0) => {
    const data = {
      "memberextensionno": `${extensionNo}`,
      "notificationtype": type,
      "limit": limit,
      "offset": offset
    }

    const isCallbackType = Array.isArray(type) ? type.some(t => t !== "MISSEDCALL") : type !== "MISSEDCALL";
    const isMissedCallType = Array.isArray(type) ? type.includes("MISSEDCALL") : type === "MISSEDCALL";

    try {
      if (isCallbackType) set({ notificationLoading: true });
      if (isMissedCallType) set({ missedCallLoading: true });

      const res = await conversationaxios.post('/agent/notification/list', data);
      const items = Array.isArray(res.data.data) ? res.data.data : [];

      if (isCallbackType) {
        const callbackNotifications = items.filter((n) => n.action !== "MISSEDCALL").map((n) => ({
          ...n,
          notificationType:
            n.notificationType || n.action,
          isRead:
            n.notificationStatus === "READ",
          title:
            n.title ||
            (n.notificationType === "CALLBACK" ||
              n.action === "CALLBACK"
              ? "Call Back Reminder"
              : n.notificationType === "INCOMINGSMS" ||
                n.action === "INCOMINGSMS"
                ? "Incoming SMS"
                : n.notificationType || n.action),
        }));
        set((state) => ({
          notificationData:
            offset === 0
              ? callbackNotifications
              : [
                ...state.notificationData,
                ...callbackNotifications,
              ],
        }));
      }

      if (isMissedCallType) {
        const missedCalls = items.filter(n => n.action === 'MISSEDCALL');
        const formattedMissedCalls = missedCalls.map(m => ({
          ...m,
          action: m.action,
          phonenumber: m.notificationData?.phonenumber,
          notificationTime: m.notificationTime,
          isRead: m.notificationStatus === "READ"
        })).reverse();

        set((state) => ({
          missedCallData: offset === 0
            ? formattedMissedCalls
            : [...state.missedCallData, ...formattedMissedCalls]
        }));
      }

    } catch (error) {
      console.log(`Error fetching ${type} notifications:`, error);
    } finally {
      if (isCallbackType) set({ notificationLoading: false });
      if (isMissedCallType) set({ missedCallLoading: false });
    }
  },

  updateNotificationStatus: async (notificationIds, status) => {
    try {
      const data = {
        "notificationids": notificationIds,
        "notificationstatus": status
      };

      await conversationaxios.post('/agent/notification/status/update', data);

      // Optimistically update local state
      set((state) => {
        const updatedNotificationData = state.notificationData.map(n => {
          if (notificationIds.includes(n.notificationId)) {
            return status === "DISMISSED" ? null : { ...n, isRead: true, notificationStatus: "READ" };
          }
          return n;
        }).filter(Boolean);

        const updatedMissedCallData = state.missedCallData.map(n => {
          if (notificationIds.includes(n.notificationId)) {
            return status === "DISMISSED" ? null : { ...n, isRead: true, notificationStatus: "READ" };
          }
          return n;
        }).filter(Boolean);

        return {
          notificationData: updatedNotificationData,
          missedCallData: updatedMissedCallData
        };
      });

    } catch (error) {
      console.error("Error updating notification status:", error);
      toast.error("Failed to update notification status");
    }
  },
  logout: async () => {
    set({ isCheckingAuth: true });
    try {
      const res = await authaxios.post("/auth/logout");
      await callStore.getState().unregisterUA();
      if (get().authRole === 'ADMIN' || get().authRole === 'TL') {
        useSocketStore.getState().disconnectAdminDashboardSocket();
      }
      set({ authUser: null });
      set({ authRole: null });
      set({ authName: null });
      set({ authExtension: null });
      localStorage.clear();
      toast.success(res.data.message);
      window.location.reload();
    } catch (error) {
      set({ authUser: null });
      set({ authRole: null });
      set({ authName: null });
      set({ authExtension: null });
      localStorage.clear();
      window.location.reload();

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
      set({ isCheckingAuth: false });
    }
  },
  getMenus: () => {
    const menuAccess = get().authPlan?.menu;
    const authRole = get().authRole;
    const authName = get().authName;

    if (authRole === "SUPERADMIN") {
      const filtered = superAdminMenu.filter(item => {
        if (item.id === "chat") return get().accountCode?.toUpperCase() === "PTPL";
        return true;
      });
      set({ menus: filtered });
      return;
    }

    if (authRole === "ADMIN") {
      let filtered = admin.filter(
        (item) => (menuAccess?.[item.id] === true || item.id === "contactbook" || item.id === "chat") &&
          (item.id !== "chat" || get().accountCode?.toUpperCase() === "PTPL")
      );

      // 🔹 Specific restriction for Squareone (PTPL)
      if (authName === "Squareone" && get().accountCode?.toUpperCase() === "PTPL") {
        const allowedIds = ["dashboard", "reports", "whatsapp"];
        filtered = filtered.filter(item => allowedIds.includes(item.id));
      }

      // 🔹 DEFAULT ADMIN
      set({ menus: filtered });
      return;
    }

    if (authRole === "TL") {
      // Base filtered menu logic similar to ADMIN but for TL items
      const filtered = tlMenu.filter(
        (item) => (menuAccess?.[item.id] === true || item.id === "chat") &&
          (item.id !== "chat" || get().accountCode?.toUpperCase() === "PTPL")
      );

      // Check for Call Dialing permission
      if (menuAccess?.calldialing === true || menuAccess?.conversation === true) {
        // Add Conversation if enabled
        if (!filtered.some(m => m.id === "conversation")) {
          filtered.push({
            id: "conversation",
            icon: "call",
            label: "Conversation",
            route: "/tl-conversation",
          });
        }
      }

      if (menuAccess?.contactbook === true) {
        if (!filtered.some(m => m.id === "contactbook")) {
          filtered.push({
            id: "contactbook",
            icon: "contact",
            label: "Contact Book",
            route: "/tl-contactbook",
          });
        }
      }

      set({ menus: filtered });
      return;
    }

    if (authRole === "USER") {
      const filtered = userMenu.filter(
        (item) => (menuAccess?.[item.id] === true || item.id === "dashboard" || item.id === "chat") &&
          (item.id !== "chat" || get().accountCode?.toUpperCase() === "PTPL")
      );
      set({ menus: filtered });
      return;
    }

    set({ menus: [] });
  }



}));