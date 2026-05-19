import { create } from "zustand";
import {
  UserAgent,
  Registerer,
  Inviter,
  Invitation,
  SessionState,
  RegistererState,
} from "sip.js";
import { useAuthStore } from "./useAuthStore.js";
import { useConversationStore } from "./agent/useConversationStore.js";
import conversationaxios from "../services/conversationaxios";
import callingfeaturesaxios from "../services/callingfeaturesaxios"
import { toast } from "./useToastStore.js";
import { useDashboardStore } from "./admin/useDashboardStore.js";
import { v4 as uuidv4 } from "uuid";

let globalAudioContext = null;
let ringtoneAudioElement = null;
let isAudioInitialized = false;
let ringtoneTimeoutId = null;
let vibrationInterval = null;
let titleFlashInterval = null;

function attachRemoteAudio(session) {
  if (!session.sessionDescriptionHandler) return;
  const pc = session.sessionDescriptionHandler.peerConnection;

  let audioEl = document.getElementById("remoteAudio");
  if (!audioEl) {
    audioEl = document.createElement("audio");
    audioEl.id = "remoteAudio";
    audioEl.autoplay = true;
    audioEl.playsInline = true;
    document.body.appendChild(audioEl);
  }

  const remoteStream = new MediaStream();
  pc.getReceivers().forEach((receiver) => {
    if (receiver.track && receiver.track.kind === "audio") {
      remoteStream.addTrack(receiver.track);
    }
  });

  // Listen for future tracks to capture early media (beginning of IVR audio)
  pc.ontrack = (event) => {
    if (event.track && event.track.kind === "audio") {
      remoteStream.addTrack(event.track);
      audioEl.play().catch((err) => {
        console.warn("Auto-play early media blocked:", err);
      });
    }
  };

  audioEl.srcObject = remoteStream;
  audioEl.play().catch((err) => {
    console.warn("Auto-play blocked:", err);
  });
}
function getLocalTimestamp(givenDate) {
  givenDate.setMinutes(givenDate.getMinutes() - givenDate.getTimezoneOffset());
  return givenDate.toISOString().slice(0, 19);
}
function enableAudioAfterUserInteraction() {
  if (isAudioInitialized) return;

  try {
    if (!globalAudioContext) {
      globalAudioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    }

    if (globalAudioContext.state === "suspended") {
      globalAudioContext.resume().then(() => { });
    }

    if (!ringtoneAudioElement) {
      ringtoneAudioElement = document.createElement("audio");
      ringtoneAudioElement.id = "ringtoneAudio";
      ringtoneAudioElement.loop = true;
      ringtoneAudioElement.volume = 0.8;
      ringtoneAudioElement.preload = "auto";
      ringtoneAudioElement.crossOrigin = "anonymous";

      ringtoneAudioElement.innerHTML = `
        <source src="https://connecthub.pulsework360.com/sounds/ringtone.mp3" type="audio/mpeg">
        <source src="/sounds/ringtone.mp3" type="audio/mpeg">
        <source src="./sounds/ringtone.mp3" type="audio/mpeg">
        <source src="/assets/sounds/ringtone.mp3" type="audio/mpeg">
      `;

      document.body.appendChild(ringtoneAudioElement);

      ringtoneAudioElement.addEventListener("canplaythrough", () => { });

      ringtoneAudioElement.addEventListener("error", (e) => {
        console.warn("Ringtone file failed to load, will use Web Audio API");
      });

      ringtoneAudioElement.load();
    }

    if (ringtoneAudioElement) {
      ringtoneAudioElement
        .play()
        .then(() => {
          ringtoneAudioElement.pause();
          ringtoneAudioElement.currentTime = 0;
          isAudioInitialized = true;
        })
        .catch((err) => {
          console.warn("Failed to prime audio system:", err);
          isAudioInitialized = true;
        });
    }

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  } catch (error) {
    console.error("Audio initialization failed:", error);
    isAudioInitialized = true;
  }
}
async function playRingtone() {
  if (!isAudioInitialized) {
    enableAudioAfterUserInteraction();
  }

  try {
    if (ringtoneAudioElement && isAudioInitialized) {
      ringtoneAudioElement.currentTime = 0;
      await ringtoneAudioElement.play();
      return ringtoneAudioElement;
    }
  } catch (err) {
    console.warn("MP3 ringtone failed, using Web Audio API:", err);
  }

  try {
    if (!globalAudioContext) {
      globalAudioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    }

    if (globalAudioContext.state === "suspended") {
      await globalAudioContext.resume();
    }

    const createRingtonePattern = () => {
      const now = globalAudioContext.currentTime;

      const createTone = (frequency, startTime, duration) => {
        const oscillator = globalAudioContext.createOscillator();
        const gainNode = globalAudioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(globalAudioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + duration - 0.05);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      createTone(880, now, 0.4);
      createTone(659, now + 0.5, 0.4);

      ringtoneTimeoutId = setTimeout(createRingtonePattern, 2000);
    };

    createRingtonePattern();
  } catch (audioErr) {
    console.error("All audio methods failed:", audioErr);
    showBrowserNotification();
  }

  return null;
}
function showBrowserNotification() {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("📞 Incoming Call", {
      body: "Click to answer",
      icon: "/favicon.ico",
      requireInteraction: true,
      tag: "incoming-call",
    });
  }
}
const checkAudioDevices = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.warn("MediaDevices API not available");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      stream.getTracks().forEach(track => track.stop());
    } catch (permissionError) {
      console.error("❌ Microphone permission denied:", permissionError);

      if (permissionError.name === "NotAllowedError") {
        toast.error("Microphone access denied. Please allow microphone permissions in your browser settings.");
      } else if (permissionError.name === "NotFoundError") {
        toast.error("No microphone found. Please connect a microphone device.");
      } else {
        toast.error("Cannot access microphone: " + permissionError.message);
      }

      return false;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();

    const audioInputDevices = devices.filter(
      (device) => device.kind === "audioinput"
    );

    return audioInputDevices.length > 0;
  } catch (error) {
    console.error("Error checking audio devices:", error);
    return false;
  }
};
function stopRingtone() {
  if (ringtoneAudioElement) {
    ringtoneAudioElement.pause();
    ringtoneAudioElement.currentTime = 0;
  }

  if (ringtoneTimeoutId) {
    clearTimeout(ringtoneTimeoutId);
    ringtoneTimeoutId = null;
  }

  if ("vibrate" in navigator) {
    navigator.vibrate(0);
  }
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }

  if (titleFlashInterval) {
    clearInterval(titleFlashInterval);
    titleFlashInterval = null;
    const currentTitle = document.title;
    if (currentTitle.includes("📞 INCOMING CALL!")) {
      document.title =
        currentTitle.replace("📞 INCOMING CALL!", "").trim() || "ConnectHub";
    }
  }

  if ("Notification" in window) {
    try {
      new Notification("", { tag: "incoming-call", silent: true }).close();
    } catch (e) {
    }
  }
}

// ─── STORE ──────────────────────────────────────────────
export const callStore = create((set, get) => ({
  ua: null,
  registerer: null,
  isUAInitializing: false,
  session: null,
  callBottomBar: true,
  callType: "Incoming",
  callType: "Incoming",
  callstatus: "Ringing",
  dialnumber: "",
  dialerType: "MANUAL",
  muted: false,
  hold: false,
  consultationSession: null,
  isConsulting: false,
  remoteStream: null,
  activeConversationId: null,
  consultationCallId: null,
  previousCallStatus: "",
  activeCalls: [],
  isConferenceActive: false,
  isConferenceConnecting: false,
  conferenceParticipants: [],
  conferenceConversationId: null,
  createCallBackLoading: false,
  isTransferInProgress: false,
  waitingCalls: [],
  registrationInterval: null,
  fsDestination: null,

  initUA: async () => {
    try {
      if (get().ua || get().registerer || get().isUAInitializing) {
        console.warn("UA or Registerer already initialized or initializing, skipping duplicate registration.");
        return;
      }

      set({ isUAInitializing: true });

      const authUser = useAuthStore.getState().authUser;
      if (!authUser || !authUser.m_memberExtensionNo) {
        console.error("❌ No authenticated user or extension number found.");
        return;
      }
      const credentials = {
        server: `wss://${authUser.p_proxyDomainName}:8089/ws`,
        uri: `sip:${authUser.m_memberExtensionNo}@${authUser.p_proxyDomainName}`,
        authorizationUsername: authUser.m_memberExtensionNo,
        authorizationPassword: (authUser.p_proxyDomainName === "pulse-proxy-3.pulsework360.com" || authUser.p_proxyDomainName === "pulse-proxy-4.pulsework360.com" && authUser.m_memberPassword)
          ? authUser.m_memberPassword
          : `Pulse@#${authUser.m_memberExtensionNo}`,
      };

      let sipInstanceId = localStorage.getItem("sipInstanceId");
      if (!sipInstanceId) {
        sipInstanceId = uuidv4();
        localStorage.setItem("sipInstanceId", sipInstanceId);
      }

      const buildDelegate = () => ({
        onInvite: async (invitation) => {
          const fromURI = invitation.request.from.uri;
          let callerNum = fromURI.user || "";
          const callid = `in-${uuidv4()}`;

          // Extract predictive lead ID
          let predictiveLeadId = null;
          if (invitation.request.headers?.['X-Predictiveleadid']) {
            predictiveLeadId = invitation.request.headers['X-Predictiveleadid'][0]?.raw;
          } else if (invitation.request.getHeader) {
            predictiveLeadId = invitation.request.getHeader('X-predictiveleadID');
          }

          const dialerType = predictiveLeadId
            ? (localStorage.getItem("dialerType") || "PREDICTIVE")
            : "MANUAL";

          const incomingCall = {
            id: callid,
            session: invitation,
            dialnumber: callerNum,
            callerName: "Unknown",       // ✅ Set immediately, update after
            callType: "Incoming",
            callstatus: "Ringing",
            hold: false,
            muted: false,
            startTime: Date.now(),
            isIncoming: true,
            isInConference: false,
            predictiveLeadId,
            dialerType,
          };

          const { activeCalls } = get();

          if (activeCalls.length > 0) {
            set((state) => ({ waitingCalls: [...state.waitingCalls, incomingCall] }));
            showBrowserNotification();

            const waitingListener = (state) => {
              if (state === SessionState.Terminated) {
                set((state) => ({
                  waitingCalls: state.waitingCalls.filter(c => c.id !== callid)
                }));
                invitation.stateChange.removeListener(waitingListener);
              }
            };
            invitation.stateChange.addListener(waitingListener);

            // ✅ Fire-and-forget contact fetch for waiting call too
            conversationaxios.post("/agent/get/contact", {
              phonenumber: callerNum.replace(/\+/g, "")
            }).then(res => {
              const name = res.data?.data?.[0]?.c_Name;
              if (name) {
                set(state => ({
                  waitingCalls: state.waitingCalls.map(c =>
                    c.id === callid ? { ...c, callerName: name } : c
                  )
                }));
              }
            }).catch(() => { });

            return;
          }

          // ✅ Register call immediately — no await blocking
          playRingtone();
          showBrowserNotification();
          get().addCall(incomingCall);

          set({
            session: invitation,
            IncomingcallBar: true,
            callType: "Incoming",
            callstatus: "Ringing",
            hold: false,
            muted: false,
            callerName: "Unknown",
            callerNumber: callerNum,
            incomingCallId: callid,
            predictiveLeadId,
            dialerType,
          });

          // ✅ Fetch contact name in background, update UI when ready
          conversationaxios.post("/agent/get/contact", {
            phonenumber: callerNum.replace(/\+/g, "")
          }).then(res => {
            const name = res.data?.data?.[0]?.c_Name;
            if (name) {
              get().updateCall(callid, { callerName: name });
              set({ callerName: name });
            }
          }).catch(() => { });

          // Browser notification (delayed for visibility check)
          setTimeout(() => {
            if (document.visibilityState !== "visible") {
              try {
                new Notification("📞 Incoming Call", {
                  body: `Call from ${callerNum}`,
                  icon: "/favicon.ico",
                  requireInteraction: true,
                  tag: `incoming-${callid}`
                });
              } catch (err) {
                console.warn("Notification error:", err);
              }
            }
          }, 300);

          // Session state listeners
          invitation.stateChange.addListener((state) => {
            if (state === SessionState.Establishing) {
              stopRingtone();
              attachRemoteAudio(invitation);
              get().updateCall(callid, { callstatus: "Connecting" });
            }

            if (state === SessionState.Established) {
              stopRingtone();
              attachRemoteAudio(invitation);

              const establishedTime = Date.now();
              const normalizePhone = (p) => p ? String(p).replace(/\D/g, '') : '';
              const normalizedCallerNum = normalizePhone(callerNum);

              const { conversations } = useConversationStore.getState();
              const matchingConversation = conversations.find((c) => {
                const n = normalizePhone(c.c_conversationPhoneNo);
                return n && normalizedCallerNum && (
                  n === normalizedCallerNum ||
                  n.endsWith(normalizedCallerNum) ||
                  normalizedCallerNum.endsWith(n)
                );
              });
              const conversationId = matchingConversation?.c_conversationId || null;

              get().updateCall(callid, {
                callstatus: "In Call",
                startTime: establishedTime,
                activeConversationId: conversationId,
              });

              set({
                callstatus: "Answered",
                IncomingcallBar: false,
                dialnumber: callerNum,
                activeConversationId: conversationId,
              });

              useConversationStore.setState({
                conversations: conversations.map((c) =>
                  conversationId && c.c_conversationId === conversationId
                    ? { ...c, startTime: establishedTime, stopped: false, duration: null }
                    : c
                )
              });

              setTimeout(() => useConversationStore.getState().getConversations(), 2000);
            }

            if (state === SessionState.Terminated) {
              stopRingtone();
              const call = get().getCall(callid);
              const callStartTime = call?.startTime || Date.now();

              get().removeCall(callid);

              if (get().session === invitation) {
                set({
                  callstatus: invitation.isCanceled ? "Declined" : "Call ended",
                  callType: "",
                  session: null,
                  dialnumber: "",
                  hold: false,
                  muted: false,
                  consultationSession: null,
                  isConsulting: false,
                  IncomingcallBar: false,
                  incomingCallId: null,
                });
              }

              const { conversations } = useConversationStore.getState();
              const durationSeconds = Math.floor((Date.now() - callStartTime) / 1000);
              useConversationStore.setState({
                conversations: conversations.map((c) =>
                  c.mobileNO === callerNum
                    ? { ...c, stopped: true, duration: durationSeconds }
                    : c
                )
              });
            }
          });
        },   // ✅ Only one onInvite — no duplicate
      });

      const uaOptions = {
        uri: UserAgent.makeURI(credentials.uri),
        authorizationUsername: credentials.authorizationUsername,
        authorizationPassword: credentials.authorizationPassword,
        instanceId: sipInstanceId,
        transportOptions: { server: credentials.server },
        hackIpInContact: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 5,
        keepAliveInterval: 30,
        contactName: authUser.m_memberExtensionNo,
        sessionDescriptionHandlerFactoryOptions: {
          constraints: { audio: true, video: false },
        },
        logLevel: "error",
        delegate: buildDelegate(get),
      };

      const ua = new UserAgent(uaOptions);

      if (ua.transport) {
        ua.transport.stateChange.addListener((newState) => {
          if (newState === "Connected") {
            set({ registrationStatus: "Registered" });
          }
        });
      }

      await ua.start();

      // Bypassing sip.js transaction drop restrictions by inspecting raw incoming websocket frames
      if (ua.transport && typeof ua.transport.onMessage === 'function') {
        const originalOnMessage = ua.transport.onMessage;
        ua.transport.onMessage = (message) => {
          if (typeof message === 'string' && message.includes('X-FS-Destination:')) {
            const match = message.match(/X-FS-Destination:\s*([^\r\n]+)/i);
            if (match) {
              const fsDest = match[1].trim();
              if (get().fsDestination !== fsDest) {
                console.log("🎯 Raw Transport Intercept - Found X-FS-Destination:", fsDest);
                set({ fsDestination: fsDest });
              }
            }
          }
          // Pass it to the original sip.js handler
          if (originalOnMessage) {
            originalOnMessage.call(ua.transport, message);
          }
        };
      }

      enableAudioAfterUserInteraction();

      const registerer = new Registerer(ua, { expires: 300 });

      registerer.stateChange.addListener((newState) => {
        switch (newState) {
          case RegistererState.Registered:
            set({ registrationStatus: "Registered" });
            break;

          case RegistererState.Unregistered:
            console.warn("⚠️ Unregistered");
            //set({ registrationStatus: "Unregistered" });
            break;

          case RegistererState.Terminated:
            console.error("❌ Registration terminated (auth failure or network issue)");
            //set({ registrationStatus: "Terminated" });
            break;
        }
      });

      const extractFsDest = (response, eventName) => {
        let rawData = response?.message?.data || "";
        if (!rawData && response?.message?.toString) {
          rawData = response.message.toString();
        }
        console.log(`Raw SIP Response Content (${eventName}):\\n`, rawData);

        let fsDest = response?.message?.getHeader?.('X-FS-Destination') || response?.message?.getHeader?.('x-fs-destination');

        if (!fsDest && response?.message?.headers) {
          const headers = Object.keys(response.message.headers);
          const fsKey = headers.find(k => k.toLowerCase() === 'x-fs-destination');
          if (fsKey && response.message.headers[fsKey].length > 0) {
            fsDest = response.message.headers[fsKey][0].raw;
          }
        }

        if (!fsDest && rawData) {
          const match = rawData.match(/X-FS-Destination:\s*([^\r\n]+)/i);
          if (match) {
            fsDest = match[1].trim();
            console.log(`Extracted X-FS-Destination with Regex (${eventName}):`, fsDest);
          }
        }

        console.log(`SIP REGISTRATION ${eventName}! Parsed fsDestination:`, fsDest);

        if (fsDest) {
          set({ fsDestination: fsDest });
        }
      };

      const registerOptions = {
        requestDelegate: {
          onAccept: (response) => extractFsDest(response, "SUCCESS"),
          onReject: (response) => extractFsDest(response, "REJECTED (401)")
        }
      };

      await registerer.register(registerOptions);

      const existingInterval = get().registrationInterval;
      if (existingInterval) clearInterval(existingInterval);

      const interval = setInterval(async () => {
        try {
          await registerer.register(registerOptions);
        } catch (err) {
          console.error("❌ [SIP] Manual registration refresh failed:", err);
        }
      }, 30000);

      set({ registrationInterval: interval });

      set({ ua, registerer, isUAInitializing: false });
    } catch (error) {
      console.error("🚨 initUA failed:", error);
      set({ registrationStatus: "Error", isUAInitializing: false });
    }
  },
  acceptWaitingCall: async (callId = null) => {
    const { waitingCalls, activeCalls, addCall, updateCall, hold } = get();
    if (!waitingCalls || waitingCalls.length === 0) return;

    let waitingCall;
    if (callId) {
      waitingCall = waitingCalls.find(c => c.id === callId);
    } else {
      waitingCall = waitingCalls[0];
    }

    if (!waitingCall || !waitingCall.session) return;

    try {
      if (activeCalls.length > 0) {
        for (const existingCall of activeCalls) {
          if (!existingCall.hold && existingCall.session?.sessionDescriptionHandler) {
            const holdOptions = {
              sessionDescriptionHandlerModifiers: [
                (description) => {
                  if (description.sdp) {
                    description.sdp = description.sdp.replace(/a=sendrecv/g, "a=sendonly");
                  }
                  return Promise.resolve(description);
                },
              ],
            };
            try {
              await existingCall.session.invite(holdOptions);
              updateCall(existingCall.id, {
                hold: true,
                callstatus: existingCall.muted ? "On Hold & Muted" : "On Hold",
              });
            } catch (holdErr) {
              console.warn("Failed to hold call", existingCall.id, holdErr);
            }
          }
        }
      }

      try {
        await waitingCall.session.accept({
          sessionDescriptionHandlerOptions: {
            constraints: { audio: true, video: false },
            iceGatheringTimeout: 100, // Faster answer start
          },
        });
      } catch (acceptErr) {
        console.error("Accept failed", acceptErr);
        return;
      }

      const newActiveCall = {
        ...waitingCall,
        callstatus: "Answered",
        startTime: Date.now(),
      };

      addCall(newActiveCall);

      set((state) => ({
        waitingCalls: state.waitingCalls.filter(c => c.id !== waitingCall.id),
        session: waitingCall.session,
        callstatus: "Answered",
        IncomingcallBar: false,
        dialnumber: waitingCall.dialnumber,
        callerName: waitingCall.callerName,
        activeConversationId: waitingCall.activeConversationId || null,
      }));

      const attachListeners = (session, callId) => {
        session.stateChange.addListener((state) => {
          if (state === SessionState.Established) {
            attachRemoteAudio(session);
            get().updateCall(callId, { callstatus: "In Call" });
          }
          if (state === SessionState.Terminated) {
            stopRingtone();
            get().removeCall(callId);
            const currentSess = get().session;
            if (currentSess === session) {
              set({
                session: null,
                callstatus: "Call ended",
                dialnumber: "",
                callType: ""
              });
            }
          }
        });
      };

      attachListeners(waitingCall.session, waitingCall.id);
      attachRemoteAudio(waitingCall.session);

    } catch (error) {
      console.error("Failed to accept waiting call:", error);
    }
  },
  rejectWaitingCall: async (callId = null) => {
    const { waitingCalls } = get();
    if (!waitingCalls || waitingCalls.length === 0) return;

    let waitingCall;
    if (callId) {
      waitingCall = waitingCalls.find(c => c.id === callId);
    } else {
      waitingCall = waitingCalls[0];
    }

    if (!waitingCall || !waitingCall.session) return;

    try {
      if (waitingCall.session.state !== SessionState.Terminated) {
        await waitingCall.session.reject();
      }
      set((state) => ({
        waitingCalls: state.waitingCalls.filter(c => c.id !== waitingCall.id)
      }));
    } catch (error) {
      console.error("Failed to reject waiting call:", error);
      set((state) => ({
        waitingCalls: state.waitingCalls.filter(c => c.id !== waitingCall.id)
      }));
    }
  },
  unregisterUA: async () => {

    try {
      const { ua, registerer, session, activeCalls } = get();

      for (const call of activeCalls) {
        try {
          if (call.session?.state === SessionState.Established) {
            await call.session.bye();
          }
        } catch (err) {
          console.warn("Error ending call during cleanup:", err);
        }
      }

      if (session) {
        try {
          if (session.state === SessionState.Established) {
            await session.bye();
          }
        } catch (err) {
          console.warn("Error ending session:", err);
        }
      }

      if (registerer) {
        try {
          await registerer.unregister();
          registerer.stateChange.removeAllListeners?.();
        } catch (unregErr) {
          console.warn("⚠️ Unregister error:", unregErr);
        }
      }

      if (ua) {
        ua.delegate = null;

        if (ua.transport) {
          ua.transport.removeAllListeners?.();
        }

        try {
          await ua.stop();
        } catch (stopErr) {
          console.warn("⚠️ Error stopping UA:", stopErr);
        }

        if (ua.dispose) {
          await ua.dispose();
        }
      }

      stopRingtone();
      const audioEl = document.getElementById("remoteAudio");
      if (audioEl) {
        if (audioEl.srcObject) {
          audioEl.srcObject.getTracks().forEach(track => track.stop());
          audioEl.srcObject = null;
        }
        audioEl.remove();
      }

      set({
        ua: null,
        registerer: null,
        session: null,
        registrationStatus: "Unregistered",
        callstatus: "",
        callType: "",
        dialnumber: "",
        IncomingcallBar: false,
        hold: false,
        muted: false,
        consultationSession: null,
        isConsulting: false,
        activeCalls: [],
        isConferenceActive: false,
        conferenceParticipants: [],
      });

    } catch (error) {
      console.error("🚨 Failed to unregister UA:", error);

      set({
        ua: null,
        registerer: null,
        session: null,
        registrationStatus: "Error",
        activeCalls: [],
      });
    }
  },
  makeCall: async (number, navigate, campaignId, holdOthers = true) => {
    const { ua, addCall, updateCall, removeCall, activeCalls, isConferenceActive } = get();
    const authUser = useAuthStore.getState().authUser;
    if (!ua) {
      console.error("UA not initialized, run initUA first.");
      return;
    }

    if (isConferenceActive) {

      const agentConferenceCall = activeCalls.find(
        (call) => call.isInConference && call.callerName === "Agent (Conference)"
      );

      if (agentConferenceCall) {
        try {
          if (agentConferenceCall.session?.state === SessionState.Established) {
            await agentConferenceCall.session.bye();
          }

          removeCall(agentConferenceCall.id);
          const remainingConferenceParticipants = activeCalls.filter(
            (call) => call.isInConference &&
              call.callerName !== "Agent (Conference)" &&
              call.id !== agentConferenceCall.id
          );

          if (remainingConferenceParticipants.length === 0) {
            set({ isConferenceActive: false, conferenceParticipants: [] });
          } else {
            const participantIds = remainingConferenceParticipants.map(p => p.id);

            set({
              isConferenceActive: true,
              conferenceParticipants: participantIds
            });

            remainingConferenceParticipants.forEach(participant => {
              updateCall(participant.id, {
                isInConference: true,
                callstatus: participant.callstatus === "In Conference"
                  ? "In Conference"
                  : participant.callstatus
              });
            });
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error("Failed to remove agent from conference:", error);
        }
      }
    }

    const callid = `out-${uuidv4()}`;

    const hasAudioDevices = await checkAudioDevices();

    let leadData = null;

    if (hasAudioDevices) {
      try {
        navigate("/agent-conversation");

        const leadResponse = await conversationaxios.post(
          "/agent/callevent/outbound/init",
          {
            phonenumber: number,
            memberextensionno: authUser.m_memberExtensionNo,
            campaignid: campaignId,
            callid,
          }
        );
        leadData = leadResponse.data?.data || null;

        try {
          await useConversationStore.getState().getConversations();
        } catch (err) {
          console.error("Failed to refresh conversations:", err);
        }
      } catch (error) {
        console.error("Failed to fetch lead data:", error);
        return;
      }
    } else {
      console.warn(
        "No audio devices detected, skipping /agent/callevent/outbound/init API call"
      );
      navigate("/agent-conversation");
      toast.error(
        "No microphone detected. Please connect an audio device for better call experience."
      );
    }

    if (holdOthers && activeCalls.length > 0) {
      for (const existingCall of activeCalls) {
        if (
          !existingCall.hold &&
          existingCall.session?.sessionDescriptionHandler
        ) {
          const holdStartTime = Date.now();

          try {
            const holdOptions = {
              sessionDescriptionHandlerModifiers: [
                (description) => {
                  if (description.sdp) {
                    description.sdp = description.sdp.replace(
                      /a=sendrecv/g,
                      "a=sendonly"
                    );
                  }
                  return Promise.resolve(description);
                },
              ],
            };

            await existingCall.session.invite(holdOptions);
            console.log("existing call SDH peerConnection:", existingCall.session?.sessionDescriptionHandler?.peerConnection);

            updateCall(existingCall.id, {
              hold: true,
              callstatus: existingCall.muted ? "On Hold & Muted" : "On Hold",
              holdStartTime,
              totalHoldDuration: existingCall.totalHoldDuration || 0,
            });

            const { conversations } = useConversationStore.getState();
            const updated = conversations.map((c) => {
              const matches =
                c.c_conversationId === existingCall.activeConversationId ||
                c.c_conversationDetails?.callId === existingCall.id ||
                c.c_conversationPhoneNo === existingCall.dialnumber;

              return matches
                ? {
                  ...c,
                  onHold: true,
                  holdStartTime,
                  holdDuration:
                    c.holdDuration || existingCall.totalHoldDuration || 0,
                }
                : c;
            });
            useConversationStore.setState({ conversations: updated });

          } catch (error) {
            console.error(`Error holding call ${existingCall.id}:`, error);

            updateCall(existingCall.id, {
              hold: true,
              callstatus: existingCall.muted ? "On Hold & Muted" : "On Hold",
              holdStartTime,
              totalHoldDuration: existingCall.totalHoldDuration || 0,
            });

            const { conversations } = useConversationStore.getState();
            const updated = conversations.map((c) => {
              const matches =
                c.c_conversationId === existingCall.activeConversationId ||
                c.c_conversationDetails?.callId === existingCall.id ||
                c.c_conversationPhoneNo === existingCall.dialnumber;

              return matches
                ? {
                  ...c,
                  onHold: true,
                  holdStartTime,
                  holdDuration:
                    c.holdDuration || existingCall.totalHoldDuration || 0,
                }
                : c;
            });
            useConversationStore.setState({ conversations: updated });
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const targetUri = UserAgent.makeURI(
      `sip:${number}@${authUser.p_proxyDomainName}`
    );
    if (!targetUri) {
      console.error("Invalid URI");
      return;
    }

    const extraHeaders = [
      `X-uniqueId:${callid}`,
      `X-leadId:${leadData?.leadId || ""}`,
      `X-conversationId:${leadData?.conversationId || ""}`,
    ];
    if (campaignId) {
      extraHeaders.push(`X-campaignId:${campaignId}`);
    }

    const inviter = new Inviter(ua, targetUri, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: hasAudioDevices, video: false },
        iceGatheringTimeout: 100, // Reduced to 100ms for instant start
      },
      earlyMedia: true,
      extraHeaders,
    });

    const newCall = {
      id: callid,
      session: inviter,
      dialnumber: number,
      callType: "Outgoing",
      callstatus: hasAudioDevices ? "Ringing" : "No Audio Device",
      hold: false,
      muted: false,
      startTime: Date.now(),
      activeConversationId: leadData?.conversationId || null,
      leadData,
      campaignId,
      hasAudioDevices,
      totalHoldDuration: 0,
      isInConference: false,
    };

    addCall(newCall);

    set({
      session: inviter,
      callBottomBar: true,
      dialnumber: number,
      callType: "Outgoing",
      callstatus: hasAudioDevices ? "Ringing" : "No Audio Device",
      hold: false,
      muted: false,
      activeConversationId: leadData?.conversationId || null,
    });

    if (!hasAudioDevices) {
      updateCall(callid, { callstatus: "Call Failed - No Audio Device" });
      set({ callstatus: "Call Failed - No Audio Device" });

      setTimeout(() => {
        removeCall(callid);
      }, 3000);

      return callid;
    }

    inviter.stateChange.addListener(async (state) => {
      if (state === SessionState.Establishing) {
        attachRemoteAudio(inviter);
        updateCall(callid, { callstatus: "Ringing" });
        if (get().session === inviter) {
          set({ callstatus: "Ringing" });
        }
      }

      if (state === SessionState.Established) {
        attachRemoteAudio(inviter); // Re-attach to ensure full audio after answer
        updateCall(callid, {
          callstatus: "Answered",
          startTime: Date.now(),
        });
        if (get().session === inviter) {
          set({ callstatus: "Answered" });
        }
        console.log("inviter SDH peerConnection:", inviter);


        const { conversations } = useConversationStore.getState();
        const updated = conversations.map((c) => {
          const matches =
            (leadData?.leadId && c.leadId === leadData.leadId) ||
            (leadData?.conversationId &&
              c.c_conversationId === leadData.conversationId) ||
            c.c_conversationPhoneNo === number;

          return matches
            ? { ...c, startTime: Date.now(), stopped: false, duration: null }
            : c;
        });

        useConversationStore.setState({ conversations: updated });
      }

      if (state === SessionState.Terminated) {
        console.warn("Call terminated", inviter);

        let reason = "Unknown";
        try {
          if (inviter?.isCanceled) {
            reason = "Canceled";
          } else if (inviter?.message && (inviter.message.statusCode || inviter.message.reasonPhrase)) {
            reason = `${inviter.message.statusCode || ""} ${inviter.message.reasonPhrase || ""}`.trim();
          } else if (inviter?.request && (inviter.request.statusCode || inviter.request.reasonPhrase)) {
            reason = `${inviter.request.statusCode || ""} ${inviter.request.reasonPhrase || ""}`.trim();
          } else if (inviter?.statusCode || inviter?.statusText) {
            reason = `${inviter.statusCode || ""} ${inviter.statusText || ""}`.trim();
          } else if (inviter?.reason || inviter?.cause || inviter?.reasonPhrase) {
            reason = inviter.reason || inviter.cause || inviter.reasonPhrase;
          }
        } catch (e) {
          console.warn("Error extracting termination reason:", e);
        }

        const callStatusText = reason && reason !== "Unknown" ? `Call ended (${reason})` : "Call ended";

        const { conversations } = useConversationStore.getState();
        const call = get().getCall(callid);
        const callStartTime = call?.startTime || Date.now();

        const updated = conversations.map((c) => {
          const matches =
            (leadData?.leadId && c.leadId === leadData.leadId) ||
            (leadData?.conversationId &&
              c.c_conversationId === leadData.conversationId) ||
            c.c_conversationPhoneNo === number;

          if (!matches) return c;

          return {
            ...c,
            stopped: true,
            duration: Math.floor((Date.now() - callStartTime) / 1000),
          };
        });

        useConversationStore.setState({ conversations: updated });
        removeCall(callid);

        if (get().session === inviter) {
          const remainingCalls = get().activeCalls;
          if (remainingCalls.length > 0) {
            const nextCall = remainingCalls[0];
            set({
              session: nextCall.session,
              dialnumber: nextCall.dialnumber,
              callstatus: nextCall.callstatus,
              callType: nextCall.callType,
            });
          } else {
            set({
              session: null,
              callstatus: callStatusText,
              dialnumber: "",
              callType: "",
              hold: false,
              muted: false,
            });
          }
        } else {
          console.info(`Call ${callid} terminated: ${reason}`);
        }

        try {
          toast.info(`Call disconnected: ${reason}`);
        } catch (e) {
          console.warn("Toast failed:", e);
        }

        try {
          await useConversationStore.getState().getConversations();
        } catch (err) {
          console.error("Failed to refresh conversations:", err);
        }
      }
    });

    try {
      await inviter.invite();

      // Immediately set up audio track listener BEFORE Establishing state
      // This prevents missing the first few seconds of IVR audio
      if (inviter.sessionDescriptionHandler) {
        const pc = inviter.sessionDescriptionHandler.peerConnection;
        if (pc) {
          let audioEl = document.getElementById("remoteAudio");
          if (!audioEl) {
            audioEl = document.createElement("audio");
            audioEl.id = "remoteAudio";
            audioEl.autoplay = true;
            audioEl.playsInline = true;
            document.body.appendChild(audioEl);
          }
          const earlyStream = new MediaStream();
          audioEl.srcObject = earlyStream;

          pc.ontrack = (event) => {
            if (event.track && event.track.kind === "audio") {
              earlyStream.addTrack(event.track);
              audioEl.play().catch((err) => {
                console.warn("Early media play blocked:", err);
              });
            }
          };

          // Also grab any tracks that already arrived
          pc.getReceivers().forEach((receiver) => {
            if (receiver.track && receiver.track.kind === "audio") {
              earlyStream.addTrack(receiver.track);
            }
          });

          audioEl.play().catch((err) => {
            console.warn("Auto-play blocked:", err);
          });
        }
      }
    } catch (err) {
      console.error("Invite error:", err);
      if (err?.message?.includes("device not found")) {
        toast.error("Microphone not found");
      } else {
        toast.error(err.message || "Call failed");
      }
      updateCall(callid, { callstatus: "Call Failed" });
      set({ callstatus: "Call Failed" });
      removeCall(callid);
    }

    return callid;
  },
  addCall: (callData) => {
    const result = set((state) => ({
      activeCalls: [
        ...state.activeCalls,
        {
          id: callData.id || Date.now().toString(),
          callType: callData.callType,
          callstatus: callData.callstatus,
          dialnumber: callData.dialnumber,
          session: callData.session,
          muted: false,
          hold: false,
          startTime: Date.now(),
          ...callData,
        },
      ],
    }));

    return result;
  },
  updateCall: (callId, updates) => {
    const result = set((state) => ({
      activeCalls: state.activeCalls.map((call) =>
        call.id === callId ? { ...call, ...updates } : call
      ),
    }));
    return result;
  },
  removeCall: (callId) => {
    const result = set((state) => ({
      activeCalls: state.activeCalls.filter((call) => call.id !== callId),
    }));
    return result;
  },
  getCall: (callId) => {
    const state = get();
    return state.activeCalls.find((call) => call.id === callId);
  },
  hangUp: async (callId) => {
    if (!callId) {
      const { session, consultationSession } = get();
      if (!session && !consultationSession) return;
      stopRingtone();

      try {
        if (session) {
          if (
            session instanceof Inviter &&
            session.state !== SessionState.Established
          ) {
            await session.cancel();
          } else if (
            session instanceof Invitation &&
            session.state !== SessionState.Established
          ) {
            await session.reject();
          } else {
            await session.bye();
          }
        }
        if (consultationSession) {
          await consultationSession.bye();
        }

        try {
          await useConversationStore.getState().getConversations();
        } catch (err) {
          console.error("Failed to refresh conversations:", err);
        }
      } catch (err) {
        console.warn("hangUp error:", err);
      } finally {
        set({
          session: null,
          consultationSession: null,
          callstatus:
            session?.state === SessionState.Established
              ? "Call ended"
              : "Declined",
          callType: "",
          dialnumber: "",
          hold: false,
          muted: false,
          isConsulting: false,
          activeConversationId: null,
        });
      }
      return;
    }

    const { getCall, removeCall } = get();
    const call = getCall(callId);

    if (!call) {
      console.warn(`Call with ID ${callId} not found`);
      return;
    }

    try {
      if (call.session) {
        if (
          call.session instanceof Inviter &&
          call.session.state !== SessionState.Established
        ) {
          await call.session.cancel();
        } else if (
          call.session instanceof Invitation &&
          call.session.state !== SessionState.Established
        ) {
          await call.session.reject();
        } else {
          await call.session.bye();
        }
      }

      // ✅ FIX: Clear hold state in conversation store when call ends
      const { conversations } = useConversationStore.getState();
      const updated = conversations.map((c) => {
        const matches =
          c.c_conversationId === call.activeConversationId ||
          c.c_conversationDetails?.callId === callId ||
          c.c_conversationPhoneNo === call.dialnumber;

        return matches
          ? {
            ...c,
            onHold: false,        // ✅ Clear hold status
            hold: false,          // ✅ Clear hold flag
            holdStatus: false,    // ✅ Clear holdStatus
            holdStartTime: null,  // ✅ Clear hold start time
          }
          : c;
      });
      useConversationStore.setState({ conversations: updated });

      try {
        await useConversationStore.getState().getConversations();
      } catch (err) {
        console.error("Failed to refresh conversations:", err);
      }
    } catch (err) {
      console.warn("hangUp error:", err);
    } finally {
      removeCall(callId);

      const currentSession = get().session;
      if (currentSession === call.session) {
        const { activeCalls } = get();
        const remainingCall = activeCalls.find((c) => c.id !== callId);

        if (remainingCall) {
          set({
            session: remainingCall.session,
            dialnumber: remainingCall.dialnumber,
            callstatus: remainingCall.callstatus,
            hold: remainingCall.hold,
            muted: remainingCall.muted,
          });
        } else {
          set({
            session: null,
            callstatus: "Call ended",
            callType: "",
            dialnumber: "",
            hold: false,
            muted: false,
            activeConversationId: null,
          });
        }
      }
    }
  },
  mute: (callId) => {
    if (!callId) {
      const { session, callstatus } = get();
      if (!session?.sessionDescriptionHandler) return;
      const pc = session.sessionDescriptionHandler.peerConnection;
      if (pc) {
        pc.getSenders().forEach((sender) => {
          if (sender.track?.kind === "audio") {
            sender.track.enabled = false;
          }
        });
        set({
          muted: true,
          callstatus: "Muted",
          previousCallStatus: callstatus,
        });
      }
      return;
    }

    const { getCall, updateCall } = get();
    const call = getCall(callId);

    if (!call || !call.session?.sessionDescriptionHandler) {
      console.warn(`Cannot mute call ${callId} - no session or handler`);
      return;
    }

    const pc = call.session.sessionDescriptionHandler.peerConnection;
    if (pc) {
      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === "audio") {
          sender.track.enabled = false;
        }
      });

      updateCall(callId, {
        muted: true,
        callstatus: call.hold ? "On Hold & Muted" : "Muted",
        previousCallStatus: call.callstatus,
      });

      if (get().session === call.session) {
        set({ muted: true, callstatus: "Muted" });
      }
    }
  },
  unmute: (callId) => {
    if (!callId) {
      const { session, previousCallStatus } = get();
      if (!session?.sessionDescriptionHandler) return;
      const pc = session.sessionDescriptionHandler.peerConnection;
      if (pc) {
        pc.getSenders().forEach((sender) => {
          if (sender.track?.kind === "audio") {
            sender.track.enabled = true;
          }
        });
        set({ muted: false, callstatus: previousCallStatus || "Answered" });
      }
      return;
    }

    const { getCall, updateCall } = get();
    const call = getCall(callId);

    if (!call || !call.session?.sessionDescriptionHandler) {
      console.warn(`Cannot unmute call ${callId} - no session or handler`);
      return;
    }

    const pc = call.session.sessionDescriptionHandler.peerConnection;
    if (pc) {
      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === "audio") {
          sender.track.enabled = true;
        }
      });

      updateCall(callId, {
        muted: false,
        callstatus: call.hold
          ? "On Hold"
          : call.previousCallStatus || "In Call",
      });

      if (get().session === call.session) {
        set({ muted: false, callstatus: call.previousCallStatus || "In Call" });
      }
    }
  },
  holdCall: async (callId) => {
    if (!callId) {
      return;
    }
    const { getCall, updateCall } = get();
    const call = getCall(callId);

    if (!call || !call.session?.sessionDescriptionHandler) {
      console.warn(`Cannot hold call ${callId}`);
      return;
    }

    try {
      const holdOptions = {
        sessionDescriptionHandlerModifiers: [
          (description) => {
            if (description.sdp) {
              description.sdp = description.sdp.replace(
                /a=sendrecv/g,
                "a=sendonly"
              );
            }
            return Promise.resolve(description);
          },
        ],
      };

      await call.session.invite(holdOptions);
      const holdStartTime = Date.now();

      updateCall(callId, {
        hold: true,
        callstatus: call.muted ? "On Hold & Muted" : "On Hold",
        holdStartTime,
        totalHoldDuration: call.totalHoldDuration || 0,
      });

      if (get().session === call.session) {
        set({ hold: true, callstatus: "On Hold" });
      }
      const { conversations } = useConversationStore.getState();
      const updated = conversations.map((c) => {
        const matches =
          c.c_conversationId === call.activeConversationId ||
          c.c_conversationDetails?.callId === callId ||
          c.c_conversationPhoneNo === call.dialnumber;

        return matches
          ? {
            ...c,
            onHold: true,
            holdStartTime,
            holdDuration: c.holdDuration || call.totalHoldDuration || 0,
          }
          : c;
      });
      useConversationStore.setState({ conversations: updated });
    } catch (err) {
      console.error("Hold failed:", err);
    }
  },
  sendDTMF: async (dtmfTone, callId) => {

    let targetSession;
    if (callId) {
      const { getCall } = get();
      const call = getCall(callId);
      targetSession = call?.session;
    } else {
      targetSession = get().session;
    }

    if (!targetSession || !dtmfTone) {
      console.error("No session or DTMF tone provided");
      return;
    }

    const validTones = /^[0-9A-D#*]$/;
    if (!validTones.test(dtmfTone)) {
      console.error("Invalid DTMF tone:", dtmfTone);
      return;
    }

    try {
      await targetSession.info({
        requestOptions: {
          body: {
            contentDisposition: "render",
            contentType: "application/dtmf-relay",
            content: `Signal=${dtmfTone}\r\nDuration=250`,
          },
        },
      });

      return;

    } catch (error) {
      console.error("DTMF sending via SIP INFO failed:", error);

      // Fallback 1: Try RFC2833 (in-band DTMF)
      try {
        const pc = targetSession.sessionDescriptionHandler?.peerConnection;
        if (pc) {
          const audioSender = pc
            .getSenders()
            .find((sender) => sender.track && sender.track.kind === "audio");

          if (audioSender?.dtmf) {
            audioSender.dtmf.insertDTMF(dtmfTone, 250, 100);
            return;
          }
        }
      } catch (fallbackError) {
        console.error("RFC2833 fallback failed:", fallbackError);
      }

      // Fallback 2: Alternative SIP INFO format
      try {
        if (targetSession.sessionDescriptionHandler?.sendDtmf) {
          await targetSession.sessionDescriptionHandler.sendDtmf(dtmfTone);
          return;
        }
      } catch (handlerError) {
        console.error("Session handler sendDtmf failed:", handlerError);
      }

      throw new Error(`Failed to send DTMF tone '${dtmfTone}'`);
    }
  },
  coldTransfer: async (transferTarget, callId) => {
    if (callId) {
      const { getCall, removeCall } = get();
      const call = getCall(callId);

      if (!call || !call.session) {
        console.error("No active call found for transfer");
        return;
      }

      if (call.session.state !== SessionState.Established) {
        console.error("Call not established - cannot transfer");
        return;
      }

      try {
        const authUser = useAuthStore.getState().authUser;
        set({ callstatus: "Cold transfer in progress..." });

        const formattedTarget = transferTarget.includes("@")
          ? `sip:${transferTarget}`
          : `sip:${transferTarget}@${authUser.p_proxyDomainName}`;

        const targetURI = UserAgent.makeURI(formattedTarget);

        if (!targetURI) {
          throw new Error("Invalid target URI format");
        }

        await call.session.refer(targetURI, {
          requestDelegate: {
            onAccept: (response) => {

              removeCall(callId);

              const { conversations } = useConversationStore.getState();
              const callStartTime = call.startTime || Date.now();
              const updated = conversations.map((c) => {
                const matches =
                  c.c_conversationId === call.activeConversationId ||
                  c.c_conversationDetails?.callId === callId ||
                  c.c_conversationPhoneNo === call.dialnumber;

                return matches
                  ? {
                    ...c,
                    stopped: true,
                    duration: Math.floor((Date.now() - callStartTime) / 1000),
                    transferredTo: transferTarget,
                  }
                  : c;
              });
              useConversationStore.setState({ conversations: updated });

              const currentSession = get().session;
              if (currentSession === call.session) {
                const { activeCalls } = get();
                const remainingCall = activeCalls.find((c) => c.id !== callId);

                if (remainingCall) {
                  set({
                    session: remainingCall.session,
                    dialnumber: remainingCall.dialnumber,
                    callstatus: remainingCall.callstatus,
                    hold: remainingCall.hold,
                    muted: remainingCall.muted,
                  });
                } else {
                  set({
                    session: null,
                    callstatus: "",
                    callType: "",
                    dialnumber: "",
                    hold: false,
                    muted: false,
                    activeConversationId: null,
                  });
                }
              }

              setTimeout(async () => {
                try {
                  if (
                    call.session &&
                    call.session.state === SessionState.Established
                  ) {
                    await call.session.bye();
                  }
                } catch (byeError) {
                  console.warn(
                    "Error ending session after transfer:",
                    byeError
                  );
                }
              }, 500);
            },
            onReject: (response) => {
              console.error(
                "Transfer rejected:",
                response?.message?.statusCode
              );
              const errorMsg = `Transfer failed: ${response?.message?.reasonPhrase || "Unknown"
                }`;

              get().updateCall(callId, { callstatus: errorMsg });

              if (get().session === call.session) {
                set({ callstatus: errorMsg });
              }
            },
          },
        });
      } catch (error) {
        console.error("Cold transfer failed:", error);
        const errorMsg = `Cold transfer failed: ${error.message || "Unknown error"
          }`;

        get().updateCall(callId, { callstatus: errorMsg });

        if (get().session === call.session) {
          set({ callstatus: errorMsg });
        }
      }
      return;
    }

    const { session } = get();
    try {
      if (!session) {
        console.error("No active session found");
        set({ callstatus: "No active call to transfer" });
        return;
      }

      if (!transferTarget || !transferTarget.trim()) {
        console.error("No transfer target provided");
        set({ callstatus: "No transfer target provided" });
        return;
      }

      if (session.state !== SessionState.Established) {
        console.error("Session not established - cannot transfer");
        set({ callstatus: "Transfer not available - call not established" });
        return;
      }

      const authUser = useAuthStore.getState().authUser;
      set({ callstatus: "Cold transfer in progress..." });

      const formattedTarget = transferTarget.includes("@")
        ? `sip:${transferTarget}`
        : `sip:${transferTarget}@${authUser.p_proxyDomainName}`;

      const targetURI = UserAgent.makeURI(formattedTarget);

      if (!targetURI) {
        throw new Error("Invalid target URI format");
      }

      await session.refer(targetURI, {
        requestDelegate: {
          onAccept: (response) => {
            set({
              callstatus: "Transfer successful",
              callBottomBar: false,
            });

            setTimeout(async () => {
              try {
                if (session && session.state === SessionState.Established) {
                  await session.bye();
                }
              } catch (byeError) {
                console.warn("Error ending session after transfer:", byeError);
              }
            }, 500);
          },
          onReject: (response) => {
            console.error("Transfer rejected:", response?.message?.statusCode);
            set({
              callstatus: `Transfer failed: ${response?.message?.reasonPhrase || "Unknown"
                }`,
            });
          },
        },
      });
    } catch (error) {
      console.error("Cold transfer failed:", error);
      set({
        callstatus: `Cold transfer failed: ${error.message || "Unknown error"}`,
      });
    }
  },
  startWarmTransfer: async (transferTarget, callId) => {
    if (!callId) {
      return get().startWarmTransferLegacy(transferTarget);
    }

    const { ua, getCall, addCall, updateCall, holdCall } = get();
    const originalCall = getCall(callId);

    if (!originalCall || !originalCall.session) {
      console.error("No original call found for warm transfer");
      return;
    }

    if (originalCall.session.state !== SessionState.Established) {
      console.error("Original call not established - cannot transfer");
      return;
    }

    try {

      updateCall(callId, { callstatus: "Starting consultation..." });

      await holdCall(callId);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const authUser = useAuthStore.getState().authUser;
      const target = transferTarget.includes("@")
        ? UserAgent.makeURI(`sip:${transferTarget}`)
        : UserAgent.makeURI(
          `sip:${transferTarget}@${authUser.p_proxyDomainName}`
        );

      if (!target) {
        throw new Error("Invalid consultation target");
      }

      const callid = `Transfer-${uuidv4()}`;

      const campaignId = localStorage.getItem("CampaignId");

      const extraHeaders = [
        `X-uniqueId: ${callid}`,
      ];

      if (campaignId) {
        extraHeaders.push(`X-campaignId: ${campaignId}`);
      }

      const consultationInviter = new Inviter(ua, target, {
        earlyMedia: true,
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: false },
          iceGatheringTimeout: 100, // Fast ICE gathering
        },
        extraHeaders: extraHeaders
      });

      const consultationCallId = `consultation-${Date.now()}`;
      const consultationCall = {
        id: consultationCallId,
        session: consultationInviter,
        dialnumber: transferTarget,
        callerName: "Consultation",
        callType: "Consultation",
        callstatus: "Ringing",
        hold: false,
        muted: false,
        startTime: Date.now(),
        isConsultation: true,
        originalCallId: callId,
      };

      addCall(consultationCall);

      set({
        session: consultationInviter,
        dialnumber: transferTarget,
        callType: "Consultation",
        callstatus: "Ringing",
        isConsulting: true,
        consultationCallId,
        originalCallId: callId,
      });


      consultationInviter.stateChange.addListener((state) => {

        if (state === SessionState.Establishing) {
          updateCall(consultationCallId, { callstatus: "Connecting" });
          attachRemoteAudio(consultationInviter);
          set({ callstatus: "Consultation connecting..." });
        }

        if (state === SessionState.Established) {
          updateCall(consultationCallId, {
            callstatus: "In Consultation",
            startTime: Date.now(),
          });
          attachRemoteAudio(consultationInviter);
          set({ callstatus: "In Consultation" });
        }

        if (state === SessionState.Terminated) {

          get().removeCall(consultationCallId);

          const originalCallStillExists = get().getCall(callId);

          if (originalCallStillExists) {
            get().switchToCall(callId);
            set({
              isConsulting: false,
              consultationCallId: null,
              originalCallId: null,
            });
          } else {
            set({
              session: null,
              callstatus: "",
              callType: "",
              dialnumber: "",
              isConsulting: false,
              consultationCallId: null,
              originalCallId: null,
            });
          }
        }
      });

      await consultationInviter.invite();
    } catch (error) {
      console.error("Warm transfer consultation failed:", error);
      updateCall(callId, {
        callstatus: `Consultation failed: ${error.message || "Unknown error"}`,
      });

      get().unholdCall(callId);

      set({
        isConsulting: false,
        consultationCallId: null,
        originalCallId: null,
      });
    }
  },
  startWarmTransferLegacy: async (transferTarget) => {
    const { session, ua, holdCall, unholdCall } = get();

    if (!session || !transferTarget.trim()) {
      console.error("No session or transfer target provided");
      set({
        callstatus: "No transfer target provided",
        callBottomBar: true,
      });
      return;
    }

    if (session.state !== SessionState.Established) {
      console.error("Original session not established - cannot transfer");
      set({
        callstatus: "Transfer not available - call not established",
        callBottomBar: true,
      });
      return;
    }

    try {
      set({
        callstatus: "Starting consultation...",
        isConsulting: true,
        callBottomBar: true,
      });

      await holdCall();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const authUser = useAuthStore.getState().authUser;
      const target = transferTarget.includes("@")
        ? UserAgent.makeURI(transferTarget)
        : UserAgent.makeURI(
          `sip:${transferTarget}@${authUser.p_proxyDomainName}`
        );

      if (!target) {
        throw new Error("Invalid consultation target");
      }

      const consultationInviter = new Inviter(ua, target, {
        earlyMedia: true,
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: false },
        },
      });

      set({ consultationSession: consultationInviter, callBottomBar: true });

      consultationInviter.stateChange.addListener((state) => {
        if (state === SessionState.Establishing) {
          set({ callstatus: "Consultation ringing...", callBottomBar: true });
          attachRemoteAudio(consultationInviter);
        }

        if (state === SessionState.Established) {
          set({
            callstatus: "Consultation connected - Choose transfer option",
            callBottomBar: true,
          });
          attachRemoteAudio(consultationInviter);
        }

        if (state === SessionState.Terminated) {
          set({
            callstatus: "Consultation ended",
            consultationSession: null,
            isConsulting: false,
            callBottomBar: !!get().session,
          });
          if (get().session) {
            unholdCall().catch((err) =>
              console.error("Failed to unhold original call:", err)
            );
          }
        }
      });

      await consultationInviter.invite();
    } catch (error) {
      console.error("Warm transfer consultation failed:", error);
      set({
        callstatus: `Consultation failed: ${error.message || "Unknown error"}`,
        isConsulting: false,
        callBottomBar: !!get().session,
      });
      if (get().session) {
        unholdCall().catch((err) =>
          console.error("Failed to unhold original call:", err)
        );
      }
    }
  },
  switchToCall: async (callId) => {
    const { activeCalls, updateCall, getCall } = get();

    const targetCall = getCall(callId);
    if (!targetCall) {
      console.warn(`❌ Call ${callId} not found`);
      return;
    }

    try {
      const currentTime = Date.now();

      for (const call of activeCalls) {
        if (
          call.id !== callId &&
          !call.hold &&
          call.session?.sessionDescriptionHandler
        ) {
          try {
            const holdStartTime = currentTime;

            const holdOptions = {
              sessionDescriptionHandlerModifiers: [
                (description) => {
                  if (description.sdp) {
                    description.sdp = description.sdp.replace(
                      /a=sendrecv/g,
                      "a=sendonly"
                    );
                  }
                  return Promise.resolve(description);
                },
              ],
            };

            await call.session.invite(holdOptions);

            updateCall(call.id, {
              hold: true,
              callstatus: call.muted ? "On Hold & Muted" : "On Hold",
              holdStartTime,
            });

            const { conversations } = useConversationStore.getState();
            const updated = conversations.map((c) => {
              const matches =
                c.c_conversationId === call.activeConversationId ||
                c.c_conversationDetails?.callId === call.id ||
                c.c_conversationPhoneNo === call.dialnumber;

              return matches
                ? {
                  ...c,
                  onHold: true,
                  holdStartTime,
                  holdDuration: c.holdDuration || call.totalHoldDuration || 0,
                }
                : c;
            });
            useConversationStore.setState({ conversations: updated });
          } catch (error) {
            console.error(`Error holding call ${call.id}:`, error);
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (targetCall.hold) {
        const accumulatedHoldTime = targetCall.holdStartTime
          ? Math.floor((currentTime - targetCall.holdStartTime) / 1000)
          : 0;

        const totalHoldDuration =
          (targetCall.totalHoldDuration || 0) + accumulatedHoldTime;

        if (!targetCall.session?.sessionDescriptionHandler) {
          console.error(`❌ No session description handler for call ${callId}`);
          updateCall(callId, {
            hold: false,
            callstatus: targetCall.muted ? "Muted" : "In Call",
            totalHoldDuration,
            holdStartTime: null,
          });
        } else {
          const unholdOptions = {
            sessionDescriptionHandlerModifiers: [
              (description) => {
                if (description.sdp) {
                  let modifiedSdp = description.sdp
                    .replace(/a=sendonly/g, "a=sendrecv")
                    .replace(/a=inactive/g, "a=sendrecv")
                    .replace(/a=recvonly/g, "a=sendrecv");

                  description.sdp = modifiedSdp;

                  console.log("🔊 Unhold SDP modified:", modifiedSdp.substring(0, 500));
                }
                return Promise.resolve(description);
              },
            ],
          };

          await targetCall.session.invite(unholdOptions);

          await new Promise((resolve) => setTimeout(resolve, 800));

          updateCall(callId, {
            hold: false,
            callstatus: targetCall.muted ? "Muted" : "In Call",
            totalHoldDuration,
            holdStartTime: null,
          });
        }

        const { conversations } = useConversationStore.getState();
        const updated = conversations.map((c) => {
          const matches =
            c.c_conversationId === targetCall.activeConversationId ||
            c.c_conversationDetails?.callId === callId ||
            c.c_conversationPhoneNo === targetCall.dialnumber;

          return matches
            ? {
              ...c,
              onHold: false,
              holdStartTime: null,
              holdDuration: totalHoldDuration,
            }
            : c;
        });
        useConversationStore.setState({ conversations: updated });
      }

      const updatedCall = getCall(callId);
      if (updatedCall?.session) {
        console.log("🔊 Reattaching audio for call:", callId);
        attachRemoteAudio(updatedCall.session);

        const audioEl = document.getElementById("remoteAudio");
        if (audioEl) {
          audioEl.play().catch((err) => {
            console.warn("Audio play blocked:", err);
          });
        }
      }

      set({
        session: updatedCall.session,
        dialnumber: updatedCall.dialnumber,
        callstatus: updatedCall.muted ? "Muted" : "In Call",
        hold: false,
        muted: updatedCall.muted,
        callType: updatedCall.callType,
        activeConversationId: updatedCall.activeConversationId,
      });

    } catch (error) {
      console.error(`❌ Error switching to call ${callId}:`, error);

      updateCall(callId, {
        hold: false,
        callstatus: targetCall.muted ? "Muted" : "In Call",
      });

      if (targetCall?.session) {
        attachRemoteAudio(targetCall.session);
      }

      set({
        session: targetCall.session,
        dialnumber: targetCall.dialnumber,
        callstatus: targetCall.muted ? "Muted" : "In Call",
        hold: false,
        muted: targetCall.muted,
        callType: targetCall.callType,
        activeConversationId: targetCall.activeConversationId,
      });
    }
  },
  accumulateHoldDuration: (callId) => {
    const { getCall, updateCall } = get();
    const call = getCall(callId);

    if (!call || !call.holdStartTime) {
      return 0;
    }

    const currentHoldDuration = Math.floor(
      (Date.now() - call.holdStartTime) / 1000
    );
    const totalHoldDuration =
      (call.totalHoldDuration || 0) + currentHoldDuration;

    updateCall(callId, {
      totalHoldDuration,
      holdStartTime: null,
    });

    return totalHoldDuration;
  },
  holdAllOtherCalls: async (currentCallId) => {
    const { activeCalls, updateCall } = get();

    const holdPromises = [];

    for (const call of activeCalls) {
      if (
        call.id === currentCallId ||
        call.hold ||
        !call.session?.sessionDescriptionHandler ||
        ["Ringing", "Connecting"].includes(call.callstatus)
      ) {
        continue;
      }

      const holdPromise = (async () => {
        try {
          const holdOptions = {
            sessionDescriptionHandlerModifiers: [
              (description) => {
                if (description.sdp) {
                  description.sdp = description.sdp.replace(
                    /a=sendrecv/g,
                    "a=sendonly"
                  );
                }
                return Promise.resolve(description);
              },
            ],
          };

          await call.session.invite(holdOptions);

          updateCall(call.id, {
            hold: true,
            callstatus: call.muted ? "On Hold & Muted" : "On Hold",
            holdStartTime: Date.now(),
          });
        } catch (error) {
          console.error(`❌ Error holding call ${call.id}:`, error);
          updateCall(call.id, {
            hold: true,
            callstatus: call.muted ? "On Hold & Muted" : "On Hold",
            holdStartTime: Date.now(),
          });
        }
      })();

      holdPromises.push(holdPromise);
    }

    if (holdPromises.length > 0) {
      await Promise.allSettled(holdPromises);
    }
  },
  unholdCall: async (callId) => {
    if (!callId) {
      const { session } = get();
      if (!session) return;

      try {
        const unholdOptions = {
          sessionDescriptionHandlerModifiers: [
            (description) => {
              if (description.sdp) {
                let modifiedSdp = description.sdp.replace(
                  /a=sendonly/g,
                  "a=sendrecv"
                );
                modifiedSdp = modifiedSdp.replace(/a=inactive/g, "a=sendrecv");
                description.sdp = modifiedSdp;
              }
              return Promise.resolve(description);
            },
          ],
        };

        await session.invite(unholdOptions);
        set({ hold: false, callstatus: "Resumed" });

        const { conversations } = useConversationStore.getState();
        const { activeConversationId } = get();
        const updated = conversations.map((c) =>
          c.c_conversationId === activeConversationId
            ? {
              ...c,
              onHold: false,
              holdDuration:
                (c.holdDuration || 0) +
                Math.floor((Date.now() - c.holdStartTime) / 1000),
              holdStartTime: null,
            }
            : c
        );
        useConversationStore.setState({ conversations: updated });
      } catch (err) {
        console.error("Unhold failed:", err);
      }
      return;
    }

    const { getCall, updateCall } = get();
    const call = getCall(callId);

    if (!call) {
      console.warn(`❌ Cannot unhold call ${callId} - call not found`);
      return;
    }

    if (!call.session?.sessionDescriptionHandler) {
      console.warn(`❌ Cannot unhold call ${callId} - no session or handler`);
      updateCall(callId, {
        hold: false,
        callstatus: call.muted ? "Muted" : "In Call",
      });
      return;
    }

    try {
      const unholdOptions = {
        sessionDescriptionHandlerModifiers: [
          (description) => {
            if (description.sdp) {
              let modifiedSdp = description.sdp.replace(
                /a=sendonly/g,
                "a=sendrecv"
              );
              modifiedSdp = modifiedSdp.replace(/a=inactive/g, "a=sendrecv");
              description.sdp = modifiedSdp;
            }
            return Promise.resolve(description);
          },
        ],
      };

      await call.session.invite(unholdOptions);

      updateCall(callId, {
        hold: false,
        callstatus: call.muted ? "Muted" : "In Call",
      });

      if (get().session === call.session) {
        set({ hold: false, callstatus: "Resumed" });
      }
      const { conversations } = useConversationStore.getState();
      const updated = conversations.map((c) =>
        c.c_conversationId === call.activeConversationId
          ? {
            ...c,
            onHold: false,
            holdDuration:
              (c.holdDuration || 0) +
              Math.floor(
                (Date.now() - (call.holdStartTime || Date.now())) / 1000
              ),
            holdStartTime: null,
          }
          : c
      );
      useConversationStore.setState({ conversations: updated });
    } catch (err) {
      console.error(`❌ Unhold failed for call ${callId}:`, err);
      updateCall(callId, {
        hold: false,
        callstatus: call.muted ? "Muted" : "In Call",
      });
    }
  },
  cancelWarmTransfer: async (consultationCallId) => {
    if (consultationCallId) {

      const { getCall, removeCall, switchToCall } = get();
      const consultationCall = getCall(consultationCallId);

      if (!consultationCall) {
        console.error("Consultation call not found");
        return;
      }

      const originalCallId = consultationCall.originalCallId;

      try {
        if (consultationCall.session) {
          if (consultationCall.session.state === SessionState.Established) {
            await consultationCall.session.bye();
          } else {
            await consultationCall.session.cancel();
          }
        }

        removeCall(consultationCallId);

        if (originalCallId) {
          const originalCall = getCall(originalCallId);
          if (originalCall) {
            await switchToCall(originalCallId);
          }
        }

        set({
          isConsulting: false,
          consultationCallId: null,
          originalCallId: null,
        });
      } catch (error) {
        console.error("Cancel warm transfer failed:", error);
      }
      return;
    }

    const { consultationSession, unholdCall } = get();
    if (consultationSession) {
      try {
        await consultationSession.bye();
        set({
          consultationSession: null,
          isConsulting: false,
          callstatus: "Transfer cancelled",
        });
        await unholdCall();
      } catch (error) {
        console.error("Cancel warm transfer failed:", error);
      }
    }
  },
  forceUnholdCall: async (callId) => {
    const { getCall, updateCall } = get();
    const call = getCall(callId);

    if (!call || !call.session?.sessionDescriptionHandler) {
      console.warn(
        `Cannot force unhold call ${callId} - no session or handler`
      );
      return false;
    }

    try {

      const unholdOptions = {
        sessionDescriptionHandlerModifiers: [
          (description) => {
            if (description.sdp) {
              let modifiedSdp = description.sdp.replace(
                /a=sendonly/g,
                "a=sendrecv"
              );
              modifiedSdp = modifiedSdp.replace(/a=inactive/g, "a=sendrecv");
              description.sdp = modifiedSdp;
            }
            return Promise.resolve(description);
          },
        ],
      };

      await call.session.invite(unholdOptions);

      updateCall(callId, {
        hold: false,
        callstatus: call.muted ? "Muted" : "In Call",
      });

      if (get().session === call.session) {
        set({ hold: false, callstatus: "Resumed" });
      }

      return true;
    } catch (err) {
      console.error(`Force unhold failed for call ${callId}:`, err);

      updateCall(callId, {
        hold: false,
        callstatus: call.muted ? "Muted" : "In Call",
      });

      return false;
    }
  },
  completeWarmTransfer: async (originalCallId, consultationCallId) => {
    if (originalCallId && consultationCallId) {
      const { getCall, removeCall, forceUnholdCall, updateCall, isTransferInProgress, activeCalls, hangUp } = get();

      if (isTransferInProgress) {
        console.warn("Transfer already in progress, please wait");
        toast.warning("Transfer already in progress");
        return;
      }
      set({ isTransferInProgress: true });

      const incomingCalls = activeCalls.filter(
        call =>
          call.isIncoming &&
          call.callstatus === "Ringing" &&
          call.id !== originalCallId &&
          call.id !== consultationCallId
      );

      if (incomingCalls.length > 0) {
        console.log(`🔔 Rejecting ${incomingCalls.length} incoming call(s) during warm transfer`);

        stopRingtone();
        for (const incomingCall of incomingCalls) {
          try {
            if (incomingCall.session && incomingCall.session instanceof Invitation) {
              if (incomingCall.session.state === SessionState.Initial ||
                incomingCall.session.state === SessionState.Establishing) {
                await incomingCall.session.reject();
                console.log(`✅ Rejected incoming call from: ${incomingCall.dialnumber}`);
              }
            }

            removeCall(incomingCall.id);

            const currentSession = get().session;
            if (currentSession === incomingCall.session) {
              set({
                session: null,
                IncomingcallBar: false,
                incomingCallId: null,
              });
            }

          } catch (error) {
            console.error(`Failed to reject call ${incomingCall.id}:`, error);
            removeCall(incomingCall.id);
          }
        }

        toast.info(`Declined ${incomingCalls.length} incoming call(s) during transfer`);

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      try {
        const originalCall = getCall(originalCallId);
        const consultationCall = getCall(consultationCallId);

        if (!originalCall?.session || !consultationCall?.session) {
          console.error("Cannot complete transfer - missing sessions");
          toast.error("Transfer failed: Missing call sessions");
          return;
        }

        const originalSession = originalCall.session;
        const consultationSession = consultationCall.session;

        set({ callstatus: "Completing warm transfer..." });

        if (originalCall.hold) {
          const unholdSuccess = await forceUnholdCall(originalCallId);

          if (!unholdSuccess) {
            console.warn("Failed to unhold original call, attempting transfer anyway");
          }

          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        const updatedOriginalCall = getCall(originalCallId);
        const updatedConsultationCall = getCall(consultationCallId);

        if (!updatedOriginalCall || !updatedConsultationCall) {
          console.error("Calls disappeared during transfer process");
          toast.error("Transfer failed: Calls no longer available");
          return;
        }

        if (
          originalSession.state !== SessionState.Established ||
          consultationSession.state !== SessionState.Established
        ) {
          console.error("Transfer failed - invalid session state");
          toast.error("Transfer failed: Calls not in valid state");
          set({ callstatus: "Transfer failed - invalid session state" });
          return;
        }

        const consultationTarget = consultationSession.remoteIdentity.uri.toString();

        const updateFn = get().updateCall;

        updateFn(originalCallId, {
          callstatus: "Transferring...",
          isTransferring: true
        });
        updateFn(consultationCallId, {
          callstatus: "Transfer Target",
          isTransferring: true
        });

        const referOptions = {
          requestDelegate: {
            onAccept: async (response) => {
              console.log("✅ Warm transfer REFER accepted");

              try {
                if (consultationSession?.state === SessionState.Established) {
                  console.log("📞 Ending consultation session immediately...");
                  await consultationSession.bye();
                  console.log("✅ Consultation session ended");
                }
              } catch (byeError) {
                console.warn("⚠️ Error ending consultation session:", byeError);
                if (consultationSession.dispose) {
                  try {
                    await consultationSession.dispose();
                  } catch (disposeError) {
                    console.warn("⚠️ Dispose failed:", disposeError);
                  }
                }
              }

              await new Promise(resolve => setTimeout(resolve, 500));

              const { conversations } = useConversationStore.getState();
              const convId =
                originalCall.activeConversationId ||
                originalCall.leadData?.conversationId ||
                originalCall.session?.request?.headers["X-conversationId"]?.[0]?.raw;

              const updated = conversations.map((c) => {
                if (c.c_conversationId == convId) {
                  return {
                    ...c,
                    stopped: true,
                    onHold: false,
                    holdStartTime: null,
                    holdDuration: 0,
                    duration: Math.floor((Date.now() - originalCall.startTime) / 1000),
                    transferredTo: consultationCall.dialnumber,
                  };
                }
                return c;
              });

              useConversationStore.setState({ conversations: [...updated] });

              removeCall(consultationCallId);
              removeCall(originalCallId);

              set({
                callstatus: "Transfer successful",
                callType: "",
                dialnumber: "",
                session: null,
                isConsulting: false,
                consultationCallId: null,
                originalCallId: null,
              });

              await new Promise(resolve => setTimeout(resolve, 300));

              try {
                if (originalSession?.state === SessionState.Established) {
                  console.log("📞 Ending original session...");
                  await originalSession.bye();
                  console.log("✅ Original session ended");
                }
              } catch (byeError) {
                console.warn("⚠️ Error ending original session:", byeError);
                if (originalSession.dispose) {
                  try {
                    await originalSession.dispose();
                  } catch (disposeError) {
                    console.warn("⚠️ Dispose failed:", disposeError);
                  }
                }
              }

              try {
                await useConversationStore.getState().getConversations();
              } catch (refreshError) {
                console.warn("⚠️ Failed to refresh conversations:", refreshError);
              }

              toast.success("Warm transfer completed successfully");
            },

            onReject: (response) => {
              console.error("❌ Warm transfer REFER rejected:", response);
              const errorMsg = response?.message?.reasonPhrase || "Transfer rejected";

              updateCall(originalCallId, {
                callstatus: "In Call",
                isTransferring: false
              });
              updateCall(consultationCallId, {
                callstatus: "In Consultation",
                isTransferring: false
              });

              set({ callstatus: "Warm transfer failed" });
              toast.error(`Transfer rejected: ${errorMsg}`);
            },
          },
          requestOptions: {
            extraHeaders: [
              `Replaces: ${consultationSession.dialog.callId};to-tag=${consultationSession.dialog.remoteTag};from-tag=${consultationSession.dialog.localTag}`,
            ],
          },
        };

        await originalSession.refer(
          UserAgent.makeURI(consultationTarget),
          referOptions
        );

      } catch (error) {
        console.error("❌ Complete warm transfer failed:", error);
        toast.error(`Warm transfer failed: ${error.message}`);
        set({ callstatus: `Warm transfer failed: ${error.message}` });

        const originalCall = getCall(originalCallId);
        const consultationCall = getCall(consultationCallId);

        if (originalCall) {
          updateCall(originalCallId, {
            callstatus: "In Call",
            isTransferring: false
          });
        }
        if (consultationCall) {
          updateCall(consultationCallId, {
            callstatus: "In Consultation",
            isTransferring: false
          });
        }
      } finally {
        set({ isTransferInProgress: false });
      }
      return;
    }

    const { session, consultationSession } = get();

    if (!session || !consultationSession) {
      console.error("Cannot complete transfer - missing session or consultation");
      toast.error("Transfer failed: Missing sessions");
      return;
    }

    if (
      session.state !== SessionState.Established ||
      consultationSession.state !== SessionState.Established
    ) {
      console.error("Cannot complete transfer - sessions not established");
      toast.error("Cannot complete transfer - calls not established");
      return;
    }

    try {
      set({ callstatus: "Completing warm transfer..." });

      const consultationTarget = consultationSession.remoteIdentity.uri.toString();

      const referOptions = {
        requestDelegate: {
          onAccept: async (response) => {
            console.log("✅ Legacy warm transfer accepted");

            try {
              await consultationSession.bye();
              console.log("✅ Consultation ended");
            } catch (err) {
              console.error("Error ending consultation:", err);
            }

            set({
              consultationSession: null,
              isConsulting: false,
              callstatus: "Warm transfer successful",
              callBottomBar: false,
            });

            await new Promise(resolve => setTimeout(resolve, 300));

            try {
              await session.bye();
              console.log("✅ Original session ended");
            } catch (err) {
              console.error("Error ending original session:", err);
            }
          },
          onReject: (response) => {
            console.error("❌ Legacy warm transfer rejected:", response);
            set({ callstatus: "Warm transfer failed" });
            toast.error("Transfer rejected");
          },
        },
        requestOptions: {
          extraHeaders: [
            `Replaces: ${consultationSession.dialog.callId};to-tag=${consultationSession.dialog.remoteTag};from-tag=${consultationSession.dialog.localTag}`,
          ],
        },
      };

      await session.refer(UserAgent.makeURI(consultationTarget), referOptions);
    } catch (error) {
      console.error("❌ Complete warm transfer failed:", error);
      set({ callstatus: "Warm transfer completion failed" });
      toast.error(`Transfer failed: ${error.message}`);
    }
  },
  makeCallBarge: async (uuid, ip, number, name) => {
    let mode;
    const n = String(name || "")
      .trim()
      .toLowerCase();
    if (n === "barge") mode = "Barge";
    else if (n === "listen") mode = "Listen";
    else if (n === "whisper" || n === "wisper") mode = "Whisper";
    else mode = "Barge";

    const lock = get().activeBargeUUID;
    if (lock && lock !== uuid) {
      console.warn(`Barge already active on ${lock}, cannot start on ${uuid}`);
      return;
    }

    const ua = get().ua;
    if (!ua) {
      console.error("UA not initialized—run initUA() first.");
      return;
    }

    useDashboardStore.getState().patchRowByUUID(uuid, {
      __bargeStatus: `${mode} Ringing`,
      __bargeInProgress: true,
    });
    set({ activeBargeUUID: uuid });

    let dialNumber;
    if (mode === "Barge") dialNumber = `553${number}`;
    else if (mode === "Listen") dialNumber = `550${number}`;
    else if (mode === "Whisper") dialNumber = `552${number}`;


    const authUser = useAuthStore.getState().authUser;
    const targetUri = dialNumber.includes("@")
      ? UserAgent.makeURI(`sip:${dialNumber}`)
      : UserAgent.makeURI(`sip:${dialNumber}@${authUser.p_proxyDomainName}`);

    if (!targetUri) {
      console.error("Invalid barge target URI");
      useDashboardStore.getState().patchRowByUUID(uuid, {
        __bargeStatus: `${mode} Failed`,
        __bargeInProgress: false,
      });
      set({ activeBargeUUID: null });
      return;
    }

    const inviter = new Inviter(ua, targetUri, {
      earlyMedia: true,
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
      },
      extraHeaders: [
        "X-Barge-In: true",
        `X-Ip: ${ip}`,
        `X-Target-uuid: ${uuid}`,
      ],
    });

    set({ bargeSession: inviter });

    inviter.stateChange.addListener((state) => {

      switch (state) {
        case SessionState.Establishing:
          useDashboardStore.getState().patchRowByUUID(uuid, {
            __bargeStatus: `${mode} Connecting`,
            __bargeInProgress: true,
          });

          setTimeout(() => {
            attachRemoteAudio(inviter);
          }, 100);
          break;

        case SessionState.Established:
          useDashboardStore.getState().patchRowByUUID(uuid, {
            __bargeStatus: `${mode} Active`,
            __bargeInProgress: true,
          });

          setTimeout(() => {
            attachRemoteAudio(inviter);
          }, 200);

          set({
            session: inviter,
            callType: mode,
            dialnumber: dialNumber,
            callstatus: `${mode} Active`,
          });
          break;

        case SessionState.Terminated:
          useDashboardStore.getState().patchRowByUUID(uuid, {
            __bargeStatus: `${mode} Ended`,
            __bargeInProgress: false,
          });

          const audioEl = document.getElementById("remoteAudio");
          if (audioEl && audioEl.srcObject) {
            audioEl.srcObject.getTracks().forEach((track) => track.stop());
            audioEl.srcObject = null;
          }

          const playBtn = document.getElementById("audioPlayBtn");
          if (playBtn) {
            playBtn.remove();
          }

          const currentSession = get().session;
          if (currentSession === inviter) {
            set({
              session: null,
              bargeSession: null,
              callType: "",
              dialnumber: "",
              activeBargeUUID: null,
              callstatus: "",
            });
          } else {
            set({
              bargeSession: null,
              activeBargeUUID: null,
            });
          }

          setTimeout(() => {
            useDashboardStore.getState().patchRowByUUID(uuid, {
              __bargeStatus: undefined,
            });
          }, 3000);
          break;

        case SessionState.Terminating:
          useDashboardStore.getState().patchRowByUUID(uuid, {
            __bargeStatus: `${mode} Ending`,
            __bargeInProgress: false,
          });
          break;
      }
    });

    inviter.delegate = {
      onBye: (bye) => {
        useDashboardStore.getState().patchRowByUUID(uuid, {
          __bargeStatus: `${mode} Rejected`,
          __bargeInProgress: false,
        });
      },
    };

    try {
      await inviter.invite();
    } catch (err) {
      console.error(`${mode} invite error:`, err);
      useDashboardStore.getState().patchRowByUUID(uuid, {
        __bargeStatus: `${mode} Failed`,
        __bargeInProgress: false,
      });
      set({
        activeBargeUUID: null,
        bargeSession: null,
      });

      setTimeout(() => {
        useDashboardStore.getState().patchRowByUUID(uuid, {
          __bargeStatus: undefined,
        });
      }, 3000);
    }
  },
  endBarge: async (uuid) => {
    const { session, bargeSession, activeBargeUUID, callType } = get();
    const sessionToEnd = bargeSession || session;

    if (!sessionToEnd) {
      console.warn("No session to end");
      const mode = callType || "Barge";
      useDashboardStore.getState().patchRowByUUID(uuid, {
        __bargeStatus: `${mode} Ended`,
        __bargeInProgress: false,
      });
      set({
        session: null,
        bargeSession: null,
        callType: "",
        dialnumber: "",
        activeBargeUUID: null,
      });
      return;
    }

    if (activeBargeUUID && activeBargeUUID !== uuid) {
      console.warn(
        `Cannot end barge for ${uuid}, active barge is ${activeBargeUUID}`
      );
      return;
    }

    const mode = callType || "Barge";

    try {
      switch (sessionToEnd.state) {
        case SessionState.Initial:
        case SessionState.Establishing:
          if (sessionToEnd.cancel) {
            await sessionToEnd.cancel();
          }
          break;

        case SessionState.Established:
          if (sessionToEnd.bye) {
            await sessionToEnd.bye();
          }
          break;

        case SessionState.Terminating:
        case SessionState.Terminated:
          break;

        default:
          console.warn("Unknown session state:", sessionToEnd.state);
          break;
      }
    } catch (error) {
      console.warn("Error during barge termination:", error);
    }

    useDashboardStore.getState().patchRowByUUID(uuid, {
      __bargeStatus: `${mode} Ended`,
      __bargeInProgress: false,
    });

    set({
      session: sessionToEnd === session ? null : session,
      bargeSession: null,
      callType: sessionToEnd === session ? "" : callType,
      dialnumber: sessionToEnd === session ? "" : get().dialnumber,
      activeBargeUUID: null,
      callstatus: sessionToEnd === session ? "" : get().callstatus,
    });

    setTimeout(() => {
      useDashboardStore.getState().patchRowByUUID(uuid, {
        __bargeStatus: undefined,
      });
    }, 3000);

    try {
      if (sessionToEnd.dispose) {
        await sessionToEnd.dispose();
      }
    } catch (disposeError) {
      console.warn("Error disposing session:", disposeError);
    }
  },
  startConference: async (callId = null) => {
    const {
      activeCalls,
      updateCall,
      ua,
      addCall,
      removeCall,
      getCall,
      isConferenceActive
    } = get();

    const authUser = useAuthStore.getState().authUser;
    const conferenceName = authUser?.m_memberExtensionNo;

    if (!conferenceName) {
      console.error("❌ No extension number for conference");
      toast.error("Conference failed: No extension number");
      return;
    }

    if (callId && isConferenceActive) {
      await get().addCallToConference(callId);
      return;
    }

    if (!isConferenceActive) {
      try {
        const callsToMerge = activeCalls.filter(c =>
          c.session?.state === SessionState.Established &&
          !c.isConsultation &&
          !c.isInConference &&
          !c.id.includes('conference-agent') &&
          c.callstatus !== "Conference Bridge"
        );


        if (callsToMerge.length < 2) {
          console.error("❌ Need at least 2 calls");
          toast.error("Need at least 2 active calls for conference");
          return;
        }

        const callsToRefer = [];

        for (const call of callsToMerge) {
          if (!call.hold && call.session?.state === SessionState.Established) {
            try {
              await call.session.invite({
                sessionDescriptionHandlerModifiers: [
                  (description) => {
                    if (description.sdp) {
                      description.sdp = description.sdp.replace(/a=sendrecv/g, "a=sendonly");
                    }
                    return Promise.resolve(description);
                  },
                ],
              });

              updateCall(call.id, {
                hold: true,
                callstatus: "On Hold for Conference",
              });

              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
              console.error(`   ❌ Failed to hold ${call.dialnumber}:`, error);
            }
          }

          callsToRefer.push({
            id: call.id,
            dialnumber: call.dialnumber,
            session: call.session,
          });
        }

        set({ isConferenceConnecting: true });

        const authUser = useAuthStore.getState().authUser;
        const conferenceURI = `sip:pulseConference@${authUser.p_proxyDomainName}`;
        const targetURI = UserAgent.makeURI(conferenceURI);

        if (!targetURI) {
          throw new Error("Invalid conference URI");
        }

        let audioEl = document.getElementById("conference-audio-agent");
        if (!audioEl) {
          audioEl = document.createElement("audio");
          audioEl.id = "conference-audio-agent";
          audioEl.autoplay = true;
          audioEl.playsInline = true;
          audioEl.muted = false;
          document.body.appendChild(audioEl);
        }

        const agentInviter = new Inviter(ua, targetURI, {
          sessionDescriptionHandlerOptions: {
            constraints: { audio: true, video: false },
            offerOptions: { offerToReceiveAudio: true },
            peerConnectionOptions: {
              rtcConfiguration: {
                iceServers: [
                  { urls: "stun:stun.l.google.com:19302" },
                  { urls: "stun:stun1.l.google.com:19302" },
                ],
              },
            },
          },
          extraHeaders: [
            "X-Conference-In: true",
            "X-Conference-Role: moderator",
            `X-roomId: ${conferenceName}`,
            `X-accountNo: ${authUser.m_accountNo}`,
            `X-accountId: ${authUser.m_accountId}`
          ],
        });

        const agentCallId = `conference-agent-${Date.now()}`;

        const setupAgentAudio = (session) => {
          const pc = session?.sessionDescriptionHandler?.peerConnection;
          if (!pc) return;

          pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
              audioEl.srcObject = event.streams[0];
              audioEl.play().catch((e) => console.warn("Audio play blocked:", e));
            }
          };

          const remoteStream = new MediaStream();
          pc.getReceivers().forEach((receiver) => {
            if (receiver.track && receiver.track.kind === "audio") {
              remoteStream.addTrack(receiver.track);
            }
          });

          if (remoteStream.getAudioTracks().length > 0) {
            audioEl.srcObject = remoteStream;
            audioEl.play().catch((e) => console.warn("Audio play blocked:", e));
          }
        };

        addCall({
          id: agentCallId,
          session: agentInviter,
          callerName: "Agent (Conference)",
          dialnumber: "Conference Bridge",
          callstatus: "Joining Conference",
          isInConference: true,
          startTime: Date.now(),
          muted: false,
          held: false,
          direction: "outbound",
        });

        agentInviter.stateChange.addListener((state) => {

          if (state === SessionState.Established) {
            updateCall(agentCallId, { callstatus: "Conference Active" });
            setupAgentAudio(agentInviter);
          } else if (state === SessionState.Terminated) {
            if (audioEl) audioEl.srcObject = null;
            removeCall(agentCallId);

            set({
              isConferenceConnecting: false,
              isConferenceActive: false,
            });
          }
        });

        await agentInviter.invite();

        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Agent timeout")), 15000);

          const check = () => {
            if (agentInviter.state === SessionState.Established) {
              clearTimeout(timeout);
              resolve();
            } else if (agentInviter.state === SessionState.Terminated) {
              clearTimeout(timeout);
              reject(new Error("Agent connection failed"));
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        const participantIds = [agentCallId];

        for (let i = 0; i < callsToRefer.length; i++) {
          const callInfo = callsToRefer[i];


          try {
            if (!callInfo.session || callInfo.session.state !== SessionState.Established) {
              console.error(`   ❌ Session invalid`);
              continue;
            }

            const preventRemoval = (newState) => {
              if (newState === SessionState.Terminated) {
                const currentCall = getCall(callInfo.id);
                if (currentCall?.isReferPending) {
                  updateCall(callInfo.id, {
                    callstatus: "In Conference",
                    isReferPending: false,
                    isInConference: true,
                  });
                }
              }
            };

            callInfo.session.stateChange.addListener(preventRemoval);

            try {
              await callInfo.session.invite({
                sessionDescriptionHandlerModifiers: [
                  (description) => {
                    if (description.sdp) {
                      description.sdp = description.sdp.replace(/a=sendonly/g, "a=sendrecv");
                    }
                    return Promise.resolve(description);
                  },
                ],
              });

              updateCall(callInfo.id, {
                hold: false,
                callstatus: "Preparing for Conference",
              });

              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
              console.warn(`   ⚠️  Unhold failed, continuing...`);
            }

            updateCall(callInfo.id, {
              callstatus: "Transferring to Conference",
              isInConference: true,
              isReferPending: true,
            });

            const authUser = useAuthStore.getState().authUser;
            const referToURI = `sip:pulseConference@${authUser.p_proxyDomainName}`;
            const referToTarget = UserAgent.makeURI(referToURI);


            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error("REFER timeout")), 15000);

              callInfo.session.refer(referToTarget, {
                requestDelegate: {
                  onAccept: () => {
                    clearTimeout(timeout);
                    resolve();
                  },
                  onReject: (response) => {
                    clearTimeout(timeout);
                    console.error(`   ❌ REFER rejected: ${response?.message?.statusCode}`);
                    reject(new Error("REFER rejected"));
                  },
                }
              });
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            const verifyCall = getCall(callInfo.id);
            if (!verifyCall) {
              console.warn(`   ⚠️  Call removed, re-adding...`);
              addCall({
                ...callInfo,
                callstatus: "In Conference",
                isInConference: true,
                isReferPending: false,
              });
            } else {
              updateCall(callInfo.id, {
                callstatus: "In Conference",
                isReferPending: false,
              });
            }

            participantIds.push(callInfo.id);

            if (i < callsToRefer.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }

          } catch (error) {
            console.error(`   ❌ Transfer failed:`, error.message);
            updateCall(callInfo.id, {
              callstatus: "Conference Failed",
              isInConference: false,
              isReferPending: false,
            });
          }
        }


        set({
          isConferenceActive: true,
          isConferenceConnecting: false,
          conferenceParticipants: participantIds,
          callstatus: "Conference Active",
        });

        toast.success(`Conference started`);
        await get().mergeConversationsInUI();

      } catch (error) {
        console.error("❌ Conference failed:", error);
        toast.error(`Conference failed: ${error.message}`);

        activeCalls.forEach((c) => {
          if (c.callstatus?.includes("Conference")) {
            updateCall(c.id, {
              isInConference: false,
              isReferPending: false,
              callstatus: "In Call",
              hold: false,
            });
          }
        });

        set({
          isConferenceActive: false,
          isConferenceConnecting: false,
          conferenceParticipants: [],
        });
      }
    }
  },
  addCallToConference: async (callId) => {
    const authUser = useAuthStore.getState().authUser;
    const conferenceName = authUser?.m_memberExtensionNo;

    const {
      activeCalls,
      updateCall,
      ua,
      isConferenceActive,
      removeCall,
      addCall,
    } = get();

    if (!isConferenceActive) {
      console.warn("No active conference to add call to");
      return;
    }

    const callToAdd = activeCalls.find(
      (c) => c.id === callId && !c.isInConference
    );
    if (!callToAdd) {
      console.warn(`Call ${callId} not found or already in conference`);
      return;
    }
    if (callToAdd.session?.state !== SessionState.Established) {
      console.warn(`Call ${callId} is not established`);
      return;
    }

    try {
      const authUser = useAuthStore.getState().authUser;
      const conferenceURI = `sip:pulseConference-${conferenceName}@${authUser.p_proxyDomainName}`;
      const targetURI = UserAgent.makeURI(conferenceURI);
      if (!targetURI) throw new Error("Invalid conference URI");

      let agentConferenceCall = activeCalls.find(
        (c) => c.isInConference && c.callerName === "Agent (Conference)"
      );

      const ensureAgentOntrack = (sessionLike) => {
        const pc = sessionLike?.sessionDescriptionHandler?.peerConnection;
        if (!pc) return;

        let audioEl = document.getElementById("conference-audio-agent");
        if (!audioEl) {
          audioEl = document.createElement("audio");
          audioEl.id = "conference-audio-agent";
          audioEl.autoplay = true;
          audioEl.playsInline = true;
          audioEl.muted = false;
          document.body.appendChild(audioEl);
        }

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            audioEl.srcObject = event.streams[0];
            audioEl.play().catch((e) => console.warn("Audio play blocked:", e));
          }
        };

        const remote = new MediaStream();
        pc.getReceivers().forEach((r) => {
          if (r.track && r.track.kind === "audio") remote.addTrack(r.track);
        });
        if (remote.getAudioTracks().length) {
          audioEl.srcObject = remote;
          audioEl.play().catch((e) => console.warn("Audio play blocked:", e));
        }
      };

      if (
        !agentConferenceCall ||
        agentConferenceCall.session?.state !== SessionState.Established
      ) {
        console.warn("Agent not connected to conference, reconnecting.");

        const agentInviter = new Inviter(ua, targetURI, {
          sessionDescriptionHandlerOptions: {
            constraints: { audio: true, video: false },
            offerOptions: { offerToReceiveAudio: true },
            peerConnectionOptions: {
              rtcConfiguration: {
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
              },
            },
          },
          extraHeaders: [
            "X-Conference-In: true",
            "X-Conference-Role: moderator",
          ],
        });

        const newAgentCallId = `conference-agent-${Date.now()}`;
        addCall({
          id: newAgentCallId,
          session: agentInviter,
          callerName: "Agent (Conference)",
          dialnumber: "Conference Bridge",
          callstatus: "Rejoining Conference",
          isInConference: true,
          startTime: Date.now(),
          muted: false,
          held: false,
          direction: "outbound",
        });

        agentInviter.stateChange.addListener((state) => {
          if (state === SessionState.Established) {
            updateCall(newAgentCallId, { callstatus: "Conference Active" });
            ensureAgentOntrack(agentInviter);
          } else if (state === SessionState.Terminated) {
            removeCall(newAgentCallId);
          }
        });

        await agentInviter.invite();
        await new Promise((r) => setTimeout(r, 1200));

        agentConferenceCall = get().activeCalls.find(
          (c) => c.isInConference && c.callerName === "Agent (Conference)"
        );
      } else {
        ensureAgentOntrack(agentConferenceCall.session);
      }

      const originalSession = callToAdd.session;

      const conferenceStateListener = (state) => {

        if (state === SessionState.Terminated) {

          removeCall(callId);

          const { conferenceParticipants, activeCalls } = get();
          const updatedParticipants = conferenceParticipants.filter(
            id => id !== callId
          );

          const remainingConferenceCalls = activeCalls.filter(
            c => c.isInConference && c.id !== callId
          );

          if (remainingConferenceCalls.length === 0) {
            set({
              isConferenceActive: false,
              isConferenceConnecting: false,
              conferenceParticipants: [],
            });
          } else {
            set({
              conferenceParticipants: updatedParticipants,
            });
          }
        }
      };

      if (callToAdd.hold) {
        try {
          const unholdOptions = {
            sessionDescriptionHandlerModifiers: [
              (description) => {
                if (description.sdp) {
                  description.sdp = description.sdp.replace(
                    /a=sendonly/g,
                    "a=sendrecv"
                  );
                }
                return Promise.resolve(description);
              },
            ],
          };

          await callToAdd.session.invite(unholdOptions);
          updateCall(callId, {
            hold: false,
            callstatus: "Preparing for Conference",
          });

          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (unholdError) {
          console.error(`Failed to unhold call ${callId}:`, unholdError);
        }
      }

      originalSession.stateChange.addListener(conferenceStateListener);

      const pc = callToAdd.session?.sessionDescriptionHandler?.peerConnection;
      if (pc && pc.localDescription) {
        const hasSendonly = pc.localDescription.sdp.includes('a=sendonly');
        if (hasSendonly) {
          console.error('❌ CRITICAL: Call is still on hold! SDP:', pc.localDescription.sdp.substring(0, 500));
        }
      }

      await callToAdd.session.refer(targetURI, {
        extraHeaders: [
          "X-Conference-In: true",
          `Referred-By: <sip:agent@${ua.configuration.uri?.host || "localhost"
          }>`,
          `Contact: <sip:agent@${ua.configuration.uri?.host || "localhost"}>`,
        ],
        requestDelegate: {
          onAccept: () => {
            updateCall(callId, {
              callstatus: "In Conference",
              isInConference: true,
            });

            const { conferenceParticipants } = get();
            set({
              conferenceParticipants: [
                ...(conferenceParticipants || []),
                callId,
              ],
            });

            get().mergeConversationsInUI();

            const agent = get().activeCalls.find(
              (c) => c.isInConference && c.callerName === "Agent (Conference)"
            );
            if (agent?.session) ensureAgentOntrack(agent.session);
          },
          onReject: (response) => {
            console.error(
              "Conference REFER rejected:",
              response?.message?.statusCode
            );
            updateCall(callId, { callstatus: "Conference Add Failed" });
          },
        },
      });
    } catch (err) {
      console.error("Failed to add to conference:", err);
    }
  },
  fetchConferenceData: async () => {
    try {
      const authUser = useAuthStore.getState().authUser;
      const conferenceName = authUser?.m_memberExtensionNo;
      const accountNo = authUser?.m_accountNo;

      const response = await callingfeaturesaxios.get(
        `/callfeatures/conference/list?conference_name=${conferenceName}-${accountNo}`
      );

      if (
        response.data?.conferences &&
        response.data.conferences.length > 0
      ) {
        return response.data.conferences;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch conference data:", error);
      return null;
    }
  },
  mergeConversationsInUI: async () => {
    const { activeCalls, isConferenceActive, conferenceConversationId } = get();
    const authUser = useAuthStore.getState().authUser;

    if (!isConferenceActive) {
      return;
    }

    const conferenceCalls = activeCalls.filter(call =>
      call.isInConference &&
      call.activeConversationId &&
      !call.id.includes('conference-agent')
    );

    if (conferenceCalls.length < 2 && !conferenceConversationId) {
      return;
    }

    try {
      let conversationIds;

      if (!conferenceConversationId) {
        conversationIds = conferenceCalls
          .map(call => call.activeConversationId)
          .filter(Boolean);

      }
      else {
        const newCalls = conferenceCalls.filter(call =>
          call.activeConversationId !== conferenceConversationId
        );

        if (newCalls.length === 0) {
          return;
        }

        conversationIds = [
          conferenceConversationId,
          newCalls[0].activeConversationId
        ];
      }

      const phoneNumbers = conferenceCalls
        .map(call => call.dialnumber)
        .filter(Boolean);

      const primaryCall = conferenceCalls[0];

      const payload = {
        conversationids: conversationIds,
        conferenceparticipants: phoneNumbers,
        phonenumber: primaryCall.dialnumber,
        leadid: primaryCall.leadId || conversationIds[0],
        callid: primaryCall.id,
        campaignid: primaryCall.campaignId || 1,
      };


      try {
        const response = await useConversationStore.getState().mergeConversationsToConference(payload, false);

        if (response?.data?.conversationId) {
          set({ conferenceConversationId: response.data.conversationId });
        }

      } catch (apiError) {
        console.error("❌ Conference merge API failed:", apiError);
        console.error("Error details:", {
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data,
          message: apiError.message
        });
      }
    } catch (error) {
      console.error("❌ Failed to merge conversations:", error);
    }
  },
  resetConferenceId: () => {
    set({ conferenceConversationId: null });
  },
  removeParticipantFromConference: async (call) => {
    console.log(call, " Removing participant from conference...");
    try {
      const authUser = useAuthStore.getState().authUser;
      const conferenceName = authUser?.m_memberExtensionNo;
      const accountNo = authUser?.m_accountNo;

      const remainingParticipants = get().activeCalls.filter(
        c => c.isInConference
      );

      const participantIds = remainingParticipants.map(p => p.id);
      set({ conferenceParticipants: participantIds });

      const conferenceData = await get().fetchConferenceData();

      if (Array.isArray(conferenceData) && conferenceData.length > 0) {
        const allParticipants = conferenceData.flatMap(c =>
          c.participants ? c.participants : [c]
        );

        const participant = allParticipants.find(
          p => p.participant_no?.slice(-10) === call.dialnumber?.slice(-10)
        );


        if (participant?.conference_id) {
          try {
            await conversationaxios.post(`/callfeatures/conference/${conferenceName}/kick/${participant.conference_id}/${accountNo}`);

          } catch (apiError) {
            console.error("❌ API kick error:", apiError);
          }
        } else {
          console.warn("⚠️ No conferenceId found for participant:", call.dialnumber);
        }
      } else {
        console.warn("⚠️ No valid conference data found.");
      }

      if (call.session?.state === SessionState.Established) {
        try {
          await call.session.bye();
        } catch (sessionError) {
          console.error("❌ Error ending session:", sessionError);
        }
      }

      const updatedConferenceData = await get().fetchConferenceData();
      if (updatedConferenceData?.[0]?.participants) {
        set({ latestConferenceData: updatedConferenceData[0].participants });
      }

      if (remainingParticipants.length <= 1) {

        if (remainingParticipants.length === 1) {
          const lastParticipant = remainingParticipants[0];

          if (lastParticipant.session?.state === SessionState.Established) {
            await lastParticipant.session.bye();
          }
          await get().hangUp(lastParticipant.id);
        }

        set({
          isConferenceActive: false,
          isConferenceConnecting: false,
          conferenceParticipants: [],
        });

      }

      return true;
    } catch (error) {
      console.error(`Failed to remove participant ${call.id}:`, error);
      return false;
    }
  },
  handleConferenceParticipantLeft: async (eventData) => {
    try {
      const { CallerCallerIDNumber } = eventData;
      const { activeCalls } = get();


      const participantCall = activeCalls.find((call) => {
        if (!call.isInConference) return false;

        const cleanDial = call.dialnumber?.replace(/\D/g, "");
        const cleanCaller = CallerCallerIDNumber?.replace(/\D/g, "");

        const last10Dial = cleanDial?.slice(-10);
        const last10Caller = cleanCaller?.slice(-10);
        const last12Dial = cleanDial?.slice(-12);
        const last12Caller = cleanCaller?.slice(-12);

        return (
          last10Dial === last10Caller ||
          last12Dial === last12Caller
        );
      });


      if (participantCall) {
        console.log("Participant left detected for call:", participantCall.id);
        await get().removeParticipantFromConference(participantCall);
      } else {
        console.warn("No matching participant found for:", CallerCallerIDNumber);
      }
    } catch (error) {
      console.error("Error handling participant left event:", error);
    }
  },
  endConference: async () => {
    try {
      const { activeCalls, resetConferenceId } = get();
      const authUser = useAuthStore.getState().authUser;
      const conferenceName = authUser?.m_memberExtensionNo;
      const accountNo = authUser?.m_accountNo;

      const conferenceCall = activeCalls.find(
        (c) => c.isInConference && c.conferenceName
      );

      if (activeCalls.filter(c => c.isInConference).length === 0) {
        resetConferenceId();
      }

      const conferenceNameToEnd = conferenceCall?.conferenceName || conferenceName

      if (conferenceNameToEnd) {
        try {
          await callingfeaturesaxios.post(
            `/callfeatures/conference/${conferenceNameToEnd}/kick-all/${accountNo}`,
          );
        } catch (apiError) {
          console.error(
            "API kick-all failed, falling back to local hangup:",
            apiError
          );
        }
      }

      const conferenceCalls = activeCalls.filter(
        (call) => call.isInConference
      );

      for (const call of conferenceCalls) {
        try {
          if (call.session) {
            if (call.session.state === SessionState.Established) {
              await call.session.bye();
            }
          }
          get().removeCall(call.id);
        } catch (error) {
          console.error(`Failed to end call ${call.id}:`, error);
          get().removeCall(call.id);
        }
      }

      set({
        isConferenceActive: false,
        isConferenceConnecting: false,
        conferenceParticipants: [],
        callstatus: "",
      });

      const conferenceId = get().conferenceParticipants[0];
      if (conferenceId) {
        useConversationStore.getState().unmergeConference(conferenceId);
      }

      return true;
    } catch (error) {
      console.error("Failed to end conference:", error);

      set({
        isConferenceActive: false,
        isConferenceConnecting: false,
        conferenceParticipants: [],
      });

      return false;
    }
  },
  rejoinConference: async () => {
    try {
      const { ua, addCall, updateCall, removeCall, activeCalls } = get();
      const authUser = useAuthStore.getState().authUser;
      const conferenceName = authUser?.m_memberExtensionNo;

      if (!conferenceName) {
        console.error("Cannot rejoin: no extension number");
        return false;
      }
      const existingAgentCall = activeCalls.find(
        (call) => call.isInConference && call.callerName === "Agent (Conference)"
      );

      if (existingAgentCall) {
        return true;
      }

      const conferenceURI = `sip:pulseConference-${conferenceName}@${authUser.p_proxyDomainName}`;
      const targetURI = UserAgent.makeURI(conferenceURI);

      if (!targetURI) {
        throw new Error("Invalid conference URI");
      }

      let audioEl = document.getElementById("conference-audio-agent");
      if (!audioEl) {
        audioEl = document.createElement("audio");
        audioEl.id = "conference-audio-agent";
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        document.body.appendChild(audioEl);
      }

      const agentInviter = new Inviter(ua, targetURI, {
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: false },
        },
        extraHeaders: [
          "X-Conference-In: true",
          "X-Conference-Role: moderator",
          `X-roomId: ${conferenceName}`,
        ],
      });

      const agentCallId = `conference-agent-${Date.now()}`;
      const agentCall = {
        id: agentCallId,
        session: agentInviter,
        callerName: "Agent (Conference)",
        dialnumber: "Conference Bridge",
        callstatus: "Rejoining Conference",
        isInConference: true,
        startTime: Date.now(),
        muted: false,
        held: false,
        direction: "outbound",
      };

      addCall(agentCall);

      agentInviter.stateChange.addListener((state) => {
        if (state === SessionState.Established) {
          updateCall(agentCallId, {
            callstatus: "Conference Active"
          });

          const sdh = agentInviter.sessionDescriptionHandler;
          if (sdh?.peerConnection) {
            const remoteStream = new MediaStream();
            sdh.peerConnection.getReceivers().forEach((receiver) => {
              if (receiver.track) {
                remoteStream.addTrack(receiver.track);
              }
            });
            if (remoteStream.getTracks().length > 0) {
              audioEl.srcObject = remoteStream;
              audioEl.play().catch(e => console.error("Failed to play:", e));
            }
          }
        } else if (state === SessionState.Terminated) {
          removeCall(agentCallId);
          if (audioEl) audioEl.srcObject = null;
        }
      });

      await agentInviter.invite();
      return true;
    } catch (error) {
      console.error("Failed to rejoin conference:", error);
      return false;
    }
  },
  muteAllConferenceCalls: () => {
    const { activeCalls, mute } = get();
    const conferenceCalls = activeCalls.filter(
      (call) =>
        call.isInConference &&
        call.callerName !== "Agent (Conference)" &&
        !call.muted
    );

    conferenceCalls.forEach((call) => {
      mute(call.id);
    });

  },
  unmuteAllConferenceCalls: () => {
    const { activeCalls, unmute } = get();
    const conferenceCalls = activeCalls.filter(
      (call) =>
        call.isInConference &&
        call.callerName !== "Agent (Conference)" &&
        call.muted
    );

    conferenceCalls.forEach((call) => {
      unmute(call.id);
    });

  },
  getConferenceCalls: () => {
    const { activeCalls, conferenceParticipants } = get();

    const participants = Array.isArray(conferenceParticipants)
      ? conferenceParticipants
      : [];

    const calls = Array.isArray(activeCalls) ? activeCalls : [];
    const hasExplicitList = participants.length > 0;

    return calls.filter(
      (call) =>
        ((hasExplicitList && participants.includes(call.id)) ||
          call?.isInConference === true) &&
        call?.callerName !== "Agent (Conference)" &&
        call?.dialnumber !== "Conference Bridge"
    );
  },
  makeWhatsCall: async (number, navigate, campaignId) => {
    const { ua, addCall, updateCall, removeCall, activeCalls } = get();

    if (!ua) {
      console.error("UA not initialized, run initUA first.");
      toast.error("Phone system not initialized");
      return;
    }

    const hasAudioDevices = await checkAudioDevices();

    if (!hasAudioDevices) {
      console.warn("No audio devices detected");
      toast.error("No microphone detected. Please connect an audio device to make WhatsApp calls.");
      return;
    }

    const cleanNumber = number.replace(/\D/g, '');

    try {

      const whatsappResponse = await fetch(
        '/callfeatures/whatsapp/initial-template',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            whatsappNumber: cleanNumber
          })
        }
      );

      if (!whatsappResponse.ok) {
        const errorData = await whatsappResponse.json();
        console.error("WhatsApp API error:", errorData);
        toast.error(`WhatsApp message failed: ${errorData.detail || 'Unknown error'}`);
        return;
      }

      const whatsappData = await whatsappResponse.json();

      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error("Failed to send WhatsApp message:", error);
      toast.error("Failed to send WhatsApp message");
      return;
    }

    if (activeCalls.length > 0) {
      for (const existingCall of activeCalls) {
        if (
          !existingCall.hold &&
          existingCall.session?.sessionDescriptionHandler
        ) {
          const holdStartTime = Date.now();

          try {
            const holdOptions = {
              sessionDescriptionHandlerModifiers: [
                (description) => {
                  if (description.sdp) {
                    description.sdp = description.sdp.replace(
                      /a=sendrecv/g,
                      "a=sendonly"
                    );
                  }
                  return Promise.resolve(description);
                },
              ],
            };

            await existingCall.session.invite(holdOptions);
            updateCall(existingCall.id, {
              hold: true,
              callstatus: existingCall.muted ? "On Hold & Muted" : "On Hold",
              holdStartTime,
              totalHoldDuration: existingCall.totalHoldDuration || 0,
            });
          } catch (error) {
            console.error(`Error holding call ${existingCall.id}:`, error);
          }
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const callid = `whatsapp-${uuidv4()}`;
    const fullNumber = number;

    const leadData = {
      leadId: "5365645675",
      conversationId: "dhfjkdhgjhbdj"
    };

    try {
      navigate("/agent-conversation");

      try {
        await useConversationStore.getState().getConversations();
      } catch (err) {
        console.error("Failed to refresh conversations:", err);
      }
    } catch (error) {
      console.error("Failed during navigation:", error);
      toast.error("Failed to initiate WhatsApp call");
      return;
    }

    const authUser = useAuthStore.getState().authUser;
    const targetUri = UserAgent.makeURI(
      `sip:${cleanNumber}@${authUser.p_proxyDomainName}`
    );

    if (!targetUri) {
      console.error("Invalid WhatsApp URI");
      toast.error("Invalid WhatsApp number");
      return;
    }

    const extraHeaders = [
      `X-uniqueId:${callid}`,
      `X-leadId:${leadData.leadId}`,
      `X-conversationId:${leadData.conversationId}`,
      "X-whatsapp:true",
    ];

    if (campaignId) {
      extraHeaders.push(`X-campaignId:${campaignId || 0}`);
    }

    const inviter = new Inviter(ua, targetUri, {
      earlyMedia: true,
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
        iceGatheringTimeout: 100, // Fast ICE gathering
      },

      peerConnectionConfiguration: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },

          // 🔥 ADD TURN (REQUIRED)
          {
            urls: "turn:YOUR_TURN_IP:3478",
            username: "user",
            credential: "pass"
          }
        ],
        iceTransportPolicy: "all", // or "relay" for strict
      },
      extraHeaders,
    });

    const newCall = {
      id: callid,
      session: inviter,
      dialnumber: fullNumber,
      callType: "WhatsApp",
      callstatus: "Ringing",
      hold: false,
      muted: false,
      startTime: Date.now(),
      activeConversationId: leadData.conversationId,
      leadData,
      campaignId,
      hasAudioDevices: true,
      totalHoldDuration: 0,
      isInConference: false
    };

    addCall(newCall);

    set({
      session: inviter,
      callBottomBar: true,
      dialnumber: fullNumber,
      callType: "WhatsApp",
      callstatus: "Ringing",
      hold: false,
      muted: false,
      activeConversationId: leadData.conversationId,
    });

    inviter.stateChange.addListener(async (state) => {
      if (state === SessionState.Establishing) {
        attachRemoteAudio(inviter);
        updateCall(callid, { callstatus: "Ringing" });
        if (get().session === inviter) {
          set({ callstatus: "Ringing" });
        }
      }

      if (state === SessionState.Established) {
        updateCall(callid, {
          callstatus: "WhatsApp Active",
          startTime: Date.now(),
        });
        if (get().session === inviter) {
          set({ callstatus: "WhatsApp Active" });
        }

        const { conversations } = useConversationStore.getState();
        const updated = conversations.map((c) => {
          const matches =
            (leadData?.leadId && c.leadId === leadData.leadId) ||
            (leadData?.conversationId &&
              c.c_conversationId === leadData.conversationId) ||
            c.c_conversationPhoneNo === fullNumber;

          return matches
            ? { ...c, startTime: Date.now(), stopped: false, duration: null }
            : c;
        });

        useConversationStore.setState({ conversations: updated });
      }

      if (state === SessionState.Terminated) {
        console.warn("WhatsApp call terminated", inviter);

        const { conversations } = useConversationStore.getState();
        const call = get().getCall(callid);
        const callStartTime = call?.startTime || Date.now();

        const updated = conversations.map((c) => {
          const matches =
            (leadData?.leadId && c.leadId === leadData.leadId) ||
            (leadData?.conversationId &&
              c.c_conversationId === leadData.conversationId) ||
            c.c_conversationPhoneNo === fullNumber;

          if (!matches) return c;

          return {
            ...c,
            stopped: true,
            duration: Math.floor((Date.now() - callStartTime) / 1000),
          };
        });

        useConversationStore.setState({ conversations: updated });
        removeCall(callid);

        if (get().session === inviter) {
          const remainingCalls = get().activeCalls;
          if (remainingCalls.length > 0) {
            const nextCall = remainingCalls[0];
            set({
              session: nextCall.session,
              dialnumber: nextCall.dialnumber,
              callstatus: nextCall.callstatus,
              callType: nextCall.callType,
            });
          } else {
            set({
              session: null,
              callstatus: "WhatsApp Call ended",
              dialnumber: "",
              callType: "",
              hold: false,
              muted: false,
            });
          }
        }

        try {
          await useConversationStore.getState().getConversations();
        } catch (err) {
          console.error("Failed to refresh conversations:", err);
        }
      }
    });

    try {
      await inviter.invite();
      toast.success("WhatsApp call initiated");
    } catch (err) {
      console.error("WhatsApp invite error:", err);

      if (err?.message?.includes("device not found") ||
        err?.message?.includes("NotFoundError")) {
        toast.error("Microphone not found. Please connect a microphone device.");
      } else if (err?.message?.includes("NotAllowedError") ||
        err?.message?.includes("Permission denied")) {
        toast.error("Microphone access denied. Please allow microphone permissions.");
      } else if (err?.message?.includes("NotReadableError")) {
        toast.error("Microphone is being used by another application.");
      } else {
        toast.error(err.message || "WhatsApp call failed");
      }

      updateCall(callid, { callstatus: "WhatsApp Call Failed" });
      set({ callstatus: "WhatsApp Call Failed" });
      removeCall(callid);
    }

    return callid;
  },
  createCallback: async (datas) => {
    set({ createCallBackLoading: true });
    const formatted = getLocalTimestamp(datas.callbackDate);
    let data = {
      phonenumber: `${datas.number}`,
      timestamp: formatted,
    }
    try {
      const res = await callingfeaturesaxios.post('/agent/callback/create', data);
      toast.success(res.data.message);
      return res;
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
    } finally {
      set({ createCallBackLoading: false });
    }
  },

}));