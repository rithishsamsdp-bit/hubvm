import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/AgentReports.css";
import Icon from "../../constants/Icon.jsx";
const AgentReports = () => {
  const [hoveredItem, setHoveredItem] = useState(null);

  const navigate = useNavigate();

  const handleMouseEnter = (index) => {
    setHoveredItem(index);
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const handleClick = (path) => {
    navigate(path);
  };

  const renderItem = (text, index, path) => (
    <div
      className="agent_reports_sites_items_conainer"
      onMouseEnter={() => handleMouseEnter(index)}
      onMouseLeave={handleMouseLeave}
      onClick={() => handleClick(path)}
      key={index}
    >
      <p className="agent_reports_sites_items_text">{text}</p>
      <Icon name="rightarrow" size={8} color={
        hoveredItem === index
          ? "#ff5200"
          : "#334155"
      } />
    </div>
  );

  const siteItems = useMemo(
    () =>
      [
        { text: "Cdr Report", path: "/agent-reports/agent-cdrReport" },
        { text: "Voice Mail Report", path: "/agent-reports/agent-voicemail" },
        { text: "Callback Reminder Report", path: "/agent-reports/agent-callback-reminder" },
        { text: "Queue Missed Calls Report", path: "/agent-reports/agent-queue-missed-calls-report" },
        { text: "Missed Calls Report", path: "/agent-reports/agent-missed-calls-report" },

      ].map((item, index) => renderItem(item.text, index, item.path)),
    [hoveredItem]
  );

  return (
    <div className="agent_reports">
      <div className="navbar_1">
        <div>
          <p className="navbar_1_heading">Reports</p>
          <span className="navbar_1_breadcrumb">
            <span
              className="navbar_1_breadcrumb_item"
              onClick={() => {

                navigate("/agent-dashboard")

              }}
            >
              Dashboard
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span className="navbar_1_breadcrumb_item active">
              Reports
            </span>
          </span>
        </div>
      </div>
      <div className="agent_reports_container">
        <div className="agent_reports_sites_container_1">
          <div className="agent_agent_reports_sites_header_container">
            <p className="agent_reports_sites_header">Sites</p>
          </div>
          <div className="agent_reports_sites_container_1_body_container">
            {siteItems}
          </div>
        </div>
        {/* <div className="agent_reports_sites_container_2">
          <div className="agent_agent_reports_sites_header_container">
            <p className="agent_reports_sites_header">Login and Break Reports</p>
          </div>
          <div className="agent_reports_sites_container_2_body_container">
            {loginBreakItems}
          </div>
        </div>
        <div className="reports_sites_container_3">
          <div className="agent_agent_reports_sites_header_container">
            <p className="agent_reports_sites_header">Product Reports</p>
          </div>
          <div className="agent_reports_sites_container_3_body_container">
            {productItems}
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default AgentReports;
