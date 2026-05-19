import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import icons from "../constants/icon";
import "./styles/Sidebar.css";
import DialPad from "./Dialpad";
import Usercard from "./Usercard";
import { useAuthStore } from "../store/useAuthStore";
import { useConversationStore } from "../store/agent/useConversationStore";
import { useDashboardStore } from "../store/agent/useDashboardStore";
import { callStore } from "../store/useCallStore";
import Icon from "../constants/Icon.jsx";
import {
  Tooltip,
  Drawer,
  Button,
  Doggle,
  Popupconfirm,
  Loader,
} from "../components/Index.jsx";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [activeMenu, setActiveMenu] = useState("");
  const [dialpadActive, setDialpadActive] = useState("");
  const [showDialpad, setShowDialpad] = useState(false);
  const [showUserCard, setShowUserCard] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showQueuePopup, setShowQueuePopup] = useState(false);

  const { callStatus, updateReadyNotReady } = useConversationStore();
  const {
    logout,
    authRole,
    authName,
    authExtension,
    menus,
    notificationData,
    missedCallData,
    authPlan,
    fetchNotifications,
    notificationLoading,
    missedCallLoading,
    updateNotificationStatus,
  } = useAuthStore();
  const { registrationStatus } = callStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { pulselogo, sidebar_avatar_icon } = icons;
  const { getLiveQueueStats, liveQueueStats } = useDashboardStore();

  const [notificationOffset, setNotificationOffset] = useState(0);
  const [missedCallOffset, setMissedCallOffset] = useState(0);

  const unreadNotificationCount = notificationData.filter((n) => !n.isRead).length;
  const unreadMissedCallCount = missedCallData.filter((n) => !n.isRead).length;

  const handleNotificationScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 5) {
      // 5px threshold
      const newOffset = notificationOffset + 20;
      setNotificationOffset(newOffset);
      fetchNotifications(authExtension, ["CALLBACK", "INCOMINGSMS"], 20, newOffset);
    }
  };

  const handleMissedCallScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 5) {
      const newOffset = missedCallOffset + 20;
      setMissedCallOffset(newOffset);
      fetchNotifications(authExtension, ["MISSEDCALL"], 20, newOffset);
    }
  };

  const usercardContainerRef = useRef(null);

  useEffect(() => {
    getLiveQueueStats();
  }, []);

  useEffect(() => {
    setActiveMenu("");
    const currentPath = location.pathname;
    let value = currentPath.split("/")[1];
    const activeItem = menus.find((item) => {
      const menuSegment = item.route.split("/")[1];
      return value === menuSegment;
    });
    if (activeItem) {
      setActiveMenu(activeItem.id);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebarElement = document.querySelector(".sidebar");
      if (sidebarElement && !sidebarElement.contains(event.target)) {
        setCollapsed(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleClickOutsideDialpad = (event) => {
      const dialpadContainer = document.querySelector(
        ".sidebar_dialpad_container",
      );
      const dialpadToggle = document.querySelector(
        ".sidebar_dialpad_icon_container_design",
      );

      if (
        showDialpad &&
        dialpadContainer &&
        !dialpadContainer.contains(event.target) &&
        dialpadToggle &&
        !dialpadToggle.contains(event.target)
      ) {
        setShowDialpad(false);
        setDialpadActive("");
      }
    };

    document.addEventListener("mousedown", handleClickOutsideDialpad);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideDialpad);
    };
  }, [showDialpad]);

  useEffect(() => {
    const handleClickOutsideUsercard = (event) => {
      if (
        showUserCard &&
        usercardContainerRef.current &&
        !usercardContainerRef.current.contains(event.target)
      ) {
        setShowUserCard(false);
        setActiveMenu("");
      }
    };

    if (showUserCard) {
      document.addEventListener("mousedown", handleClickOutsideUsercard);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideUsercard);
    };
  }, [showUserCard]);

  const handleMenuClick = (id, route) => {
    setActiveMenu("");
    setActiveMenu(id);
    navigate(route);
  };

  const handleToggle = (next) => {
    updateReadyNotReady(next);
  };

  const handleRead = (notificationId) => {
    updateNotificationStatus([notificationId], "READ");
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className="siderbarmain">
      <div className={`sidebar ${collapsed ? "sidebar_collapsed" : ""}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={collapsed ? { marginLeft: "75%" } : { marginLeft: "220px" }}
          className="sidebar_collapsed_btn"
        >
          <Icon
            name={collapsed ? "rightarrow" : "leftarrow"}
            color="#5F6368"
            width="8px"
            height="8px"
          />
        </button>
        <div>
          <div
            style={collapsed ? { justifyContent: "center" } : {}}
            className="sidebar_header"
          >
            <img
              src={pulselogo}
              alt="Logo"
              className={`${collapsed
                ? "sidebar_logo_collapsed"
                : "sidebar_logo_no_collapsed"
                }`}
            />
          </div>

          <nav className="sidebar_menu">
            {menus.map((item, index) => (
              <div
                key={index}
                style={
                  collapsed
                    ? {
                      justifyContent: "center",
                      padding: "8px 8px",
                    }
                    : {}
                }
                className={`sidebar_menu_item ${activeMenu === item.id ? "active" : ""
                  }`}
                onClick={() => handleMenuClick(item.id, item.route)}
              >
                <Tooltip content={item.label} placement="right">
                  <div className="sidebar_menu_icon_container">
                    <Icon
                      name={item.icon}
                      style={{
                        width: "100%",
                        height: "100%",
                        color: activeMenu === item.id ? "#FF5200" : "#2A2A2A",
                      }}
                    />
                  </div>
                </Tooltip>
                {!collapsed && (
                  <span
                    className={` ${activeMenu === item.id
                      ? "sidebar_menu_label_active"
                      : "sidebar_menu_label"
                      }`}
                  >
                    {item.label}
                  </span>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="sidebar_footer">
          {(authRole === "USER" ||
            (authRole === "TL" && authPlan?.menu?.calldialing)) && (
              <>
                <div
                  style={
                    collapsed
                      ? { justifyContent: "center", padding: "8px" }
                      : { padding: "8px 8px 8px 18px" }
                  }
                  className="sidebar_notification"
                  onClick={() => {
                    setDrawer("Notification");
                    setNotificationOffset(0);
                    fetchNotifications(authExtension, ["CALLBACK", "INCOMINGSMS"], 20, 0);
                  }}
                >
                  <Tooltip content="Notification" placement="right">
                    <div className="sidebar_notification_icon_container">
                      <Icon
                        name="notification"
                        style={{
                          width: "100%",
                          height: "100%",
                          color: "#2A2A2A",
                        }}
                      />
                      {unreadNotificationCount > 0 && (
                        <span className="sidebar_icon_count_badge">
                          {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                        </span>
                      )}
                    </div>
                  </Tooltip>

                  {!collapsed && (
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                      <span className="sidebar_notification_label">
                        Notification
                      </span>
                    </div>
                  )}
                </div>

                <div
                  style={
                    collapsed
                      ? { justifyContent: "center", padding: "8px" }
                      : { padding: "8px 8px 8px 18px" }
                  }
                  className="sidebar_missedcall"
                  onClick={() => {
                    setDrawer("Missedcalls");
                    setMissedCallOffset(0);
                    fetchNotifications(authExtension, ["MISSEDCALL"], 20, 0);
                  }}
                >
                  <Tooltip content="Missed Calls" placement="right">
                    <div className="sidebar_missedcall_icon_container">
                      <Icon
                        name="missedcall"
                        style={{
                          width: "100%",
                          height: "100%",
                          color: "#2A2A2A",
                        }}
                      />
                      {unreadMissedCallCount > 0 && (
                        <span className="sidebar_icon_count_badge">
                          {unreadMissedCallCount > 99 ? "99+" : unreadMissedCallCount}
                        </span>
                      )}
                    </div>
                  </Tooltip>

                  {!collapsed && (
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                      <span className="sidebar_missedcall_label">Missed calls</span>
                    </div>
                  )}
                </div>

                <div
                  style={
                    collapsed ? { justifyContent: "center", padding: "8px" } : {}
                  }
                  className="sidebar_callstatus"
                >
                  <Tooltip
                    content={callStatus === true ? "Ready" : "Not Ready"}
                    placement="right"
                  >
                    <div style={{ width: "40px" }}>
                      <Doggle checked={callStatus} onChange={handleToggle} />
                    </div>
                  </Tooltip>

                  {!collapsed && (
                    <span className="sidebar_callstatus_label">
                      {callStatus === true ? "Ready" : "Not Ready"}
                    </span>
                  )}
                </div>

                <div
                  className={`${collapsed ? "sidebar_dialpad_collapsed" : "sidebar_dialpad"
                    } ${activeMenu === "dialpad" ? "active" : ""}`}
                  onClick={(e) => {
                    if (
                      e.target.closest(".sidebar_dialpad_container") ||
                      e.target.classList.contains("sidebar_dialpad_container")
                    ) {
                      return;
                    }
                    setShowDialpad(!showDialpad);
                    setShowUserCard(false);
                    setDialpadActive(showDialpad ? "" : "dialpad");
                  }}
                >
                  <Tooltip content="Dialpad" placement="right">
                    <div className="sidebar_dialpad_icon_container_design">
                      <div className="sidebar_dialpad_icon_container">
                        <Icon
                          name="dialpad"
                          className="sidebar_dialpad_icon"
                          style={{ color: showDialpad ? "#FF5200" : "#2A2A2A" }}
                        />
                      </div>
                    </div>
                  </Tooltip>

                  {!collapsed && (
                    <span className="sidebar_dialpad_label">Dialpad</span>
                  )}
                  {showDialpad && (
                    <div
                      className="sidebar_dialpad_container"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DialPad
                        onCallInitiated={() => {
                          setShowDialpad(false);
                          setDialpadActive("");
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Live Queue Trigger */}
                <div
                  className="sidebar_live_queue_wrapper"
                  onClick={() => setShowQueuePopup(!showQueuePopup)}
                  style={collapsed ? { justifyContent: "center" } : {}}
                >
                  <Tooltip content="Waiting Calls" placement="right">
                    <div className="sidebar_live_queue_btn">
                      WC: {liveQueueStats?.total_waiting || 0}
                    </div>
                  </Tooltip>
                  {!collapsed && (
                    <span className="sidebar_menu_label">Waiting Calls</span>
                  )}

                  {/* Floating Panel Removed from here */}
                </div>
              </>
            )}
          <hr className="sidebar_fancy_hr"></hr>
          <div
            ref={usercardContainerRef}
            className={`${collapsed
              ? "sidebar_user_profile_collapsed"
              : "sidebar_user_profile"
              }`}
            onClick={(e) => {
              if (
                e.target.closest(".sidebar_dialpad_container") ||
                e.target.classList.contains("sidebar_dialpad_container")
              ) {
                return;
              }
              setShowUserCard(!showUserCard);
              setShowDialpad(false);
              setActiveMenu(showUserCard ? "" : "usercard");
            }}
          >
            <Tooltip content={authName} placement="right">
              <div className="sidebar_user_profile_wrapper">
                <img
                  src={sidebar_avatar_icon}
                  alt="User"
                  className="sidebar_user_profile_icon"
                />
                <span
                  className={`sidebar_user_status_dot ${registrationStatus === "Registered"
                    ? "sidebar_user_status_dot_green"
                    : "sidebar_user_status_dot_red"
                    }`}
                ></span>
              </div>
            </Tooltip>

            {!collapsed && <span className="sidebar_username">{authName}</span>}

            {showUserCard && (
              <div
                className="sidebar_dialpad_container"
                onClick={(e) => e.stopPropagation()}
              >
                <Usercard
                  imgsrc={sidebar_avatar_icon}
                  username={authName}
                  role={authRole}
                  extension={authExtension}
                />
              </div>
            )}
          </div>
          <div
            onClick={handleLogoutClick}
            style={
              collapsed
                ? { justifyContent: "center", padding: "8px" }
                : { padding: "8px 8px 8px 18px" }
            }
            className="sidebar_logout"
          >
            <Tooltip content="Logout" placement="right">
              <div className="sidebar_logout_icon_container">
                <Icon
                  name="logout"
                  style={{ width: "100%", height: "100%", color: "#2A2A2A" }}
                />
              </div>
            </Tooltip>

            {!collapsed && <span className="sidebar_logout_label">logout</span>}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Popup */}
      <Popupconfirm
        isOpen={showLogoutConfirm}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        title="Logout Confirmation"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
      />

      {/* Notification drawer */}
      <Drawer
        open={drawer === "Notification"}
        onClose={() => setDrawer(false)}
        className="notification_drawer"
      >
        <div className="notification_modal_header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <p className="notification_modal_heading">Notification</p>
            {unreadNotificationCount > 0 && (
              <span className="sidebar_notification_count">
                {unreadNotificationCount} New
              </span>
            )}
          </div>
          <div className="notification_header_actions">
            {notificationData.length > 0 && (
              <button
                className="clear_all_btn"
                onClick={() => {
                  const ids = notificationData.map(n => n.notificationId);
                  if (ids.length > 0) {
                    updateNotificationStatus(ids, "DISMISSED");
                  }
                }}
              >
                Clear All
              </button>
            )}
            <Button
              variant="empty"
              onClick={() => setDrawer(false)}
              style={{ width: "10px", height: "10px" }}
            >
              <Icon name="close" />
            </Button>
          </div>
        </div>

        <div
          className="notification_modal_container"
          onScroll={handleNotificationScroll}
          style={{ overflowY: "auto" }}
        >
          {notificationData.map((n) => (
            <div
              key={n.notificationTime}
              className={`notification_modal_content notification_item_container ${!n.isRead ? "unread" : "read"}`}
              onClick={() => !n.isRead && handleRead(n.notificationId)}
            >
              {/* Icon */}
              <div className="notification_icon_wrapper">
                <div className="notification_modal_content_body_item_icon">
                  <Icon
                    name={n.action === "CALLBACK" ? "call" : n.action === "INCOMINGSMS" ? "sms" : "notification"}
                    size={20}
                    color="#002449"
                  />
                </div>
              </div>

              {/* Details */}
              <div className="notification_details_wrapper">
                <p className="notification_modal_content_body_item_content_title notification_title">
                  {n.action === "CALLBACK" ? "Call back Reminder" : n.action === "INCOMINGSMS" ? "Incoming SMS" : n.action}
                </p>
                <p className="notification_modal_content_body_item_content_small_subtitle notification_time">
                  {n.notificationTime}
                </p>
                <p className="notification_modal_content_body_item_content_subtitle notification_subtitle">
                  {n.notificationData?.phonenumber || ""}
                </p>
              </div>

              {/* Actions */}
              <div className="sidebar_action_buttons notification_actions_wrapper">
                {n.action === "INCOMINGSMS" ? (
                  <Tooltip content="View Conversation" placement="left">
                    <button
                      className="call_btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!n.isRead) handleRead(n.notificationId);
                        const phone = n.notificationData?.phonenumber;
                        const messageId = n.notificationData?._id || n.notificationData?.m_id || n.notificationData?.details?.m_id || n.notificationData?.uniqueId;
                        if (phone) {
                          useConversationStore.getState().setPendingNotificationPhone(phone);
                          if (messageId) {
                            useConversationStore.getState().setPendingHighlightedMessageId(messageId);
                          }
                          const msgText = n.notificationData?.m_receiveMsg || n.notificationData?.details?.m_receiveMsg;
                          if (msgText) {
                            useConversationStore.getState().setPendingHighlightedMessageText(msgText);
                          }
                          const msgTime = n.notificationTime;
                          if (msgTime) {
                            useConversationStore.getState().setPendingHighlightedMessageTime(msgTime);
                          }
                        }
                        setDrawer(false);
                        navigate("/agent-conversation");
                      }}
                    >
                      View
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip content="Call" placement="left">
                    <button
                      className="call_btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const number = n.notificationData?.phonenumber;
                        const campaignId = parseInt(
                          localStorage.getItem("CampaignId") || "0",
                        );
                        if (number) {
                          if (!n.isRead) handleRead(n.notificationId);
                          callStore
                            .getState()
                            .makeCall(number, navigate, campaignId);
                          setDrawer(false);
                        }
                      }}
                    >
                      Call
                    </button>
                  </Tooltip>
                )}

                <button
                  className="dismiss_btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateNotificationStatus([n.notificationId], "DISMISSED");
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
          {notificationLoading && (
            <div
              style={{ height: "60px", width: "100%", position: "relative" }}
            >
              <Loader />
            </div>
          )}
        </div>
      </Drawer>
      {/* Missed Calls */}
      <Drawer
        open={drawer === "Missedcalls"}
        onClose={() => setDrawer(false)}
        className="notification_drawer"
      >
        <div className="notification_modal_header">
          <p className="notification_modal_heading">Missed Calls</p>
          <div className="notification_header_actions">
            {missedCallData.length > 0 && (
              <button
                className="clear_all_btn"
                onClick={() => {
                  const ids = missedCallData.map(n => n.notificationId);
                  if (ids.length > 0) {
                    updateNotificationStatus(ids, "DISMISSED");
                  }
                }}
              >
                Clear All
              </button>
            )}
            <Button
              variant="empty"
              onClick={() => setDrawer(false)}
              style={{ width: "10px", height: "10px" }}
            >
              <Icon name="close" />
            </Button>
          </div>
        </div>
        <div
          className="notification_modal_container"
          onScroll={handleMissedCallScroll}
          style={{ overflowY: "auto" }}
        >
          {Array.isArray(missedCallData) && missedCallData.length > 0
            ? missedCallData.map((m, i) => (
              <div
                key={i}
                className={`notification_modal_content notification_item_container ${!m.isRead ? "unread" : "read"}`}
                onClick={() => !m.isRead && handleRead(m.notificationId)}
              >
                {/* Icon */}
                <div className="notification_icon_wrapper">
                  <div className="notification_modal_content_body_item_icon">
                    <Icon name="missedcall" size={20} color="red" />
                  </div>
                </div>

                {/* Details */}
                <div className="notification_details_wrapper">
                  <p
                    className="notification_modal_content_body_item_content_title notification_title"
                  >
                    Missed Call
                  </p>
                  <p
                    className="notification_modal_content_body_item_content_small_subtitle notification_time"
                  >
                    {m.notificationTime}
                  </p>
                  <p
                    className="notification_modal_content_body_item_content_subtitle notification_subtitle"
                  >
                    {m.phonenumber}
                  </p>
                </div>

                {/* Actions */}
                <div className="sidebar_action_buttons notification_actions_wrapper">
                  <Tooltip content="Call" placement="left">
                    <button
                      className="call_btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const number = m.phonenumber;
                        const campaignId = parseInt(
                          localStorage.getItem("CampaignId") || "0",
                        );
                        if (number) {
                          if (!m.isRead) handleRead(m.notificationId);
                          callStore
                            .getState()
                            .makeCall(number, navigate, campaignId);
                          setDrawer(false);
                        }
                      }}
                    >
                      Call
                    </button>
                  </Tooltip>

                  <button
                    className="dismiss_btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateNotificationStatus([m.notificationId], "DISMISSED");
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
            : !missedCallLoading && (
              <p style={{ padding: "10px", color: "#777" }}>
                No missed calls
              </p>
            )}
          {missedCallLoading && (
            <div
              style={{ height: "60px", width: "100%", position: "relative" }}
            >
              <Loader />
            </div>
          )}
        </div>
      </Drawer>
      {/* Live Queue Popup - Moved Outside Sidebar */}
      {showQueuePopup && (
        <div
          className="sidebar_live_queue_popup"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="live_queue_header">
            <span>Waiting calls</span>
            <span className="live_queue_total_badge">
              {liveQueueStats?.total_waiting || 0}
            </span>
          </div>
          {/* <div className="live_queue_content">
              <div className="live_queue_item">
                <div className="queue_info">
                  <span className="queue_name">Sales Queue</span>
                </div>
                <div className="queue_count_badge">3</div>
              </div>
              <div className="live_queue_item">
                <div className="queue_info">
                  <span className="queue_name">Support Queue</span>
                </div>
                <div className="queue_count_badge">1</div>
              </div>
              <div className="live_queue_item">
                <div className="queue_info">
                  <span className="queue_name">Enquiry</span>
                </div>
                <div className="queue_count_badge">1</div>
              </div>
            </div> */}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
