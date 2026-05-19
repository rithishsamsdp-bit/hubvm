import { useState, useEffect } from "react";
import Icon from "../../constants/Icon.jsx";
import { Input, Select, Loader, Button } from "../../components/Index.jsx";
import "./styles/RingToPanel.css";
import { usePhoneNumberStore } from "../../store/admin/usePhoneNumberStore.js";
import { useCallFlow } from "../../store/useCallFlow.js";
import { toast } from "../../store/useToastStore.js";

export default function RingToPanel({
  rule,
  onRuleChange,
  onFullRuleChange,
  callflowName,
}) {
  const [showSettings, setShowSettings] = useState(true);
  const [showApiSettings, setShowApiSettings] = useState(true);
  const {
    getAgents,
    agentsData,
    agentsLoading,
    getQueue,
    queueLoading,
    queueData,
    getNumber,
    NumberData,
    NumberLoading,
  } = usePhoneNumberStore();

  const ringForValue = rule.ringFor || "ringto";

  const { getVoice, uploadAudioFile, deleteAudioFile } = useCallFlow();
  const [busyFile, setBusyFile] = useState(null);
  const [isBusyUploading, setIsBusyUploading] = useState(false);
  const [isBusyDeleting, setIsBusyDeleting] = useState(false);

  const [unavailFile, setUnavailFile] = useState(null);
  const [isUnavailUploading, setIsUnavailUploading] = useState(false);
  const [isUnavailDeleting, setIsUnavailDeleting] = useState(false);

  const updateRule = (updates) => onRuleChange({ ...rule, ...updates });

  const renderAnnouncementSection = (
    title,
    keyPrefix,
    fileState,
    setFileState,
    uploadState,
    setUploadState,
    deleteState,
    setDeleteState,
  ) => {
    const ann = rule[keyPrefix] || {};
    return (
      <div style={{ marginTop: 16 }}>
        <p className="ringto-sidepanel-input-label">{title}</p>
        <Select
          mode="single"
          value={ann.option || "False"}
          onChange={(value) => {
            updateRule({
              [keyPrefix]: {
                ...ann,
                option: value,
                messageType: ann.messageType || "tts",
              },
            });
          }}
          options={[
            { label: "Enable", value: "True" },
            { label: "Disable", value: "False" },
          ]}
        />
        {ann.option === "True" && (
          <div
            style={{
              marginTop: 16,
              padding: "16px",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              backgroundColor: "#F8FAFC",
            }}
          >
            <p className="ringto-sidepanel-input-label">Message Type</p>
            <Select
              mode="single"
              value={ann.messageType || "tts"}
              onChange={(value) => {
                if (
                  ann.messageType === "audio" &&
                  value === "tts" &&
                  (ann.path || ann.audioFileName)
                ) {
                  toast.error(
                    "Please delete the existing audio file before changing the message type.",
                  );
                  return;
                }
                const nextRule = { ...rule };
                nextRule[keyPrefix] = { ...ann, messageType: value };
                if (value === "tts") {
                  delete nextRule[keyPrefix].audioFileName;
                } else {
                  delete nextRule[keyPrefix].instructionMsg;
                  nextRule[keyPrefix].path = "";
                }
                if (onFullRuleChange) {
                  onFullRuleChange(nextRule);
                } else {
                  onRuleChange(nextRule);
                }
                setFileState(null);
              }}
              options={[
                { label: "Text to Speech", value: "tts" },
                { label: "Audio Upload", value: "audio" },
              ]}
            />

            {(ann.messageType === "tts" || !ann.messageType) && (
              <div style={{ marginTop: 12 }}>
                <p className="ringto-sidepanel-input-label">
                  Text to Speech Message
                </p>
                <Input
                  type="textarea"
                  placeholder="Enter message"
                  value={ann.instructionMsg || ""}
                  onChange={(e) =>
                    updateRule({
                      [keyPrefix]: { ...ann, instructionMsg: e.target.value },
                    })
                  }
                />
              </div>
            )}

            {ann.messageType === "audio" && (
              <div style={{ marginTop: 12 }}>
                <p
                  className="ringto-sidepanel-input-label"
                  style={{ marginBottom: "8px" }}
                >
                  Audio File Upload
                </p>
                {!ann.path ? (
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
                        backgroundColor: "#FFFFFF",
                        cursor: "pointer",
                        position: "relative",
                      }}
                    >
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) setFileState(file);
                        }}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          opacity: 0,
                          cursor: "pointer",
                        }}
                      />
                      <Icon name="upload" size={32} color="#64748B" />
                      <p
                        style={{
                          marginTop: "12px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#1E293B",
                          textAlign: "center",
                          wordBreak: "break-all",
                        }}
                      >
                        {fileState
                          ? fileState.name
                          : "Click or drag to select audio"}
                      </p>
                      <p
                        style={{
                          marginTop: "4px",
                          fontSize: "12px",
                          color: "#64748B",
                          textAlign: "center",
                        }}
                      >
                        {fileState
                          ? "Ready to save"
                          : "Supports mp3, wav, and other audio formats"}
                      </p>
                    </div>
                    {fileState && (
                      <Button
                        variant="primary"
                        onClick={async () => {
                          setUploadState(true);
                          const data = await uploadAudioFile(
                            callflowName,
                            fileState,
                          );
                          setUploadState(false);
                          if (data?.filepath) {
                            updateRule({
                              [keyPrefix]: {
                                ...ann,
                                path: data.filepath,
                                audioFileName: fileState.name,
                              },
                            });
                            setFileState(null);
                          }
                        }}
                        style={{
                          marginTop: 12,
                          width: "100%",
                          display: "flex",
                          justifyContent: "center",
                        }}
                        disabled={uploadState}
                      >
                        {uploadState ? (
                          <Loader width={20} height={20} />
                        ) : (
                          "Save Audio"
                        )}
                      </Button>
                    )}
                  </>
                ) : (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "16px",
                      border: "1px solid #E2E8F0",
                      borderRadius: "12px",
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          overflow: "hidden",
                          paddingRight: "8px",
                        }}
                      >
                        <Icon name="play" size={18} color="#3B82F6" />
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#0F172A",
                            margin: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {ann.audioFileName || "Uploaded Audio"}
                        </p>
                      </div>
                      <Button
                        variant="empty"
                        onClick={async () => {
                          setDeleteState(true);
                          await deleteAudioFile(ann.path);
                          const nextRule = { ...rule };
                          delete nextRule[keyPrefix].path;
                          delete nextRule[keyPrefix].audioFileName;
                          if (onFullRuleChange) {
                            onFullRuleChange(nextRule);
                          } else {
                            onRuleChange(nextRule);
                          }
                          setDeleteState(false);
                        }}
                        style={{ color: "#EF4444", padding: "6px" }}
                        title="Delete Audio"
                        disabled={deleteState}
                      >
                        {deleteState ? (
                          <Loader width={16} height={16} color="#EF4444" />
                        ) : (
                          <Icon name="deletee" size={18} color="#EF4444" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    getAgents();
    getQueue();
    getNumber();
  }, []);

  useEffect(() => {
    if (rule.phoneNumber && NumberData?.length > 0) {
      const selectedNum = NumberData.find(
        (n) => n.c_clinumberName === rule.phoneNumber,
      );
      if (selectedNum) {
        if (
          rule.countryCode !== selectedNum.c_clinumberCountryCode ||
          rule.peerName !== selectedNum.p_peerName ||
          String(rule.prefix) !== String(selectedNum.a_accountPrefix)
        ) {
          updateRule({
            countryCode: selectedNum.c_clinumberCountryCode,
            peerName: selectedNum.p_peerName,
            prefix: String(selectedNum.a_accountPrefix),
          });
        }
      }
    }
  }, [rule.phoneNumber, NumberData]);

  if (agentsLoading && queueLoading && NumberLoading) {
    return <Loader />;
  }

  /* Build URL using base + params */
  const buildGetUrl = (base, params) => {
    if (!base) return ""; // keep empty if user cleared it manually

    const queryString = (params || [])
      .filter((p) => p.key && p.value)
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join("&");

    // If no params → return base untouched
    return queryString ? `${base}?${queryString}` : base;
  };

  return (
    <div className="ringto-sidebar">
      <div className="ringto-panel-settings">
        <div
          className="ringto-sidepanel-section-header"
          onClick={() => setShowSettings((s) => !s)}
        >
          <p>Settings</p>
          <Icon
            name={showSettings ? "uparrow" : "downarrow"}
            size={12}
            color="#0F172A"
          />
        </div>

        {showSettings && (
          <>
            {/* Main Ring For Selector */}
            <div>
              <p className="ringto-sidepanel-input-label">Ring for</p>
              <Select
                mode="single"
                placeholder="Select"
                showSearch={false}
                value={ringForValue}
                onChange={(value) => updateRule({ ringFor: value })}
                options={[
                  { label: "Agent", value: "agent" },
                  { label: "Sticky Agent", value: "sticky_agent" },
                  { label: "Queue", value: "queue" },
                  { label: "Number", value: "number" },
                  { label: "Api", value: "Api" },
                  { label: "URI", value: "uri" },
                ]}
              />
            </div>

            {/* QUEUE */}
            {ringForValue === "queue" && (
              <div>
                <p className="ringto-sidepanel-input-label">Queue</p>
                <Select
                  mode="single"
                  placeholder="Select queue"
                  showSearch={false}
                  value={rule.queue || ""}
                  onChange={(value) => updateRule({ queue: value })}
                  options={queueData.map((a) => ({
                    value: a.q_queuegroupId,
                    label: a.q_queuegroupName,
                  }))}
                />

                <div
                  style={{
                    margin: "24px 0 16px 0",
                    height: "1px",
                    backgroundColor: "#E2E8F0",
                  }}
                />

                {renderAnnouncementSection(
                  "Busy Announcement",
                  "busyAnnouncement",
                  busyFile,
                  setBusyFile,
                  isBusyUploading,
                  setIsBusyUploading,
                  isBusyDeleting,
                  setIsBusyDeleting,
                )}
                {renderAnnouncementSection(
                  "Unavailable Announcement",
                  "unavailableAnnouncement",
                  unavailFile,
                  setUnavailFile,
                  isUnavailUploading,
                  setIsUnavailUploading,
                  isUnavailDeleting,
                  setIsUnavailDeleting,
                )}
              </div>
            )}

            {/* AGENT */}
            {ringForValue === "agent" && (
              <div>
                <p className="ringto-sidepanel-input-label">Agent</p>
                <Select
                  mode="single"
                  placeholder="Select agent"
                  showSearch
                  value={rule.agent || ""}
                  onChange={(value) => updateRule({ agent: value })}
                  options={agentsData.map((a) => ({
                    label: a.m_memberName,
                    value: a.m_memberExtensionNo,
                  }))}
                />
              </div>
            )}

            {ringForValue === "sticky_agent" && (
              <div>
                <p className="ringto-sidepanel-input-label">
                  Sticky Agent Logic
                </p>
                <Select
                  mode="single"
                  placeholder="Select logic type"
                  showSearch={false}
                  value={rule.stickyAgentLogic || ""}
                  onChange={(value) =>
                    updateRule({
                      stickyAgentLogic: value,
                      stickyAgentEvent:
                        value === "yours_api" ? "INBOUND_CALL_RECEIVED" : "",
                      stickyApiName: "",
                      stickyApiUrl: "",
                      stickyApiMethod: "",
                      stickyApiHeaders: "",
                      stickyApiJson: "",
                    })
                  }
                  options={[
                    { label: "Pulse Logic", value: "pulse" },
                    { label: "Yours API Logic", value: "yours_api" },
                  ]}
                />

                {rule.stickyAgentLogic === "yours_api" && (
                  <div className="api-section">
                    {/* API Name */}
                    <p className="ringto-sidepanel-input-label">API Name</p>
                    <Input
                      type="text"
                      placeholder="Enter API name"
                      value={rule.stickyApiName || ""}
                      onChange={(e) =>
                        updateRule({ stickyApiName: e.target.value })
                      }
                    />

                    {/* API URL */}
                    <p className="ringto-sidepanel-input-label">API URL</p>
                    <Input
                      type="text"
                      placeholder="Enter API endpoint"
                      value={rule.stickyApiUrl || ""}
                      onChange={(e) =>
                        updateRule({ stickyApiUrl: e.target.value })
                      }
                    />

                    {/* Method */}
                    <p className="ringto-sidepanel-input-label">Method</p>
                    <Select
                      mode="single"
                      placeholder="Select method"
                      showSearch={false}
                      value={rule.stickyApiMethod || ""}
                      onChange={(value) =>
                        updateRule({ stickyApiMethod: value })
                      }
                      options={[
                        { label: "GET", value: "GET" },
                        { label: "POST", value: "POST" },
                      ]}
                    />

                    {/* POST → Header JSON + JSON Body */}
                    {rule.stickyApiMethod === "POST" && (
                      <div className="post-body-section">
                        <p className="ringto-sidepanel-input-label">
                          Header JSON
                        </p>
                        <textarea
                          className="ringto-json-textarea"
                          placeholder='{"Content-Type": "application/json"}'
                          value={rule.stickyApiHeaders || ""}
                          onChange={(e) =>
                            updateRule({ stickyApiHeaders: e.target.value })
                          }
                          rows={4}
                        />

                        <p className="ringto-sidepanel-input-label">
                          JSON Body
                        </p>
                        <textarea
                          className="ringto-json-textarea"
                          placeholder='{"key": "value"}'
                          value={rule.stickyApiJson || ""}
                          onChange={(e) =>
                            updateRule({ stickyApiJson: e.target.value })
                          }
                          rows={6}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* NUMBER */}
            {ringForValue === "number" && (
              <div>
                <p className="ringto-sidepanel-input-label">Phone Number</p>
                <Select
                  mode="single"
                  placeholder="Select phone number"
                  showSearch
                  value={rule.phoneNumber || ""}
                  onChange={(value) => {
                    const selectedNum = NumberData.find(
                      (n) => n.c_clinumberName === value,
                    );
                    updateRule({
                      phoneNumber: value,
                      countryCode: selectedNum?.c_clinumberCountryCode,
                      peerName: selectedNum?.p_peerName,
                      prefix: String(selectedNum?.a_accountPrefix),
                    });
                  }}
                  options={NumberData.map((a) => ({
                    label: a.c_clinumberName,
                    value: a.c_clinumberName,
                  }))}
                />
                <p className="ringto-sidepanel-input-label">Ring to</p>
                <Input
                  type="text"
                  placeholder="Enter ring destination"
                  value={rule.ringTo || ""}
                  onChange={(e) => updateRule({ ringTo: e.target.value })}
                />
              </div>
            )}

            {/* URI */}
            {ringForValue === "uri" && (
              <div>
                <p className="ringto-sidepanel-input-label">SIP URI</p>
                <Input
                  type="text"
                  placeholder="Enter SIP URI"
                  value={rule.sipUri || ""}
                  onChange={(e) => updateRule({ sipUri: e.target.value })}
                />
              </div>
            )}

            {/* ================================ */}
            {/*            API SECTION           */}
            {/* ================================ */}
            {ringForValue === "Api" && (
              <div className="api-section">
                {/* BASE URL */}
                <p className="ringto-sidepanel-input-label">API URL</p>
                <Input
                  type="text"
                  placeholder="Enter API endpoint"
                  value={rule.apiUrl || ""}
                  onChange={(e) => {
                    const base = e.target.value;

                    updateRule({
                      apiBaseUrl: base, // Store base separately
                    });

                    // Rebuild only preview, never erase base
                    const finalUrl = buildGetUrl(base, rule.apiParams || []);

                    updateRule({ apiUrl: finalUrl });
                  }}
                />

                {/* METHOD SELECT */}
                <p className="ringto-sidepanel-input-label">Method</p>
                <Select
                  mode="single"
                  placeholder="Select"
                  showSearch={false}
                  value={rule.apiMethod}
                  onChange={(value) => updateRule({ apiMethod: value })}
                  options={[
                    // { label: "GET", value: "GET" },
                    { label: "POST", value: "POST" },
                  ]}
                />

                {/* GET (Key/Value Params) */}
                {rule.apiMethod === "GET" && (
                  <div className="get-keyvalue-container">
                    <p className="ringto-sidepanel-input-label">Query Params</p>

                    {(rule.apiParams || []).map((p, index) => (
                      <div key={index} className="ringto-key-val-row">
                        <Input
                          placeholder="Key"
                          value={p.key}
                          onChange={(e) => {
                            const updated = [...rule.apiParams];
                            updated[index].key = e.target.value;

                            const base = rule.apiBaseUrl || rule.apiUrl || "";

                            const finalUrl = buildGetUrl(base, updated);

                            updateRule({
                              apiParams: updated,
                              apiUrl: finalUrl,
                            });
                          }}
                        />

                        <Input
                          placeholder="Value"
                          value={p.value}
                          onChange={(e) => {
                            const updated = [...rule.apiParams];
                            updated[index].value = e.target.value;

                            const base = rule.apiBaseUrl || rule.apiUrl || "";

                            const finalUrl = buildGetUrl(base, updated);

                            updateRule({
                              apiParams: updated,
                              apiUrl: finalUrl,
                            });
                          }}
                        />

                        <Button
                          type="button"
                          variant="empty"
                          className="remove-key-btn"
                          onClick={() => {
                            const updated = (rule.apiParams || []).filter(
                              (_, i) => i !== index,
                            );

                            const finalUrl = buildGetUrl(
                              rule.apiBaseUrl,
                              updated,
                            );

                            updateRule({
                              apiParams: updated,
                              apiUrl: finalUrl,
                            });
                          }}
                        >
                          <Icon name="deletee" size={12} color="#5F6368" />
                        </Button>
                      </div>
                    ))}

                    {/* ADD PARAM */}
                    <Button
                      type="button"
                      className="add-more-btn"
                      onClick={() => {
                        const params = rule.apiParams
                          ? [...rule.apiParams]
                          : [];
                        params.push({ key: "", value: "" });

                        // Always use apiBaseUrl as real base
                        const base = rule.apiBaseUrl || rule.apiUrl || "";
                        console.log();
                        const finalUrl = buildGetUrl(base, params);

                        updateRule({
                          apiParams: params,
                          apiUrl: finalUrl,
                        });
                      }}
                    >
                      + Add More
                    </Button>
                  </div>
                )}

                {/* POST (JSON Body Textarea) */}
                {rule.apiMethod === "POST" && (
                  <div className="post-body-section">
                    <p className="ringto-sidepanel-input-label">JSON Body</p>

                    <textarea
                      className="ringto-json-textarea"
                      placeholder='{"key": "value"}'
                      value={rule.apiJson || ""}
                      onChange={(e) =>
                        updateRule({
                          apiJson: e.target.value,
                        })
                      }
                      rows={6}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {/* MESSAGE SETTINGS */}
      {/* MESSAGE SETTINGS */}
      <div className="keypad-panel-message-settings">
        <div
          className="keypad-sidepanel-section-header"
          onClick={() => setShowApiSettings(!showApiSettings)}
        >
          <p>Call Initiation API</p>
          <Icon
            name={showApiSettings ? "uparrow" : "downarrow"}
            size={12}
            color="#0F172A"
          />
        </div>

        {showApiSettings && (
          <div className="api-section">
            {/* BASE URL */}
            <p className="ringto-sidepanel-input-label">API URL</p>
            <Input
              type="text"
              placeholder="Enter API endpoint"
              value={rule.callApiUrl || ""}
              onChange={(e) => {
                const base = e.target.value;

                updateRule({ callApiBaseUrl: base });

                const finalUrl = buildGetUrl(base, rule.callApiParams || []);

                updateRule({ callApiUrl: finalUrl });
              }}
            />

            {/* METHOD */}
            <p className="ringto-sidepanel-input-label">Method</p>
            <Select
              mode="single"
              placeholder="Select"
              showSearch={false}
              value={rule.callApiMethod}
              onChange={(value) => updateRule({ callApiMethod: value })}
              options={[{ label: "POST", value: "POST" }]}
            />

            {/* GET PARAMS */}
            {rule.callApiMethod === "GET" && (
              <div className="get-keyvalue-container">
                <p className="ringto-sidepanel-input-label">Query Params</p>

                {(rule.callApiParams || []).map((p, index) => (
                  <div key={index} className="ringto-key-val-row">
                    <Input
                      placeholder="Key"
                      value={p.key}
                      onChange={(e) => {
                        const updated = [...rule.callApiParams];
                        updated[index].key = e.target.value;

                        const base = rule.callApiBaseUrl || "";
                        const finalUrl = buildGetUrl(base, updated);

                        updateRule({
                          callApiParams: updated,
                          callApiUrl: finalUrl,
                        });
                      }}
                    />

                    <Input
                      placeholder="Value"
                      value={p.value}
                      onChange={(e) => {
                        const updated = [...rule.callApiParams];
                        updated[index].value = e.target.value;

                        const base = rule.callApiBaseUrl || "";
                        const finalUrl = buildGetUrl(base, updated);

                        updateRule({
                          callApiParams: updated,
                          callApiUrl: finalUrl,
                        });
                      }}
                    />

                    <Button
                      type="button"
                      variant="empty"
                      className="remove-key-btn"
                      onClick={() => {
                        const updated = (rule.callApiParams || []).filter(
                          (_, i) => i !== index,
                        );

                        const finalUrl = buildGetUrl(
                          rule.callApiBaseUrl,
                          updated,
                        );

                        updateRule({
                          callApiParams: updated,
                          callApiUrl: finalUrl,
                        });
                      }}
                    >
                      <Icon name="deletee" size={12} color="#5F6368" />
                    </Button>
                  </div>
                ))}

                {/* ADD PARAM */}
                <Button
                  type="button"
                  className="add-more-btn"
                  onClick={() => {
                    const params = rule.callApiParams
                      ? [...rule.callApiParams]
                      : [];

                    params.push({ key: "", value: "" });

                    const finalUrl = buildGetUrl(
                      rule.callApiBaseUrl || "",
                      params,
                    );

                    updateRule({
                      callApiParams: params,
                      callApiUrl: finalUrl,
                    });
                  }}
                >
                  + Add More
                </Button>
              </div>
            )}

            {/* POST BODY */}
            {rule.callApiMethod === "POST" && (
              <div className="post-body-section">
                <p className="ringto-sidepanel-input-label">JSON Body</p>
                <textarea
                  className="ringto-json-textarea"
                  placeholder='{"key": "value"}'
                  value={rule.callApiJson || ""}
                  onChange={(e) => updateRule({ callApiJson: e.target.value })}
                  rows={6}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
