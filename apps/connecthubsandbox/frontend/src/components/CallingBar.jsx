import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import "./styles/CallingBar.css";
import { callStore } from "../store/useCallStore";
import { useConversationStore } from "../store/agent/useConversationStore";
import { useAuthStore } from "../store/useAuthStore";
import useDocumentPiP from "../hooks/useDocumentPiP";
import Icon from "../constants/CallingBar_Icons.jsx";
import { formatTimer, getInitials, getContactOrAgentName } from "../utils/helpers.js";
import TransferModal from "./TransferModal.jsx";
import DTMFPad from "../components/DTMFPad.jsx";
import Badges from "../components/Badges.jsx";

// Single Call Bar Component
const SingleCallBar = ({ call, isFront = false, totalCalls = 1 }) => {
  const { authPlan } = useAuthStore();
  const { conversations, agentsData } = useConversationStore();
  const {
    hangUp,
    mute,
    unmute,
    holdCall,
    unholdCall,
    sendDTMF,
    coldTransfer,
    startWarmTransfer,
    switchCalls,
    cancelWarmTransfer,
    completeWarmTransfer,
    activeCalls,
    isConferenceActive,
    startConference,
  } = callStore();

  const [seconds, setSeconds] = useState(0);
  const [showDtmfDialpad, setShowDtmfDialpad] = useState(false);
  const [openTransfer, setTransferOpen] = useState(false);
  const [transferMode, setTransferMode] = useState("Cold");
  const intervalRef = useRef(null);

  const isConsultationCall = call.isConsultation || call.callType === "Consultation";
  const originalCall = isConsultationCall
    ? activeCalls.find((c) => c.id === call.originalCallId)
    : null;

  const contactName = getContactOrAgentName(call, conversations, agentsData);

  useEffect(() => {
    const activeStatuses = [
      "In Call",
      "Answered",
      "Resumed",
      "Starting consultation...",
      "Consultation connected - Choose transfer option",
      "Talking to original caller",
      "Talking to consultation party",
      "Consultation failed",
      "Transfer cancelled",
      "On Hold",
      "Muted",
      "On Hold & Muted",
      "In Consultation",
      "In Conference",
    ];

    if (activeStatuses.includes(call.callstatus)) {
      if (!intervalRef.current) {
        const startTime = call.startTime || Date.now();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setSeconds(elapsed);

        intervalRef.current = setInterval(() => {
          setSeconds((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setSeconds(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [call.callstatus, call.startTime]);

  const handleTransferSubmit = (target, transferType, mode) => {
    if (mode === "Cold") {
      coldTransfer(target, call.id);
      setTransferOpen(false);
    } else {
      startWarmTransfer(target, call.id);
      setTransferOpen(false);
    }
  };

  const handleCompleteTransfer = async () => {
    if (isConsultationCall && originalCall) {
      try {
        await completeWarmTransfer(originalCall.id, call.id);
      } catch (error) {
        console.error("Failed to complete warm transfer:", error);
      }
    }
  };

  const handleCancelTransfer = async () => {
    if (isConsultationCall) {
      try {
        await cancelWarmTransfer(call.id);
      } catch (error) {
        console.error("Failed to cancel warm transfer:", error);
      }
    }
  };

  // Error states
  if (
    [
      "Number Not Found",
      "Invalid Number",
      "Invalid SIP URI",
      "Call Failed",
    ].includes(call.callstatus)
  ) {
    return (
      <div
        className={`calling-bar ${isFront ? "calling-bar-front" : "calling-bar-stacked"}`}
        data-call-id={call.id}
      >
        <div className="callingbar-center">
          <p className="callingbar-error">{call.callstatus}</p>
          <button
            className="callingbar-hangup-icon-button"
            onClick={() => hangUp(call.id)}
            title="Close"
          >
            <Icon name="end" />
          </button>
        </div>
      </div>
    );
  }

  // Active Call UI
  if (
    [
      "In Call",
      "Answered",
      "Resumed",
      "On Hold",
      "Muted",
      "On Hold & Muted",
      "Starting consultation...",
      "Consultation connected - Choose transfer option",
      "Talking to original caller",
      "Talking to consultation party",
      "Transfer cancelled",
      "In Consultation",
      "In Conference",
      "WhatsApp Active",
    ].includes(call.callstatus)
  ) {
    return (
      <div style={{ position: "relative" }}>
        <div className="calling-bar" data-call-id={call.id}>
          <div className="callingbar-starting">
            <div className="callingbar-cust-initials">
              {getInitials(contactName || call.dialnumber)}
            </div>
            <div className="callingbar-cust-info">
              <p className="callingbar-cust-name">
                {isConsultationCall ? "Consultation" : contactName || "Unknown"}
              </p>
              <p className="callingbar-cust-number">
                {call.dialnumber || "Unknown"}
              </p>
            </div>
          </div>

          <div className="callingbar-center">
            <button
              className={`callingbar-icon-button ${call.muted ? "callingbar-icon-button-active" : ""
                } ${call.hold ? "callingbar-icon-button-disabled" : ""}`}
              onClick={() => (call.muted ? unmute(call.id) : mute(call.id))}
              title={
                call.hold
                  ? "Cannot mute while on hold"
                  : call.muted
                    ? "Unmute"
                    : "Mute"
              }
              disabled={
                call.hold ||
                !call.session ||
                !call.session.sessionDescriptionHandler
              }
            >
              <Icon name={call.muted ? "active_mute" : "mute"} size={14} />
            </button>

            {!call.isInConference &&
              !call.callstatus?.includes("Conference") && 
              authPlan?.options?.dialpad?.conference === true && (
                (() => {
                  const availableCallsForConference = activeCalls.filter(
                    (c) =>
                      c.id !== call.id &&
                      !c.isInConference &&
                      c.callerName !== "Agent (Conference)" &&
                      ["In Call", "Answered", "Resumed", "Muted", "On Hold", "On Hold & Muted"].includes(
                        c.callstatus
                      )
                  ).length;

                  const canStartConference =
                    isConferenceActive || availableCallsForConference > 0;

                  return (
                    <button
                      className={`callingbar-icon-button ${!canStartConference ? "callingbar-icon-button-disabled" : ""
                        }`}
                      onClick={() =>
                        isConferenceActive
                          ? startConference(call.id)
                          : startConference()
                      }
                      title={
                        !canStartConference
                          ? "Need another active call to start conference"
                          : isConferenceActive
                            ? "Add to Conference"
                            : "Start Conference"
                      }
                      disabled={
                        !canStartConference ||
                        !call.session ||
                        !call.session.sessionDescriptionHandler ||
                        !["In Call", "Answered", "Resumed", "Muted", "On Hold", "On Hold & Muted"].includes(
                          call.callstatus
                        )
                      }
                    >
                      <Icon name="conference" size={18} />
                    </button>
                  );
                })()
              )}

            <button
              className="callingbar-icon-button"
              title="Dialpad"
              onClick={() => setShowDtmfDialpad((prev) => !prev)}
            >
              <Icon name="dialpad" size={14} />
            </button>

            {/* Only show hold button when there's a single call */}
            {totalCalls === 1 && (
              <button
                className={`callingbar-icon-button ${call.hold ? "callingbar-icon-button-active" : ""
                  }`}
                onClick={() =>
                  call.hold ? unholdCall(call.id) : holdCall(call.id)
                }
                title={call.hold ? "Unhold" : "Hold"}
                disabled={
                  !call.session || !call.session.sessionDescriptionHandler
                }
              >
                <Icon name={call.hold ? "active_pause" : "pause"} size={14} />
              </button>
            )}

            {!isConsultationCall ? (
              (authPlan?.options?.dialpad?.internalTransfer === true || authPlan?.options?.dialpad?.externalTransfer === true) && (
                <button
                  className="callingbar-icon-button"
                  title="Transfer"
                  onClick={() => setTransferOpen(true)}
                >
                  <Icon name="transfer" size={14} />
                </button>
              )
            ) : (
              <button
                className="callingbar-icon-button"
                title="Complete Transfer"
                onClick={handleCompleteTransfer}
                style={{ backgroundColor: "#10b981", color: "white" }}
              >
                <Icon name="transfer" size={14} />
              </button>
            )}

            <button
              className="callingbar-hangup-icon-button"
              onClick={() =>
                isConsultationCall ? handleCancelTransfer() : hangUp(call.id)
              }
              title={isConsultationCall ? "Cancel Transfer" : "End Call"}
              style={isConsultationCall ? { backgroundColor: "#ef4444" } : {}}
            >
              <Icon name="end" size={14} />
            </button>
          </div>

          <div className="callingbar-ending">
            <p className="callingbar-duration">{formatTimer(seconds)}</p>
            <p className="callingbar-call">
              {isConsultationCall && originalCall
                ? `${call.callstatus} (Original on hold)`
                : call.callstatus}
            </p>
          </div>
        </div>

        {showDtmfDialpad && (
          <DTMFPad
            onSend={async (digits) => {
              if (!digits) return;
              for (const digit of digits) {
                await sendDTMF(digit, call.id);
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
            }}
            onClose={() => setShowDtmfDialpad(false)}
          />
        )}

        {openTransfer &&
          !isConsultationCall &&
          createPortal(
            <TransferModal
              open={openTransfer}
              onClose={() => setTransferOpen(false)}
              onTransfer={handleTransferSubmit}
              transferMode={transferMode}
              onTransferModeChange={setTransferMode}
              isConsulting={false}
              onCancelWarmTransfer={cancelWarmTransfer}
              onCompleteWarmTransfer={completeWarmTransfer}
              onSwitchCalls={() => switchCalls()}
              callHold={call.hold}
            />,
            document.body
          )}
      </div>
    );
  }

  // Ringing interface
  if (
    (call.callType === "Outgoing" && call.callstatus === "Ringing") ||
    (call.callType === "WhatsApp" && call.callstatus === "Ringing") ||
    (call.callType === "Consultation" &&
      ["Ringing", "Connecting"].includes(call.callstatus))
  ) {
    return (
      <div className="calling-bar" data-call-id={call.id}>
        <div className="callingbar-starting">
          <div className="callingbar-cust-initials">
            {getInitials(contactName || call.dialnumber)}
          </div>
          <div className="callingbar-cust-info">
            <p className="callingbar-cust-name">
              {isConsultationCall ? "Consultation" : contactName || "Unknown"}
            </p>
            <p className="callingbar-cust-number">
              {call.dialnumber || "Unknown"}
            </p>
          </div>
        </div>
        <div className="callingbar-center">
          <p className="callingbar-outgoing-call-status">{call.callstatus}</p>
          <button
            className="callingbar-hangup-icon-button"
            onClick={() =>
              isConsultationCall ? handleCancelTransfer() : hangUp(call.id)
            }
            title={isConsultationCall ? "Cancel Transfer" : "End Call"}
          >
            <Icon name="end" />
          </button>
        </div>
        <div className="callingbar-ending">
          <p className="callingbar-call">
            {isConsultationCall ? "Consultation Call" : `${call.callType} Call`}
          </p>
        </div>
      </div>
    );
  }

  return null;
};

// Conference Bar Component
const ConferenceBar = () => {
  const { conversations } = useConversationStore();
  const {
    sendDTMF,
    isConferenceActive,
    isConferenceConnecting,
    removeParticipantFromConference,
    endConference,
    muteAllConferenceCalls,
    unmuteAllConferenceCalls,
    getConferenceCalls,
    fetchConferenceData,
    latestConferenceData,
    activeCalls,
  } = callStore();

  const [seconds, setSeconds] = useState(0);
  const [showDtmfDialpad, setShowDtmfDialpad] = useState(false);
  const [conferenceData, setConferenceData] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    const loadConferenceData = async () => {
      if (isConferenceActive) {
        const data = await fetchConferenceData();
        if (data && data.length > 0 && data[0].participants) {
          setConferenceData(data[0].participants);
        }
      } else {
        setConferenceData(null);
      }
    };

    loadConferenceData();
  }, [isConferenceActive, fetchConferenceData]);

  useEffect(() => {
    if (latestConferenceData) {
      setConferenceData(latestConferenceData);
    }
  }, [latestConferenceData]);

  useEffect(() => {
    let refreshInterval;

    if (isConferenceActive) {
      refreshInterval = setInterval(async () => {
        const data = await fetchConferenceData();
        if (data && data.length > 0 && data[0].participants) {
          setConferenceData(data[0].participants);
        }
      }, 5000);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isConferenceActive, fetchConferenceData]);

  const conferenceCalls = useMemo(() => {
    const calls = getConferenceCalls();

    return calls.map((call) => {
      if (conferenceData && Array.isArray(conferenceData)) {
        const match = conferenceData.find((participant) => {
          if (participant.participant_no === call.dialnumber) return true;

          const cleanParticipantNo = participant.participant_no?.replace(/\D/g, '');
          const cleanCallNo = call.dialnumber?.replace(/\D/g, '');
          if (cleanParticipantNo === cleanCallNo) return true;

          return false;
        });

        if (match) {
          return {
            ...call,
            conferenceId: match.conference_id,
            conferenceName: match.conference_name,
            callerIDNumber: match.participant_no,
          };
        }
      }
      return call;
    });
  }, [getConferenceCalls, conferenceData, activeCalls]);

  const conferenceStartTime = useMemo(() => {
    if (conferenceCalls.length === 0) return Date.now();
    const times = conferenceCalls.map((c) => c?.startTime || Date.now());
    return Math.min(...times);
  }, [conferenceCalls]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isConferenceActive && conferenceCalls.length > 0) {
      setSeconds(Math.floor((Date.now() - conferenceStartTime) / 1000));
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isConferenceActive, conferenceCalls, conferenceStartTime]);

  const getRandomColor = (index) => {
    const colors = [
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#06b6d4",
      "#84cc16",
    ];
    return colors[index % colors.length];
  };

  const allCallsMuted =
    conferenceCalls.length > 0 && conferenceCalls.every((call) => call?.muted);

  const handleEndConference = async () => {
    const success = await endConference();
    if (success) {
      setConferenceData(null);
    }
  };

  const handleRemoveParticipant = async (call) => {
    console.log("🔴 Removing participant from UI:", call.id);
    await removeParticipantFromConference(call);
  };

  if (
    !isConferenceActive &&
    !isConferenceConnecting &&
    conferenceCalls.length === 0
  ) {
    return null;
  }

  // Connecting state
  if (isConferenceConnecting && !isConferenceActive) {
    const connectingCalls = getConferenceCalls();

    return (
      <div className="modern-conference-container">
        {connectingCalls.length > 0 && (
          <div className="conference-participants-list">
            {connectingCalls.map((call, index) => {
              const matchingConversation = conversations.find(
                (conv) =>
                  conv.c_conversationId === call.activeConversationId ||
                  conv.c_conversationPhoneNo === call.dialnumber ||
                  conv.c_conversationDetails?.callId === call.id
              );

              const contactName =
                matchingConversation?.c_contactName ||
                call.callerName ||
                call.c_contactName;

              const displayName = contactName || "Unknown";

              return (
                <div key={call.id} className="participant-card connecting">
                  <div
                    className="participant-avatar"
                    style={{ backgroundColor: getRandomColor(index) }}
                  >
                    {getInitials(displayName)}
                  </div>
                  <div className="participant-info">
                    <p className="participant-name">{displayName}</p>
                    <p className="participant-number">
                      {call?.dialnumber || "Unknown"}
                    </p>
                  </div>
                  <div className="participant-status">
                    <span className="connecting-indicator">●</span>
                    <span className="connecting-text">Connecting...</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="modern-conference-controls conference-connecting-state">
          <div className="conference-left">
            <div className="conference-title">
              <h3>Conference Call</h3>
              <span className="member-count connecting">
                Setting up conference...
              </span>
            </div>
            <div className="conference-dropdown-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          <div className="conference-center">
            <div className="control-buttons">
              <button
                className="end-call-btn"
                onClick={handleEndConference}
                title="Cancel Conference"
              >
                <Icon name="end" size={18} />
              </button>
            </div>
          </div>

          <div className="conference-right">
            <div className="conference-title">
              <h3>Connecting...</h3>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active conference
  return (
    <div className={`modern-conference-container ${showParticipants ? 'participants-open' : ''}`}>
      <div className="conference-participants-list">
        {conferenceCalls.map((call, index) => {
          const matchingConversation = conversations.find(
            (conv) =>
              conv.c_conversationId === call.activeConversationId ||
              conv.c_conversationPhoneNo === call.dialnumber ||
              conv.c_conversationDetails?.callId === call.id
          );

          const contactName =
            matchingConversation?.c_contactName ||
            call.callerName ||
            call.c_contactName;
          const displayName = contactName || "Unknown";

          return (
            <div key={call.id} className="participant-card">
              <div
                className="participant-avatar"
                style={{ backgroundColor: getRandomColor(index) }}
              >
                {getInitials(displayName)}
              </div>
              <div className="participant-info">
                <p className="participant-name">{displayName}</p>
                <p className="participant-number">
                  {call?.dialnumber || "Unknown"}
                </p>
              </div>
              <button
                className={`participant-end-btn ${call?.muted ? "muted" : ""}`}
                onClick={() => handleRemoveParticipant(call)}
                title="Remove from conference"
              >
                <Icon name="end" size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="modern-conference-controls">
        <div className="conference-left">
          <div className="conference-badge-container">
            <Badges
              badgeData={conferenceCalls
                .map(call => {
                  const matchingConversation = conversations.find(
                    (conv) =>
                      conv.c_conversationId === call.activeConversationId ||
                      conv.c_conversationPhoneNo === call.dialnumber ||
                      conv.c_conversationDetails?.callId === call.id
                  );
                  const contactName =
                    matchingConversation?.c_contactName ||
                    call.callerName ||
                    call.c_contactName;
                  return contactName || call.dialnumber || "Unknown";
                })
                .filter(Boolean)
              }
            />
          </div>

          <div className="conference-title-group">
            <div className="conference-title">
              <h3>Conference Call</h3>
              <span className="member-count">
                {conferenceCalls.length} Member
                {conferenceCalls.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div
              className="conference-dropdown-icon"
              onClick={() => setShowParticipants(!showParticipants)}
              role="button"
              aria-label={showParticipants ? "Hide participants" : "Show participants"}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowParticipants(!showParticipants);
                }
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="conference-center">
          <div className="control-buttons">
            <button
              className={`control-btn ${allCallsMuted ? "active" : ""}`}
              onClick={
                allCallsMuted ? unmuteAllConferenceCalls : muteAllConferenceCalls
              }
              title={allCallsMuted ? "Unmute All" : "Mute All"}
            >
              <Icon name={allCallsMuted ? "active_mute" : "mute"} size={18} />
            </button>

            <button
              className={`control-btn ${showDtmfDialpad ? "active" : ""}`}
              onClick={() => setShowDtmfDialpad((s) => !s)}
              title="DTMF Dialpad"
            >
              <Icon name="dialpad" size={18} />
            </button>

            <button
              className="end-call-btn"
              onClick={handleEndConference}
              title="End Conference"
            >
              <Icon name="end" size={18} />
            </button>
          </div>
        </div>

        <div className="conference-right">
          <div className="conference-duration">{formatTimer(seconds)}</div>
        </div>
      </div>
      {showDtmfDialpad && (
        <DTMFPad
          onSend={async (digits) => {
            if (!digits) return;
            for (const _ of conferenceCalls) {
              for (const digit of digits) {
                await sendDTMF(digit);
                await new Promise((r) => setTimeout(r, 100));
              }
            }
          }}
          onClose={() => setShowDtmfDialpad(false)}
        />
      )}
    </div>
  );
};

// Main CallingBar Component with PiP
const CallingBar = () => {
  const {
    activeCalls,
    isConferenceActive,
    isConferenceConnecting,
    conferenceParticipants,
    switchToCall,
    hangUp,
    mute,
    unmute,
    holdCall,
    unholdCall,
  } = callStore();

  const { conversations, agentsData } = useConversationStore();

  // PiP hook
  const { isSupported, pipWindow, openPiP, closePiP, isPiPOpen } = useDocumentPiP();

  const [callTimers, setCallTimers] = useState({});

  const nonConferenceCalls = useMemo(() => {
    return (
      activeCalls?.filter((call) => {
        if (call.isInConference) return false;
        if (call.callerName === "Agent (Conference)") return false;
        if (
          Array.isArray(conferenceParticipants) &&
          conferenceParticipants.includes(call.id)
        ) {
          return false;
        }
        return true;
      }) || []
    );
  }, [activeCalls, conferenceParticipants]);

  const [stack, setStack] = useState(nonConferenceCalls);

  const hasConference = isConferenceActive || isConferenceConnecting;
  const totalStackItems = nonConferenceCalls.length + (hasConference ? 1 : 0);

  // Update call timers
  useEffect(() => {
    const intervals = {};

    nonConferenceCalls.forEach(call => {
      const activeStatuses = [
        "In Call",
        "Answered",
        "Resumed",
        "On Hold",
        "Muted",
        "On Hold & Muted",
        "In Consultation",
        "In Conference",
      ];

      if (activeStatuses.includes(call.callstatus)) {
        const startTime = call.startTime || Date.now();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);

        setCallTimers(prev => ({ ...prev, [call.id]: elapsed }));

        intervals[call.id] = setInterval(() => {
          setCallTimers(prev => ({ ...prev, [call.id]: (prev[call.id] || 0) + 1 }));
        }, 1000);
      }
    });

    return () => {
      Object.values(intervals).forEach(interval => clearInterval(interval));
    };
  }, [nonConferenceCalls]);

  // Auto PiP when tab becomes inactive
  useEffect(() => {
    if (!isSupported) return;
    if (totalStackItems === 0) return;

    const handleVisibilityChange = async () => {
      const hasActiveCalls = nonConferenceCalls.some(call =>
        [
          "In Call",
          "Answered",
          "Resumed",
          "On Hold",
          "Muted",
          "On Hold & Muted",
          "In Consultation",
          "In Conference",
        ].includes(call.callstatus)
      ) || hasConference;

      if (document.hidden && hasActiveCalls && !isPiPOpen) {
        await openPiP({ width: 420, height: 280 });
      } else if (!document.hidden && isPiPOpen) {
        closePiP();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSupported, totalStackItems, nonConferenceCalls, hasConference, isPiPOpen, openPiP, closePiP]);

  useEffect(() => {
    const filteredCalls =
      activeCalls?.filter((call) => {
        if (call.isInConference) return false;
        if (call.callerName === "Agent (Conference)") return false;
        if (
          Array.isArray(conferenceParticipants) &&
          conferenceParticipants.includes(call.id)
        ) {
          return false;
        }
        return true;
      }) || [];

    if (filteredCalls.length === 0) {
      setStack([]);
      return;
    }

    const sortedCalls = [...filteredCalls].sort((a, b) => {
      if (!a.hold && b.hold) return -1;
      if (a.hold && !b.hold) return 1;
      return 0;
    });

    setStack(sortedCalls);
  }, [activeCalls, conferenceParticipants]);

  const handleCallBarClick = (callId, e) => {
    if (e && e.target && e.target.closest) {
      if (e.target.closest("button, a, input, svg")) return;
    }

    const clickedIndex = stack.findIndex((c) => c.id === callId);
    if (clickedIndex === -1) return;

    setStack((prev) => {
      const idx = prev.findIndex((c) => c.id === callId);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      return copy;
    });

    switchToCall(callId);
  };

  const getCallStatus = (call) => {
    if (call.hold) return "hold";
    if (call.muted) return "muted";
    return "active";
  };

  // PiP Optimized UI - Shows all active calls in compact view
  const renderPiPContent = () => (
    <div className="pip-multi-calling-bar">
      <div className="pip-header-bar">
        <div className="pip-title">
          <span className="pip-call-count">{totalStackItems}</span>
          <span>Active {totalStackItems === 1 ? 'Call' : 'Calls'}</span>
        </div>
      </div>

      <div className="pip-calls-container">
        {/* Show Conference if active */}
        {hasConference && (
          <div className="pip-call-card conference">
            <div className="pip-call-info">
              <div className="pip-avatar conference-avatar">
                <Icon name="conference" size={18} color="#fff" />
              </div>
              <div className="pip-text">
                <p className="pip-name">Conference Call</p>
                <p className="pip-number">
                  {conferenceParticipants?.length || 0} Participants
                </p>
              </div>
            </div>
            <span className="pip-status-badge active">Active</span>
          </div>
        )}

        {/* Show all non-conference calls */}
        {stack.slice(0, 3).map((call, index) => {
          const contactName = getContactOrAgentName(call, conversations, agentsData) || "Unknown";
          const timer = callTimers[call.id] || 0;
          const status = getCallStatus(call);

          return (
            <div key={call.id} className="pip-call-card">
              <div className="pip-call-info">
                <div className="pip-avatar">
                  {getInitials(contactName)}
                </div>
                <div className="pip-text">
                  <p className="pip-name">{contactName}</p>
                  <p className="pip-number">{call.dialnumber || "Unknown"}</p>
                </div>
              </div>
              <div className="pip-call-meta">
                <span className="pip-timer">{formatTimer(timer)}</span>
                <span className={`pip-status-badge ${status}`}>
                  {call.hold ? "On Hold" : call.muted ? "Muted" : "Active"}
                </span>
              </div>
              <div className="pip-quick-controls">
                <button
                  className={`pip-mini-btn ${call.muted ? "active" : ""}`}
                  onClick={() => (call.muted ? unmute(call.id) : mute(call.id))}
                  title={call.muted ? "Unmute" : "Mute"}
                  disabled={call.hold}
                >
                  <Icon name={call.muted ? "active_mute" : "mute"} size={12} />
                </button>
                <button
                  className={`pip-mini-btn ${call.hold ? "active" : ""}`}
                  onClick={() => (call.hold ? unholdCall(call.id) : holdCall(call.id))}
                  title={call.hold ? "Unhold" : "Hold"}
                >
                  <Icon name={call.hold ? "active_pause" : "pause"} size={12} />
                </button>
                <button
                  className="pip-mini-btn end"
                  onClick={() => hangUp(call.id)}
                  title="End Call"
                >
                  <Icon name="end" size={12} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Show more calls indicator */}
        {stack.length > 3 && (
          <div className="pip-more-calls">
            +{stack.length - 3} more {stack.length - 3 === 1 ? 'call' : 'calls'}
          </div>
        )}
      </div>

      <div className="pip-footer-hint">
        Return to tab for full controls
      </div>
    </div>
  );

  // Render PiP content if PiP is open
  if (isPiPOpen && pipWindow) {
    return createPortal(
      renderPiPContent(),
      pipWindow.document.body
    );
  }

  if (totalStackItems === 0) {
    return null;
  }

  // Only conference, no regular calls
  if (hasConference && stack.length === 0) {
    return <ConferenceBar />;
  }

  // Only regular calls, no conference
  if (!hasConference && stack.length > 0) {
    return (
      <div className="multi-calling-bar-container" aria-live="polite">
        {stack.map((call, index) => {
          const isFront = index === 0;
          const bottomOffset = index * 30;
          const translateY = index * -15;
          const scale = Math.max(0.94, 1 - index * 0.02);
          const zIndex = 1000 - index;

          return (
            <div
              key={call.id}
              role="button"
              tabIndex={0}
              aria-label={`Call bar: ${call.callerName || call.dialnumber}`}
              className={`calling-bar-wrapper ${isFront ? "front" : "stacked"}`}
              onClick={(e) => handleCallBarClick(call.id, e)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCallBarClick(call.id, e);
                }
              }}
              style={{
                position: "absolute",
                left: "0",
                right: "0",
                margin: "0 auto",
                width: "100%",
                bottom: `${bottomOffset}px`,
                transform: `translateY(${translateY}px) scale(${scale})`,
                zIndex,
                transition: "all 280ms cubic-bezier(.2,.9,.2,1)",
              }}
            >
              <SingleCallBar call={call} isFront={isFront} totalCalls={stack.length} />
            </div>
          );
        })}
      </div>
    );
  }

  // Both conference and regular calls
  if (hasConference && stack.length > 0) {
    return (
      <div className="multi-calling-bar-container" aria-live="polite">
        <div
          style={{
            position: "absolute",
            left: "0",
            right: "0",
            width: "100%",
            bottom: "0px",
            zIndex: 1000 + stack.length,
          }}
        >
          <ConferenceBar />
        </div>

        {stack.map((call, index) => {
          const stackIndex = index + 1;
          const bottomOffset = stackIndex * 30;
          const translateY = stackIndex * -15;
          const scale = Math.max(0.94, 1 - stackIndex * 0.02);
          const zIndex = 1000 + stack.length - stackIndex;

          return (
            <div
              key={call.id}
              role="button"
              tabIndex={0}
              aria-label={`Call bar: ${call.callerName || call.dialnumber}`}
              className="calling-bar-wrapper stacked"
              onClick={(e) => handleCallBarClick(call.id, e)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCallBarClick(call.id, e);
                }
              }}
              style={{
                position: "absolute",
                left: "0",
                right: "0",
                margin: "0 auto",
                width: "100%",
                bottom: `${bottomOffset}px`,
                transform: `translateY(${translateY}px) scale(${scale})`,
                zIndex,
                transition: "all 280ms cubic-bezier(.2,.9,.2,1)",
              }}
            >
              <SingleCallBar call={call} isFront={false} totalCalls={stack.length + 1} />
            </div>
          );
        })}
      </div>
    );
  }

  return null;
};

export default CallingBar;