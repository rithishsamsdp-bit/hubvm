import React, { useState, useEffect, useRef } from "react";
import Icon from "../../../../../../constants/Icon.jsx";
import { Button } from "../../../../../../components/Index.jsx";

// ── LLM Model options ─────────────────────────────────────────────────────────
const LLM_OPTIONS = [
  {
    label: "GPT-4o Realtime",
    provider: "openai",
    model: "gpt-4o-realtime-preview-2024-12-17",
    badge: "openai",
    icon: "✦",
    gradient: "linear-gradient(135deg, #10a37f 0%, #1a7f64 100%)",
    desc: "Best quality · Low latency · Multimodal",
  },
  {
    label: "GPT-4o Mini Realtime",
    provider: "openai",
    model: "gpt-4o-mini-realtime-preview-2024-12-17",
    badge: "openai",
    icon: "⚡",
    gradient: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
    desc: "Faster & cheaper · Great for high volume",
  },
  {
    label: "Gemini 2.0 Flash",
    provider: "gemini",
    model: "gemini-2.0-flash",
    badge: "gemini",
    icon: "◈",
    gradient: "linear-gradient(135deg, #4285f4 0%, #34a853 60%, #fbbc05 100%)",
    desc: "Google's fastest realtime model · Experimental",
  },
  {
    label: "Gemini 2.5 Flash",
    provider: "gemini",
    model: "gemini-2.5-flash-preview-native-audio-dialog",
    badge: "gemini",
    icon: "◈",
    gradient: "linear-gradient(135deg, #1a73e8 0%, #34a853 100%)",
    desc: "Native audio dialog · Highest Gemini quality",
  },
  {
    label: "Claude Sonnet 4.5",
    provider: "claude",
    model: "claude-sonnet-4-5",
    badge: "claude",
    icon: "⬡",
    gradient: "linear-gradient(135deg, #c084fc 0%, #818cf8 100%)",
    desc: "Anthropic's voice model · Coming soon",
    disabled: true,
  },
];

const VOICE_OPTIONS = {
  openai: [
    {
      value: "alloy",
      label: "Alloy",
      emoji: "🌊",
      desc: "Smooth, neutral, and balanced — great for professional contexts.",
    },
    {
      value: "ash",
      label: "Ash",
      emoji: "🌲",
      desc: "Soft, gentle, and conversational.",
    },
    {
      value: "coral",
      label: "Coral",
      emoji: "🪸",
      desc: "Clear, bright, and friendly.",
    },
    {
      value: "echo",
      label: "Echo",
      emoji: "🔵",
      desc: "Clear and authoritative — ideal for information delivery.",
    },
    {
      value: "sage",
      label: "Sage",
      emoji: "🌿",
      desc: "Calm and soothing — perfect for wellness and guidance.",
    },
    {
      value: "shimmer",
      label: "Shimmer",
      emoji: "✨",
      desc: "Gentle and calming — works well for support.",
    },
  ],
  gemini: [
    {
      value: "Aoede",
      label: "Aoede",
      emoji: "🌸",
      desc: "Warm and friendly — ideal for welcoming interactions.",
    },
    {
      value: "Charon",
      label: "Charon",
      emoji: "🔷",
      desc: "Clear and neutral — great for factual, professional use.",
    },
    {
      value: "Fenrir",
      label: "Fenrir",
      emoji: "🐺",
      desc: "Deep and authoritative — excellent for executive presence.",
    },
    {
      value: "Kore",
      label: "Kore",
      emoji: "🍃",
      desc: "Soft and calm — best for support or wellness contexts.",
    },
    {
      value: "Puck",
      label: "Puck",
      emoji: "⚡",
      desc: "Energetic and bright — great for engagement and sales.",
    },
  ],
  claude: [],
};

const PROVIDER_BADGE_STYLES = {
  openai: { bg: "#f0fdf4", color: "#15803d", label: "OpenAI" },
  gemini: { bg: "#eff6ff", color: "#1d4ed8", label: "Google" },
  claude: { bg: "#fdf4ff", color: "#7e22ce", label: "Anthropic" },
};

const WorkflowSidebar = ({
  selectedElement,
  nodes,
  setNodes,
  edges,
  setEdges,
}) => {
  const [preventLoops, setPreventLoops] = useState(false);

  // Local state for the edge property settings preview
  const [edgeTransitionType, setEdgeTransitionType] = useState("None");
  const [showTransitionDropdown, setShowTransitionDropdown] = useState(false);

  // Local state for subagent sidebar Knowledge Base
  const [subagentTab, setSubagentTab] = useState("General");
  const [showSidebarKbAdd, setShowSidebarKbAdd] = useState(false);
  const [addSidebarKbType, setAddSidebarKbType] = useState("file");
  // Subagent context inputs
  const [sidebarKbTitle, setSidebarKbTitle] = useState("");
  const [sidebarKbContent, setSidebarKbContent] = useState("");

  const fileInputRef = useRef(null);

  const readFileAsText = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const dateStr = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const newItem = {
        id: Date.now(),
        type: "file",
        title: file.name,
        content: text,
        date: dateStr,
      };

      if (!selectedElement || selectedElement.type !== "node") return;

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === selectedElement.data.id) {
            const existingKb = n.data?.knowledgeBase || [];
            return {
              ...n,
              data: {
                ...n.data,
                knowledgeBase: [newItem, ...existingKb],
              },
            };
          }
          return n;
        }),
      );
      setShowSidebarKbAdd(false);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) readFileAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) readFileAsText(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Update local edge state config accurately matching current graph element
  useEffect(() => {
    if (selectedElement?.type === "edge") {
      const edge = edges.find((e) => e.id === selectedElement.data.id);
      if (edge && edge.data && edge.data.transitionType) {
        setEdgeTransitionType(edge.data.transitionType);
      } else {
        setEdgeTransitionType("LLM Condition");
      }
    }
  }, [selectedElement, edges, nodes]);

  // Close popovers if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close transition dropdown if clicking outside of it
      if (!event.target.closest(".transition_dropdown_wrapper")) {
        setShowTransitionDropdown(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleSidebarKbAdd = () => {
    if (!selectedElement || selectedElement.type !== "node") return;

    // Determine title / content
    let titleStr = sidebarKbTitle || "Untiltled Snippet";
    let contentStr = sidebarKbContent;

    // Create new RAG item
    const newItem = {
      id: Date.now(),
      type: addSidebarKbType,
      title: titleStr,
      content: contentStr,
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    };

    // Save it to the node
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedElement.data.id) {
          const existingKb = n.data?.knowledgeBase || [];
          return {
            ...n,
            data: {
              ...n.data,
              knowledgeBase: [newItem, ...existingKb],
            },
          };
        }
        return n;
      }),
    );

    setShowSidebarKbAdd(false);
    setSidebarKbTitle("");
    setSidebarKbContent("");
  };

  const handleSidebarKbDelete = (itemId) => {
    if (!selectedElement || selectedElement.type !== "node") return;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedElement.data.id) {
          const currentKb = n.data?.knowledgeBase || [];
          return {
            ...n,
            data: {
              ...n.data,
              knowledgeBase: currentKb.filter((item) => item.id !== itemId),
            },
          };
        }
        return n;
      }),
    );
  };

  // Get current node data helper
  const currentNodeData =
    nodes.find((n) => n.id === selectedElement?.data?.id)?.data || {};

  // Get current edge data helper
  const currentEdgeData =
    edges.find((e) => e.id === selectedElement?.data?.id) || {};

  return (
    <div className="workflow_sidebar">
      {!selectedElement ? (
        // Global Settings View (Nothing Selected)
        <>
          <h3>Global Settings</h3>
          <div className="global_setting_item">
            <div className="info_callout">
              <Icon name="info" size={16} color="#1e293b" />
              <p>
                To enable a workflow, connect the start node to an entry node.
              </p>
            </div>
          </div>

          <div className="workflow_toggle_group">
            <div className="toggle_info">
              <h4>Prevent infinite loops</h4>
              <p>
                Prevents the workflow from continuously transiting in a loop
                when all conditions are true.
              </p>
            </div>
            <div
              className={`toggle_switch ${preventLoops ? "on" : ""}`}
              onClick={() => setPreventLoops(!preventLoops)}
            ></div>
          </div>
        </>
      ) : selectedElement.type === "node" ? (
        // Node Specific Property View
        <div className="node_properties_panel">
          <div className="panel_header">
            <Icon
              name={
                selectedElement.data.data.nodeType === "start" ? "flag" : "user"
              }
              size={18}
              color="#1e293b"
            />
            {selectedElement.data.data.nodeType === "subagent" ||
             selectedElement.data.data.nodeType === "action" ? (
              <input
                type="text"
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "16px",
                  fontWeight: "800",
                  color: "#1e293b",
                  width: "100%",
                  outline: "none",
                }}
                value={currentNodeData.label || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedElement.data.id
                        ? { ...n, data: { ...n.data, label: val } }
                        : n,
                    ),
                  );
                }}
              />
            ) : (
              <h3>{selectedElement.data.data.label}</h3>
            )}
          </div>

          {/* Start Node Properties */}
          {selectedElement.data.data.nodeType === "start" && (
            <div className="info_callout">
              <Icon name="info" size={16} color="#1e293b" />
              <p>This node determines the entry point of the workflow.</p>
            </div>
          )}

          {/* Subagent Node Properties */}
          {selectedElement.data.data.nodeType === "subagent" && (
            <div className="subagent_properties">
              <div className="props_tabs">
                <div
                  className={`prop_tab ${subagentTab === "General" ? "active" : ""}`}
                  onClick={() => setSubagentTab("General")}
                >
                  General
                </div>
                <div
                  className={`prop_tab ${subagentTab === "Knowledge Base" ? "active" : ""}`}
                  onClick={() => setSubagentTab("Knowledge Base")}
                >
                  Knowledge Base
                </div>
              </div>

              {subagentTab === "General" && (
                <>
                  <div className="prop_section">
                    <label className="prop_label">Welcome greeting</label>
                    <textarea
                      className="prop_textarea"
                      placeholder="e.g. Hi there! Welcome to Sales. How can I help you?"
                      value={currentNodeData.firstMessage || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes((nds) =>
                          nds.map((n) => {
                            if (n.id === selectedElement.data.id) {
                              return {
                                ...n,
                                data: { ...n.data, firstMessage: val },
                              };
                            }
                            return n;
                          }),
                        );
                      }}
                    ></textarea>
                  </div>
                  <div className="prop_section">
                    <div className="flex_between" style={{ marginBottom: 10 }}>
                      <label className="prop_label" style={{ marginBottom: 0 }}>
                        Conversation goal
                      </label>
                      <div
                        className={`override_toggle ${currentNodeData.systemPrompt ? "active" : ""}`}
                      >
                        <span className="prop_label_small">
                          Override prompt
                        </span>
                        <div className="toggle_switch_small"></div>
                      </div>
                    </div>
                    <textarea
                      className="prop_textarea"
                      placeholder="Extend the system prompt with instructions specific to this conversation node."
                      value={currentNodeData.systemPrompt || ""}
                      style={{ minHeight: "330px" }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes((nds) =>
                          nds.map((n) => {
                            if (n.id === selectedElement.data.id) {
                              return {
                                ...n,
                                data: { ...n.data, systemPrompt: val },
                              };
                            }
                            return n;
                          }),
                        );
                      }}
                    ></textarea>
                  </div>


                  {/* ── Voice Selector ────────────────────────────────── */}
                  <div className="prop_section">
                    <label className="prop_label">Voice</label>
                    {(() => {
                      const providerKey =
                        currentNodeData.llmProvider || "openai";
                      const voices =
                        VOICE_OPTIONS[providerKey] || VOICE_OPTIONS.openai;
                      const currentVoice =
                        currentNodeData.voice || voices[0]?.value;
                      const badge =
                        PROVIDER_BADGE_STYLES[providerKey] ||
                        PROVIDER_BADGE_STYLES.openai;
                      const selectedVoice = voices.find(
                        (x) => x.value === currentVoice,
                      );
                      return (
                        <>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 7,
                              marginTop: 8,
                            }}
                          >
                            {voices.map((v) => {
                              const isSel = currentVoice === v.value;
                              return (
                                <div
                                  key={v.value}
                                  onClick={() => {
                                    setNodes((nds) =>
                                      nds.map((n) =>
                                        n.id === selectedElement.data.id
                                          ? {
                                              ...n,
                                              data: {
                                                ...n.data,
                                                voice: v.value,
                                              },
                                            }
                                          : n,
                                      ),
                                    );
                                  }}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "6px 11px",
                                    borderRadius: 20,
                                    border: isSel
                                      ? `1.5px solid ${badge.color}`
                                      : "1.5px solid #e2e8f0",
                                    background: isSel ? badge.bg : "white",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                    fontSize: 12,
                                    fontWeight: isSel ? 700 : 500,
                                    color: isSel ? badge.color : "#475569",
                                    boxShadow: isSel
                                      ? `0 1px 8px ${badge.color}25`
                                      : "none",
                                  }}
                                >
                                  <span style={{ fontSize: 13 }}>
                                    {v.emoji}
                                  </span>
                                  <span>{v.label}</span>
                                </div>
                              );
                            })}
                          </div>
                          {selectedVoice?.desc && (
                            <div
                              style={{
                                marginTop: 8,
                                padding: "8px 12px",
                                background: "#f8fafc",
                                borderRadius: 8,
                                fontSize: 11,
                                color: "#64748b",
                                lineHeight: 1.5,
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              🎙️ {selectedVoice.desc}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </>
              )}

              {subagentTab === "Knowledge Base" && (
                <div className="sidebar_kb_container">
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginBottom: "16px",
                      lineHeight: "1.5",
                    }}
                  >
                    Knowledge bases attached here will only be accessible while
                    the conversation is active on this subagent.
                  </p>
                  <Button
                    type="outline"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      marginBottom: "8px",
                    }}
                    onClick={() => setShowSidebarKbAdd(true)}
                  >
                    <Icon name="plus" size={14} color="currentColor" />
                    Add Resource
                  </Button>

                  {showSidebarKbAdd && (
                    <div
                      style={{
                        padding: "16px",
                        background: "#f8fafc",
                        borderRadius: "12px",
                        marginBottom: "16px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginBottom: "12px",
                        }}
                      >
                        <Button
                          type={
                            addSidebarKbType === "file" ? "primary" : "empty"
                          }
                          style={{ flex: 1, padding: "6px" }}
                          onClick={() => setAddSidebarKbType("file")}
                        >
                          <Icon name="docs" size={14} color="currentColor" />{" "}
                          File
                        </Button>
                        <Button
                          type={
                            addSidebarKbType === "text" ? "primary" : "empty"
                          }
                          style={{ flex: 1, padding: "6px" }}
                          onClick={() => setAddSidebarKbType("text")}
                        >
                          <Icon name="edit" size={14} color="currentColor" />{" "}
                          Text
                        </Button>
                      </div>

                      {addSidebarKbType === "file" && (
                        <div
                          className="file_dropzone"
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          style={{
                            padding: "20px 10px",
                            textAlign: "center",
                            border: "1px dashed #cbd5e1",
                            borderRadius: "8px",
                            background: "white",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={handleFileChange}
                            accept=".txt,.csv,.json,.md"
                          />
                          <Icon name="upload" size={24} color="#64748b" />
                          <p
                            style={{
                              margin: 0,
                              fontSize: "12px",
                              color: "#64748b",
                            }}
                          >
                            Click to upload or drag and drop
                          </p>
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                            TXT, CSV, JSON, MD
                          </span>
                        </div>
                      )}



                      {addSidebarKbType === "text" && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <input
                            type="text"
                            className="premium_input prop_input"
                            placeholder="Title (e.g. Return Policy)"
                            style={{
                              padding: "8px 12px",
                              fontSize: "13px",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                            value={sidebarKbTitle}
                            onChange={(e) => setSidebarKbTitle(e.target.value)}
                          />
                          <textarea
                            className="premium_textarea prop_textarea"
                            placeholder="Paste text here..."
                            style={{
                              padding: "8px 12px",
                              fontSize: "13px",
                              minHeight: "80px",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                            value={sidebarKbContent}
                            onChange={(e) =>
                              setSidebarKbContent(e.target.value)
                            }
                          />
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: "8px",
                          marginTop: "12px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                          onClick={() => setShowSidebarKbAdd(false)}
                        >
                          Cancel
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#ff5200",
                            fontWeight: "600",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                          onClick={handleSidebarKbAdd}
                        >
                          Add
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="sidebar_kb_list">
                    {currentNodeData.knowledgeBase &&
                    currentNodeData.knowledgeBase.length > 0 ? (
                      currentNodeData.knowledgeBase.map((kbItem) => (
                        <div key={kbItem.id} className="sidebar_kb_item">
                          <div
                            className={`kb_item_icon ${kbItem.type}`}
                            style={{
                              background:
                                kbItem.type === "url"
                                  ? "#fdf4ff"
                                  : kbItem.type === "text"
                                    ? "#fffbeb"
                                    : "#eff6ff",
                              color:
                                kbItem.type === "url"
                                  ? "#d946ef"
                                  : kbItem.type === "text"
                                    ? "#d97706"
                                    : "#3b82f6",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Icon
                              name={
                                kbItem.type === "url"
                                  ? "link"
                                  : kbItem.type === "text"
                                    ? "edit"
                                    : "docs"
                              }
                              size={16}
                              color="currentColor"
                            />
                          </div>
                          <div className="kb_item_details">
                            <div className="kb_item_title">{kbItem.title}</div>
                            <p
                              className="kb_item_meta"
                              style={{ color: "#166534" }}
                            >
                              Added {kbItem.date}
                            </p>
                          </div>
                          <div className="sidebar_kb_actions">
                            <div
                              className="action_btn_icon delete"
                              style={{ padding: "4px" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSidebarKbDelete(kbItem.id);
                              }}
                            >
                              <Icon
                                name="deletee"
                                size={12}
                                color="currentColor"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "20px",
                          color: "#94a3b8",
                          fontSize: "12px",
                        }}
                      >
                        No specific knowledge added yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action (Tool) Node Properties */}
          {selectedElement.data.data.nodeType === "action" && (
            <div className="action_properties">
              <div className="prop_section">
                <label className="prop_label">Tool Description (Instructions for AI)</label>
                <textarea
                  className="premium_textarea prop_textarea"
                  placeholder="e.g. Call this tool to fetch the status of a user's order."
                  value={currentNodeData.description || ""}
                  style={{ minHeight: "80px" }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === selectedElement.data.id
                          ? { ...n, data: { ...n.data, description: val } }
                          : n,
                      ),
                    );
                  }}
                ></textarea>
              </div>

              <div className="prop_section">
                <label className="prop_label">HTTP Method</label>
                <select
                  className="premium_input prop_input"
                  style={{ width: "100%" }}
                  value={currentNodeData.apiMethod || "GET"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === selectedElement.data.id
                          ? { ...n, data: { ...n.data, apiMethod: val } }
                          : n,
                      ),
                    );
                  }}
                >
                  <option value="GET">GET Request</option>
                  <option value="POST">POST Request (Submit/Collect Data)</option>
                </select>
              </div>

              <div className="prop_section">
                <label className="prop_label">API Webhook URL</label>
                <input
                  type="text"
                  className="premium_input prop_input"
                  placeholder="https://api.yourcompany.com/v1/webhook"
                  value={currentNodeData.apiUrl || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === selectedElement.data.id
                          ? { ...n, data: { ...n.data, apiUrl: val } }
                          : n,
                      ),
                    );
                  }}
                />
              </div>

              <div className="prop_section">
                <label className="prop_label" style={{ marginBottom: "4px" }}>
                  API Headers (Optional)
                </label>
                <p style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px", lineHeight: 1.4 }}>
                  Add custom headers like Authorization tokens or API keys in JSON format.
                </p>
                <textarea
                  className="premium_textarea prop_textarea"
                  style={{ fontFamily: "monospace", fontSize: "12px", minHeight: "80px", background: "#1e293b", color: "#f8fafc" }}
                  placeholder={'{\n  "Authorization": "Bearer YOUR_API_KEY",\n  "X-Custom-Header": "value"\n}'}
                  value={currentNodeData.apiHeaders || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === selectedElement.data.id
                          ? { ...n, data: { ...n.data, apiHeaders: val } }
                          : n,
                      ),
                    );
                  }}
                ></textarea>
              </div>

              {/* Only show JSON Schema for POST — GET doesn't need parameters */}
              {(currentNodeData.apiMethod || "GET") === "POST" && (
                <div className="prop_section">
                  <label className="prop_label" style={{ marginBottom: "4px" }}>
                    Parameters (JSON Schema)
                  </label>
                  <p style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px", lineHeight: 1.4 }}>
                    Define strictly what the AI needs to collect from the caller. The AI will interrogate the user for these fields before triggering the webhook.
                  </p>
                  <textarea
                    className="premium_textarea prop_textarea"
                    style={{ fontFamily: "monospace", fontSize: "12px", minHeight: "150px", background: "#1e293b", color: "#f8fafc" }}
                    placeholder={'{\n  "type": "object",\n  "properties": {\n    "name": {"type": "string"},\n    "email": {"type": "string"}\n  },\n  "required": ["name", "email"]\n}'}
                    value={currentNodeData.apiParameters || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNodes((nds) =>
                        nds.map((n) =>
                          n.id === selectedElement.data.id
                            ? { ...n, data: { ...n.data, apiParameters: val } }
                            : n,
                        ),
                      );
                    }}
                  ></textarea>
                </div>
              )}
            </div>
          )}

          {/* End Node Properties */}
          {selectedElement.data.data.nodeType === "end" && (
            <div className="info_callout">
              <Icon name="info" size={16} color="#1e293b" />
              <p>The conversation will end when this node is reached.</p>
            </div>
          )}
        </div>
      ) : (
        // Edge Specific Property View
        <div className="edge_properties_panel">
          <div className="panel_header">
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#1e293b", fontWeight: 800 }}>
                {nodes.find((n) => n.id === selectedElement.data.source)?.data
                  .label || "Start"}
              </span>
              <Icon name="clock" size={14} color="#94a3b8" />
              <span style={{ color: "#1e293b", fontWeight: 800 }}>
                {nodes.find((n) => n.id === selectedElement.data.target)?.data
                  .label || "Next"}
              </span>
            </h3>
          </div>

          {/* Removed Forward/Backward tabs for simplicity */}

          {/* Transition Type Dropdown */}
          <div className="prop_section">
            <label className="prop_label">Transition Type</label>
            <select
              className="premium_input prop_input"
              style={{ width: "100%" }}
              value={currentEdgeData.data?.transitionType || "LLM Condition"}
              onChange={(e) => {
                const val = e.target.value;
                setEdges((eds) =>
                  eds.map((edge) => {
                    if (edge.id === selectedElement.data.id) {
                      return {
                        ...edge,
                        label: val === "None" ? "" : (edge.label || "Configure condition"),
                        data: { ...edge.data, transitionType: val },
                      };
                    }
                    return edge;
                  }),
                );
              }}
            >
              <option value="LLM Condition">LLM Condition</option>
              <option value="None">None (Direct / Tool Link)</option>
            </select>
          </div>

          {/* Only show Canvas Label + LLM condition when transition type is LLM Condition */}
          {(currentEdgeData.data?.transitionType || "LLM Condition") === "LLM Condition" && (
            <>
              <div className="prop_section">
                <label className="prop_label">Canvas Label</label>
                <input
                  type="text"
                  className="premium_input prop_input"
                  value={currentEdgeData.label || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEdges((eds) =>
                      eds.map((edge) => {
                        if (edge.id === selectedElement.data.id) {
                          return { ...edge, label: val };
                        }
                        return edge;
                      }),
                    );
                  }}
                />
              </div>

              <div className="prop_section">
                <label className="prop_label">LLM condition description</label>
                <textarea
                  className="premium_textarea prop_textarea"
                  placeholder="e.g. The user explicitly asks to be transferred to sales"
                  value={currentEdgeData.data?.llmCondition || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEdges((eds) =>
                      eds.map((edge) => {
                        if (edge.id === selectedElement.data.id) {
                          return {
                            ...edge,
                            data: { ...edge.data, llmCondition: val },
                          };
                        }
                        return edge;
                      }),
                    );
                  }}
                ></textarea>
              </div>
            </>
          )}

          {(currentEdgeData.data?.transitionType) === "None" && (
            <div className="info_callout">
              <Icon name="info" size={16} color="#1e293b" />
              <p>This is a direct tool link. The AI can use the connected action without any transition condition.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowSidebar;
