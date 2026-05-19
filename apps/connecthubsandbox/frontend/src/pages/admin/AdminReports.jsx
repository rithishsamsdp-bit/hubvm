import { useState, useMemo } from "react";
import "./styles/AdminReports.css";
import { useNavigate } from "react-router-dom";
import Icon from "../../constants/Icon.jsx";
import { useAuthStore } from "../../store/useAuthStore.js";

const AdminReports = () => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const navigate = useNavigate();
  const { authRole, authPlan } = useAuthStore();
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
        { text: "CDR Report", path: "/admin-reports/admin-cdrReport" },
        { text: "Performance Report", path: "/admin-reports/admin-performance" },
        { text: "Login Logout Report", path: "/admin-reports/admin-login-logout" },
        { text: "Break Report", path: "/admin-reports/admin-break-report" },
        { text: "Conference Report", path: "/admin-reports/admin-conference-report" },
        { text: "Queue missed calls Report", path: "/admin-reports/admin-queue-missed-calls-report" },
        { text: "Missed Calls Report", path: "/admin-reports/admin-missed-calls-report" },
        { text: "Callback Reminder Report", path: "/admin-reports/admin-callback-reminder" },
      ].map((item, index) => renderItem(item.text, index, item.path)),
    [hoveredItem]
  );

  const whatsappReportItems = useMemo(
    () =>
      [
        { text: "Delivery Response Report", path: "/admin-reports/admin-whatsapp-delivery-response" },
      ].map((item, index) => renderItem(item.text, `whatsapp-${index}`, item.path)),
    [hoveredItem]
  );

  const tlWhatsappReportItems = useMemo(
    () =>
      [
        { text: "Delivery Response Report", path: "/tl-reports/tl-whatsapp-delivery-response" },
      ].map((item, index) => renderItem(item.text, `tl-whatsapp-${index}`, item.path)),
    [hoveredItem]
  );

  const smsReportItems = useMemo(
    () =>
      [
        { text: "SMS Delivery Response Report", path: "/admin-reports/admin-sms-delivery-response" },
      ].map((item, index) => renderItem(item.text, `sms-${index}`, item.path)),
    [hoveredItem]
  );

  const tlSmsReportItems = useMemo(
    () =>
      [
        { text: "SMS Delivery Response Report", path: "/tl-reports/tl-sms-delivery-response" },
      ].map((item, index) => renderItem(item.text, `tl-sms-${index}`, item.path)),
    [hoveredItem]
  );

  const tlSiteItems = useMemo(
    () =>
      [
        { text: "CDR Report", path: "/tl-reports/tl-cdrReport" },
        { text: "Performance Report", path: "/tl-reports/tl-performance" },
        { text: "Login Logout Report", path: "/tl-reports/tl-login-logout" },
        { text: "Break Report", path: "/tl-reports/tl-break-report" },
        { text: "Conference Report", path: "/tl-reports/tl-conference-report" },
        { text: "Queue missed calls Report", path: "/tl-reports/tl-queue-missed-calls-report" },
        { text: "Callback Reminder Report", path: "/tl-reports/tl-callback-reminder" },
      ].map((item, index) => renderItem(item.text, index, item.path)),
    [hoveredItem]
  )

  return (
    <div className="admin_reports">
      <div className="navbar_1">
        <div>
          <p className="navbar_1_heading">Reports</p>
          <span className="navbar_1_breadcrumb">
            <span
              className="navbar_1_breadcrumb_item"
              onClick={() => {
                if (authRole === "TL") {
                  navigate("/tl-dashboard")
                }
                else if (authRole === "ADMIN") {
                  navigate("/admin-dashboard")
                };
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

      <div className="admin_reports_container">
        <div className="admin_reports_sites_container_1">
          <div className="admin_admin_reports_sites_header_container">
            <p className="admin_reports_sites_header">Sites</p>
          </div>
          <div className="admin_reports_sites_container_1_body_container">
            {authRole === "TL" ? tlSiteItems : siteItems}
          </div>
        </div>

        {(authPlan?.menu?.whatsapp || authPlan?.menu?.sms) && (
          <div className="admin_reports_sites_container_1">
            {authPlan?.menu?.whatsapp && (
              <>
                <div className="admin_admin_reports_sites_header_container">
                  <p className="admin_reports_sites_header">WhatsApp Sites</p>
                </div>
                <div className="admin_reports_sites_container_1_body_container">
                  {authRole === "TL" ? tlWhatsappReportItems : whatsappReportItems}
                </div>
              </>
            )}

            {authPlan?.menu?.sms && (
              <>
                <div className="admin_admin_reports_sites_header_container" style={authPlan?.menu?.whatsapp ? { marginTop: "16px" } : {}}>
                  <p className="admin_reports_sites_header">SMS Sites</p>
                </div>
                <div className="admin_reports_sites_container_1_body_container">
                  {authRole === "TL" ? tlSmsReportItems : smsReportItems}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReports;
