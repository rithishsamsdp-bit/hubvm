// useSocketStore.js
import { create } from 'zustand';
import { io } from 'socket.io-client';
import { callStore } from './useCallStore';
const Production_URL = 'https://connecthub.pulsework360.com/socketagent/agentevent';
const dashboard_url = 'https://connecthub.pulsework360.com/socketadmin/monitoring';

export const useSocketStore = create((set, get) => ({
  socket: null,
  conferenceHangupEvent: null,

  connectSocket: () => {
    const { socket } = get();
    if (socket?.connected) return;

    const cookieValue = document.cookie;
    console.log(Production_URL);
    const newSocket = io(Production_URL, {
      path: "/socketagent",
      transports: ["websocket"],
      withCredentials: true,
    });


    newSocket.on('connect', () => {
      console.log('Socket Connected Id:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

      /** ❌ BASIC CONNECTION ERROR */
  newSocket.on("connect_error", (error) => {
    console.error("🔴 Socket connect_error:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
  });

  /** ❌ CONNECTION TIMEOUT */
  newSocket.on("connect_timeout", () => {
    console.error("⏱️ Socket connection timeout");
  });

  /** ❌ DISCONNECT */
  newSocket.on("disconnect", (reason) => {
    console.warn("🟠 Socket disconnected. Reason:", reason);
  });

  /** 🔄 RECONNECT ATTEMPTS */
  newSocket.io.on("reconnect_attempt", (attempt) => {
    console.log(`🔁 Reconnect attempt #${attempt}`);
  });

  newSocket.io.on("reconnect_error", (error) => {
    console.error("🔴 Reconnect error:", error.message);
  });

  newSocket.io.on("reconnect_failed", () => {
    console.error("❌ Reconnect failed completely");
  });


    newSocket.on('response', (eventData) => {
      console.log('🔵 Socket response received:', eventData);

      if (eventData.type === 'confrencehangup') {
        console.log('Conference hangup event received:', eventData);
        callStore.getState().handleConferenceParticipantLeft(eventData);

        set({ conferenceHangupEvent: eventData });
      }
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  adminDashboardSocket: null,

  clearConferenceHangupEvent: () => {
    set({ conferenceHangupEvent: null });
  },

  connectAdminDashboardSocket: () => {
    const { adminDashboardSocket } = get();
    if (adminDashboardSocket?.connected) return;

    const newSocket = io(dashboard_url, {
      path: "/socketadmin",
      transports: ["websocket"],
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('Dashboard Socket Connected');
    });

    newSocket.on('disconnect', () => {
      console.log('Dashboard Socket disconnected');
    });

    set({ adminDashboardSocket: newSocket });
  },

  disconnectAdminDashboardSocket: () => {
    const { adminDashboardSocket } = get();
    if (adminDashboardSocket?.connected) {
      adminDashboardSocket.disconnect();
      set({ adminDashboardSocket: null });
    }
  },
  agentsocket: null,

  // connectAgentWebSocket: (memberExtensionNo) => {
  //   const { socket } = get();
  //   if (socket?.connected) return;
  //   const agentSocketURL = `wss://connecthub.pulsework360.com/agent/websocket/ws/${memberExtensionNo}`;
  //   const newSocket = io(agentSocketURL, {
  //     path: "/socketagent",
  //     transports: ["websocket"],
  //     withCredentials: true,
  //   });

  //   newSocket.on('connect', () => {
  //     console.log('Socket Connected Id:', newSocket.id);
  //   });

  //   newSocket.on('disconnect', () => {
  //     console.log('Socket disconnected');
  //   });

  //   set({ socket: newSocket });
  // }
}));
