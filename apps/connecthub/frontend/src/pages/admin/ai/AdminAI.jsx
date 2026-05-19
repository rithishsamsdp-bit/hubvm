import React, { useState, useEffect } from "react";
import "./AdminAI.css";
import Icon from "../../../constants/Icon.jsx";
import { Button } from "../../../components/Index.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore.js";
import AdminAIAgents from "./AdminAIAgents.jsx";
import AdminAICallLogs from "./AdminAICallLogs.jsx";

const tabs = ["Agents", "Call Logs"];

const getValidTab = (tabParam) => {
  return (
    tabs.find((tab) => tab.toLowerCase() === tabParam?.toLowerCase()) ||
    "Agents"
  );
};

const AdminAI = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { authRole } = useAuthStore();

  const tabParam = params.get("tab");
  const initialTab = getValidTab(tabParam);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const currentTab = params.get("tab");
    const matchedTab = getValidTab(currentTab);

    if (!currentTab || !tabs.includes(matchedTab)) {
      if (authRole === "ADMIN") {
        navigate(`/admin-ai?tab=Agents`, { replace: true });
      }
    } else if (currentTab !== matchedTab) {
      if (authRole === "ADMIN") {
        navigate(`/admin-ai?tab=${encodeURIComponent(matchedTab)}`, {
          replace: true,
        });
      }
    }

    setActiveTab(matchedTab);
  }, [location.search, authRole, navigate]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (authRole === "ADMIN") {
      navigate(`/admin-ai?tab=${encodeURIComponent(tab)}`);
    }
  };

  return (
    <div className="admin_ai">
      {/* Top Bar */}
      <div className="navbar_2">
        <div>
          <p className="navbar_2_heading">AI Configuration</p>
          <span className="navbar_2_breadcrumb">
            <span
              className="navbar_2_breadcrumb_item"
              onClick={() => {
                if (authRole === "ADMIN") {
                  navigate("/admin-dashboard");
                }
              }}
            >
              Dashboard
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span
              className="navbar_2_breadcrumb_item"
              onClick={() => {
                if (authRole === "ADMIN") {
                  navigate(`/admin-ai?tab=Agents`, { replace: true });
                }
                setActiveTab("Agents");
              }}
            >
              AI Bot
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span className="navbar_2_breadcrumb_item active">{activeTab}</span>
          </span>

          {/* Tabs */}
          <div className="navbar_2_tabs">
            {tabs.map((tab) => (
              <div
                key={tab}
                className={`navbar_2_tab_item ${activeTab === tab ? "active" : ""}`}
                onClick={() => handleTabChange(tab)}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>
        <div>
          {activeTab === "Agents" && (
            <Button
              type="primary"
              onClick={() => navigate("/admin-ai/agent-builder")}
            >
              Create Agent
            </Button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="admin_ai_tab_content">
        {activeTab === "Agents" && <AdminAIAgents />}
        {activeTab === "Call Logs" && <AdminAICallLogs />}
      </div>
    </div>
  );
};

export default AdminAI;
