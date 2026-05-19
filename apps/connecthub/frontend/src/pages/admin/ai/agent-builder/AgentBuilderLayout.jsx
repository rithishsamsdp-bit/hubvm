import React, { useState, useEffect, useRef } from "react";
import "./AgentBuilder.css";
import Icon from "../../../../constants/Icon.jsx";
import { Button } from "../../../../components/Index.jsx";
import { useNavigate, useSearchParams } from "react-router-dom";
import AgentConfigTab, {
  LLM_OPTIONS,
  VOICE_OPTIONS,
} from "./AgentConfigTab.jsx";
import AIWorkflowEdit from "./ai-workflow-edit/index.jsx";
import { initialNodes } from "./ai-workflow-edit/nodes/index.js";
import { initialEdges } from "./ai-workflow-edit/edges/index.js";
import useRealtimeAudio from "../../../../hooks/useRealtimeAudio.js";
import VoiceTestModal from "./VoiceTestModal.jsx";
import { useAIBotStore } from "../../../../store/admin/useAIBotStore.js";

const builderTabs = ["Agent", "Workflow", "Knowledge Base"];

// Empty initial knowledge base
const initialKbDocs = [];

const AgentBuilderLayout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editBotId = searchParams.get("botId");
  const [activeTab, setActiveTab] = useState("Agent");

  const { createBot, updateBot, getBotById, createBotLoading } =
    useAIBotStore();

  // Workflow Config State
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  // Agent Config State
  const [agentName, setAgentName] = useState("New Agent");

  const [llmProvider, setLlmProvider] = useState("openai");
  const [llmModel, setLlmModel] = useState(
    "gpt-4o-realtime-preview-2024-12-17",
  );
  const [voice, setVoice] = useState("alloy");

  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [firstMessage, setFirstMessage] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    `# Role
You are a helpful assistant.

# Guidelines
1. USE KNOWLEDGE BASE: Always prioritize information from the provided Knowledge Base context.
2. STRICT ADHERENCE: If a user asks something NOT covered in the knowledge base or your specific instructions, politely state that you don't have that information. Do not make up facts.
3. TONE: Be helpful, concise, and professional.
4. LANGUAGE: Always respond in English unless the user speaks another language.
5. NOISE & SILENCE: If the input is just noise or silence, do not respond. Do not assume the user said bye unless clearly stated.
`,
  );

  const [savedBotId, setSavedBotId] = useState(editBotId || null);

  // Load existing bot if editing
  useEffect(() => {
    if (!editBotId) return;
    getBotById(editBotId).then((bot) => {
      if (!bot) return;
      setAgentName(bot.name || "New Agent");
      setFirstMessage(bot.first_message || "");
      setSystemPrompt(bot.system_prompt || "");
      setSelectedLanguage(bot.language || "en");

      const loadedModel = bot.model || "gpt-4o-realtime-preview-2024-12-17";
      setLlmModel(loadedModel);

      const opt = LLM_OPTIONS.find((o) => o.model === loadedModel);
      if (opt) setLlmProvider(opt.provider);

      setVoice(bot.voice || "alloy");
      setSavedBotId(bot.id);

      if (bot.nodes && bot.nodes.length > 0) {
        setNodes(bot.nodes);
      }
      if (bot.edges && bot.edges.length > 0) {
        setEdges(bot.edges);
      }
      if (bot.knowledge_base && bot.knowledge_base.length > 0) {
        setKbDocs(bot.knowledge_base);
      } else {
        setKbDocs([]);
      }
    });
  }, [editBotId]);

  // Save / Publish bot to DB
  const handlePublish = async () => {
    const payload = {
      name: agentName,
      language: selectedLanguage,
      voice: voice,
      model: llmModel,
      llmProvider: llmProvider,
      first_message: firstMessage || null,
      system_prompt: systemPrompt || null,
      nodes: nodes,
      edges: edges,
      knowledge_base: kbDocs,
    };
    let result;
    if (savedBotId) {
      result = await updateBot(savedBotId, payload);
    } else {
      result = await createBot(payload);
    }
    if (result?.id) {
      setSavedBotId(result.id);
    }
    navigate(`/admin-ai?tab=Agents`);
  };

  // RT Audio Hook
  const {
    isConnected,
    isRecording,
    transcript,
    activeAgent,
    error,
    connectAndStart,
    stop,
  } = useRealtimeAudio(savedBotId || "agent_123");

  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const handleTestClick = () => {
    setShowVoiceModal(true);
    if (!isConnected && !isRecording) {
      connectAndStart({
        agentName: agentName,
        voice: voice,
        model: llmModel,
        llmProvider: llmProvider,
        prompt: systemPrompt,
        firstMessage: firstMessage,
        knowledgeBase: kbDocs,
        nodes: nodes,
        edges: edges,
      });
    }
  };

  const handleVoiceMicClick = () => {
    if (isConnected || isRecording) {
      stop();
    } else {
      connectAndStart({
        agentName: agentName,
        voice: voice,
        model: llmModel,
        llmProvider: llmProvider,
        prompt: systemPrompt,
        firstMessage: firstMessage,
        knowledgeBase: kbDocs,
        nodes: nodes,
        edges: edges,
      });
    }
  };

  const handleVoiceModalClose = () => {
    stop();
    setShowVoiceModal(false);
  };

  // Knowledge Base State
  const [kbDocs, setKbDocs] = useState(initialKbDocs);
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [addResourceType, setAddResourceType] = useState("file"); // "file", "url", "text"

  // Temporary state for the input forms
  const [urlInput, setUrlInput] = useState("");
  const [textInputTitle, setTextInputTitle] = useState("");
  const [textInputContent, setTextInputContent] = useState("");

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
        status: "processed",
        date: dateStr,
      };
      setKbDocs((prev) => [newItem, ...prev]);
      setIsAddingResource(false);
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

  const handleAddResource = () => {
    let newItem = null;
    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (addResourceType === "text" && textInputTitle && textInputContent) {
      newItem = {
        id: Date.now(),
        type: "text",
        title: textInputTitle,
        content: textInputContent,
        status: "processed",
        date: dateStr,
      };
    }

    if (newItem) {
      setKbDocs([newItem, ...kbDocs]);
      setIsAddingResource(false);
      setUrlInput("");
      setTextInputTitle("");
      setTextInputContent("");
    }
  };

  const handleDeleteDoc = (id) => {
    setKbDocs(kbDocs.filter((doc) => doc.id !== id));
  };

  return (
    <div className="agent_builder_root">
      {/* Top Navigation */}
      <div className="builder_header">
        <div className="builder_header_left">
          <div
            className="header_back_btn"
            onClick={() => navigate("/admin-ai?tab=Agents")}
          >
            <Icon name="leftarrow" size={16} color="#64748b" />
          </div>
          <div className="header_title_section">
            <span className="agent_name">{agentName}</span>
            <span className="agent_status_badge">
              <span className="status_dot"></span>
              Live 100%
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="builder_header_right">
          <Button
            type={isConnected ? "outline" : "empty"}
            className="btn_test"
            onClick={handleTestClick}
            style={
              isConnected
                ? {
                    borderColor: "#ff5200",
                    color: "#ff5200",
                    background: "#fef2f2",
                  }
                : {}
            }
          >
            <Icon
              name="play"
              size={14}
              color={isConnected ? "#fff" : "#1e293b"}
            />
            {isConnected
              ? isRecording
                ? "Stop Session"
                : "Connecting..."
              : "Test Voice"}
          </Button>
          <Button
            type="primary"
            className="btn_publish"
            onClick={handlePublish}
            disabled={createBotLoading}
          >
            {createBotLoading
              ? "Saving..."
              : savedBotId
                ? "Update Bot"
                : "Publish Bot"}
          </Button>
        </div>
      </div>

      <div className="builder_main_wrapper">
        {/* Left Navigation Sidebar */}
        <div className="builder_sidebar_nav">
          <div className="sidebar_nav_title">Configuration</div>
          {builderTabs.map((tab) => (
            <div
              key={tab}
              className={`builder_sidebar_tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "Agent" && (
                <Icon
                  name="gen_ai"
                  size={16}
                  color={activeTab === "Agent" ? "#ff5200" : "#64748b"}
                />
              )}
              {tab === "Workflow" && (
                <Icon
                  name="flow"
                  size={16}
                  color={activeTab === "Workflow" ? "#ff5200" : "#64748b"}
                />
              )}
              {tab === "Knowledge Base" && (
                <Icon
                  name="database"
                  size={16}
                  color={activeTab === "Knowledge Base" ? "#ff5200" : "#64748b"}
                />
              )}
              <span>{tab}</span>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="builder_content_area">
          {activeTab === "Agent" && (
            <AgentConfigTab
              agentName={agentName}
              setAgentName={setAgentName}
              llmProvider={llmProvider}
              setLlmProvider={setLlmProvider}
              llmModel={llmModel}
              setLlmModel={setLlmModel}
              voice={voice}
              setVoice={setVoice}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              firstMessage={firstMessage}
              setFirstMessage={setFirstMessage}
              systemPrompt={systemPrompt}
              setSystemPrompt={setSystemPrompt}
            />
          )}
          {activeTab === "Workflow" && (
            <AIWorkflowEdit
              nodes={nodes}
              setNodes={setNodes}
              edges={edges}
              setEdges={setEdges}
            />
          )}
          {activeTab === "Knowledge Base" && (
            <div className="kb_container">
              <div className="kb_header">
                <div>
                  <h2>Knowledge Base</h2>
                  <p>
                    Provide your agent with custom knowledge through documents,
                    websites, or direct text.
                  </p>
                </div>
                {!isAddingResource && (
                  <Button
                    type="primary"
                    onClick={() => setIsAddingResource(true)}
                  >
                    <Icon name="plus" size={14} color="#fff" />
                    Add Resource
                  </Button>
                )}
              </div>

              <div className="kb_content">
                {isAddingResource && (
                  <div className="kb_add_resource">
                    <div className="resource_type_selector">
                      <div
                        className={`resource_type_btn ${addResourceType === "file" ? "active" : ""}`}
                        onClick={() => setAddResourceType("file")}
                      >
                        <Icon
                          name="docs"
                          size={16}
                          color={
                            addResourceType === "file" ? "#ff5200" : "#64748b"
                          }
                        />{" "}
                        File Upload
                      </div>

                      <div
                        className={`resource_type_btn ${addResourceType === "text" ? "active" : ""}`}
                        onClick={() => setAddResourceType("text")}
                      >
                        <Icon
                          name="edit"
                          size={16}
                          color={
                            addResourceType === "text" ? "#ff5200" : "#64748b"
                          }
                        />{" "}
                        Raw Text
                      </div>
                    </div>

                    {addResourceType === "file" && (
                      <div
                        className="resource_input_area file_dropzone"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ cursor: "pointer" }}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: "none" }}
                          onChange={handleFileChange}
                          accept=".txt,.csv,.json,.md"
                        />
                        <div className="dropzone_icon">
                          <Icon name="upload" size={24} color="#64748b" />
                        </div>
                        <div className="dropzone_text">
                          Click to upload or drag and drop
                        </div>
                        <div className="dropzone_subtext">
                          TXT, CSV, JSON, MD (File reading relies on text
                          format)
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          <Button type="outline">Browse Files</Button>
                        </div>
                      </div>
                    )}

                    {addResourceType === "text" && (
                      <div className="resource_input_area">
                        <div
                          className="input_group"
                          style={{ flexDirection: "column", gap: "16px" }}
                        >
                          <div>
                            <label
                              style={{
                                fontSize: "13px",
                                fontWeight: "500",
                                color: "#1e293b",
                                display: "block",
                                marginBottom: "8px",
                              }}
                            >
                              Title
                            </label>
                            <input
                              type="text"
                              className="kb_main_input"
                              placeholder="e.g., Return Policy"
                              value={textInputTitle}
                              onChange={(e) =>
                                setTextInputTitle(e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label
                              style={{
                                fontSize: "13px",
                                fontWeight: "500",
                                color: "#1e293b",
                                display: "block",
                                marginBottom: "8px",
                              }}
                            >
                              Content
                            </label>
                            <textarea
                              className="kb_main_textarea"
                              placeholder="Paste or type your text here..."
                              value={textInputContent}
                              onChange={(e) =>
                                setTextInputContent(e.target.value)
                              }
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="action_buttons">
                      <Button
                        type="empty"
                        onClick={() => setIsAddingResource(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="primary" onClick={handleAddResource}>
                        Add to Knowledge Base
                      </Button>
                    </div>
                  </div>
                )}

                {kbDocs.length > 0 ? (
                  <ul className="kb_list">
                    {kbDocs.map((doc) => (
                      <li key={doc.id} className="kb_list_item">
                        <div className={`kb_item_icon ${doc.type}`}>
                          <Icon
                            name={
                              doc.type === "file"
                                ? "docs"
                                : doc.type === "url"
                                  ? "link"
                                  : "edit"
                            }
                            size={20}
                            color="currentColor"
                          />
                        </div>
                        <div className="kb_item_details">
                          <div className="kb_item_title">{doc.title}</div>
                          <div className="kb_item_meta">
                            <span className={`kb_item_badge ${doc.status}`}>
                              {doc.status === "processed"
                                ? "Processed"
                                : "Syncing..."}
                            </span>
                            <span>Added {doc.date}</span>
                            {doc.size && <span>{doc.size}</span>}
                          </div>
                        </div>
                        <div className="kb_item_actions">
                          <div
                            className="action_btn_icon delete"
                            title="Delete"
                            onClick={() => handleDeleteDoc(doc.id)}
                          >
                            <Icon
                              name="deletee"
                              size={14}
                              color="currentColor"
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  !isAddingResource && (
                    <div className="kb_empty_state">
                      <div className="kb_empty_icon">
                        <Icon name="database" size={32} color="#94a3b8" />
                      </div>
                      <h3>No Knowledge Fragments Yet</h3>
                      <p>
                        Upload documents, link to websites, or add custom text
                        snippets to teach your agent specific information.
                      </p>
                      <Button
                        type="primary"
                        onClick={() => setIsAddingResource(true)}
                      >
                        <Icon name="plus" size={14} color="#fff" />
                        Add Resource
                      </Button>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Test Modal */}
      <VoiceTestModal
        isOpen={showVoiceModal}
        onClose={handleVoiceModalClose}
        isConnected={isConnected}
        isRecording={isRecording}
        transcript={transcript}
        activeAgent={activeAgent}
        error={error}
        onMicClick={handleVoiceMicClick}
      />
    </div>
  );
};

export default AgentBuilderLayout;
