import React, { useState, useRef, useEffect } from "react";
import Icon from "../../../../constants/Icon.jsx";

// ── LLM Model options ─────────────────────────────────────────────────────────
export const LLM_OPTIONS = [
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

export const VOICE_OPTIONS = {
  openai: [
    { value: "alloy",   label: "Alloy",   emoji: "🌊", desc: "Smooth, neutral, and balanced — great for professional contexts." },
    { value: "ash",     label: "Ash",     emoji: "🌲", desc: "Soft, gentle, and conversational." },
    { value: "coral",   label: "Coral",   emoji: "🪸", desc: "Clear, bright, and friendly." },
    { value: "echo",    label: "Echo",    emoji: "🔵", desc: "Clear and authoritative — ideal for information delivery." },
    { value: "sage",    label: "Sage",    emoji: "🌿", desc: "Calm and soothing — perfect for wellness and guidance." },
    { value: "shimmer", label: "Shimmer", emoji: "✨", desc: "Gentle and calming — works well for support." },
  ],
  gemini: [
    { value: "Aoede",  label: "Aoede",  emoji: "🌸", desc: "Warm and friendly — ideal for welcoming interactions." },
    { value: "Charon", label: "Charon", emoji: "🔷", desc: "Clear and neutral — great for factual, professional use." },
    { value: "Fenrir", label: "Fenrir", emoji: "🐺", desc: "Deep and authoritative — excellent for executive presence." },
    { value: "Kore",   label: "Kore",   emoji: "🍃", desc: "Soft and calm — best for support or wellness contexts." },
    { value: "Puck",   label: "Puck",   emoji: "⚡", desc: "Energetic and bright — great for engagement and sales." },
  ],
  claude: [],
};

export const PROVIDER_BADGE_STYLES = {
  openai: { bg: "#f0fdf4", color: "#15803d", label: "OpenAI" },
  gemini: { bg: "#eff6ff", color: "#1d4ed8", label: "Google" },
  claude: { bg: "#fdf4ff", color: "#7e22ce", label: "Anthropic" },
};

export const LANGUAGES = [
  { id: "en", label: "English", flag: "https://flagcdn.com/w20/us.png", desc: "Default" },
  { id: "es", label: "Spanish", flag: "https://flagcdn.com/w20/es.png", desc: "Español" },
  { id: "fr", label: "French", flag: "https://flagcdn.com/w20/fr.png", desc: "Français" },
  { id: "de", label: "German", flag: "https://flagcdn.com/w20/de.png", desc: "Deutsch" },
  { id: "it", label: "Italian", flag: "https://flagcdn.com/w20/it.png", desc: "Italiano" },
  { id: "hi", label: "Hindi", flag: "https://flagcdn.com/w20/in.png", desc: "हिंदी" },
  { id: "ta", label: "Tamil", flag: "https://flagcdn.com/w20/in.png", desc: "தமிழ்" },
  { id: "ml", label: "Malayalam", flag: "https://flagcdn.com/w20/in.png", desc: "മലയാളം" },
  { id: "te", label: "Telugu", flag: "https://flagcdn.com/w20/in.png", desc: "తెలుగు" },
];

const AgentConfigTab = ({
  agentName,
  setAgentName,
  llmProvider,
  setLlmProvider,
  llmModel,
  setLlmModel,
  voice,
  setVoice,
  selectedLanguage,
  setSelectedLanguage,
  firstMessage,
  setFirstMessage,
  systemPrompt,
  setSystemPrompt,
}) => {
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const langRef = useRef(null);

  const activeLang = LANGUAGES.find((l) => l.id === selectedLanguage) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="config_tab_container">
      <div className="config_main_column">
        {/* Identity Section */}
        <div className="config_section">
          <div className="section_header">
            <h3>Agent Identity</h3>
            <p>Setup the appearance and initial greeting.</p>
          </div>
          <div className="form_group">
            <label>Agent Name *</label>
            <input
              type="text"
              className="premium_input"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. Sales Assistant"
            />
          </div>
          <div className="form_group">
            <label>First Message</label>
            <p className="input_help">
              The first message the agent will say. If empty, it waits for the user.
            </p>
            <textarea
              className="premium_textarea"
              placeholder="Hello! How can I help you today?"
              rows={3}
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
            />
          </div>
        </div>

        {/* System Prompt Section */}
        <div className="config_section">
          <div className="section_header flex_between">
            <div>
              <h3>System Prompt</h3>
              <p>Instructions for the AI to follow during the conversation.</p>
            </div>
          </div>
          <div className="form_group">
            <textarea
              className="premium_textarea min_h_200"
              placeholder="You are a helpful assistant..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="config_sidebar_column">

        {/* Voice Select Pills */}
        <div className="config_sidebar_card">
          <div className="card_header">
            <h4>Voice</h4>
          </div>
          <p className="card_desc" style={{ marginBottom: 12 }}>Choose the tone and personality of the AI.</p>
          
          {(() => {
            const voices = VOICE_OPTIONS[llmProvider] || VOICE_OPTIONS.openai;
            const badge = PROVIDER_BADGE_STYLES[llmProvider] || PROVIDER_BADGE_STYLES.openai;
            const selectedVoice = voices.find(x => x.value === voice) || voices[0];
            
            return (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {voices.map((v) => {
                    const isSel = voice === v.value;
                    return (
                      <div
                        key={v.value}
                        onClick={() => setVoice(v.value)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "8px 14px", borderRadius: 24,
                          border: isSel ? `1.5px solid ${badge.color}` : "1.5px solid #e2e8f0",
                          background: isSel ? badge.bg : "white",
                          cursor: "pointer", transition: "all 0.15s",
                          fontSize: 13, fontWeight: isSel ? 700 : 500,
                          color: isSel ? badge.color : "#475569",
                          boxShadow: isSel ? `0 2px 10px ${badge.color}25` : "none",
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{v.emoji}</span>
                        <span>{v.label}</span>
                      </div>
                    );
                  })}
                </div>
                {selectedVoice?.desc && (
                  <div style={{ marginTop: 14, padding: "10px 14px", background: "#f8fafc", borderRadius: 10, fontSize: 12, color: "#64748b", lineHeight: 1.5, border: "1px solid #e2e8f0" }}>
                    🎙️ {selectedVoice.desc}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Language */}
        <div className="config_sidebar_card">
          <div className="card_header">
            <h4>Language</h4>
          </div>
          <p className="card_desc" style={{ marginBottom: 12 }}>
            Choose the default language your agent will communicate in.
          </p>

          <div className="config_dropdown_wrapper" ref={langRef}>
            <div
              className="language_selector_active"
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 12,
                border: "2px solid #e2e8f0", background: "white", cursor: "pointer",
              }}
            >
              <img src={activeLang.flag} alt={activeLang.label} className="flag_icon" />
              <div className="voice_details" style={{ flex: 1 }}>
                <h5 style={{ fontSize: "14px", fontWeight: "700", margin: 0 }}>{activeLang.label}</h5>
                <span style={{ fontSize: "12px", color: "#64748b" }}>{activeLang.desc}</span>
              </div>
              <Icon name="rightarrow" size={14} color="#94a3b8" />
            </div>
            {showLangDropdown && (
              <div className="config_dropdown_menu" style={{ marginTop: 8 }}>
                {LANGUAGES.map((l) => (
                  <div
                    key={l.id}
                    className={`config_dropdown_item ${selectedLanguage === l.id ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedLanguage(l.id);
                      setShowLangDropdown(false);
                    }}
                  >
                    <div className="flex_between" style={{ alignItems: "center" }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <img src={l.flag} alt={l.label} className="flag_icon" />
                        <span className="dropdown_item_label" style={{ fontSize: "14px" }}>{l.label}</span>
                      </div>
                      <span className="dropdown_item_desc">{l.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AgentConfigTab;

