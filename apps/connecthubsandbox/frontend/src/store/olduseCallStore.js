import { create } from "zustand";
import {
  UserAgent,
  Registerer,
  Inviter,
  Invitation,
  SessionState,
  RegistererState,
} from "sip.js";

// Your SIP credentials
const credentials = {
  server: "wss://pulse-proxy-1.pulsework360.com:8089/ws",
  uri: "sip:1934@13.201.218.156",
  authorizationUsername: "1934",
  authorizationPassword: "Pulse@123",
};

export const callStore = create((set, get) => ({
  // UI state
  callBottomBar: true,
  callType: "", // "incoming" | "outgoing" | ""
  callstatus: "", // "ringing" | "answered" | "ended" | "declined"
  dialnumber: "",
  muted: false,
  hold: false,

  // SIP.js objects
  ua: null,
  registerer: null,
  session: null, // Inviter or Invitation

  // Optional helper
  setCallStatus: (status) => set({ callstatus: status }),

  // initialize UserAgent and REGISTER with the SIP server
  initUA: async () => {
    const transportOptions = {
      server: credentials.server,
      traceSip: false, // disable SIP message dumps
    };
    const userAgentOptions = {
      uri: UserAgent.makeURI(credentials.uri),
      authorizationUsername: credentials.authorizationUsername,
      authorizationPassword: credentials.authorizationPassword,
      transportOptions,
      logLevel: "error", // only errors, no debug/log/warn
    };

    const ua = new UserAgent(userAgentOptions);
    await ua.start();

    const registerer = new Registerer(ua);
    registerer.stateChange.addListener((state) => {
      console.log("REGISTER state:", state);
      if (state === RegistererState.Registered) {
        console.log("✅ Registered");
      } else if (state === RegistererState.Unregistered) {
        console.log("📴 Unregistered");
      }
    });
    await registerer.register();

    // Handle incoming calls
    ua.delegate = {
      onInvite: (invitation) => {
        console.log("📞 Incoming from", invitation.request.from.uri.toString());
        // show bar + ringing
        set({
          session: invitation,
          callBottomBar: true,
          callType: "Incoming",
          callstatus: "Ringing",
        });

        invitation.stateChange.addListener((newState) => {
          console.log("Incoming session:", newState);
          switch (newState) {
            case SessionState.Established:
              console.log("✅ Call answered");
              set({ callstatus: "Answered" });
              break;
            case SessionState.Terminated:
              // if caller hung up before answer → canceled
              const finalStatus = invitation.canceled ? "declined" : "ended";
              console.log("❌ Call", finalStatus);
              set({
                callstatus: finalStatus,
                callBottomBar: false,
                callType: "",
                session: null,
              });
              break;
          }
        });

        // To auto-answer:
        // invitation.accept();
      },
    };

    set({ ua, registerer });
  },

  // make an outgoing call
  makeCall: async (number) => {
    const targetUri = `sip:${number}@pulse-proxy-1.pulsework360.com`;
    const { ua } = get();
    if (!ua) {
      console.error("UA not initialized—run initUA() first.");
      return;
    }

    const target = UserAgent.makeURI(targetUri);
    if (!target) {
      console.error("Invalid URI:", targetUri);
      return;
    }

    const inviter = new Inviter(ua, target, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
      },
    });

    // show bar + outgoing ringing
    set({
      session: inviter,
      callBottomBar: true,
      dialnumber: number,
      callType: "Outgoing",
      callstatus: "Ringing",
    });

    inviter.stateChange.addListener((state) => {
      console.log("Outgoing session:", state);
      switch (state) {
        case SessionState.Established:
          console.log("✅ Call connected");
          set({ callstatus: "Answered" });
          break;
        case SessionState.Terminated:
          console.log("❌ Call ended");
          set({
            callstatus: "Call ended",
            callBottomBar: false,
            dialnumber: "",
            callType: "",
            session: null,
          });
          break;
      }
    });

    try {
      await inviter.invite();
    } catch (err) {
      console.error("Call failed:", err);
      // treat as declined
      set({
        callstatus: "declined",
        callBottomBar: false,
        callType: "",
        session: null,
      });
    }
  },

  // hang up the current session
  hangUp: async () => {
    const session = get().session;
    console.log("hangup function", session);
    if (!session) return;

    try {
      // if it's an outgoing INVITE still ringing
      if (
        session instanceof Inviter &&
        session.state !== SessionState.Established
      ) {
        await session.cancel();
      }
      // if it's an incoming INVITE still ringing
      else if (
        session instanceof Invitation &&
        session.state !== SessionState.Established
      ) {
        await session.reject();
      }
      // if already in call
      else {
        await session.bye();
      }
      console.log("📴 Call terminated/canceled/rejected");
    } catch (err) {
      console.warn("Error in hangUp():", err);
    } finally {
      set({
        session: null,
        callstatus:
          session.state === SessionState.Established
            ? "Call ended"
            : "declined",
        callType: "",
        callBottomBar: false,
        dialnumber: "",
      });
    }
  },

  // Toggle mute/unmute
  toggleMute: () => {
    const { session, muted } = get();
    if (!session || !session.sessionDescriptionHandler) return;

    const pc = session.sessionDescriptionHandler.peerConnection;
    pc.getSenders().forEach((sender) => {
      if (sender.track?.kind === "audio") {
        // when muted=false we disable; when muted=true we enable
        sender.track.enabled = muted;
      }
    });

    set({ muted: !muted });
  },

  // Put call on hold (a=sendonly), or resume (a=sendrecv)
 holdCall: async () => {
    const session = get().session;
    if (!session) return;
    try {
      await session.hold();
      set({ hold: true, callstatus: "On Hold" });
    } catch (err) {
      console.error("Hold failed:", err);
    }
  },

  // resume the call
  unholdCall: async () => {
    const session = get().session;
    if (!session) return;
    try {
      await session.unhold();
      set({ hold: false, callstatus: "Resumed" });
    } catch (err) {
      console.error("Unhold failed:", err);
    }
  },
}));
