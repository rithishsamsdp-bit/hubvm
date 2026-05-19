import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import "./styles/ConversationMessageContainer.css";
import {
  Button,
  Tag,
  Modal,
  Popupconfirm,
  Select,
  Skeleton,
} from "../../../components/Index.jsx";
import Icon from "../../../constants/Icon.jsx";
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

const MessageSkeleton = ({ isSelf }) => (
  <div
    className={`conversation_message_row ${isSelf ? "self" : "other"}`}
    style={{
      opacity: 0.6,
      display: "flex",
      flexDirection: isSelf ? "row-reverse" : "row",
      justifyContent: isSelf ? "flex-start" : "flex-start",
      width: "100%",
    }}
  >
    <div
      className="conversation_message_avatar_container"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        justifyContent: "flex-end",
      }}
    >
      <Skeleton variant="circle" width="32px" height="32px" />
    </div>
    <div
      className="conversation_message_wrapper"
      style={{
        alignItems: isSelf ? "flex-end" : "flex-start",
        marginLeft: isSelf ? "0" : "10px",
        marginRight: isSelf ? "10px" : "0",
      }}
    >
      <div
        className="conversation_message_sender_details"
        style={{
          flexDirection: isSelf ? "row-reverse" : "row",
          gap: "8px",
          justifyContent: isSelf ? "flex-start" : "flex-start",
        }}
      >
        <Skeleton width="80px" height="14px" />
        <Skeleton width="50px" height="12px" />
      </div>
      <div
        className="conversation_message_card"
        style={{
          padding: "12px",
          minWidth: "220px",
          backgroundColor: isSelf ? "#E3F2FD" : "#F4F8FF",
          borderRadius: isSelf ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
        }}
      >
        <Skeleton width="100%" height="12px" style={{ marginBottom: "8px" }} />
        <Skeleton width="80%" height="12px" />
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
  const [panelOpen, setPanelOpen] = useState(false); // closed by default, opens on call

  // Auto-open panel when call becomes active; auto-close when call ends
  useEffect(() => {
    const isCallActive = !!(
      currentCall &&
      ["Answered", "In Call"].includes(currentCall.callstatus)
    );
    if (isCallActive) {
      setPanelOpen(true); // always open for live transcription
    } else if (!currentCall) {
      setPanelOpen(false); // call ended — auto-close
    }
  }, [currentCall?.callstatus, currentCall]);

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
    conversationChat,
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

  useLayoutEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [selectedLead, conversationChat]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      const timeoutId = setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [selectedLead, conversationChat]);

  const handleNotesModalCancel = () => {
    setSpecificNotesModal(false);
  };

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
    <>
      <div className="conversation_right_header">
        <div className="conversation_right_user_info">
          <div
            className="conversation_right_user_avatar"
            style={{
              backgroundColor:
                selectedData?.colour ||
                getAvatarColor(
                  selectedData?.c_contactName ||
                    selectedData?.c_conversationPhoneNo,
                ),
            }}
          >
            <p className="conversation_right_user_avatar_text">
              {selectedData
                ? getAvatarText(
                    selectedData?.c_contactName ||
                      selectedData?.c_conversationPhoneNo,
                  )
                : ""}
            </p>
          </div>
          <div className="conversation_right_user_name">
            {selectedData?.c_contactName || selectedData?.c_conversationPhoneNo}
          </div>
          <Tag
            text={selectedData?.c_conversationDetails?.callDirection || "Info"}
            icon="call"
            bgColor="#DBFFE9"
            textColor="#127137"
            size={24}
            width="150px"
          />
        </div>
        <div className="conversation_tabs">
          {["chat", "Information"].map((tab) => (
            <div
              key={tab}
              className={`conversation_tab ${
                activeTab === tab ? "conversation_tab_active" : ""
              }`}
              onClick={() => setActiveTab(tab)}
            >
              <p>{tab.charAt(0).toUpperCase() + tab.slice(1)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="conversation_header_button_container">
        {["lead", "yettostart"].includes(status) && (
          <Button variant="primary">Call</Button>
        )}
        <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
          Callback Reminder
        </Button>
        <Button
          variant="primary"
          onClick={handleEndConversation}
          disabled={
            currentCall &&
            !["Call ended", "Declined", "Call Failed"].includes(
              currentCall.callstatus,
            )
          }
          style={{
            opacity:
              currentCall &&
              !["Call ended", "Declined", "Call Failed"].includes(
                currentCall.callstatus,
              )
                ? 0.5
                : 1,
            cursor:
              currentCall &&
              !["Call ended", "Declined", "Call Failed"].includes(
                currentCall.callstatus,
              )
                ? "not-allowed"
                : "pointer",
          }}
        >
          End Conversation
        </Button>
      </div>

      <div
        className="conversation_right_container"
        style={{
          gridColumn: (!authPlan?.options?.conversation?.aidata || !panelOpen) ? "1 / -1" : "",
        }}
      >
        {chatLoading ? (
          <div
            className="conversation_message_container"
            style={{ padding: "20px", overflow: "hidden" }}
          >
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
                  className="conversation_message_container"
                  ref={chatContainerRef}
                  onScroll={handleScroll}
                >
                  {fetchingMore && (
                    <div style={{ padding: "10px 0" }}>
                      <MessageSkeleton isSelf={false} />
                    </div>
                  )}
                  {conversationChat &&
                    typeof conversationChat === "object" &&
                    Object.entries(conversationChat)
                      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
                      .map(([date, items]) => (
                        <div key={date}>
                          <div className="conversation_message_chat_date_container">
                            <p className="conversation_message_chat_date">
                              {date}
                            </p>
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
                                  className={`conversation_message_row ${isSelf ? "self" : "other"} ${String(highlightedId) === String(item._id || item.details?.m_id || item.uniqueId) ? "highlighted_message" : ""}`}
                                >
                                  <div
                                    className="conversation_message_avatar_container"
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      gap: "4px",
                                      justifyContent: "flex-end",
                                    }}
                                  >
                                    {item.type !== "Call" && (
                                      <div className="conversation_message_icon">
                                        {(item.channel === "SMS" ||
                                          item.c_conversationChannel ===
                                            "SMS") && (
                                          <Icon
                                            name="sms"
                                            size={12}
                                            color="#64748B"
                                          />
                                        )}
                                        {(item.channel === "Whatsapp" ||
                                          item.c_conversationChannel ===
                                            "Whatsapp") && (
                                          <Icon
                                            name="whatsapp"
                                            size={14}
                                            color="#25D366"
                                          />
                                        )}
                                      </div>
                                    )}
                                    <div
                                      className="conversation_message_avatar"
                                      style={{
                                        backgroundColor: isSelf
                                          ? ""
                                          : selectedData?.colour,
                                      }}
                                    >
                                      {isSelf
                                        ? (sender || "A").charAt(0)
                                        : selectedData
                                          ? getAvatarText(
                                              selectedData?.c_contactName ||
                                                selectedData?.c_conversationPhoneNo,
                                            )
                                          : ""}
                                    </div>
                                  </div>
                                  <div className="conversation_message_wrapper">
                                    <div className="conversation_message_sender_details">
                                      <p className="conversation_message_sender_name">
                                        {sender}
                                      </p>
                                      <p className="conversation_message_sender_time">
                                        {time}
                                      </p>
                                    </div>
                                    <div
                                      className="conversation_message_card"
                                      style={{
                                        cursor: "pointer",
                                        backgroundColor: isSelf
                                          ? ""
                                          : "#F4F8FF",
                                        position: "relative",
                                        paddingBottom: "",
                                      }}
                                    >
                                      {item.type === "Call" ? (
                                        <div>
                                          <div className="conversation_message_call_card_title">
                                            <div className="conversation_conversation_message_call_card_1">
                                              <div className="conversation_message_call_card_title_icon">
                                                {item.details?.c_disposition &&
                                                  item.details.c_disposition
                                                    .toLowerCase()
                                                    .startsWith("missed") && (
                                                    <Icon
                                                      name="missedcall"
                                                      color="#CE0000"
                                                      size={12}
                                                    />
                                                  )}
                                                {item.details?.c_disposition &&
                                                  item.details.c_disposition
                                                    .toLowerCase()
                                                    .startsWith("ans") && (
                                                    <Icon
                                                      name={
                                                        isSelf
                                                          ? "outgoing"
                                                          : "incoming"
                                                      }
                                                      color="#16A34A"
                                                      size={12}
                                                    />
                                                  )}
                                                {item.details?.c_disposition &&
                                                  item.details.c_disposition
                                                    .toLowerCase()
                                                    .startsWith("busy") && (
                                                    <Icon
                                                      name="outgoing"
                                                      color="#6A6A6A"
                                                      size={12}
                                                    />
                                                  )}
                                                {item.details?.c_disposition &&
                                                  item.details.c_disposition
                                                    .toLowerCase()
                                                    .startsWith("failed") && (
                                                    <Icon
                                                      name={
                                                        isSelf
                                                          ? "outgoing"
                                                          : "incoming"
                                                      }
                                                      color="#CE0000"
                                                      size={12}
                                                    />
                                                  )}
                                                {item.details?.c_disposition &&
                                                  item.details.c_disposition
                                                    .toLowerCase()
                                                    .startsWith("no") && (
                                                    <Icon
                                                      name={
                                                        isSelf
                                                          ? "outgoing"
                                                          : "incoming"
                                                      }
                                                      color="#CE0000"
                                                      size={12}
                                                    />
                                                  )}
                                              </div>
                                              {item.details?.c_disposition ||
                                                "Call"}
                                            </div>

                                            {formatSecsToHMS(
                                              item.details?.c_duration || 0,
                                            )}
                                          </div>
                                          <div className="conversation_message_call_notes_container">
                                            <p className="conversation_message_call_notes_heading">
                                              Hung up by{" "}
                                              {item.details?.c_terminationEnd ||
                                                ""}
                                            </p>
                                            <div
                                              style={{
                                                marginTop: "8px",
                                                width: "100%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: "10px",
                                              }}
                                            >
                                              <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() => {
                                                  setSpecificNotesModal(true);
                                                  getSelectedNotes(item);
                                                }}
                                              >
                                                Notes
                                              </Button>
                                              {authPlan?.options?.conversation
                                                ?.aidata && (
                                                <Button
                                                  type="button"
                                                  variant="secondary"
                                                  onClick={() => {
                                                    setAidata(item);
                                                    setPanelOpen(true);
                                                    getaidata(
                                                      item?.details
                                                        ?.c_callRecordingUrl ||
                                                        "",
                                                    );
                                                  }}
                                                >
                                                  AI Data
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          {["image", "video"].includes(
                                            item.details?.m_type,
                                          ) ? (
                                            <div className="wa-media-card">
                                              {item.details?.m_type ===
                                              "image" ? (
                                                <img
                                                  src={
                                                    item.details
                                                      ?.m_mediaUrlRaw ||
                                                    item.details?.m_receiveMsg
                                                  }
                                                  alt="Shared image"
                                                  className="wa-media-image"
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
                                                    item.details
                                                      ?.m_mediaUrlRaw ||
                                                    item.details?.m_receiveMsg
                                                  }
                                                  className="wa-media-video"
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
                                            <div className="wa-file-card">
                                              <div className="wa-file-icon">
                                                📎
                                              </div>
                                              <div className="wa-file-info">
                                                <a
                                                  href={
                                                    item.details
                                                      ?.m_mediaUrlRaw ||
                                                    item.details?.m_receiveMsg
                                                  }
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="wa-file-name"
                                                >
                                                  {(
                                                    item.details
                                                      ?.m_mediaUrlRaw ||
                                                    item.details
                                                      ?.m_receiveMsg ||
                                                    "File"
                                                  )
                                                    .split("/")
                                                    .pop()}
                                                </a>
                                                <a
                                                  href={
                                                    item.details
                                                      ?.m_mediaUrlRaw ||
                                                    item.details?.m_receiveMsg
                                                  }
                                                  download
                                                  className="wa-download-btn"
                                                >
                                                  Download
                                                </a>
                                              </div>
                                            </div>
                                          ) : null}

                                          <div className="wa-message-text-row">
                                            {item.details?.m_type ===
                                            "Template" ? (
                                              <div className="wa-template-message">
                                                {item.details?.m_receiveMsg?.components?.map(
                                                  (comp, idx) => (
                                                    <React.Fragment key={idx}>
                                                      {comp.type === "BODY" && (
                                                        <p className="wa-template-body">
                                                          {comp.text}
                                                        </p>
                                                      )}
                                                      {comp.type ===
                                                        "FOOTER" && (
                                                        <p className="wa-template-footer">
                                                          {comp.text}
                                                        </p>
                                                      )}
                                                      {comp.type ===
                                                        "BUTTONS" && (
                                                        <div className="wa-template-buttons">
                                                          {comp.buttons?.map(
                                                            (btn, btnIdx) =>
                                                              btn.type ===
                                                              "url" ? (
                                                                <a
                                                                  key={btnIdx}
                                                                  href={btn.url}
                                                                  target="_blank"
                                                                  rel="noopener noreferrer"
                                                                  className="wa-template-btn"
                                                                >
                                                                  🔗 {btn.text}
                                                                </a>
                                                              ) : (
                                                                <span
                                                                  key={btnIdx}
                                                                  className="wa-template-btn"
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
                                              ].includes(
                                                item.details?.m_type,
                                              ) ? (
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
                                                  <span
                                                    style={{
                                                      whiteSpace: "pre-wrap",
                                                    }}
                                                  >
                                                    {renderTextWithLinks(
                                                      displayText,
                                                    )}
                                                    {needsReadMore && (
                                                      <span
                                                        className="read-more-link"
                                                        onClick={() =>
                                                          toggleExpand(
                                                            messageKey,
                                                          )
                                                        }
                                                      >
                                                        ... Read More
                                                      </span>
                                                    )}
                                                    {isExpanded && (
                                                      <span
                                                        className="read-more-link"
                                                        onClick={() =>
                                                          toggleExpand(
                                                            messageKey,
                                                          )
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
                                                  <span
                                                    style={{
                                                      whiteSpace: "pre-wrap",
                                                    }}
                                                  >
                                                    {renderTextWithLinks(
                                                      displayText,
                                                    )}
                                                    {needsReadMore && (
                                                      <span
                                                        className="read-more-link"
                                                        onClick={() =>
                                                          toggleExpand(
                                                            messageKey,
                                                          )
                                                        }
                                                      >
                                                        ... Read More
                                                      </span>
                                                    )}
                                                    {isExpanded && (
                                                      <span
                                                        className="read-more-link"
                                                        onClick={() =>
                                                          toggleExpand(
                                                            messageKey,
                                                          )
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
                                                    item.updatedStatus.length -
                                                      1
                                                  ]?.status;
                                              }

                                              if (!isSelf || !messageStatus)
                                                return null;

                                              return (
                                                <div
                                                  className="wa-message-status-icon"
                                                  style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    gap: "2px",
                                                    float: "right",
                                                    marginTop: "4px",
                                                    marginLeft: "8px",
                                                  }}
                                                >
                                                  {messageStatus === "sent" && (
                                                    <Icon
                                                      name="sent"
                                                      size={16}
                                                      color="#9CA3AF"
                                                    />
                                                  )}
                                                  {messageStatus ===
                                                    "delivered" && (
                                                    <Icon
                                                      name="delivered"
                                                      size={16}
                                                      color="#9CA3AF"
                                                    />
                                                  )}
                                                  {messageStatus === "read" && (
                                                    <Icon
                                                      name="delivered"
                                                      size={16}
                                                      color="#3B82F6"
                                                    />
                                                  )}
                                                  {messageStatus ===
                                                    "failed" && (
                                                    <span
                                                      style={{
                                                        cursor: "pointer",
                                                      }}
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

                                                        setTemplatesLoading(
                                                          true,
                                                        );
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
                                                          selectedTemplate:
                                                            null,
                                                        });
                                                      }}
                                                      title="Click to see error details and resend"
                                                    >
                                                      <Icon
                                                        name="failed"
                                                        size={16}
                                                        color="#EF4444"
                                                      />
                                                    </span>
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
              <div className="conversation_notes_container">
                {formData && (
                  <div
                    className="form_header"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "20px",
                    }}
                  >
                    <h3>{formData.formTitle || "Form"}</h3>
                  </div>
                )}

                <form>
                  {formData &&
                  Array.isArray(formData.elements) &&
                  formData.elements.length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(12, 1fr)",
                        gap: "16px",
                        gridAutoFlow: "row dense",
                        alignItems: "start",
                        padding: "10px",
                      }}
                    >
                      {formData.elements.map((element, index) => {
                        if (!checkCondition(element)) return null;
                        const { w } = element.layout;
                        return (
                          <div
                            key={element.id}
                            style={{ gridColumn: `span ${w || 4}` }}
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
                    <p>No form elements available</p>
                  )}
                </form>
              </div>
            )}
          </>
        )}
      </div>

      {authPlan?.options?.conversation?.aidata && panelOpen && (
        <ConversationAIDataPanel
          callTime={aidata?.details?.c_callDateTime || ""}
          callDuration={formatSecsToHMS(aidata?.details?.c_duration || 0)}
          audioSrc={aidata?.details?.c_callRecordingUrl || ""}
          isCallActive={!!(currentCall && ["Answered", "In Call"].includes(currentCall.callstatus))}
          agentName={currentCall?.memberName || "Agent"}
          customerName={
            selectedData?.c_contactName ||
            selectedData?.c_conversationPhoneNo ||
            "Customer"
          }
          onClose={() => setPanelOpen(false)}
        />
      )}

      <Modal
        open={specificNotesModal}
        width="627px"
        onClose={() => setSpecificNotesModal(false)}
      >
        <div className="callback_remainder_modal_header_container">
          <p className="callback_remainder_modal_header">Notes</p>
          <Button variant="empty" onClick={handleNotesModalCancel}>
            <Icon name="close" color="#0F172A" size={14} />
          </Button>
        </div>
        {getSelectedNotesLoading ? (
          <div style={{ padding: "20px" }}>
            <Skeleton
              width="100%"
              height="20px"
              style={{ marginBottom: "10px" }}
            />
            <Skeleton
              width="90%"
              height="20px"
              style={{ marginBottom: "10px" }}
            />
            <Skeleton width="95%" height="20px" />
          </div>
        ) : (
          <form className="callback_remainder_modal_form">
            {selectedNotes && Object.keys(selectedNotes).length > 0 ? (
              <div className="notes-container">
                {Object.entries(selectedNotes).map(([key, value]) => (
                  <div className="note-row" key={key}>
                    <span className="note-key">{key}</span>
                    {typeof value === "object" ? (
                      <span className="note-value">
                        start - {value.start} — end - {value.end}
                      </span>
                    ) : (
                      <span className="note-value">{value || "-"}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No data found</p>
            )}
          </form>
        )}
      </Modal>

      <Modal
        open={errorPopup.isOpen}
        onClose={() =>
          setErrorPopup({
            isOpen: false,
            message: "",
            dst: "",
            selectedTemplate: null,
          })
        }
        width="450px"
      >
        <div className="callback_remainder_modal_header_container">
          <p className="callback_remainder_modal_header">Reason and Resend</p>
          <Button
            variant="empty"
            onClick={() =>
              setErrorPopup({
                isOpen: false,
                message: "",
                dst: "",
                selectedTemplate: null,
              })
            }
          >
            <Icon name="close" color="#0F172A" size={14} />
          </Button>
        </div>
        <div style={{ padding: "16px" }}>
          <div
            style={{
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "20px",
            }}
          >
            <p style={{ color: "#991B1B", fontSize: "14px", margin: 0 }}>
              {errorPopup.message}
            </p>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              Resend using Template
            </label>
            {templatesLoading ? (
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Skeleton width="100px" height="32px" />
                <span>Loading templates...</span>
              </div>
            ) : (
              <Select
                placeholder="Select a template"
                options={templates.map((t) => ({
                  label: t.templateName,
                  value: t.templateId,
                }))}
                value={errorPopup.selectedTemplate?.id || null}
                onChange={(value) => {
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
              />
            )}
          </div>

          {/* Destination Info */}
          {errorPopup.dst && (
            <p
              style={{
                fontSize: "12px",
                color: "#6B7280",
                marginBottom: "16px",
              }}
            >
              Destination: {errorPopup.dst}
            </p>
          )}

          {/* Action Buttons */}
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}
          >
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
              variant="primary"
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
          </div>
        </div>
      </Modal>

      {/* Media Preview Modal - WhatsApp Style */}
      {mediaPreview.isOpen && (
        <div className="media-preview-modal">
          <div className="media-preview-header">
            <div className="media-preview-header-right">
              <button
                className="media-preview-action-icon"
                onClick={() =>
                  setMediaPreview((prev) => ({
                    ...prev,
                    zoom: Math.max(0.5, prev.zoom - 0.25),
                  }))
                }
                title="Zoom out"
              >
                <Icon name="zoom_out" size={24} color="#fff" />
              </button>
              <button
                className="media-preview-action-icon"
                onClick={() =>
                  setMediaPreview((prev) => ({
                    ...prev,
                    zoom: Math.min(3, prev.zoom + 0.25),
                  }))
                }
                title="Zoom in"
              >
                <Icon name="zoom_in" size={24} color="#fff" />
              </button>
              <a
                href={mediaPreview.url}
                download
                className="media-preview-action-icon"
                title="Download"
              >
                <Icon name="Export" size={24} color="#fff" />
              </a>
              <button
                className="media-preview-action-icon"
                onClick={() =>
                  setMediaPreview({ isOpen: false, url: "", type: "", zoom: 1 })
                }
                title="Close"
              >
                <Icon name="fullscreen_exit" size={24} color="#fff" />
              </button>
            </div>
          </div>
          <div className="media-preview-content">
            {mediaPreview.type === "image" ? (
              <img
                src={mediaPreview.url}
                alt="Preview"
                className="media-preview-image"
                style={{ transform: `scale(${mediaPreview.zoom})` }}
              />
            ) : (
              <video
                src={mediaPreview.url}
                controls
                autoPlay
                className="media-preview-video"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(ConversationMessageContainer);
