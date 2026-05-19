import { useState, useEffect } from "react";
import "./styles/VoicemailPanel.css";
import Icon from "../../constants/Icon.jsx";
import { Input, Button, Loader, Switch, Select } from "../../components/Index.jsx";
import { useCallFlow } from "../../store/useCallFlow.js";
import { toast } from "../../store/useToastStore.js";

export default function AudioMessagePanel({ rule, onRuleChange, onFullRuleChange, callflowName }) {
  const { getVoice, uploadAudioFile, deleteAudioFile } = useCallFlow();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateRule = (updates) => onRuleChange({ ...rule, ...updates });

  const [showSettings, setShowSettings] = useState(true);
  const [showMessageSettings, setShowMessageSettings] = useState(true);

  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
  const [ttsAudioKey, setTtsAudioKey] = useState(0);
  const [ttsLoading, setTtsLoading] = useState(false);

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
            <p className="voicemail-sidepanel-input-label">Audio Message Title</p>
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


            <Switch
              className="ivr-switch-container"
              label="IVR with direct extension dialing"
              checked={rule.ivrDirectDialing || false}
              onChange={(val) => updateRule({ ivrDirectDialing: val })}
            />

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
            {/* ───────────────────────────── */}
          </>
        )}
      </div>
    </div>
  );
}