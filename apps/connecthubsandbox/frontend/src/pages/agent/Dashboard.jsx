import { useEffect, useState } from "react";
import "./styles/Dashboard.css";
import icons from "../../constants/icon";
import { useAgentSocket } from "../../store/agent/useAgentSocket";
import { useSocketStore } from "../../store/useSocketStore";
import { useDashboardStore } from "../../store/agent/useDashboardStore";

const Dashboard = () => {
  const {
    dashboard_breakfast_icon,
    dashboard_login_icon,
    dashboard_call_handle_icon,
    dashboard_break_icon,
    expand_collapse_icon,
    voicemail_icon,
    idle_icon,
    dashboard_inc_call_icon,
    dashboard_whatsapp_icon,
    dashboard_Out_call_icon
  } = icons;

  const { socket } = useSocketStore();
  const [isExpanded, setIsExpanded] = useState(false);

  // Get stats from the store
  const { agentStats, getStats } = useDashboardStore();



  useEffect(() => {
    // Fetch stats when component mounts
    getStats();
  }, [socket, getStats]);

  // Helper function to format time values (assuming they're in seconds)
  const formatTime = (seconds) => {
    if (!seconds) return "0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Stats data mapping with actual API data
  const statsData = [
    {
      label: "Total Calls",
      value: agentStats?.total_calls?.toString() || "0",
      icon: dashboard_call_handle_icon
    },
    {
      label: "Inbound calls count",
      value: agentStats?.inbound_calls?.toString() || "0",
      icon: dashboard_inc_call_icon
    },
    {
      label: "Inbound Answered calls",
      value: agentStats?.inbound_answered?.toString() || "0",
      icon: dashboard_inc_call_icon
    },
    {
      label: "Inbound Missed calls",
      value: agentStats?.inbound_missed?.toString() || "0",
      icon: dashboard_inc_call_icon
    },
    {
      label: "Outbound calls",
      value: agentStats?.outbound_calls?.toString() || "0",
      icon: dashboard_Out_call_icon
    },
    {
      label: "Outbound answered",
      value: agentStats?.outbound_answered?.toString() || "0",
      icon: dashboard_Out_call_icon
    },
    {
      label: "Outbound unanswered",
      value: agentStats?.outbound_unanswered?.toString() || "0",
      icon: dashboard_Out_call_icon
    },
    {
      label: "Voicemail count",
      value: agentStats?.voicemail_count?.toString() || "0",
      icon: voicemail_icon
    },
    {
      label: "Idle time",
      value: formatTime(agentStats?.idle_time) || "0m",
      icon: idle_icon
    },
    {
      label: "Available time",
      value: formatTime(agentStats?.available_time) || "0m",
      icon: dashboard_login_icon
    },
    {
      label: "Call back scheduled count",
      value: agentStats?.callback_scheduled?.toString() || "0",
      icon: dashboard_call_handle_icon
    },
    {
      label: "SMS inbound count",
      value: agentStats?.sms_inbound?.toString() || "0",
      icon: dashboard_break_icon
    },
    {
      label: "SMS outbound count",
      value: agentStats?.sms_outbound?.toString() || "0",
      icon: dashboard_breakfast_icon
    },
    {
      label: "Whatsapp conversation count",
      value: agentStats?.whatsapp_conversations?.toString() || "0",
      icon: dashboard_whatsapp_icon
    },
    {
      label: "Total conversation count",
      value: agentStats?.total_conversations?.toString() || "0",
      icon: dashboard_call_handle_icon
    },
    {
      label: "Total open conversation",
      value: agentStats?.open_conversations?.toString() || "0",
      icon: dashboard_break_icon
    },
    {
      label: "Total closed conversation",
      value: agentStats?.closed_conversations?.toString() || "0",
      icon: dashboard_breakfast_icon
    },
    {
      label: "Login time",
      value: formatTime(agentStats?.login_time) || "0m",
      icon: dashboard_login_icon
    },
    {
      label: "Break time stamps",
      value: agentStats?.break_time_stamps?.toString() || "0",
      icon: dashboard_call_handle_icon
    },
    {
      label: "Total break time",
      value: formatTime(agentStats?.total_break_time) || "0m",
      icon: dashboard_break_icon
    },
  ];

  // Show only first 5 items (one row) when collapsed
  const displayedStats = isExpanded ? statsData : statsData.slice(0, 5);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="dashboard">
      <div className="dashboard_wrapper">
        <div className="dashboard_inventory_status_container">
          <div className="dashboard_inventory_status_header">
            <p className="dashboard_inventory_title">INVENTORY STATUS</p>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                toggleExpand();
              }}
              className="dashboard_view_less"
              aria-label={isExpanded ? "Show less" : "Show more"}
              style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
            >
              {isExpanded ? "View less" : "View more"}
            </a>          </div>

          <div className="dashboard_stats_grid">
            {displayedStats.map((stat, index) => (
              <div key={index} className="dashboard_stat_card">
                <div className="dashboard_stat_icon_box">
                  <img
                    src={stat.icon}
                    alt={stat.label}
                    className="dashboard_stat_icon"
                  />
                </div>
                <div className="dashboard_stat_content">
                  <p className="dashboard_stat_label">{stat.label}</p>
                  <p className="dashboard_stat_value">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="dashboard_expand_collapse_container">
            <button
              className="dashboard_expand_collapse_btn"
              onClick={toggleExpand}
              aria-label={isExpanded ? "Show less" : "Show more"}
            >
              <img
                src={expand_collapse_icon}
                alt="expand"
                className={`dashboard_expand_icon ${isExpanded ? 'rotated' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;