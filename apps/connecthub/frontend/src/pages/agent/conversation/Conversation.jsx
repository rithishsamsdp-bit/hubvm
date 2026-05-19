import React, { useState, useCallback, useEffect } from "react";
import {
  getStoredHoldDuration,
  setStoredHoldDuration,
  clearStoredHoldDuration,
} from "../../../utils/conversationFunction";
import { useAiStore } from "../../../store/agent/useAiStore";
import { Button } from "@/components/ui/button";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useConversationStore } from "../../../store/agent/useConversationStore.js";
import { callStore } from "../../../store/useCallStore.js";
import NewConversation from "./NewConversation.jsx";
import ConversationLeftSidebar from "./ConversationLeftSidebar.jsx";
import ConversationMessageContainer from "./ConversationMessageContainer.jsx";
import { useAuthStore } from "../../../store/useAuthStore.js";
import ConversationAIDataPanel from "./ConversationAIDataPanel.jsx";
import { Sparkles } from "lucide-react";
import { formatSecsToHMS } from "../../../utils/helpers.js";

const Conversation = () => {
  const { getaidata, clearaiData } = useAiStore();
  const { authPlan } = useAuthStore();
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [activeTab, setActiveTab] = useState("chat");
  const SIDEBAR_KEY = "conv_selected_lead_id";
  const [callbackDate, setCallbackDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reminderData, setReminderData] = useState({});
  const [formValues, setFormValues] = useState({});
  const { activeCalls, createCallback, createCallBackLoading } = callStore();
  const {
    getConversations,
    conversations = [],
    conversationLoading,
    getChat,
    conversationChat = {},
    chatLoading,
    formData,
    endConversation,
    fetchFollowupForm,
    selectedNotes,
    getSelectedNotes,
    getSelectedNotesLoading,
    selectContact,
    pendingNotificationPhone,
    setPendingNotificationPhone,
  } = useConversationStore();

  const [holdDurations, setHoldDurations] = useState({});
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState("live");
  const { aiData } = useAiStore();

  // Auto-open panel when a call becomes active; auto-close when ends
  useEffect(() => {
    const hasActiveCall = !!(activeCalls || []).find((c) =>
      ["Answered", "In Call", "Connecting", "Ringing"].includes(c.callstatus)
    );
    
    if (hasActiveCall) {
      setPanelOpen(true);
      setPanelTab("live");
    } else if (panelTab === "live") {
      // Only auto-close if we were in live mode. 
      // If user switched to summary, keep it open.
      setPanelOpen(false);
    }
  }, [activeCalls?.length, panelTab]);

  useEffect(() => {
    if (formData && Array.isArray(formData.elements)) {
      const initialValues = {};
      formData.elements.forEach((element) => {
        // Use existing value if available (e.g. from fetchFollowupForm), otherwise default or empty
        initialValues[element.label] =
          element.value || element.defaultValue || "";

        // Handle checkbox array initialization
        if (
          element.type === "Checkbox" &&
          !Array.isArray(initialValues[element.label])
        ) {
          initialValues[element.label] = [];
        }
      });
      setFormValues(initialValues);
    }
  }, [formData]);

  useEffect(() => {
    clearaiData();
  }, [selectedLead, selectedData]);

  useEffect(() => {
    getConversations && getConversations();
  }, []);

  // Auto-select conversation when navigating from notification View button
  useEffect(() => {
    if (
      pendingNotificationPhone &&
      conversations.length > 0 &&
      !conversationLoading
    ) {
      const phone = String(pendingNotificationPhone);
      const match = conversations.find((c) => {
        const convPhone = String(c.c_conversationPhoneNo || "");
        return (
          convPhone === phone ||
          convPhone.endsWith(phone) ||
          phone.endsWith(convPhone)
        );
      });
      if (match) {
        handleCardClick(match);
      }
      setPendingNotificationPhone(null);
    }
  }, [pendingNotificationPhone, conversations, conversationLoading]);

  // Restore previously selected conversation after refresh
  useEffect(() => {
    if (
      conversations.length > 0 &&
      !conversationLoading &&
      selectedLead === null
    ) {
      const storedId = sessionStorage.getItem(SIDEBAR_KEY);
      if (storedId) {
        const storedIdNum = isNaN(storedId) ? storedId : Number(storedId);
        const match = conversations.find(
          (c) =>
            c.c_conversationId === storedIdNum ||
            c.c_conversationId === storedId,
        );
        if (match) {
          handleCardClick(match);
        } else {
          sessionStorage.removeItem(SIDEBAR_KEY);
        }
      }
    }
  }, [conversations, conversationLoading]);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const callStoreState = callStore.getState();
        const currentCalls = Array.isArray(callStoreState.activeCalls)
          ? callStoreState.activeCalls
          : [];

        const updatedHoldDurations = {};

        (conversations || []).forEach((item) => {
          const conversationId = item.c_conversationId;
          const callId = item.c_conversationDetails?.callId || conversationId;
          const convKey = conversationId;

          // Find matching active call
          const matchingActiveCall = currentCalls.find(
            (call) =>
              call.id === callId ||
              call.activeConversationId === conversationId ||
              call.dialnumber === item.c_conversationPhoneNo,
          );

          const hasActiveCall = !!matchingActiveCall;
          const isConferenceCall =
            matchingActiveCall?.isConferenceCall || false;

          // Check if conversation is on hold
          const isOnHold =
            item.callstatus === "On Hold" ||
            item.callstatus === "On Hold & Muted" ||
            item.holdStatus === true ||
            item.hold === true;

          const activeCallOnHold =
            matchingActiveCall &&
            (matchingActiveCall.callstatus === "On Hold" ||
              matchingActiveCall.callstatus === "On Hold & Muted" ||
              matchingActiveCall.holdStatus === true ||
              matchingActiveCall.hold === true);

          // Handle active call on hold
          if (activeCallOnHold && !isConferenceCall) {
            const storedData =
              getStoredHoldDuration(matchingActiveCall.id || callId) || {};
            if (storedData.startTime) {
              const runningDuration = Math.floor(
                (Date.now() - storedData.startTime) / 1000,
              );
              updatedHoldDurations[convKey] = runningDuration;
            } else if (matchingActiveCall.holdStartTime) {
              const runningDuration = Math.floor(
                (Date.now() - matchingActiveCall.holdStartTime) / 1000,
              );
              updatedHoldDurations[convKey] = runningDuration;
              setStoredHoldDuration(matchingActiveCall.id || callId, {
                startTime: matchingActiveCall.holdStartTime,
                duration: runningDuration,
              });
            }
          }
          // Handle conversation on hold without active call
          else if (!hasActiveCall && isOnHold && !isConferenceCall) {
            const storedData = getStoredHoldDuration(callId) || {};
            if (storedData.startTime) {
              const runningDuration = Math.floor(
                (Date.now() - storedData.startTime) / 1000,
              );
              updatedHoldDurations[convKey] = runningDuration;
              setStoredHoldDuration(callId, {
                startTime: storedData.startTime,
                duration: runningDuration,
              });
            } else if (item.holdStartTime) {
              const runningDuration = Math.floor(
                (Date.now() - item.holdStartTime) / 1000,
              );
              updatedHoldDurations[convKey] = runningDuration;
              setStoredHoldDuration(callId, {
                startTime: item.holdStartTime,
                duration: runningDuration,
              });
            } else {
              const startTime = Date.now();
              setStoredHoldDuration(callId, { startTime, duration: 0 });
              updatedHoldDurations[convKey] = 0;
            }
          }
          // Clear hold duration if not on hold or is conference call
          else if (!hasActiveCall && !isOnHold) {
            updatedHoldDurations[convKey] = 0;
            clearStoredHoldDuration(callId);
          } else if (isConferenceCall) {
            updatedHoldDurations[convKey] = 0;
            clearStoredHoldDuration(callId);
          }
        });

        setHoldDurations((prev) => {
          const keys = Object.keys(updatedHoldDurations);
          const hasChanges = keys.some(
            (k) => prev[k] !== updatedHoldDurations[k],
          );
          return hasChanges ? { ...prev, ...updatedHoldDurations } : prev;
        });
      } catch (err) {
        console.error("Error in hold-duration interval:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [conversations, activeCalls]);

  useEffect(() => {
    if ((conversations || []).length > 0) {
      (conversations || []).forEach((item) => {
        const conversationId = item.c_conversationId;
        const callId = item.c_conversationDetails?.callId || conversationId;
        const isOnHold =
          item.onHold || item.status === "onhold" || item.holdStatus === true;

        const storedData = getStoredHoldDuration(callId) || {};

        if (isOnHold && !storedData.startTime) {
          const startTime = Date.now();
          setStoredHoldDuration(callId, { startTime, duration: 0 });
        }
      });
    }
  }, [conversations]);

  const status = selectedData?.statusLabel?.toLowerCase?.();

  const handleCardClick = useCallback((card) => {
    setSelectedLead(card.c_conversationId);
    setSelectedData(card);
    selectContact(card);
    getChat && getChat(card.c_leadId);
    setFormValues({});
    setActiveTab("chat");
    sessionStorage.setItem(SIDEBAR_KEY, card.c_conversationId);

    // Determine active call and dialer type
    const activeCall = (callStore.getState().activeCalls || []).find(
      (c) =>
        c.activeConversationId === card.c_conversationId ||
        c.dialnumber === card.c_conversationPhoneNo,
    );

    const isPredictive =
      (activeCall &&
        activeCall.dialerType === "PREDICTIVE" &&
        activeCall.predictiveLeadId) ||
      (card.c_conversationDetails && card.c_conversationDetails.predictiveID);

    if (isPredictive) {
      const fetchPredictive =
        useConversationStore.getState().fetchPredictiveLeadData;
      const predictiveIdToUse =
        activeCall?.predictiveLeadId ||
        card.c_conversationDetails?.predictiveID;
      const campaignIdToUse =
        activeCall?.campaignId ||
        card.c_conversationDetails?.callCampaignId ||
        localStorage.getItem("CampaignId") ||
        "0";

      // Clear standard form data ensures UI knows to show predictive data (or empty standard form)
      useConversationStore.setState({ formData: null });
      fetchPredictive &&
        fetchPredictive(predictiveIdToUse, campaignIdToUse.toString());
    } else {
      useConversationStore.setState({ predictiveLeadData: null });
      const fetchFollowup =
        useConversationStore.getState().fetchFollowupForm || fetchFollowupForm;
      fetchFollowup &&
        fetchFollowup(
          card.c_leadId,
          (card.c_conversationDetails?.callCampaignId || "0").toString(),
          card.c_conversationDetails?.cliNumberId || "",
          card.c_conversationDetails?.callDirection || "Outbound",
          card.c_conversationPhoneNo,
        );
    }
  }, []);

  // Auto-select conversation (Active call takes priority, then first record)
  useEffect(() => {
    if (
      conversations.length > 0 &&
      !conversationLoading &&
      selectedLead === null
    ) {
      const normalize = (num) => String(num || "").replace(/\D/g, "");

      // 1. Try to match an active call first
      let match = null;
      if ((activeCalls || []).length > 0) {
        match = conversations.find((c) => {
          const convPhone = normalize(c.c_conversationPhoneNo);
          const convId = c.c_conversationId;

          return activeCalls.some((call) => {
            const dialNum = normalize(call.dialnumber);
            return (
              (call.activeConversationId &&
                call.activeConversationId === convId) ||
              (dialNum !== "" &&
                convPhone !== "" &&
                (dialNum === convPhone ||
                  dialNum.endsWith(convPhone) ||
                  convPhone.endsWith(dialNum)))
            );
          });
        });
      }

      // 2. If no active call match, just pick the first conversation
      if (!match) {
        match = conversations[0];
      }

      if (match) {
        console.log("🎯 Auto-selecting conversation:", match.c_conversationId);
        handleCardClick(match);
      }
    }
  }, [
    activeCalls,
    conversations,
    conversationLoading,
    selectedLead,
    handleCardClick,
  ]);

  const currentCall = (activeCalls || []).find(
    (c) =>
      c.activeConversationId === selectedData?.c_conversationId ||
      (selectedData?.c_conversationPhoneNo &&
        c.dialnumber &&
        String(c.dialnumber).replace(/^\+/, "") ===
          String(selectedData.c_conversationPhoneNo).replace(/^\+/, "")),
  );

  const handleCancel = () => {
    setIsModalOpen(false);
    setReminderData({});
  };

  const handleDateChange = ({ value }) => {
    if (!value) return;
    const formatted = value.toISOString().slice(0, 19);
    setCallbackDate(value);
    setReminderData((prev) => ({ ...prev, date: formatted }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submit reminder:", reminderData, selectedData);
    const number = selectedData?.c_conversationPhoneNo || "";
    let data = { callbackDate, number };
    await createCallback(data);
    setIsModalOpen(false);
    setReminderData({});
  };

  // Recursive dependency reset logic
  const getRecursiveDependents = (parentId) => {
    const dependents = [];
    if (formData && Array.isArray(formData.elements)) {
      formData.elements.forEach((element) => {
        if (element.conditions && element.conditions.length > 0) {
          const isDependent = element.conditions.some(
            (cond) => cond.fieldId === parentId,
          );
          if (isDependent) {
            dependents.push(element.id);
            // Recursively find dependents of this dependent
            const subDependents = getRecursiveDependents(element.id);
            dependents.push(...subDependents);
          }
        }
      });
    }
    return [...new Set(dependents)]; // Remove duplicates
  };

  const handleFormFieldChange = useCallback(
    (label, value) => {
      setFormValues((prev) => {
        if (prev[label] === value) return prev;
        const newValues = { ...prev, [label]: value };

        // Find the element ID for this label to check dependencies
        // (Assuming label is unique or we can map back to ID.
        // Ideally we should pass ID to handleFormFieldChange, but existing code uses label.
        // Let's rely on finding element by label.)
        const changedElement = formData?.elements?.find(
          (el) => el.label === label,
        );

        if (changedElement) {
          const dependents = getRecursiveDependents(changedElement.id);
          dependents.forEach((depId) => {
            const depElement = formData.elements.find((el) => el.id === depId);
            if (depElement) {
              newValues[depElement.label] = ""; // Reset using label as key
              if (depElement.type === "Checkbox") {
                newValues[depElement.label] = [];
              }
            }
          });
        }

        return newValues;
      });
    },
    [formData], // Added formData dependency
  );

  const handleEndConversation = async () => {
    if (!selectedData) {
      alert("No conversation selected!");
      return;
    }

    const followup = {};

    if (formData && Array.isArray(formData.elements)) {
      formData.elements.forEach((element) => {
        followup[element.label] = {
          value: formValues[element.label] || element.defaultValue || "",
          type: element.type,
          id: element.id,
          layout: element.layout,
          options: element.options || [],
          placeholder: element.placeholder || "",
          required: element.required || false,
          defaultValue: element.defaultValue || "",
          conditions: element.conditions || [],
        };
      });
    }

    const payload = {
      conversationid: selectedData.c_conversationId,
      callid: selectedData.c_conversationDetails?.callId || "",
      callendtime: selectedData.c_conversationDetails?.callEndTime || "",
      followup,
      fullForm: formData,
    };

    await endConversation(payload);

    const callId =
      selectedData.c_conversationDetails?.callId ||
      selectedData.c_conversationId;
    clearStoredHoldDuration(callId);

    const activeCall = (activeCalls || []).find(
      (call) =>
        call.id === callId ||
        call.activeConversationId === selectedData.c_conversationId ||
        call.dialnumber === selectedData.c_conversationPhoneNo,
    );

    if (activeCall && callStore.getState().removeCall) {
      callStore.getState().removeCall(activeCall.id);
    }

    useConversationStore.setState((prev) => {
      const updated = (prev.conversations || []).filter(
        (conv) => conv.c_conversationId !== selectedData.c_conversationId,
      );
      return { conversations: updated };
    });

    setSelectedLead(null);
    setSelectedData(null);
    selectContact(null);
    setFormValues({});
    sessionStorage.removeItem(SIDEBAR_KEY);
  };

  if ((conversations || []).length === 0 && !conversationLoading) {
    return <NewConversation />;
  }

    const isCallActiveGlobal = !!(activeCalls || []).find((c) =>
    ["Answered", "In Call", "Connecting", "Ringing"].includes(c.callstatus)
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full overflow-hidden bg-white">
      <div className="flex w-full h-full">
        <ConversationLeftSidebar
          conversations={conversations}
          conversationLoading={conversationLoading}
          selectedLead={selectedLead}
          handleCardClick={handleCardClick}
          activeCalls={activeCalls}
          holdDurations={holdDurations}
          getConversations={getConversations} // Pass function for pagination
        />

        <section
          className={
            authPlan?.options?.conversation?.aidata
              ? "flex-1 min-w-0"
              : "flex-1 min-w-0"
          }
          style={
            !authPlan?.options?.conversation?.aidata
              ? { display: "grid", gridTemplateColumns: "1fr auto" }
              : { display: "flex", flexDirection: "column" }
          }
        >
          {selectedLead !== "" && selectedLead !== null && selectedData && (
            <ConversationMessageContainer
              selectedLead={selectedLead}
              selectedData={selectedData}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              conversationChat={conversationChat}
              chatLoading={chatLoading}
              formData={formData}
              formValues={formValues}
              handleFormFieldChange={handleFormFieldChange}
              handleEndConversation={handleEndConversation}
              currentCall={currentCall}
              status={status}
              setIsModalOpen={setIsModalOpen}
              getaidata={getaidata}
              getSelectedNotes={getSelectedNotes}
              selectedNotes={selectedNotes}
              getSelectedNotesLoading={getSelectedNotesLoading}
              getChat={getChat}
              setPanelOpen={setPanelOpen}
              setPanelTab={setPanelTab}
            />
          )}
        </section>

        {authPlan?.options?.conversation?.aidata && panelOpen && (
          <ConversationAIDataPanel
            initialTab={panelTab}
            callTime={aiData?.details?.c_callDateTime || ""}
            callDuration={formatSecsToHMS(aiData?.details?.c_duration || 0)}
            audioSrc={aiData?.details?.c_callRecordingUrl || ""}
            isCallActive={
              !!(activeCalls || []).find((c) =>
                ["Answered", "In Call", "Connecting", "Ringing"].includes(
                  c.callstatus,
                )
              )
            }
            agentName={
              (activeCalls || []).find((c) =>
                ["Answered", "In Call", "Connecting", "Ringing"].includes(
                  c.callstatus,
                )
              )?.memberName || "Agent"
            }
            customerName={
              (activeCalls || []).find((c) =>
                ["Answered", "In Call", "Connecting", "Ringing"].includes(
                  c.callstatus,
                )
              )?.dialnumber ||
              selectedData?.c_contactName ||
              "Customer"
            }
            onClose={() => setPanelOpen(false)}
          />
        )}

        {authPlan?.options?.conversation?.aidata && !panelOpen && isCallActiveGlobal && (
          <button
            onClick={() => setPanelOpen(true)}
            className="fixed right-6 bottom-44 w-12 h-12 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-40 group"
            title="Open Live Transcription"
          >
            <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
            <div className="absolute right-full mr-3 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Live Transcription
            </div>
          </button>
        )}
      </div>

        <Dialog open={isModalOpen} onOpenChange={(v) => !v && handleCancel()}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Callback Reminder</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-2">
              <div className="flex flex-col gap-2 items-center text-center">
                <label className="block text-sm font-semibold text-slate-700">
                  Select Date & Time
                </label>
                <div className="flex justify-center w-full">
                  <DateTimeRangePicker
                    type="single"
                    showTime={true}
                    initialStart={callbackDate}
                    initialEnd={callbackDate}
                    onChange={handleDateChange}
                    format="YYYY-MM-DD"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1 text-center">
                  You will be notified 30 mins before the scheduled reminder.
                </p>
              </div>
              <DialogFooter className="pt-2">
                <Button
                  variant="secondary"
                  onClick={handleCancel}
                  type="button"
                >
                  Cancel
                </Button>
                <Button type="submit">Save Reminder</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default React.memo(Conversation);
