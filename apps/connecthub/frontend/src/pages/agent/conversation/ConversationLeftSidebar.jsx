import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Pause, Phone } from "lucide-react";
import { Timer } from "../../../components/Index.jsx";
import { getAvatarText, getAvatarColor } from "../../../utils/helpers.js";
import {
  formatDateforcard,
  formatDuration,
  formatHoldTime,
} from "../../../utils/conversationFunction";
import icons from "../../../constants/icon";

// Shadcn UI
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Skeleton = ({ className, ...props }) => (
  <div
    className={`animate-pulse rounded-md bg-slate-200 ${className}`}
    {...props}
  />
);

const ConversationCardSkeleton = () => (
  <div className="bg-white rounded-lg border border-slate-100 p-3 cursor-default space-y-3">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="w-28 h-4" />
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-16 h-2.5" />
        </div>
      </div>
      <Skeleton className="w-12 h-3.5" />
    </div>
    <hr className="border-slate-100 my-1" />
    <div className="flex items-center justify-between">
      <Skeleton className="w-28 h-7 rounded-md" />
      <Skeleton className="w-20 h-6 rounded-md" />
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
  const { agentpanel_whatsapp_icon, agentpanel_call_icon, sms_icon } =
    icons || {};

  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);

  React.useEffect(() => {
    setOffset(0);
    setHasMore(true);
  }, []);

  const handleScroll = async (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (
      scrollHeight - scrollTop <= clientHeight + 50 &&
      hasMore &&
      !isFetchingMore &&
      !conversationLoading
    ) {
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
    <aside className="flex flex-col w-[320px] 2xl:w-[350px] bg-slate-50 border-r border-slate-200 h-full overflow-hidden shrink-0">
      <header className="p-4 space-y-1 bg-white border-b border-slate-200">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          Conversation
        </h2>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <span
            className="text-xs font-semibold text-muted-foreground hover:text-primary cursor-pointer transition-colors whitespace-nowrap"
            onClick={() => navigate("/agent-dashboard")}
          >
            Dashboard
          </span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-xs font-semibold text-primary whitespace-nowrap">
            Conversation
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0" onScroll={handleScroll}>
        <div className="p-3 space-y-2">
          {conversationLoading && offset === 0 ? (
            Array(6)
              .fill(0)
              .map((_, i) => <ConversationCardSkeleton key={i} />)
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
                    if (call.activeConversationId === item.c_conversationId)
                      return true;
                    if (call.id === item.c_conversationDetails?.callId)
                      return true;
                    return false;
                  },
                );

                const isOnHold =
                  !isConferenceCard &&
                  conversationActiveCall &&
                  (conversationActiveCall.hold === true ||
                    conversationActiveCall.onHold === true ||
                    conversationActiveCall.callstatus === "On Hold" ||
                    conversationActiveCall.callstatus === "On Hold & Muted" ||
                    conversationActiveCall.holdStatus === true) &&
                  conversationActiveCall.session?.state !== "Terminated" &&
                  !conversationActiveCall.stopped;

                const isSelected = selectedLead === item.c_conversationId;

                return (
                  <div
                    className={`relative bg-white rounded-lg border p-3 cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm ${
                      isSelected
                        ? "border-primary/50 shadow-sm bg-blue-50/50"
                        : "border-slate-200"
                    } ${isConferenceCard ? "border-l-4 border-l-[#FF6B35]" : ""}`}
                    key={item.c_conversationId}
                    onClick={() => handleCardClick(item)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {isConferenceCard ? (
                          <div className="relative">
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm border-2 border-white"
                                    style={{ backgroundColor: "#FF6B35" }}
                                  >
                                    {getAvatarText("Conference")}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  className="p-3 min-w-[150px]"
                                >
                                  <p className="font-bold mb-2 text-xs">
                                    Participants ({participantCount})
                                  </p>
                                  {conferenceParticipants.map(
                                    (participant, idx) => {
                                      const participantName =
                                        typeof participant === "object"
                                          ? participant.name
                                          : null;
                                      const participantPhone =
                                        typeof participant === "object"
                                          ? participant.phone
                                          : participant;
                                      return (
                                        <div
                                          key={idx}
                                          className="text-[11px] mb-1.5 last:mb-0"
                                        >
                                          {participantName && (
                                            <p className="font-semibold mb-0.5 text-slate-700">
                                              {participantName}
                                            </p>
                                          )}
                                          <p className="text-slate-500">
                                            {participantPhone}
                                          </p>
                                        </div>
                                      );
                                    },
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <span className="absolute -top-1 -right-1 bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">
                              {participantCount}
                            </span>
                          </div>
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm border-2 border-white"
                            style={{
                              backgroundColor:
                                item.colour ||
                                getAvatarColor(
                                  item.c_contactName ||
                                    item.c_conversationPhoneNo,
                                ),
                            }}
                          >
                            {getAvatarText(
                              item.c_contactName || item.c_conversationPhoneNo,
                            )}
                          </div>
                        )}

                        <div className="flex flex-col min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {isConferenceCard
                              ? "Conference call"
                              : item.c_contactName || "Unknown"}
                          </p>
                          {!isConferenceCard && (
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                              {item.c_conversationPhoneNo}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-1">
                            {formatDateforcard(
                              item.c_conversationDetails?.callStartTime,
                            ) || formatDateforcard(item?.c_createdOn)}
                          </p>
                        </div>
                      </div>

                      <div className="text-[11px] font-semibold text-slate-500 whitespace-nowrap bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                        {(() => {
                          const normalizePhone = (phone) => {
                            if (!phone) return "";
                            return String(phone).replace(/\D/g, "");
                          };

                          const activeCall = (activeCalls || []).find(
                            (call) => {
                              if (call.activeConversationId) {
                                return (
                                  call.activeConversationId ===
                                  item.c_conversationId
                                );
                              }
                              if (
                                call.id === item.c_conversationDetails?.callId
                              )
                                return true;
                              const normalizedCallNum = normalizePhone(
                                call.dialnumber,
                              );
                              const normalizedConvNum = normalizePhone(
                                item.c_conversationPhoneNo,
                              );
                              if (normalizedCallNum && normalizedConvNum) {
                                if (normalizedCallNum === normalizedConvNum)
                                  return true;
                                if (
                                  normalizedCallNum.endsWith(
                                    normalizedConvNum,
                                  ) ||
                                  normalizedConvNum.endsWith(normalizedCallNum)
                                )
                                  return true;
                              }
                              return false;
                            },
                          );

                          if (activeCall) {
                            const isPreConnection =
                              activeCall.callstatus === "Ringing" ||
                              activeCall.callstatus === "Connecting" ||
                              activeCall.callstatus ===
                                "Starting consultation...";

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
                            if (isPreConnection || !activeCall.startTime)
                              return "00:00:00";
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
                                item.c_conversationDetails.callEndTime,
                              );
                            } else {
                              return item.duration || "00:00";
                            }
                          }
                        })()}
                      </div>
                    </div>

                    <hr className="my-3 border-slate-100" />

                    <div className="flex items-center justify-between">
                      <div className="relative">
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border pr-6 text-[10px] font-bold tracking-wide ${
                            isOnHold
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {isOnHold ? (
                            <>
                              <Pause className="w-3 h-3 text-amber-700 fill-current" />
                              <span className="truncate max-w-[100px]">
                                On Hold (
                                {formatHoldTime(
                                  holdDurations[item.c_conversationId] || 0,
                                )}
                                )
                              </span>
                            </>
                          ) : (
                            <>
                              <Phone className="w-3 h-3 text-emerald-700 fill-current" />
                              <span className="truncate max-w-[100px]">
                                {item.c_conversationDetails?.callDirection ||
                                  item.c_conversationChannel ||
                                  "Unknown"}
                              </span>
                            </>
                          )}
                        </div>

                        <div
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full z-10"
                          style={{
                            backgroundColor: (() => {
                              const hasActiveCall = (activeCalls || []).some(
                                (call) =>
                                  call.activeConversationId ===
                                    item.c_conversationId ||
                                  call.dialnumber ===
                                    item.c_conversationPhoneNo ||
                                  call.id ===
                                    item.c_conversationDetails?.callId,
                              );

                              if (isConferenceCard) {
                                return hasActiveCall || !item.stopped
                                  ? "#10b981"
                                  : "#ef4444";
                              }
                              return hasActiveCall &&
                                item.c_conversationStatus === "Active"
                                ? "#10b981"
                                : "#ef4444";
                            })(),
                          }}
                        />
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                        <img
                          src={
                            item.c_conversationChannel === "Whatsapp"
                              ? agentpanel_whatsapp_icon
                              : item.c_conversationChannel === "SMS"
                                ? sms_icon
                                : agentpanel_call_icon
                          }
                          alt={item.c_conversationChannel}
                          className="w-3.5 h-3.5 object-contain"
                        />
                        <p className="text-[10px] font-semibold text-slate-600">
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
                <div className="flex flex-col gap-3 py-2">
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
