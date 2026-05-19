import { useState, useEffect, useMemo } from "react";
import "./styles/VoicemailPanel.css";
import Icon from "../../constants/Icon.jsx";
import { Input, Button, Select, Loader } from "../../components/Index.jsx";
import { useCallFlow } from "../../store/useCallFlow.js";
import { usePhoneNumberStore } from "../../store/admin/usePhoneNumberStore.js";
import { toast } from "../../store/useToastStore.js";

export default function VoicemailPanel({ rule, onRuleChange, onFullRuleChange, callflowName }) {
  const { getVoice, uploadAudioFile, deleteAudioFile } = useCallFlow();
  const { getAgents, agentsData, agentsLoading } = usePhoneNumberStore();

  const updateRule = (updates) => onRuleChange({ ...rule, ...updates });

  const [showSettings, setShowSettings] = useState(true);
  const [showMessageSettings, setShowMessageSettings] = useState(true);

  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
  const [ttsAudioKey, setTtsAudioKey] = useState(0);
  const [ttsLoading, setTtsLoading] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Multi-email state
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState(rule?.notifyEmails || []);

  // Built-in domain suggestions (includes your company domain)
  const domainCatalog = useMemo(
    () => ["gmail.com", "outlook.com", "yahoo.com", "icloud.com"],
    []
  );

  // Optional address book from agents (if they have an email field)
  const addressBook = useMemo(() => {
    const list =
      (agentsData || [])
        .map((a) => a?.m_memberEmail || a?.email)
        .filter(Boolean) || [];
    return Array.from(new Set(list));
  }, [agentsData]);

  // Suggestions shown only after '@'
  const suggestions = useMemo(() => {
    const v = emailInput.trim();
    if (!v.includes("@")) return [];

    const [local, domPart] = v.split("@");
    if (local.length === 0) return [];

    // Domain completions (local@<domain…>)
    const domMatches = domainCatalog
      .filter((d) => d.toLowerCase().startsWith((domPart || "").toLowerCase()))
      .map((d) => `${local}@${d}`);

    // Known addresses that include the partially typed domain or local
    const addrMatches = addressBook.filter((a) =>
      a.toLowerCase().includes(v.toLowerCase())
    );

    // Merge, keep unique, drop ones already selected
    const merged = Array.from(new Set([...domMatches, ...addrMatches])).filter(
      (e) => !emails.includes(e)
    );

    return merged.slice(0, 8);
  }, [emailInput, domainCatalog, addressBook, emails]);

  useEffect(() => {
    getAgents();
  }, []);

  // Sync out selected emails to parent rule
  useEffect(() => {
    updateRule({ notifyEmails: emails });
  }, [emails]);

  useEffect(() => {
    if (!rule.instructionMsg?.trim()) {
      setTtsAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setTtsAudioKey((k) => k + 1);
    }
  }, [rule.instructionMsg]);

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

  // ── Multi-email helpers
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const commitEmail = (raw) => {
    const e = raw.trim().replace(/[,;]+$/, "");
    if (!e) return;
    if (!emailRegex.test(e)) return; // silently ignore invalid
    if (emails.includes(e)) return;
    setEmails((prev) => [...prev, e]);
  };

  const onKeyDownEmail = (e) => {
    if (["Enter", ",", " "].includes(e.key)) {
      e.preventDefault();
      commitEmail(emailInput);
      setEmailInput("");
      return;
    }
    if (e.key === "Backspace" && !emailInput) {
      // remove last chip
      setEmails((prev) => prev.slice(0, -1));
    }
  };

  const onBlurEmail = () => {
    // Add whatever is typed when focus leaves
    if (emailInput.trim()) {
      commitEmail(emailInput);
      setEmailInput("");
    }
  };

  const removeEmail = (target) =>
    setEmails((prev) => prev.filter((x) => x !== target));

  const selectSuggestion = (value) => {
    commitEmail(value);
    setEmailInput("");
  };

  if (agentsLoading) return <Loader />;

  return (
    <div className="voicemail">
      {/* SETTINGS SECTION */}
      <div className="voicemail-panel-settings">
        <div
          className="voicemail-sidepanel-section-header"
          onClick={() => setShowSettings((s) => !s)}
        >
          <p>Settings</p>
          <Icon name={showSettings ? "uparrow" : "downarrow"} size={12} color="#0F172A" />
        </div>

        {showSettings && (
          <div>
            <p className="voicemail-sidepanel-input-label">Voicemail Title</p>
            <Input
              type="text"
              placeholder="Enter title"
              value={rule.title || ""}
              onChange={(e) => updateRule({ title: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* MESSAGE SETTINGS SECTION */}
      <div className="voicemail-panel-message-settings">
        <div
          className="voicemail-sidepanel-section-header"
          onClick={() => setShowMessageSettings((s) => !s)}
        >
          <p>Message Settings</p>
          <Icon name={showMessageSettings ? "uparrow" : "downarrow"} size={12} color="#0F172A" />
        </div>

        {showMessageSettings && (
          <>
            <div style={{ marginTop: 16 }}>
              <p className="voicemail-sidepanel-input-label">Agent</p>
              <Select
                mode="single"
                placeholder="Select agent"
                showSearch
                value={rule.agent || ""}
                onChange={(value) => updateRule({ agent: value })}
                options={(agentsData || []).map((a) => ({
                  label: a.m_memberName,
                  value: a.m_memberExtensionNo,
                }))}
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <p className="voicemail-sidepanel-input-label">Message Type</p>
              <Select
                mode="single"
                value={rule.messageType || "tts"}
                onChange={(value) => {
                  if (rule.messageType === "audio" && value === "tts" && (rule.path || rule.audioFileName)) {
                    toast.error("Please delete the existing audio file before changing the message type.");
                    return;
                  }

                  const nextRule = { ...rule, messageType: value };
                  if (value === "tts") {
                    delete nextRule.audioFileName;
                    delete nextRule.audioFileBase64;
                    delete nextRule.path;
                  } else {
                    delete nextRule.instructionMsg;
                    nextRule.path = "";
                  }
                  onFullRuleChange(nextRule);
                  setSelectedFile(null);
                }}
                options={[
                  { label: "Text to Speech", value: "tts" },
                  { label: "Audio Upload", value: "audio" },
                ]}
              />
            </div>

            {(rule.messageType === "tts" || !rule.messageType) && (
              <>
                <div style={{ marginTop: 16 }}>
                  <p className="voicemail-sidepanel-input-label">Text to Speech Message</p>
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

            {rule.messageType === "audio" && (
              <div style={{ marginTop: 16 }}>
                <p className="voicemail-sidepanel-input-label" style={{ marginBottom: "8px" }}>Audio File Upload</p>
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
                            setSelectedFile(file);
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
                        {selectedFile ? selectedFile.name : "Click or drag to select audio"}
                      </p>
                      <p style={{ marginTop: "4px", fontSize: "12px", color: "#64748B", textAlign: "center" }}>
                        {selectedFile ? "Ready to save" : "Supports mp3, wav, and other audio formats"}
                      </p>
                    </div>

                    {selectedFile && (
                      <Button
                        variant="primary"
                        onClick={async () => {
                          setIsUploading(true);
                          const data = await uploadAudioFile(callflowName, selectedFile);
                          setIsUploading(false);
                          if (data?.filepath) {
                            updateRule({ path: data.filepath, audioFileName: selectedFile.name });
                            setSelectedFile(null);
                          }
                        }}
                        style={{ marginTop: 12, width: "100%", display: "flex", justifyContent: "center" }}
                        disabled={isUploading}
                      >
                        {isUploading ? <Loader width={20} height={20} /> : "Save Audio"}
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
                            {rule.audioFileName || "Uploaded Audio"}
                          </p>
                          <p style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>
                            {isDeleting ? "Deleting..." : "Audio File Saved"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="empty"
                        onClick={async () => {
                          setIsDeleting(true);
                          await deleteAudioFile(rule.path);
                          const nextRule = { ...rule };
                          delete nextRule.path;
                          delete nextRule.audioFileName;
                          delete nextRule.audioFileBase64;
                          onFullRuleChange(nextRule);
                          setIsDeleting(false);
                        }}
                        style={{ color: "#EF4444", padding: "6px" }}
                        title="Delete Audio"
                        disabled={isDeleting}
                      >
                        {isDeleting ? <Loader width={16} height={16} color="#EF4444" /> : <Icon name="deletee" size={18} color="#EF4444" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Max duration helper */}
            <p className="voicemail-sidepanel-message-last">
              This is the maximum duration of your customer message
            </p>

            <div style={{ marginTop: 8, position: "relative" }}>
              <p className="voicemail-sidepanel-input-label">Notify Emails</p>

              <div
                className="email-chip-box"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  border: "1px solid #E2E8F0",
                  borderRadius: 8,
                  padding: 6,
                  minHeight: 42,
                  alignItems: "center",
                  background: "#fff",
                  position: "relative",
                  zIndex: 1,
                }}
                onClick={() => {
                  const el = document.getElementById("notify-email-input");
                  if (el) el.focus();
                }}
              >
                {emails.map((e) => (
                  <span
                    key={e}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: "#E0F2FE",
                      color: "#075985",
                      fontSize: 12,
                    }}
                  >
                    {e}
                    <button
                      type="button"
                      onClick={() => removeEmail(e)}
                      style={{
                        marginLeft: 6,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 14,
                        lineHeight: 1,
                        color: "#0F172A",
                      }}
                      aria-label={`remove ${e}`}
                    >
                      ×
                    </button>
                  </span>
                ))}

                <input
                  id="notify-email-input"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={onKeyDownEmail}
                  onBlur={onBlurEmail}
                  placeholder="Type email…"
                  style={{
                    flex: 1,
                    minWidth: 140,
                    border: "none",
                    outline: "none",
                    fontSize: 14,
                    padding: "6px 8px",
                  }}
                />
              </div>

              {/* Suggestion list — appear ABOVE input */}
              {emailInput.includes("@") && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%", // ⬆ show above
                    left: 0,
                    width: "100%",
                    marginBottom: 6,
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    background: "#fff",
                    maxHeight: 180,
                    overflowY: "auto",
                    boxShadow: "0 -4px 10px rgba(0,0,0,0.05)",
                    zIndex: 2,
                  }}
                >
                  {/* dynamic suggestion includes typed value */}
                  {(() => {
                    const value = emailInput.trim();
                    const list = [
                      value, // user’s exact typed value
                      ...(domainCatalog
                        .map((d) => {
                          const [local, domainPart] = value.split("@");
                          if (!local || !domainPart) return null;
                          return `${local}@${d}`;
                        })
                        .filter(Boolean)
                        .filter((v) => !emails.includes(v))),
                    ];

                    return list.map((s) => (
                      <div
                        key={s}
                        onMouseDown={() => selectSuggestion(s)}
                        style={{
                          padding: "8px 10px",
                          cursor: "pointer",
                        }}
                        className="email-suggestion-item"
                      >
                        {s}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

