import { useState, useMemo } from "react";
import "../admin/styles/AdminReports.css";
import { useNavigate } from "react-router-dom";
import Icon from "../../constants/Icon.jsx";

const SuperAdminReports = () => {
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
      className="admin_reports_sites_items_conainer"
      onMouseEnter={() => handleMouseEnter(index)}
      onMouseLeave={handleMouseLeave}
      onClick={() => handleClick(path)}
      key={index}
    >
      <p className="admin_reports_sites_items_text">{text}</p>
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
        { text: "CDR Report", path: "/superadmin-reports/superadmin-cdrReport" },
      ].map((item, index) => renderItem(item.text, index, item.path)),
    [hoveredItem]
  );

  return (
    <div className="admin_reports">
      <div className="navbar_1">
        <div>
          <p className="navbar_1_heading">Reports</p>
          <span className="navbar_1_breadcrumb">
            <span
              className="navbar_1_breadcrumb_item"
              onClick={() => navigate("/superadmin-dashboard")}
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

      <div className="admin_reports_container">
        <div className="admin_reports_sites_container_1">
          <div className="admin_admin_reports_sites_header_container">
            <p className="admin_reports_sites_header">Sites</p>
          </div>
          <div className="admin_reports_sites_container_1_body_container">
            {siteItems}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminReports;
