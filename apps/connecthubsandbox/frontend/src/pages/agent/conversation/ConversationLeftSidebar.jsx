import React from "react";
import { useNavigate } from "react-router-dom";
import "./styles/ConversationLeftSidebar.css";
import Icon from "../../../constants/Icon.jsx";
import { Tag, Timer, Tooltip, Skeleton } from "../../../components/Index.jsx";
import { getAvatarText, getAvatarColor } from "../../../utils/helpers.js";
import { formatDateforcard, formatDuration, formatHoldTime } from "../../../utils/conversationFunction";
import icons from "../../../constants/icon";

const ConversationCardSkeleton = () => (
    <div className="conversation_left_card" style={{ cursor: 'default', border: '1px solid #f1f5f9' }}>
        <div className="conversation_left_card_header">
            <div className="conversation_left_card_header1">
                <Skeleton variant="circle" width="40px" height="40px" />
                <div className="conversation_left_user_details" style={{ gap: '6px' }}>
                    <Skeleton width="120px" height="16px" />
                    <Skeleton width="90px" height="12px" />
                    <Skeleton width="70px" height="10px" />
                </div>
            </div>
            <Skeleton width="50px" height="14px" />
        </div>
        <hr className="line_breaker" style={{ margin: '12px 0' }} />
        <div className="conversation_status_row">
            <Skeleton width="120px" height="28px" style={{ borderRadius: '6px' }} />
            <Skeleton width="80px" height="24px" style={{ borderRadius: '4px' }} />
        </div>
    </div>
);

const ConversationLeftSidebar = ({
    conversations = [],
    conversationLoading,
    selectedLead,
    handleCardClick,
    activeCalls = [],
    holdDurations = {},
    getConversations,
}) => {
    const navigate = useNavigate();
    const { agentpanel_whatsapp_icon, agentpanel_call_icon, sms_icon } = icons || {};

    const [offset, setOffset] = React.useState(0);
    const [hasMore, setHasMore] = React.useState(true);
    const [isFetchingMore, setIsFetchingMore] = React.useState(false);

    React.useEffect(() => {
        setOffset(0);
        setHasMore(true);
    }, []);

    const handleScroll = async (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !isFetchingMore && !conversationLoading) {
            setIsFetchingMore(true);
            const nextOffset = offset + 20;
            try {
                if (getConversations) {
                    const moreAvailable = await getConversations(20, nextOffset);
                    setOffset(nextOffset);
                    setHasMore(moreAvailable);
                }
            } catch (err) {
                console.error("Failed to fetch more conversations", err);
            } finally {
                setIsFetchingMore(false);
            }
        }
    };

    return (
        <aside className="conversation_left_sidebar">
            <header className="conversation_header">
                <h2 className="conversation_section_title">Conversation</h2>
                <span
                    className="conversation-breadcrumb_text"
                    onClick={() => navigate("/agent-dashboard")}
                >
                    Dashboard
                </span>{" "}
                <Icon name="rightarrow" size={10} color="#334155" />
                <span className="conversation-breadcrumb-current"> Conversation</span>
            </header>
            <hr className="conversation_top_line_breaker" />
            <div
                className="conversation_left_scroll_container"
                onScroll={handleScroll}
            >
                <div className="conversation_left_sidebar_inner">
                    {conversationLoading && offset === 0 ? (
                        Array(6).fill(0).map((_, i) => <ConversationCardSkeleton key={i} />)
                    ) : (
                        <>
                            {(conversations || []).map((item) => {
                                const isConferenceCard =
                                    item.c_conversationType === "Conference Call" ||
                                    (item.isConferenceMerged && item.mergedParticipants);

                                const conferenceParticipants =
                                    item.c_conversationDetails?.conferenceParticipants ||
                                    item.mergedParticipants ||
                                    [];

                                const participantCount = conferenceParticipants.length || 1;

                                const conversationActiveCall = (activeCalls || []).find(
                                    (call) => {
                                        if (call.activeConversationId === item.c_conversationId) return true;
                                        if (call.id === item.c_conversationDetails?.callId) return true;
                                        return false;
                                    }
                                );

                                const isOnHold = !isConferenceCard &&
                                    conversationActiveCall &&
                                    (
                                        conversationActiveCall.hold === true ||
                                        conversationActiveCall.onHold === true ||
                                        conversationActiveCall.callstatus === "On Hold" ||
                                        conversationActiveCall.callstatus === "On Hold & Muted" ||
                                        conversationActiveCall.holdStatus === true
                                    ) &&
                                    conversationActiveCall.session?.state !== "Terminated" &&
                                    !conversationActiveCall.stopped;

                                return (
                                    <div
                                        className={`conversation_left_card ${selectedLead === item.c_conversationId
                                            ? "conversation_left_card_active"
                                            : ""
                                            } ${isConferenceCard ? "conference-merged-card" : ""}`}
                                        key={item.c_conversationId}
                                        onClick={() => handleCardClick(item)}
                                    >
                                        <div className="conversation_left_card_header">
                                            <div className={`conversation_left_card_header1`}>
                                                {isConferenceCard ? (
                                                    <>
                                                        <div style={{ position: 'relative' }}>
                                                            <Tooltip
                                                                content={
                                                                    <div style={{ padding: '8px', minWidth: '150px' }}>
                                                                        <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>
                                                                            Participants ({participantCount})
                                                                        </p>
                                                                        {conferenceParticipants.map((participant, idx) => {
                                                                            const participantName = typeof participant === 'object' ? participant.name : null;
                                                                            const participantPhone = typeof participant === 'object' ? participant.phone : participant;

                                                                            return (
                                                                                <div key={idx} style={{ fontSize: '11px', marginBottom: '6px' }}>
                                                                                    {participantName && (
                                                                                        <p style={{ fontWeight: '600', marginBottom: '2px' }}>
                                                                                            {participantName}
                                                                                        </p>
                                                                                    )}
                                                                                    <p style={{ color: '#666' }}>
                                                                                        {participantPhone}
                                                                                    </p>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                }
                                                                placement="right"
                                                                trigger="hover"
                                                            >
                                                                <div
                                                                    className="conversation_left_avatar"
                                                                    style={{
                                                                        backgroundColor: "#FF6B35",
                                                                        cursor: "pointer",
                                                                        position: "relative"
                                                                    }}
                                                                >
                                                                    <p className="conversation_left_avatar_text">
                                                                        {getAvatarText("Conference")}
                                                                    </p>
                                                                </div>
                                                            </Tooltip>
                                                            <span className="participant-count-badge">
                                                                {participantCount}
                                                            </span>
                                                        </div>
                                                        <div className="conversation_left_user_details">
                                                            <p className="conversation_left_user_name">Conference call</p>
                                                            <p className="conversation_left_date_sm">
                                                                {formatDateforcard(item.c_conversationDetails?.callStartTime) ||
                                                                    formatDateforcard(new Date())}
                                                            </p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div
                                                            className="conversation_left_avatar"
                                                            style={{
                                                                backgroundColor:
                                                                    item.colour ||
                                                                    getAvatarColor(item.c_contactName || item.c_conversationPhoneNo),
                                                            }}
                                                        >
                                                            <p className="conversation_left_avatar_text">
                                                                {getAvatarText(item.c_contactName || item.c_conversationPhoneNo)}
                                                            </p>
                                                        </div>
                                                        <div className="conversation_left_user_details">
                                                            <p className="conversation_left_user_name">
                                                                {item.c_contactName || "Unknown"}
                                                            </p>
                                                            <p className="conversation_left_user_number">{item.c_conversationPhoneNo}</p>
                                                            <p className="conversation_left_date_sm">
                                                                {formatDateforcard(item.c_conversationDetails?.callStartTime) ||
                                                                    formatDateforcard(item?.c_createdOn)}
                                                            </p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <p className="conversation_left_time">
                                                {(() => {
                                                    const normalizePhone = (phone) => {
                                                        if (!phone) return '';
                                                        return String(phone).replace(/\D/g, '');
                                                    };

                                                    const activeCall = (activeCalls || []).find((call) => {
                                                        // 1. Strict match: If call is already linked to a conversation, ONLY match that conversation
                                                        if (call.activeConversationId) {
                                                            return call.activeConversationId === item.c_conversationId;
                                                        }

                                                        // 2. Strict ID match (fallback if activeConversationId missing but callId matches)
                                                        if (call.id === item.c_conversationDetails?.callId) return true;

                                                        // 3. Fallback to phone match ONLY if call is NOT linked to any conversation yet
                                                        const normalizedCallNum = normalizePhone(call.dialnumber);
                                                        const normalizedConvNum = normalizePhone(item.c_conversationPhoneNo);
                                                        if (normalizedCallNum && normalizedConvNum) {
                                                            if (normalizedCallNum === normalizedConvNum) return true;
                                                            if (normalizedCallNum.endsWith(normalizedConvNum) || normalizedConvNum.endsWith(normalizedCallNum)) return true;
                                                        }
                                                        return false;
                                                    });


                                                    if (activeCall) {
                                                        const isPreConnection =
                                                            activeCall.callstatus === "Ringing" ||
                                                            activeCall.callstatus === "Connecting" ||
                                                            activeCall.callstatus === "Starting consultation...";

                                                        if (activeCall.startTime && !activeCall.stopped) {
                                                            if (!isPreConnection) {
                                                                return (
                                                                    <Timer
                                                                        key={`timer-${activeCall.id}-${activeCall.startTime}`}
                                                                        startTime={activeCall.startTime}
                                                                        stopped={false}
                                                                        paused={false}
                                                                        finalDuration={null}
                                                                    />
                                                                );
                                                            }
                                                        }

                                                        if (activeCall.startTime && activeCall.stopped) {
                                                            return (
                                                                <Timer
                                                                    key={`timer-stopped-${activeCall.id}`}
                                                                    startTime={activeCall.startTime}
                                                                    stopped={true}
                                                                    paused={false}
                                                                    finalDuration={activeCall.duration}
                                                                />
                                                            );
                                                        }

                                                        if (isPreConnection || !activeCall.startTime) {
                                                            return "00:00:00";
                                                        }

                                                        return "00:00:00";
                                                    } else {
                                                        if (item.startTime && !item.stopped) {
                                                            return (
                                                                <Timer
                                                                    startTime={item.startTime}
                                                                    stopped={false}
                                                                    finalDuration={null}
                                                                />
                                                            );
                                                        } else if (item.startTime && item.stopped) {
                                                            return (
                                                                <Timer
                                                                    startTime={item.startTime}
                                                                    stopped={true}
                                                                    finalDuration={item.duration}
                                                                />
                                                            );
                                                        } else if (
                                                            item.c_conversationDetails?.callAnswerTime &&
                                                            item.c_conversationDetails?.callEndTime
                                                        ) {
                                                            return formatDuration(
                                                                item.c_conversationDetails.callAnswerTime,
                                                                item.c_conversationDetails.callEndTime
                                                            );
                                                        } else {
                                                            return item.duration || "00:00";
                                                        }
                                                    }
                                                })()}
                                            </p>
                                        </div>

                                        <hr className="line_breaker" />
                                        <div className="conversation_status_row">
                                            <div style={{ position: "relative", width: "150px" }}>
                                                <Tag
                                                    text={
                                                        <span
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "6px",
                                                                paddingRight: "20px",
                                                            }}
                                                        >
                                                            {isOnHold ? (
                                                                <>
                                                                    <Icon name="pause" size={10} color="#9D5333" />
                                                                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                                        On Hold ({formatHoldTime(holdDurations[item.c_conversationId] || 0)})
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Icon name="call" size={10} color="#127137" />
                                                                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                                        {item.c_conversationDetails?.callDirection ||
                                                                            item.c_conversationChannel ||
                                                                            "Unknown"}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </span>
                                                    }
                                                    bgColor={isOnHold ? "#FFEDDB" : "#DBFFE9"}
                                                    textColor={isOnHold ? "#9D5333" : "#127137"}
                                                    width="150px"
                                                />

                                                <div
                                                    className="status_dot"
                                                    style={{
                                                        position: "absolute",
                                                        top: "50%",
                                                        right: "8px",
                                                        transform: "translateY(-50%)",
                                                        width: "8px",
                                                        height: "8px",
                                                        borderRadius: "50%",
                                                        backgroundColor: (() => {
                                                            const hasActiveCall = (activeCalls || []).some(
                                                                (call) =>
                                                                    call.activeConversationId === item.c_conversationId ||
                                                                    call.dialnumber === item.c_conversationPhoneNo ||
                                                                    call.id === item.c_conversationDetails?.callId
                                                            );

                                                            if (isConferenceCard) {
                                                                return (hasActiveCall || !item.stopped) ? "#59AC77" : "#ED3F27";
                                                            }

                                                            // Show green only if there's an active call AND conversation is active
                                                            // Show red when call is hung up (no active call) or conversation is not active
                                                            return (hasActiveCall && item.c_conversationStatus === "Active")
                                                                ? "#59AC77"
                                                                : "#ED3F27";
                                                        })(),
                                                        zIndex: 1,
                                                    }}
                                                />
                                            </div>

                                            <div className="conversation_call_status_box">
                                                <img
                                                    src={
                                                        item.c_conversationChannel === "Whatsapp"
                                                            ? agentpanel_whatsapp_icon
                                                            : item.c_conversationChannel === "SMS"
                                                                ? sms_icon
                                                                : agentpanel_call_icon
                                                    }
                                                    alt={
                                                        item.c_conversationChannel === "Whatsapp"
                                                            ? "WhatsApp"
                                                            : item.c_conversationChannel === "SMS"
                                                                ? "SMS"
                                                                : "Phone"
                                                    }
                                                />
                                                <p className="conversation_call_status_text">
                                                    {item.c_conversationChannel === "Whatsapp"
                                                        ? "WhatsApp"
                                                        : item.c_conversationChannel === "SMS"
                                                            ? "SMS"
                                                            : "Phone call"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {isFetchingMore && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                                    <ConversationCardSkeleton />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default React.memo(ConversationLeftSidebar);
