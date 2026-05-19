import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
} from "react";
import {
  Phone,
  PhoneMissed,
  PhoneIncoming,
  PhoneOutgoing,
  X,
  MessageCircle,
  MessageSquare,
  Check,
  CheckCheck,
  AlertCircle,
  Paperclip,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAvatarText,
  getAvatarColor,
  formatSecsToHMS,
} from "../../../utils/helpers.js";
import { renderFormElement } from "../../../utils/conversationFunction";
import MessageInputBox from "./MessageInputBox.jsx";
import ConversationAIDataPanel from "./ConversationAIDataPanel";
import { useWhatsappStore } from "../../../store/agent/useWhatsappStore.js";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useConversationStore } from "../../../store/agent/useConversationStore.js";

const Skeleton = ({ className, style, ...props }) => (
  <div
    className={`animate-pulse rounded-md bg-slate-200 ${className || ""}`}
    style={style}
    {...props}
  />
);

const MessageSkeleton = ({ isSelf }) => (
  <div
    className={`flex w-full mb-4 ${isSelf ? "flex-row-reverse" : "flex-row"}`}
    style={{ opacity: 0.6 }}
  >
    <div className="flex flex-col items-center justify-end gap-1 px-2">
      <Skeleton className="w-8 h-8 rounded-full" />
    </div>
    <div className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
      <div
        className={`flex gap-2 mb-1 ${isSelf ? "flex-row-reverse" : "flex-row"}`}
      >
        <Skeleton className="w-20 h-3.5" />
        <Skeleton className="w-12 h-3" />
      </div>
      <div
        className={`p-3 min-w-[220px] ${isSelf ? "bg-blue-50 rounded-2xl rounded-br-sm" : "bg-slate-50 rounded-2xl rounded-bl-sm"}`}
      >
        <Skeleton className="w-full h-3 mb-2" />
        <Skeleton className="w-4/5 h-3" />
      </div>
    </div>
  </div>
);

const ConversationMessageContainer = ({
  selectedLead,
  selectedData,
  activeTab,
  setActiveTab,
  conversationChat = {},
  chatLoading,
  formData,
  formValues,
  handleFormFieldChange,
  handleEndConversation,
  currentCall,
  status,
  setIsModalOpen,
  getSelectedNotes,
  selectedNotes,
  getSelectedNotesLoading,
  getChat,
  getaidata,
  setPanelOpen,
  setPanelTab,
}) => {
  const messageEndRef = useRef(null);
  const [aidata, setAidata] = useState(null);
  const [specificNotesModal, setSpecificNotesModal] = useState(false);
  const [errorPopup, setErrorPopup] = useState({
    isOpen: false,
    message: "",
    dst: "",
    selectedTemplate: null,
  });
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState({
    isOpen: false,
    url: "",
    type: "",
    zoom: 1,
  });
  const [expandedMessages, setExpandedMessages] = useState({});
  const chatContainerRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const { authPlan } = useAuthStore();

  const {
    fetchPredictiveLeadData,
    predictiveLeadData,
    predictiveLeadLoading,
    pendingHighlightedMessageId,
    setPendingHighlightedMessageId,
    pendingHighlightedMessageText,
    setPendingHighlightedMessageText,
    pendingHighlightedMessageTime,
    setPendingHighlightedMessageTime,
  } = useConversationStore();
  const [highlightedId, setHighlightedId] = useState(null);

  useEffect(() => {
    if (
      (pendingHighlightedMessageId ||
        pendingHighlightedMessageText ||
        pendingHighlightedMessageTime) &&
      !chatLoading
    ) {
      console.log("Highlighting triggered for:", {
        id: pendingHighlightedMessageId,
        text: pendingHighlightedMessageText,
        time: pendingHighlightedMessageTime,
      });

      const scrollAttempt = (targetId, retryCount = 0) => {
        const idToFind = String(targetId);
        const element = document.getElementById(`msg-${idToFind}`);

        if (element) {
          console.log("Found element for highlighting:", idToFind);
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightedId(idToFind);
          setPendingHighlightedMessageId(null);
          setPendingHighlightedMessageText(null);
          setPendingHighlightedMessageTime(null);

          setTimeout(() => {
            setHighlightedId(null);
          }, 15000); // 15 seconds highlight for better visibility
        } else if (retryCount < 25) {
          // Retry for about 5 seconds
          setTimeout(() => scrollAttempt(targetId, retryCount + 1), 200);
        }
      };

      // Find the message in the loaded data first
      let resolvedTargetId = null;
      if (conversationChat && typeof conversationChat === "object") {
        const searchId = pendingHighlightedMessageId
          ? String(pendingHighlightedMessageId)
          : null;
        const searchText = pendingHighlightedMessageText
          ? String(pendingHighlightedMessageText).trim().toLowerCase()
          : null;
        const searchTime = pendingHighlightedMessageTime
          ? String(pendingHighlightedMessageTime)
              .replace("T", " ")
              .substring(0, 19)
          : null;

        Object.values(conversationChat).forEach((messages) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg) => {
              if (resolvedTargetId) return; // Stop if already found

              const mId = msg._id || msg.details?.m_id;
              const uId = msg.uniqueId;
              const text = (
                msg.details?.m_receiveMsg ||
                msg.details?.m_sendMsg ||
                ""
              )
                .trim()
                .toLowerCase();
              const timestamp = msg.activityTimestamp
                ? String(msg.activityTimestamp)
                    .replace("T", " ")
                    .substring(0, 19)
                : null;

              if (
                (searchId &&
                  (String(mId) === searchId || String(uId) === searchId)) ||
                (searchText && text && text.includes(searchText)) ||
                (searchTime && timestamp && timestamp === searchTime)
              ) {
                resolvedTargetId = mId || uId || msg._id;
              }
            });
          }
        });
      }

      const scrollAttemptByDOM = (retryCount = 0) => {
        const rows = document.querySelectorAll(".conversation_message_row");
        const searchText = pendingHighlightedMessageText
          ? String(pendingHighlightedMessageText).trim().toLowerCase()
          : null;
        let foundElement = null;

        if (resolvedTargetId) {
          foundElement = document.getElementById(`msg-${resolvedTargetId}`);
        }

        if (!foundElement && searchText) {
          for (let row of rows) {
            if (row.innerText.toLowerCase().includes(searchText)) {
              foundElement = row;
              break;
            }
          }
        }

        if (foundElement) {
          console.log("Highlighting element:", foundElement);
          foundElement.scrollIntoView({ behavior: "smooth", block: "center" });
          const idFromDOM = foundElement.id.replace("msg-", "");
          setHighlightedId(idFromDOM);
          setPendingHighlightedMessageId(null);
          setPendingHighlightedMessageText(null);
          setPendingHighlightedMessageTime(null);

          setTimeout(() => {
            setHighlightedId(null);
          }, 15000); // 15 seconds highlight for better visibility
        } else if (retryCount < 25) {
          setTimeout(() => scrollAttemptByDOM(retryCount + 1), 200);
        }
      };

      scrollAttemptByDOM();
    }
  }, [
    pendingHighlightedMessageId,
    pendingHighlightedMessageText,
    pendingHighlightedMessageTime,
    // conversationChat, // Removed to avoid excessive runs
    chatLoading,
  ]);
  useEffect(() => {
    if (
      currentCall &&
      currentCall.predictiveLeadId &&
      currentCall.dialerType === "PREDICTIVE" &&
      !predictiveLeadData
    ) {
      const campaignId = localStorage.getItem("CampaignId") || "0";
      fetchPredictiveLeadData(currentCall.predictiveLeadId, campaignId);
    }
  }, [currentCall]);

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
  }, [selectedLead]);

  const handleScroll = async (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;

    if (
      scrollTop < 20 &&
      hasMore &&
      !fetchingMore &&
      !chatLoading &&
      offset > 0
    ) {
      setFetchingMore(true);
      const nextOffset = offset + 20;
      const newMessages = await getChat(selectedData.c_leadId, 20, nextOffset);

      if (newMessages && Object.keys(newMessages).length > 0) {
        setOffset(nextOffset);
      } else {
        setHasMore(false);
      }
      setFetchingMore(false);
    } else if (
      scrollTop < 20 &&
      hasMore &&
      !fetchingMore &&
      !chatLoading &&
      offset === 0 &&
      scrollHeight > clientHeight
    ) {
      setFetchingMore(true);
      const nextOffset = offset + 20;
      const newMessages = await getChat(selectedData.c_leadId, 20, nextOffset);

      if (newMessages && Object.keys(newMessages).length > 0) {
        setOffset(nextOffset);
      } else {
        setHasMore(false);
      }
      setFetchingMore(false);
    }
  };

  const prevScrollHeightRef = useRef(0);

  useLayoutEffect(() => {
    if (fetchingMore) {
      prevScrollHeightRef.current = chatContainerRef.current?.scrollHeight || 0;
    }
  }, [fetchingMore]);

  useEffect(() => {
    if (!fetchingMore && offset > 0 && chatContainerRef.current) {
      const newScrollHeight = chatContainerRef.current.scrollHeight;
      const diff = newScrollHeight - prevScrollHeightRef.current;
      if (diff > 0) {
        chatContainerRef.current.scrollTop = diff;
      }
    }
  }, [conversationChat, offset]);

  const MAX_CHARS = 500;
  const getTextWithReadMore = (text, messageKey) => {
    if (!text) return { displayText: "", needsReadMore: false };

    if (expandedMessages[messageKey]) {
      return { displayText: text, needsReadMore: false, isExpanded: true };
    }

    if (text.length > MAX_CHARS) {
      return {
        displayText: text.substring(0, MAX_CHARS),
        needsReadMore: true,
        totalChars: text.length,
      };
    }

    return { displayText: text, needsReadMore: false, isExpanded: false };
  };

  const renderTextWithLinks = (text) => {
    if (!text) return "";
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlPattern);
    return parts.map((part, i) => {
      if (part.match(urlPattern)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-message-link"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const toggleExpand = (messageKey) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [messageKey]: !prev[messageKey],
    }));
  };

  const { fetchWhatsappTemplates, sendManualTemplate } = useWhatsappStore();

  useEffect(() => {
    if (activeTab === "chat" && !chatLoading && offset === 0 && !fetchingMore) {
      const container = chatContainerRef.current;
      if (container) {
        // Immediate scroll
        container.scrollTop = container.scrollHeight;

        // Delayed scroll for slower renders/images
        const timeoutId = setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 150);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [
    activeTab,
    chatLoading,
    conversationChat,
    offset,
    fetchingMore,
    selectedLead,
  ]);

  const handleNotesModalCancel = () => {
    setSpecificNotesModal(false);
  };

  const memoizedSortedChat = useMemo(() => {
    if (!conversationChat || typeof conversationChat !== "object") return [];
    return Object.entries(conversationChat).sort(
      (a, b) => new Date(a[0]) - new Date(b[0]),
    );
  }, [conversationChat]);

  const checkCondition = (element) => {
    if (!element.conditions || element.conditions.length === 0) return true;

    return element.conditions.every((condition) => {
      const { fieldId, operator, value } = condition;
      const parentElement = formData.elements.find((el) => el.id === fieldId);
      if (!parentElement) return true;

      const parentValue = formValues[parentElement.label];

      if (operator === "equals") {
        return String(parentValue) === String(value);
      }
      return true;
    });
  };

  if (!selectedLead || !selectedData) {
    return null;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200 bg-white shrink-0 overflow-hidden gap-2">
        {/* Left: Lead Info */}
        <div className="flex items-center gap-3 min-w-0 shrink">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm"
            style={{
              backgroundColor:
                selectedData?.colour ||
                getAvatarColor(
                  selectedData?.c_contactName ||
                    selectedData?.c_conversationPhoneNo,
                ),
            }}
          >
            {selectedData
              ? getAvatarText(
                  selectedData?.c_contactName ||
                    selectedData?.c_conversationPhoneNo,
                )
              : ""}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-base font-semibold text-slate-800 truncate">
              {selectedData?.c_contactName ||
                selectedData?.c_conversationPhoneNo}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant="secondary"
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1 font-medium text-[10px] px-2 py-0.5 shrink-0"
              >
                <Phone className="w-3 h-3" />
                {selectedData?.c_conversationDetails?.callDirection || "Info"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Center: Tabs */}
        <div className="flex items-center h-full shrink-0">
          {["chat", "Information"].map((tab) => (
            <button
              key={tab}
              className={`h-full px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Right: Actions */}

        <div className="flex items-center gap-2 shrink-0">
          {["lead", "yettostart"].includes(status) && (
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 shrink-0"
            >
              Call
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            className="font-medium shrink-0"
            onClick={() => setIsModalOpen(true)}
          >
            <span className="hidden md:inline">Callback Reminder</span>
            <span className="md:hidden text-[10px]">Reminder</span>
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="shrink-0"
            onClick={handleEndConversation}
            disabled={
              currentCall &&
              !["Call ended", "Declined", "Call Failed"].includes(
                currentCall.callstatus,
              )
            }
          >
            <span className="hidden md:inline">End Conversation</span>
            <span className="md:hidden text-[10px]">End</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-50 relative overflow-hidden">
          {chatLoading ? (
            <div className="flex-1 overflow-hidden p-5 flex flex-col">
              <MessageSkeleton isSelf={false} />
              <MessageSkeleton isSelf={true} />
              <MessageSkeleton isSelf={false} />
              <MessageSkeleton isSelf={true} />
              <MessageSkeleton isSelf={false} />
              <MessageSkeleton isSelf={true} />
            </div>
          ) : (
            <>
              {activeTab === "chat" && (
                <>
                  <div
                    className="flex-1 overflow-y-auto p-5 pb-8 space-y-4"
                    ref={chatContainerRef}
                    onScroll={handleScroll}
                  >
                    {fetchingMore && (
                      <div style={{ padding: "10px 0" }}>
                        <MessageSkeleton isSelf={false} />
                      </div>
                    )}
                    {memoizedSortedChat.map(([date, items]) => (
                      <div key={date}>
                        <div className="flex justify-center my-4 sticky top-2 z-10">
                          <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm">
                            {date}
                          </span>
                        </div>
                        {Array.isArray(items) &&
                          items.map((item, idx) => {
                            const time = item.activityTimestamp
                              ? new Date(
                                  item.activityTimestamp,
                                ).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "";

                            const isSelf =
                              (item.direction || "").toLowerCase() ===
                              "outbound";
                            const sender = isSelf
                              ? (item?.memberName ?? "Agent")
                              : item?.senderName ||
                                selectedData?.c_contactName ||
                                item.details?.m_src ||
                                selectedData?.c_conversationPhoneNo ||
                                "Unknown";

                            return (
                              <div
                                key={idx}
                                id={`msg-${item._id || item.details?.m_id || item.uniqueId}`}
                                className={`flex w-full mb-4 ${isSelf ? "flex-row-reverse" : "flex-row"} ${String(highlightedId) === String(item._id || item.details?.m_id || item.uniqueId) ? "bg-amber-50/50 p-2 -mx-2 rounded-lg transition-colors duration-500" : ""}`}
                              >
                                <div className="flex flex-col items-center justify-end gap-1 px-2 shrink-0">
                                  {item.type !== "Call" && (
                                    <div className="flex items-center justify-center bg-white rounded-full p-0.5 shadow-sm border border-slate-100 z-10 -mb-2">
                                      {(item.channel === "SMS" ||
                                        item.c_conversationChannel ===
                                          "SMS") && (
                                        <MessageSquare className="w-3 h-3 text-blue-500" />
                                      )}
                                      {(item.channel === "Whatsapp" ||
                                        item.c_conversationChannel ===
                                          "Whatsapp") && (
                                        <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                                      )}
                                    </div>
                                  )}
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[11px] shadow-sm shrink-0"
                                    style={{
                                      backgroundColor: isSelf
                                        ? "#94A3B8"
                                        : selectedData?.colour ||
                                          getAvatarColor(
                                            selectedData?.c_contactName ||
                                              selectedData?.c_conversationPhoneNo,
                                          ),
                                    }}
                                  >
                                    {isSelf
                                      ? (sender || "A").charAt(0).toUpperCase()
                                      : selectedData
                                        ? getAvatarText(
                                            selectedData?.c_contactName ||
                                              selectedData?.c_conversationPhoneNo,
                                          )
                                        : ""}
                                  </div>
                                </div>

                                <div
                                  className={`flex flex-col max-w-[75%] ${isSelf ? "items-end" : "items-start"}`}
                                >
                                  <div
                                    className={`flex items-center gap-2 mb-1 px-1 ${isSelf ? "flex-row-reverse" : "flex-row"}`}
                                  >
                                    <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[120px]">
                                      {sender}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      {time}
                                    </span>
                                  </div>

                                  <div
                                    className={`p-3 relative shadow-sm border ${
                                      isSelf
                                        ? "bg-blue-50 text-slate-800 border-blue-100/50 rounded-2xl rounded-br-sm"
                                        : "bg-white text-slate-800 border-slate-200/60 rounded-2xl rounded-bl-sm"
                                    }`}
                                  >
                                    {item.type === "Call" ? (
                                      <div className="flex flex-col gap-2 min-w-[200px]">
                                        <div className="flex items-center justify-between gap-4">
                                          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
                                            <div className="flex items-center justify-center bg-white p-1 rounded-full shadow-sm">
                                              {item.details?.c_disposition &&
                                                item.details.c_disposition
                                                  .toLowerCase()
                                                  .startsWith("missed") && (
                                                  <PhoneMissed className="w-3.5 h-3.5 text-red-600" />
                                                )}
                                              {item.details?.c_disposition &&
                                                item.details.c_disposition
                                                  .toLowerCase()
                                                  .startsWith("ans") &&
                                                (isSelf ? (
                                                  <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-600" />
                                                ) : (
                                                  <PhoneIncoming className="w-3.5 h-3.5 text-emerald-600" />
                                                ))}
                                              {item.details?.c_disposition &&
                                                item.details.c_disposition
                                                  .toLowerCase()
                                                  .startsWith("busy") && (
                                                  <PhoneOutgoing className="w-3.5 h-3.5 text-slate-500" />
                                                )}
                                              {item.details?.c_disposition &&
                                                (item.details.c_disposition
                                                  .toLowerCase()
                                                  .startsWith("failed") ||
                                                  item.details.c_disposition
                                                    .toLowerCase()
                                                    .startsWith("no")) &&
                                                (isSelf ? (
                                                  <PhoneOutgoing className="w-3.5 h-3.5 text-red-600" />
                                                ) : (
                                                  <PhoneIncoming className="w-3.5 h-3.5 text-red-600" />
                                                ))}
                                            </div>
                                            {item.details?.c_disposition ||
                                              "Call"}
                                          </div>

                                          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100/50 text-slate-600">
                                            {formatSecsToHMS(
                                              item.details?.c_duration || 0,
                                            )}
                                          </span>
                                        </div>

                                        <div className="mt-1 pt-2 border-t border-slate-200/50">
                                          <p className="text-[10px] text-slate-500 font-medium mb-2">
                                            Hung up by{" "}
                                            {item.details?.c_terminationEnd ||
                                              ""}
                                          </p>
                                          <div className="flex items-center gap-2">
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              className="flex-1 h-7 text-[10px]"
                                              onClick={() => {
                                                setSpecificNotesModal(true);
                                                getSelectedNotes(item);
                                              }}
                                            >
                                              Notes
                                            </Button>
                                            {authPlan?.options?.conversation
                                              ?.aidata && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setAidata(item);
                                                  if (setPanelTab)
                                                    setPanelTab("post-call");
                                                  setPanelOpen(true);
                                                  getaidata(
                                                    item?.details
                                                      ?.c_callRecordingUrl ||
                                                      "",
                                                  );
                                                }}
                                                className="flex-1 h-7 rounded-md p-[1px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-center group"
                                              >
                                                <div className="flex h-full w-full items-center justify-center gap-1 rounded-[5px] bg-white px-2 hover:bg-slate-50 transition-colors">
                                                  <Sparkles className="w-3 h-3 text-indigo-500" />
                                                  <span className="text-[10px] font-bold tracking-wide bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                                                    AI Data
                                                  </span>
                                                </div>
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        {["image", "video"].includes(
                                          item.details?.m_type,
                                        ) ? (
                                          <div className="relative rounded overflow-hidden max-w-[240px] border border-slate-200/50 shadow-sm cursor-zoom-in">
                                            {item.details?.m_type ===
                                            "image" ? (
                                              <img
                                                src={
                                                  item.details?.m_mediaUrlRaw ||
                                                  item.details?.m_receiveMsg
                                                }
                                                alt="Shared image"
                                                className="w-full h-auto max-h-[200px] object-cover"
                                                onClick={() =>
                                                  setMediaPreview({
                                                    isOpen: true,
                                                    url:
                                                      item.details
                                                        ?.m_mediaUrlRaw ||
                                                      item.details
                                                        ?.m_receiveMsg,
                                                    type: "image",
                                                    zoom: 1,
                                                  })
                                                }
                                              />
                                            ) : (
                                              <video
                                                src={
                                                  item.details?.m_mediaUrlRaw ||
                                                  item.details?.m_receiveMsg
                                                }
                                                className="w-full h-auto max-h-[200px] object-cover"
                                                onClick={() =>
                                                  setMediaPreview({
                                                    isOpen: true,
                                                    url:
                                                      item.details
                                                        ?.m_mediaUrlRaw ||
                                                      item.details
                                                        ?.m_receiveMsg,
                                                    type: "video",
                                                    zoom: 1,
                                                  })
                                                }
                                              />
                                            )}
                                          </div>
                                        ) : [
                                            "file",
                                            "audio",
                                            "document",
                                          ].includes(item.details?.m_type) ? (
                                          <div className="flex items-center gap-3 bg-white/50 p-2.5 rounded-lg border border-slate-200/50 min-w-[200px]">
                                            <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                              <Paperclip className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                              <a
                                                href={
                                                  item.details?.m_mediaUrlRaw ||
                                                  item.details?.m_receiveMsg
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[12px] font-semibold text-slate-700 truncate hover:text-primary transition-colors"
                                              >
                                                {(
                                                  item.details?.m_mediaUrlRaw ||
                                                  item.details?.m_receiveMsg ||
                                                  "File"
                                                )
                                                  .split("/")
                                                  .pop()}
                                              </a>
                                              <a
                                                href={
                                                  item.details?.m_mediaUrlRaw ||
                                                  item.details?.m_receiveMsg
                                                }
                                                download
                                                className="text-[10px] text-primary hover:underline mt-0.5"
                                              >
                                                Download
                                              </a>
                                            </div>
                                          </div>
                                        ) : null}

                                        <div className="mt-1 text-[13px] leading-relaxed break-words relative pr-5">
                                          {item.details?.m_type ===
                                          "Template" ? (
                                            <div className="flex flex-col gap-2">
                                              {item.details?.m_receiveMsg?.components?.map(
                                                (comp, idx) => (
                                                  <React.Fragment key={idx}>
                                                    {comp.type === "BODY" && (
                                                      <p className="whitespace-pre-wrap">
                                                        {comp.text}
                                                      </p>
                                                    )}
                                                    {comp.type === "FOOTER" && (
                                                      <p className="text-[10px] text-slate-400 mt-1">
                                                        {comp.text}
                                                      </p>
                                                    )}
                                                    {comp.type ===
                                                      "BUTTONS" && (
                                                      <div className="flex flex-col gap-1.5 mt-2">
                                                        {comp.buttons?.map(
                                                          (btn, btnIdx) =>
                                                            btn.type ===
                                                            "url" ? (
                                                              <a
                                                                key={btnIdx}
                                                                href={btn.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded text-[12px] font-semibold text-primary hover:bg-slate-50 transition-colors"
                                                              >
                                                                <span>🔗</span>{" "}
                                                                {btn.text}
                                                              </a>
                                                            ) : (
                                                              <span
                                                                key={btnIdx}
                                                                className="flex items-center justify-center px-3 py-1.5 bg-white border border-slate-200 rounded text-[12px] font-semibold text-slate-700"
                                                              >
                                                                {btn.text}
                                                              </span>
                                                            ),
                                                        )}
                                                      </div>
                                                    )}
                                                  </React.Fragment>
                                                ),
                                              )}
                                            </div>
                                          ) : ![
                                              "image",
                                              "video",
                                              "document",
                                              "audio",
                                              "file",
                                            ].includes(item.details?.m_type) ? (
                                            (() => {
                                              const messageKey = `${date}-${idx}`;
                                              const text =
                                                item.details?.m_receiveMsg ||
                                                item.details?.m_sendMsg ||
                                                "";
                                              const {
                                                displayText,
                                                needsReadMore,
                                                isExpanded,
                                              } = getTextWithReadMore(
                                                text,
                                                messageKey,
                                              );
                                              return (
                                                <span className="whitespace-pre-wrap">
                                                  {renderTextWithLinks(
                                                    displayText,
                                                  )}
                                                  {needsReadMore && (
                                                    <span
                                                      className="text-primary font-semibold text-[11px] ml-1 cursor-pointer hover:underline"
                                                      onClick={() =>
                                                        toggleExpand(messageKey)
                                                      }
                                                    >
                                                      ... Read More
                                                    </span>
                                                  )}
                                                  {isExpanded && (
                                                    <span
                                                      className="text-primary font-semibold text-[11px] ml-1 cursor-pointer hover:underline"
                                                      onClick={() =>
                                                        toggleExpand(messageKey)
                                                      }
                                                    >
                                                      {" "}
                                                      Show Less
                                                    </span>
                                                  )}
                                                </span>
                                              );
                                            })()
                                          ) : item.details
                                              ?.m_mediaTextCaption ? (
                                            (() => {
                                              const messageKey = `caption-${date}-${idx}`;
                                              const text =
                                                item.details
                                                  ?.m_mediaTextCaption || "";
                                              const {
                                                displayText,
                                                needsReadMore,
                                                isExpanded,
                                              } = getTextWithReadMore(
                                                text,
                                                messageKey,
                                              );
                                              return (
                                                <span className="whitespace-pre-wrap italic">
                                                  {renderTextWithLinks(
                                                    displayText,
                                                  )}
                                                  {needsReadMore && (
                                                    <span
                                                      className="text-primary font-semibold text-[11px] ml-1 cursor-pointer hover:underline"
                                                      onClick={() =>
                                                        toggleExpand(messageKey)
                                                      }
                                                    >
                                                      ... Read More
                                                    </span>
                                                  )}
                                                  {isExpanded && (
                                                    <span
                                                      className="text-primary font-semibold text-[11px] ml-1 cursor-pointer hover:underline"
                                                      onClick={() =>
                                                        toggleExpand(messageKey)
                                                      }
                                                    >
                                                      {" "}
                                                      Show Less
                                                    </span>
                                                  )}
                                                </span>
                                              );
                                            })()
                                          ) : null}

                                          {(() => {
                                            let messageStatus =
                                              item.details?.m_updatedStatus
                                                ?.status;
                                            if (
                                              !messageStatus &&
                                              Array.isArray(
                                                item.updatedStatus,
                                              ) &&
                                              item.updatedStatus.length > 0
                                            ) {
                                              messageStatus =
                                                item.updatedStatus[
                                                  item.updatedStatus.length - 1
                                                ]?.status;
                                            }

                                            if (!isSelf || !messageStatus)
                                              return null;

                                            return (
                                              <div className="absolute right-0 bottom-0 translate-y-1">
                                                {messageStatus === "sent" && (
                                                  <Check className="w-3.5 h-3.5 text-slate-400" />
                                                )}
                                                {messageStatus ===
                                                  "delivered" && (
                                                  <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                                                )}
                                                {messageStatus === "read" && (
                                                  <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                                                )}
                                                {messageStatus === "failed" && (
                                                  <AlertCircle
                                                    className="w-3.5 h-3.5 text-red-500 cursor-pointer hover:text-red-600 transition-colors"
                                                    title="Click to see error details and resend"
                                                    onClick={async () => {
                                                      const errorDetails =
                                                        item.details
                                                          ?.m_statusDetails?.[0]
                                                          ?.error_data
                                                          ?.details ||
                                                        item.details
                                                          ?.m_statusDetails?.[0]
                                                          ?.message ||
                                                        item
                                                          .errorDetails?.[0]?.[0]
                                                          ?.error_data
                                                          ?.details ||
                                                        "Message delivery failed";
                                                      const dst =
                                                        item.details?.m_dst ||
                                                        "";

                                                      setTemplatesLoading(true);
                                                      const fetchedTemplates =
                                                        await fetchWhatsappTemplates();
                                                      setTemplates(
                                                        fetchedTemplates,
                                                      );
                                                      setTemplatesLoading(
                                                        false,
                                                      );

                                                      setErrorPopup({
                                                        isOpen: true,
                                                        message: errorDetails,
                                                        dst,
                                                        selectedTemplate: null,
                                                      });
                                                    }}
                                                  />
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ))}
                    <div ref={messageEndRef} />
                  </div>

                  <MessageInputBox data={selectedData} />
                </>
              )}

              {activeTab === "Information" && (
                <div className="flex-1 overflow-y-auto p-5 bg-white">
                  {formData && (
                    <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
                      <h3 className="text-lg font-semibold text-slate-800">
                        {formData.formTitle || "Form"}
                      </h3>
                    </div>
                  )}

                  <form>
                    {formData &&
                    Array.isArray(formData.elements) &&
                    formData.elements.length > 0 ? (
                      <div className="grid grid-cols-12 gap-4 items-start p-2">
                        {formData.elements.map((element, index) => {
                          if (!checkCondition(element)) return null;
                          const { w } = element.layout || {};
                          return (
                            <div
                              key={element.id}
                              style={{ gridColumn: `span ${w || 12}` }}
                              className="md:col-span-4"
                            >
                              {renderFormElement(
                                {
                                  ...element,
                                  onChange: (value) =>
                                    handleFormFieldChange(element.label, value),
                                  value: formValues[element.label] || "",
                                },
                                index,
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-8">
                        No form elements available
                      </p>
                    )}
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={specificNotesModal} onOpenChange={setSpecificNotesModal}>
        <DialogContent className="max-w-[600px] p-0">
          <DialogHeader className="px-6 py-4 border-b border-slate-100">
            <DialogTitle>Notes</DialogTitle>
          </DialogHeader>
          {getSelectedNotesLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="w-full h-5" />
              <Skeleton className="w-11/12 h-5" />
              <Skeleton className="w-[95%] h-5" />
            </div>
          ) : (
            <div className="p-6 overflow-y-auto max-h-[60vh] scrollbar-thin">
              {selectedNotes && Object.keys(selectedNotes).length > 0 ? (
                <div className="flex flex-col gap-3">
                  {Object.entries(selectedNotes).map(([key, value]) => (
                    <div
                      className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100"
                      key={key}
                    >
                      <span className="font-semibold text-slate-700 text-sm min-w-[120px]">
                        {key}
                      </span>
                      {typeof value === "object" ? (
                        <span className="text-slate-600 text-sm">
                          start - {value.start} — end - {value.end}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-sm whitespace-pre-wrap">
                          {value || "-"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">No data found</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={errorPopup.isOpen}
        onOpenChange={(open) =>
          !open &&
          setErrorPopup({
            isOpen: false,
            message: "",
            dst: "",
            selectedTemplate: null,
          })
        }
      >
        <DialogContent className="max-w-[450px] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">
              Reason and Resend
            </DialogTitle>
          </DialogHeader>
          <div className="mt-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 shadow-sm">
              <p className="text-red-800 text-sm font-semibold leading-relaxed m-0">
                {errorPopup.message}
              </p>
            </div>

            <div className="mb-6">
              <label className="block mb-2.5 font-bold text-sm text-slate-700">
                Resend using Template
              </label>
              {templatesLoading ? (
                <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="animate-pulse w-5 h-5 bg-slate-200 rounded-full" />
                  <span className="text-sm text-slate-500 font-medium">
                    Fetching templates...
                  </span>
                </div>
              ) : (
                <Select
                  value={errorPopup.selectedTemplate?.id || undefined}
                  onValueChange={(value) => {
                    const template = templates.find(
                      (t) => t.templateId === value,
                    );
                    setErrorPopup((prev) => ({
                      ...prev,
                      selectedTemplate: template
                        ? { id: value, name: template.templateName }
                        : null,
                    }));
                  }}
                >
                  <SelectTrigger className="w-full h-11 border-slate-200 focus:ring-primary/20">
                    <SelectValue placeholder="Select a template to resend" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {templates.map((t) => (
                      <SelectItem key={t.templateId} value={t.templateId}>
                        {t.templateName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {errorPopup.dst && (
              <div className="flex items-center gap-2 mb-8 px-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Destination
                </span>
                <span className="text-sm font-semibold text-slate-600">
                  {errorPopup.dst}
                </span>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() =>
                  setErrorPopup({
                    isOpen: false,
                    message: "",
                    dst: "",
                    selectedTemplate: null,
                  })
                }
              >
                Cancel
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-white font-bold px-6 shadow-md"
                disabled={!errorPopup.selectedTemplate}
                onClick={async () => {
                  if (errorPopup.selectedTemplate && errorPopup.dst) {
                    const authUser = useAuthStore.getState().authUser;
                    const agentExtension = authUser?.m_memberExtensionNo || "";
                    const result = await sendManualTemplate(
                      errorPopup.selectedTemplate.id,
                      errorPopup.selectedTemplate.name,
                      errorPopup.dst,
                      agentExtension,
                    );
                    if (result.success) {
                      setErrorPopup({
                        isOpen: false,
                        message: "",
                        dst: "",
                        selectedTemplate: null,
                      });
                    }
                  }
                }}
              >
                Send Template
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Preview Modal - WhatsApp Style */}
      <Dialog
        open={mediaPreview.isOpen}
        onOpenChange={(open) =>
          !open &&
          setMediaPreview({ isOpen: false, url: "", type: "", zoom: 1 })
        }
      >
        <DialogContent className="max-w-[90vw] h-[90vh] bg-black/95 border-none p-0 overflow-hidden flex flex-col sm:rounded-xl">
          <div className="flex items-center justify-end gap-2 p-4 bg-gradient-to-b from-black/50 to-transparent absolute top-0 w-full z-10 pointer-events-none">
            <div className="pointer-events-auto flex gap-2">
              <button
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                onClick={() =>
                  setMediaPreview((prev) => ({
                    ...prev,
                    zoom: Math.max(0.5, prev.zoom - 0.25),
                  }))
                }
                title="Zoom out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                onClick={() =>
                  setMediaPreview((prev) => ({
                    ...prev,
                    zoom: Math.min(3, prev.zoom + 0.25),
                  }))
                }
                title="Zoom in"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <a
                href={mediaPreview.url}
                download
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors ml-2"
                onClick={() =>
                  setMediaPreview({ isOpen: false, url: "", type: "", zoom: 1 })
                }
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto p-4">
            {mediaPreview.type === "image" ? (
              <img
                src={mediaPreview.url}
                alt="Preview"
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${mediaPreview.zoom})` }}
              />
            ) : (
              <video
                src={mediaPreview.url}
                controls
                autoPlay
                className="max-w-full max-h-full"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default React.memo(ConversationMessageContainer);
