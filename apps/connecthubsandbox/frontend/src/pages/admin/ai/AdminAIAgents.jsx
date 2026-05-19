import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminAI.css";
import Icon from "../../../constants/Icon.jsx";
import { Button } from "../../../components/Index.jsx";
import { useAIBotStore } from "../../../store/admin/useAIBotStore.js";

const VOICE_LABELS = {
  alloy: "Alloy",
  ash: "Ash",
  ballad: "Ballad",
  coral: "Coral",
  echo: "Echo",
  sage: "Sage",
  shimmer: "Shimmer",
  verse: "Verse",
};
const LANG_LABELS = { en: "English", ta: "Tamil" };

const AdminAIAgents = () => {
  const navigate = useNavigate();
  const { botsData, botsLoading, getBots, deleteBot } = useAIBotStore();

  useEffect(() => {
    getBots();
  }, []);

  return (
    <div className="admin_ai_agents_container">
      <div className="admin_ai_agents_header">
        <div>
          <h3>AI Agents</h3>
          <p>Manage your configured AI agents here.</p>
        </div>
      </div>

      {botsLoading ? (
        <div className="admin_ai_empty_container">
          <p style={{ color: "#64748b" }}>Loading agents...</p>
        </div>
      ) : botsData.length === 0 ? (
        <div className="admin_ai_empty_container">
          <div className="admin_ai_empty_state">
            <div className="admin_ai_empty_icon">
              <Icon name="gen_ai" size={48} color="#ff5200" />
            </div>
            <h3>No AI Agents Active</h3>
            <p>Create a new agent to handle your call traffic seamlessly.</p>
            <Button
              type="primary"
              onClick={() => navigate("/admin-ai/agent-builder")}
            >
              Create Agent
            </Button>
          </div>
        </div>
      ) : (
        <div className="ai_agents_list">
          {botsData.map((bot) => (
              <div key={bot.id} className="ai_agent_card">
                {/* Left Side: Icon */}
                <div className="ai_agent_card_left">
                  <div className="ai_agent_card_icon_wrap">
                    <Icon name="gen_ai" size={20} color="#fff" />
                  </div>
                </div>

                {/* Middle: Details */}
                <div className="ai_agent_card_body">
                  <div className="ai_agent_card_title_row">
                    <div className="ai_agent_card_name">{bot.name}</div>
                    <div className="ai_agent_card_id">
                      ID: {bot.id.slice(0, 8)}…
                    </div>
                  </div>
                  <div className="ai_agent_card_tags">
                    <div className="ai_tag">
                      <Icon name="message" size={14} color="#64748b" />
                      <span className="ai_tag_label">Language:</span>
                      <span className="ai_tag_value">
                        {LANG_LABELS[bot.language] || bot.language}
                      </span>
                    </div>
                    <div className="ai_tag">
                      <Icon name="voice" size={14} color="#64748b" />
                      <span className="ai_tag_label">Voice:</span>
                      <span className="ai_tag_value">
                        {VOICE_LABELS[bot.voice] || bot.voice}
                      </span>
                    </div>
                  </div>

                  <div className="ai_agent_prompt_label">First Message:</div>
                  <div className="ai_agent_card_prompt">
                    "{bot.first_message || "Hello, how can I help you today?"}"
                  </div>
                </div>

                {/* Right Side: Actions */}
                <div className="ai_agent_card_right">
                  <div className="card_action_buttons">
                    <button
                      className="btn_card_action btn_edit_agent"
                      onClick={() =>
                        navigate(`/admin-ai/agent-builder?botId=${bot.id}`)
                      }
                    >
                      <Icon name="edit" size={14} color="currentColor" /> Edit
                    </button>
                    <button
                      className="btn_card_action btn_delete_agent"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to delete this agent?",
                          )
                        ) {
                          deleteBot(bot.id);
                        }
                      }}
                    >
                      <Icon name="deletee" size={14} color="currentColor" />{" "}
                      Delete
                    </button>
                  </div>
                </div>
              </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAIAgents;
