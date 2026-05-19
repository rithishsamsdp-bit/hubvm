import React, { useState, useEffect } from "react";
import "./styles/KeypadPanel.css";
import Icon from "../../constants/Icon.jsx";
import { Input, Select, Button, Loader } from "../../components/Index.jsx";
import { useCallFlow } from "../../store/useCallFlow.js";
import { toast } from "../../store/useToastStore.js";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export default function KeypadPanel({
  rule,
  onRuleChange,
  onFullRuleChange,
  onImmediateAdd,
  onSyncChildNode,
  onRemoveChildNode,
  callflowName,
}) {
  const buttons = Array.isArray(rule.buttons) ? rule.buttons : [];
  const updateRule = (updates) => onRuleChange({ ...rule, ...updates });
  const { getVoice, uploadAudioFile, deleteAudioFile } = useCallFlow();

  const [selectedInstructionFile, setSelectedInstructionFile] = useState(null);
  const [isInstructionUploading, setIsInstructionUploading] = useState(false);
  const [isInstructionDeleting, setIsInstructionDeleting] = useState(false);

  const [selectedReminderFile, setSelectedReminderFile] = useState(null);
  const [isReminderUploading, setIsReminderUploading] = useState(false);
  const [isReminderDeleting, setIsReminderDeleting] = useState(false);

  const [showSettings, setShowSettings] = useState(true);
  const [showMessageSettings, setShowMessageSettings] = useState(true);
  const [showBranchSettings, setShowBranchSettings] = useState(true);

  // AUDIO STATES
  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
  const [ttsAudioKey, setTtsAudioKey] = useState(0);
  const [reminderAudioUrl, setReminderAudioUrl] = useState(null);
  const [reminderAudioKey, setReminderAudioKey] = useState(0);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);

  useEffect(() => {
    if (!rule.instructionMsg?.trim()) {
      setTtsAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setTtsAudioKey((k) => k + 1);
    }
  }, [rule.instructionMsg]);

  useEffect(() => {
    if (!rule.reminderMessage?.trim()) {
      setReminderAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setReminderAudioKey((k) => k + 1);
    }
  }, [rule.reminderMessage]);

  const findNextFreeKey = () => {
    const used = new Set(buttons.map((b) => b.key));
    return KEYS.find((k) => !used.has(k)) || null;
  };

  const handleAddBranch = () => {
    const nextKey = findNextFreeKey();
    if (!nextKey) return;
    const newBtn = {
      id: Date.now(),
      key: String(nextKey),
      title: `Key ${nextKey}`,
      nodeId: null,
    };
    const createdNodeId = onImmediateAdd?.({ title: newBtn.title }) || null;
    updateRule({ buttons: [...buttons, { ...newBtn, nodeId: createdNodeId }] });
  };

  const handleTitleChange = (id, title) => {
    const nextButtons = buttons.map((b) => (b.id === id ? { ...b, title } : b));
    updateRule({ buttons: nextButtons });
    const changed = nextButtons.find((b) => b.id === id);
    if (changed?.nodeId) {
      onSyncChildNode?.({ nodeId: changed.nodeId, label: title || "Select Key" });
    }
  };

  const handleKeySelect = (id, k) => {
    if (buttons.some((b) => b.key === k && b.id !== id)) return;
    const nextButtons = buttons.map((b) => (b.id === id ? { ...b, key: k } : b));
    updateRule({ buttons: nextButtons });
  };

  const handleRemoveBranch = (id) => {
    const btn = buttons.find((b) => b.id === id);
    if (btn?.nodeId) onRemoveChildNode?.(btn.nodeId);
    updateRule({ buttons: buttons.filter((b) => b.id !== id) });
  };

  const handlePlayTTS = async () => {
    const msg = rule.instructionMsg?.trim();
    if (!msg) {
      setTtsAudioUrl(null);
      return;
    }

    setTtsLoading(true);
    const url = await getVoice(msg);
    setTtsLoading(false);

    if (url) {
      setTtsAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setTtsAudioKey((k) => k + 1);
    }
  };

  const handlePlayReminder = async () => {
    const msg = rule.reminderMessage?.trim();
    if (!msg) {
      setReminderAudioUrl(null);
      return;
    }

    setReminderLoading(true);
    const url = await getVoice(msg);
    setReminderLoading(false);

    if (url) {
      setReminderAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setReminderAudioKey((k) => k + 1);
    }
  };

  return (
    <div className="keypad-sidebar">
      {/* SETTINGS */}
      <div className="keypad-panel-settings">
        <div className="keypad-sidepanel-section-header" onClick={() => setShowSettings(!showSettings)}>
          <p>Settings</p>
          <Icon name={showSettings ? "uparrow" : "downarrow"} size={12} color="#0F172A" />
        </div>
        {showSettings && (
          <div>
            <p className="keypad-sidepanel-input-label">Keypad (IVR) Title</p>
            <Input
              type="text"
              placeholder="Enter title"
              value={rule.title || ""}
              onChange={(e) => updateRule({ title: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* MESSAGE SETTINGS */}
      <div className="keypad-panel-message-settings">
        <div className="keypad-sidepanel-section-header" onClick={() => setShowMessageSettings(!showMessageSettings)}>
          <p>Message Settings</p>
          <Icon name={showMessageSettings ? "uparrow" : "downarrow"} size={12} color="#0F172A" />
        </div>

        {showMessageSettings && (
          <>
            {/* MAIN INSTRUCTION MSG */}
            <div style={{ marginTop: 16 }}>
              <p className="keypad-sidepanel-input-label">Message Type (Main)</p>
              <Select
                mode="single"
                value={rule.instructionMsgType || "tts"}
                onChange={(value) => {
                  if (rule.instructionMsgType === "audio" && value === "tts" && (rule.path || rule.instructionAudioName)) {
                    toast.error("Please delete the existing audio file before changing the message type.");
                    return;
                  }

                  const nextRule = { ...rule, instructionMsgType: value };
                  if (value === "tts") {
                    delete nextRule.instructionAudioName;
                  } else {
                    delete nextRule.instructionMsg;
                    nextRule.path = "";
                  }
                  onFullRuleChange(nextRule);
                  setSelectedInstructionFile(null);
                }}
                options={[
                  { label: "Text to Speech", value: "tts" },
                  { label: "Audio Upload", value: "audio" },
                ]}
              />
            </div>

            {(rule.instructionMsgType === "tts" || !rule.instructionMsgType) && (
              <>
                <div style={{ marginTop: 16 }}>
                  <p className="keypad-sidepanel-input-label">Text to Speech Message</p>
                  <Input
                    type="textarea"
                    placeholder="Enter message"
                    value={rule.instructionMsg || ""}
                    onChange={(e) => updateRule({ instructionMsg: e.target.value })}
                  />
                </div>

                <Button
                  variant="secondary"
                  type="button"
                  style={{ width: "100%", marginTop: "10px" }}
                  onClick={handlePlayTTS}
                >
                  {ttsLoading ? <Loader /> : "Test and Play"}
                </Button>

                {ttsAudioUrl && (
                  <audio key={ttsAudioKey} controls style={{ width: "100%", marginTop: 8 }}>
                    <source src={ttsAudioUrl} />
                    Your browser does not support the audio element.
                  </audio>
                )}
              </>
            )}

            {rule.instructionMsgType === "audio" && (
              <div style={{ marginTop: 16 }}>
                <p className="keypad-sidepanel-input-label" style={{ marginBottom: "8px" }}>Audio File Upload (Main)</p>
                {!rule.path ? (
                  <>
                    <div 
                      style={{
                        border: "2px dashed #CBD5E1",
                        borderRadius: "12px",
                        padding: "24px 16px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#F8FAFC",
                        cursor: "pointer",
                        transition: "all 0.2s ease-in-out",
                        position: "relative"
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.backgroundColor = "#EFF6FF"; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.backgroundColor = "#F8FAFC"; }}
                    >
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                             setSelectedInstructionFile(file);
                          }
                        }}
                        style={{
                          position: "absolute",
                          top: 0, left: 0, width: "100%", height: "100%",
                          opacity: 0, cursor: "pointer"
                        }}
                      />
                      <Icon name="upload" size={32} color="#64748B" />
                      <p style={{ marginTop: "12px", fontSize: "14px", fontWeight: "600", color: "#1E293B", textAlign: "center", wordBreak: "break-all" }}>
                         {selectedInstructionFile ? selectedInstructionFile.name : "Click or drag to select audio"}
                      </p>
                      <p style={{ marginTop: "4px", fontSize: "12px", color: "#64748B", textAlign: "center" }}>
                         {selectedInstructionFile ? "Ready to save" : "Supports mp3, wav, and other audio formats"}
                      </p>
                    </div>

                    {selectedInstructionFile && (
                        <Button 
                           variant="primary" 
                           onClick={async () => {
                               setIsInstructionUploading(true);
                               const data = await uploadAudioFile(callflowName, selectedInstructionFile);
                               setIsInstructionUploading(false);
                               if (data?.filepath) {
                                   updateRule({ path: data.filepath, instructionAudioName: selectedInstructionFile.name });
                                   setSelectedInstructionFile(null);
                               }
                           }}
                           style={{ marginTop: 12, width: "100%", display: "flex", justifyContent: "center" }}
                           disabled={isInstructionUploading}
                        >
                           {isInstructionUploading ? <Loader width={20} height={20} /> : "Save Audio"}
                        </Button>
                    )}
                  </>
                ) : (
                  <div style={{
                    marginTop: 8,
                    padding: "16px",
                    border: "1px solid #E2E8F0",
                    borderRadius: "12px",
                    backgroundColor: "#FFFFFF",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", maxWidth: "80%" }}>
                        <div style={{
                          minWidth: "36px", height: "36px", borderRadius: "8px",
                          backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          <Icon name="play" size={18} color="#3B82F6" />
                        </div>
                        <div style={{ overflow: "hidden" }}>
                          <p style={{ fontSize: "14px", fontWeight: "600", color: "#0F172A", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {rule.instructionAudioName || "Uploaded Audio"}
                          </p>
                          <p style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>
                            {isInstructionDeleting ? "Deleting..." : "Audio File Saved"}
                          </p>
                        </div>
                      </div>
                      <Button
                         variant="empty"
                         onClick={async () => {
                             setIsInstructionDeleting(true);
                             await deleteAudioFile(rule.path);
                             const nextRule = { ...rule };
                             delete nextRule.path;
                             delete nextRule.instructionAudioName;
                             delete nextRule.instructionAudioBase64;
                             onFullRuleChange(nextRule);
                             setIsInstructionDeleting(false);
                         }}
                         style={{ color: "#EF4444", padding: "6px" }}
                         title="Delete Audio"
                         disabled={isInstructionDeleting}
                      >
                         {isInstructionDeleting ? <Loader width={16} height={16} color="#EF4444" /> : <Icon name="deletee" size={18} color="#EF4444" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ margin: "20px 0", backgroundColor: "#EBEBEB", height: "1px" }} />

            {/* REMINDER MSG */}
            <div style={{ marginTop: 16 }}>
              <p className="keypad-sidepanel-input-label">Message Type (Reminder)</p>
              <Select
                mode="single"
                value={rule.reminderMsgType || "tts"}
                onChange={(value) => {
                  if (rule.reminderMsgType === "audio" && value === "tts" && (rule.reminderPath || rule.reminderAudioName)) {
                    toast.error("Please delete the existing audio file before changing the message type.");
                    return;
                  }

                  const nextRule = { ...rule, reminderMsgType: value };
                  if (value === "tts") {
                    delete nextRule.reminderAudioName;
                  } else {
                    delete nextRule.reminderMsg;
                    nextRule.reminderPath = "";
                  }
                  onFullRuleChange(nextRule);
                  setSelectedReminderFile(null);
                }}
                options={[
                  { label: "Text to Speech", value: "tts" },
                  { label: "Audio Upload", value: "audio" },
                ]}
              />
            </div>

            {(rule.reminderMsgType === "tts" || !rule.reminderMsgType) && (
              <>
                <div style={{ marginTop: 16 }}>
                  <p className="keypad-sidepanel-input-label">No or wrong input reminder message (optional)</p>
                  <Input
                    type="textarea"
                    placeholder="Enter message"
                    value={rule.reminderMessage || ""}
                    onChange={(e) => updateRule({ reminderMessage: e.target.value })}
                  />
                </div>

                <Button
                  variant="secondary"
                  type="button"
                  style={{ width: "100%", marginTop: "10px" }}
                  onClick={handlePlayReminder}
                >
                  {reminderLoading ? <Loader /> : "Test and Play"}
                </Button>

                {reminderAudioUrl && (
                  <audio key={reminderAudioKey} controls style={{ width: "100%", marginTop: 8 }}>
                    <source src={reminderAudioUrl} />
                    Your browser does not support the audio element.
                  </audio>
                )}
              </>
            )}

            {rule.reminderMsgType === "audio" && (
              <div style={{ marginTop: 16 }}>
                <p className="keypad-sidepanel-input-label" style={{ marginBottom: "8px" }}>Audio File Upload (Reminder)</p>
                {!rule.reminderPath ? (
                  <>
                    <div 
                      style={{
                        border: "2px dashed #CBD5E1",
                        borderRadius: "12px",
                        padding: "24px 16px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#F8FAFC",
                        cursor: "pointer",
                        transition: "all 0.2s ease-in-out",
                        position: "relative"
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.backgroundColor = "#EFF6FF"; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.backgroundColor = "#F8FAFC"; }}
                    >
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                             setSelectedReminderFile(file);
                          }
                        }}
                        style={{
                          position: "absolute",
                          top: 0, left: 0, width: "100%", height: "100%",
                          opacity: 0, cursor: "pointer"
                        }}
                      />
                      <Icon name="upload" size={32} color="#64748B" />
                      <p style={{ marginTop: "12px", fontSize: "14px", fontWeight: "600", color: "#1E293B", textAlign: "center", wordBreak: "break-all" }}>
                         {selectedReminderFile ? selectedReminderFile.name : "Click or drag to select audio"}
                      </p>
                      <p style={{ marginTop: "4px", fontSize: "12px", color: "#64748B", textAlign: "center" }}>
                         {selectedReminderFile ? "Ready to save" : "Supports mp3, wav, and other audio formats"}
                      </p>
                    </div>

                    {selectedReminderFile && (
                        <Button 
                           variant="primary" 
                           onClick={async () => {
                               setIsReminderUploading(true);
                               const data = await uploadAudioFile(callflowName, selectedReminderFile);
                               setIsReminderUploading(false);
                               if (data?.filepath) {
                                   updateRule({ reminderPath: data.filepath, reminderAudioName: selectedReminderFile.name });
                                   setSelectedReminderFile(null);
                               }
                           }}
                           style={{ marginTop: 12, width: "100%", display: "flex", justifyContent: "center" }}
                           disabled={isReminderUploading}
                        >
                           {isReminderUploading ? <Loader width={20} height={20} /> : "Save Audio"}
                        </Button>
                    )}
                  </>
                ) : (
                  <div style={{
                    marginTop: 8,
                    padding: "16px",
                    border: "1px solid #E2E8F0",
                    borderRadius: "12px",
                    backgroundColor: "#FFFFFF",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", maxWidth: "80%" }}>
                        <div style={{
                          minWidth: "36px", height: "36px", borderRadius: "8px",
                          backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          <Icon name="play" size={18} color="#3B82F6" />
                        </div>
                        <div style={{ overflow: "hidden" }}>
                          <p style={{ fontSize: "14px", fontWeight: "600", color: "#0F172A", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {rule.reminderAudioName || "Uploaded Audio"}
                          </p>
                          <p style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>
                            {isReminderDeleting ? "Deleting..." : "Audio File Saved"}
                          </p>
                        </div>
                      </div>
                      <Button
                         variant="empty"
                         onClick={async () => {
                             setIsReminderDeleting(true);
                             await deleteAudioFile(rule.reminderPath);
                             const nextRule = { ...rule };
                             delete nextRule.reminderPath;
                             delete nextRule.reminderAudioName;
                             delete nextRule.reminderAudioBase64;
                             onFullRuleChange(nextRule);
                             setIsReminderDeleting(false);
                         }}
                         style={{ color: "#EF4444", padding: "6px" }}
                         title="Delete Audio"
                         disabled={isReminderDeleting}
                      >
                         {isReminderDeleting ? <Loader width={16} height={16} color="#EF4444" /> : <Icon name="deletee" size={18} color="#EF4444" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* REPEAT */}
            <div style={{ marginTop: 20 }}>
              <p className="keypad-sidepanel-input-label">Repeat</p>
              <Select
                mode="single"
                placeholder="select"
                showSearch={false}
                value={rule.instructionType || "Once"}
                onChange={(value) => updateRule({ instructionType: value })}
                options={[
                  { label: "Once", value: "Once" },
                  { label: "Twice", value: "Twice" },
                  { label: "Trice", value: "Trice" },
                ]}
              />
            </div>
          </>
        )}
      </div>

      {/* BRANCH SETTINGS */}
      <div className="keypad-panel-branch-settings">
        <div className="keypad-sidepanel-section-header" onClick={() => setShowBranchSettings(!showBranchSettings)}>
          <p>Branch Settings</p>
          <Icon name={showBranchSettings ? "uparrow" : "downarrow"} size={12} color="#0F172A" />
        </div>

        {showBranchSettings && (
          <>
            {buttons.map((btn) => (
              <div className="keypad-panel-btn-items" key={btn.id}>
                <div className="keypad-panel-btn-items-header">
                  <p>Key {btn.key}</p>
                  <Button variant="empty" onClick={() => handleRemoveBranch(btn.id)}>
                    <Icon name="deletee" size={12} color="#5F6368" />
                  </Button>
                </div>

                <div>
                  <p className="keypad-sidepanel-input-label">Branch title (optional)</p>
                  <Input
                    type="text"
                    placeholder="Enter title"
                    maxLength={30}
                    value={btn.title}
                    onChange={(e) => handleTitleChange(btn.id, e.target.value)}
                  />
                </div>

                <div className="keypad-sidepanel-number-select">
                  {KEYS.map((k) => {
                    const usedElsewhere = buttons.some((b) => b.key === k && b.id !== btn.id);
                    return (
                      <button
                        key={k}
                        data-key={k}
                        className={`keypad-sidepanel-button${k === btn.key ? " active" : ""}`}
                        disabled={usedElsewhere}
                        onClick={() => handleKeySelect(btn.id, k)}
                      >
                        {k}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              type="button"
              className="keypad-sidepanel-branch-block-add-branch-btn"
              onClick={handleAddBranch}
              disabled={buttons.length >= KEYS.length}
            >
              <div className="keypad-sidepanel-branch-add-icon">
                <Icon name="plus" size={11} color="white" />
              </div>
              Add New Branch
            </button>
          </>
        )}
      </div>
    </div>
  );
}
