import React, { useState, useEffect, useCallback, useMemo } from "react";
import "./styles/Admin_dashboard.css";
import DonutChart from "./DonutChart";
import {
  Table,
  Tabletag,
  Loader,
  Button,
  Tooltip,
} from "../../components/Index.jsx";
import { useDashboardStore } from "../../store/admin/useDashboardStore.js";
import Icon from "../../constants/Icon.jsx";
import { capitalizeFirst, formatTime } from "../../utils/helpers.js";
import { useNow, formatDuration, parseTimestamp } from "../../utils/time.js";
import { callStore } from "../../store/useCallStore.js";
import { useAuthStore } from "../../store/useAuthStore.js";

function Admin_dashboard() {
  const [activeTab, setActiveTab] = useState("user");
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("25");
  const [offset, setOffset] = useState((page - 1) * pageSize || 0);
  const now = useNow(1000);
  const {
    userStatusData,
    userStatusDataLoading,
    getUserStatusData,
    subscribeTodata,
    unsubscribeFromdata,
    getMetricsData,
    MetricsLoading,
    tc,
    tin,
    tout,
    tans,
    tunans,
    avgtalktime,

    inboundAnswered,
    outboundAnswered,
    inboundUnanswered,
    outboundUnanswered,
    inboundMissed,
    outboundMissed,
    inboundDuration,
    outboundDuration,
    inboundMaxDuration,
    outboundMaxDuration,
    inboundAvgTalkTime,
    outboundAvgTalkTime,
    outboundCallbackRequests,
    inboundRepeatCalls,
    outboundRepeatCalls,
    inboundRepeatCallsPercent,
    outboundRepeatCallsPercent,
    inboundPeakHour,
    outboundPeakHour,

    tunans: _tunans, // rename original tunans to avoid conflict if needed, or just use values

    ringing,
    available,
    incall,
    notavailable,
    totalBreak,
    total,
    getCallsDetails,
    callsMetrics,
    callsMetricsTotal,
    callsMetricsLoading,
    forceLogout,
  } = useDashboardStore();
  const { authExtension } = useAuthStore();

  const { makeCallBarge, activeBargeUUID, endBarge } = callStore();

  useEffect(() => {
    getCallsDetails(pageSize, offset);
  }, [pageSize, offset]);
  useEffect(() => {
    getUserStatusData();
    getMetricsData();
  }, []);

  useEffect(() => {
    subscribeTodata();
    return () => unsubscribeFromdata();
  }, [subscribeTodata, unsubscribeFromdata]);

  // Top summary cards
  const tabs_data = [
    { name: "Total Calls", value: tc, icon: "call", color: "#ff5200" },
    { name: "Incoming Calls", value: tin, icon: "incoming", color: "#ff5200" },
    { name: "Outgoing Calls", value: tout, icon: "outgoing", color: "#ff5200" },
    { name: "Answered Calls", value: tans, icon: "call", color: "#16A34A" },
    {
      name: "UnAnswered Calls",
      value: tunans,
      icon: "unanswer",
      color: "#B91C1C",
    },
    {
      name: "Avg Talktime",
      value: `${avgtalktime} min`,
      icon: "sandclock",
      color: "#ff5200",
    },
  ];

  // Advance Metrics cards (replace placeholders when BE exposes more fields)

  const inAnsPct =
    tin > 0 ? ((inboundAnswered / tin) * 100).toFixed(1) + "%" : "0%";
  const inUnansPct =
    tin > 0 ? ((inboundUnanswered / tin) * 100).toFixed(1) + "%" : "0%";

  const outAnsPct =
    tout > 0 ? ((outboundAnswered / tout) * 100).toFixed(1) + "%" : "0%";
  const outUnansPct =
    tout > 0 ? ((outboundUnanswered / tout) * 100).toFixed(1) + "%" : "0%";

  const incoming_cards = [
    {
      name: "Incoming Total",
      value: tin ?? "—",
      icon: "incoming",
      color: "#0EA5E9",
    },
    {
      name: "Answered",
      value: inboundAnswered ?? "—",
      icon: "call",
      color: "#16A34A",
    },
    {
      name: "Answered Calls in %",
      value: inAnsPct,
      icon: "call",
      color: "#16A34A",
    },
    {
      name: "Unanswered",
      value: inboundUnanswered ?? "—",
      icon: "unanswer",
      color: "#DC2626",
    },
    {
      name: "Unanswered calls in %",
      value: inUnansPct,
      icon: "unanswer",
      color: "#DC2626",
    },
    {
      name: "Abandoned calls in IVR",
      value: "0",
      icon: "unanswer",
      color: "#DC2626",
    },
    {
      name: "Missed calls",
      value: inboundMissed ?? "0",
      icon: "missedcall",
      color: "#DC2626",
    },
    {
      name: "Avg Talktime",
      value: `${inboundAvgTalkTime} min`,
      icon: "sandclock",
      color: "#F59E0B",
    },
    {
      name: "Repeat calls",
      value: inboundRepeatCalls ?? "0",
      icon: "sandclock",
      color: "#F59E0B",
    },
    {
      name: "Repeat calls in %",
      value: inboundRepeatCallsPercent + "%",
      icon: "sandclock",
      color: "#F59E0B",
    },
    {
      name: "Peak call hour",
      value: inboundPeakHour,
      icon: "sandclock",
      color: "#F59E0B",
    },
    {
      name: "Total Talktime duration",
      value: formatDuration(inboundDuration * 1000) || "0s",
      icon: "sandclock",
      color: "#F59E0B",
    },
    {
      name: "Longest call duration",
      value: formatDuration(inboundMaxDuration * 1000) || "0s",
      icon: "sandclock",
      color: "#F59E0B",
    },
  ];

  const outgoing_cards = [
    {
      name: "Outgoing Total",
      value: tout ?? "—",
      icon: "outgoing",
      color: "#0EA5E9",
    },
    {
      name: "Answered",
      value: outboundAnswered ?? "—",
      icon: "call",
      color: "#16A34A",
    },
    {
      name: "Unanswered",
      value: outboundUnanswered ?? "—",
      icon: "unanswer",
      color: "#DC2626",
    },
    {
      name: "Repeat calls",
      value: outboundRepeatCalls ?? "0",
      icon: "sandclock",
      color: "#F59E0B",
    },
    {
      name: "Longest call duration",
      value: formatDuration(outboundMaxDuration * 1000) || "0s",
      icon: "sandclock",
      color: "#F59E0B",
    },
    {
      name: "Avg Talktime",
      value: `${outboundAvgTalkTime} min`,
      icon: "sandclock",
      color: "#F59E0B",
    },
    {
      name: "Answered Calls in %",
      value: outAnsPct,
      icon: "call",
      color: "#16A34A",
    },
    {
      name: "Unanswered calls in %",
      value: outUnansPct,
      icon: "unanswer",
      color: "#DC2626",
    },
    {
      name: "Repeat calls in %",
      value: outboundRepeatCallsPercent + "%",
      icon: "sandclock",
      color: "#F59E0B",
    },
    {
      name: "Peak call hour",
      value: outboundPeakHour,
      icon: "sandclock",
      color: "#F59E0B",
    },
    {
      name: "Total Talktime duration",
      value: formatDuration(outboundDuration * 1000) || "0s",
      icon: "sandclock",
      color: "#F59E0B",
    },
    {
      name: "Longest call duration",
      value: formatDuration(outboundMaxDuration * 1000) || "0s",
      icon: "sandclock",
      color: "#F59E0B",
    },
    {
      name: "Callback request",
      value: outboundCallbackRequests ?? "0",
      icon: "missedcall",
      color: "#DC2626",
    },
  ];

  const callStatusData = [
    { name: "Available", value: available, color: "#4ADE80" },
    { name: "Ringing", value: ringing, color: "#FACC15" },
    { name: "In call", value: incall, color: "#818CF8" },
    { name: "Not available", value: notavailable, color: "#F87171" },
  ];

  // ESC to close modal

  const columns = useMemo(
    () => [
      { title: "User", key: "l_memberName", width: 130, fixed: "left" },
      {
        title: "Campaign",
        key: "l_memberCampaignName",
        width: 130,
        fixed: "left",
      },
      { title: "Ready Status", key: "l_readyStatus" },
      {
        title: "In Total",
        key: "l_inboundTotal",
        titleIcon: "call",
        titleIconColor: "#ff5200",
      },
      {
        title: "In Ans",
        key: "l_inboundAnswered",
        titleIcon: "call",
        titleIconColor: "#16A34A",
      },
      {
        title: "In Unans",
        key: "l_inboundUnAnswered",
        titleIcon: "unanswer",
        titleIconColor: "#B91C1C",
      },
      {
        title: "Out Total",
        key: "l_outboundTotal",
        titleIcon: "outgoing",
        titleIconColor: "#ff5200",
      },
      {
        title: "Out Ans",
        key: "l_outboundAnswered",
        titleIcon: "call",
        titleIconColor: "#16A34A",
      },
      {
        title: "Out Unans",
        key: "l_outboundUnAnswered",
        titleIcon: "unanswer",
        titleIconColor: "#B91C1C",
      },
      { title: "Direction", key: "l_memberCallDirection" },
      {
        title: "Status",
        key: "l_memberStatus",
        width: 130,
        fixed: "right",
        Cell: (record) => {
          const status = record.l_memberStatus;
          const formattedStatus = capitalizeFirst(status);

          let iconName = "dot";
          let iconColor = "#999";
          let size = 6;
          if (status === "INCALL") {
            iconName = "call";
            iconColor = "#818CF8";
            size = 12;
          } else if (status === "RINGING") {
            iconName = "ring";
            iconColor = "#FACC15";
            size = 12;
          } else if (status === "AVAILABLE") {
            iconColor = "#4ADE80";
          } else if (status === "UNAVAILABLE") {
            iconColor = "#F87171";
          }

          // ✅ Compute duration with the `now` from the outer scope (no hooks here)
          const sinceMs = parseTimestamp(record.l_memberLastUpdated); // "2025-09-16 08:41:19"
          const durationText = sinceMs ? formatDuration(now - sinceMs) : "—";
          return (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon
                  name={iconName}
                  size={size}
                  style={{ color: iconColor }}
                />
                <span style={{ fontWeight: 500, color: "#333", fontSize: 14 }}>
                  {formattedStatus}
                </span>
              </div>
              <span style={{ fontWeight: 400, color: "#888", fontSize: 13 }}>
                for {durationText}
              </span>
            </div>
          );
        },
      },
      {
        title: "Actions",
        key: "__actions",
        width: 70,
        fixed: "right",
        Cell: (record) => {
          const status = record.l_memberStatus;

          if (status === "AVAILABLE") {
            return (
              <Button
                variant="empty"
                onClick={() => {
                  forceLogout(record.l_memberExtention || "");
                }}
              >
                <Icon name="logout" size="14" style={{ color: "#2A2A2A" }} />
              </Button>
            );
          }
        },
      },
    ],
    [now],
  );

  // Fixed callsColums for Admin_dashboard.jsx
  const callsColums = [
    {
      title: "Direction",
      key: "l_callDirection",
      titleIcon: "call",
      titleIconColor: "#969696",
      Cell: (row) => {
        let direction = row.l_callDirection?.toLowerCase();
        let disposition = row.l_callStatus?.toLowerCase();

        if (direction === "outbound") {
          if (
            disposition.includes("oncall") ||
            disposition.includes("init") ||
            disposition.includes("active")
          ) {
            return (
              <span>
                <Icon name="outgoing" color="#16a34a" size={12} /> Outbound
              </span>
            );
          } else if (disposition.includes("ringing")) {
            return (
              <span>
                <Icon name="outgoing" color="#f59e0b" size={12} /> Outbound
              </span>
            );
          } else if (disposition.includes("completed")) {
            return (
              <span>
                <Icon name="outgoing" color="#6b7280" size={12} /> Outbound
              </span>
            );
          } else if (disposition.includes("busy")) {
            return (
              <span>
                <Icon name="outgoing" color="#e11d48" size={12} /> Outbound
              </span>
            );
          } else if (disposition.includes("failed")) {
            return (
              <span>
                <Icon name="outgoing" color="#dc2626" size={12} /> Outbound
              </span>
            );
          } else {
            return (
              <span>
                <Icon name="outgoing" color="#6b7280" size={12} /> Outbound
              </span>
            );
          }
        } else if (direction === "inbound") {
          if (
            disposition.includes("oncall") ||
            disposition.includes("init") ||
            disposition.includes("active")
          ) {
            return (
              <span>
                <Icon name="incoming" color="#16a34a" size={12} /> Inbound
              </span>
            );
          } else if (disposition.includes("ringing")) {
            return (
              <span>
                <Icon name="incoming" color="#f59e0b" size={12} /> Inbound
              </span>
            );
          } else if (disposition.includes("completed")) {
            return (
              <span>
                <Icon name="incoming" color="#2563EB" size={12} /> Inbound
              </span>
            );
          } else if (disposition.includes("missed")) {
            return (
              <span>
                <Icon name="incoming" color="#e11d48" size={12} /> Inbound
              </span>
            );
          } else if (disposition.includes("failed")) {
            return (
              <span>
                <Icon name="incoming" color="#dc2626" size={12} /> Inbound
              </span>
            );
          } else {
            return (
              <span>
                <Icon name="incoming" color="#6b7280" size={12} /> Inbound
              </span>
            );
          }
        }
        return null;
      },
    },
    { title: "Member Name", key: "m_memberName" },
    { title: "User", key: "l_memberExtention" },
    { title: "Number", key: "l_CliNumber" },
    { title: "Customer", key: "l_CustomerNumber" },
    { title: "Status", key: "l_callStatus" },
    {
      title: "Call start time",
      key: "l_callStartTime",
      Cell: (row) => {
        return <span>{formatTime(row.l_callStartTime)}</span>;
      },
    },
    {
      title: "Actions",
      key: "__actions",
      Cell: (row) => {
        const status = row.__bargeStatus;
        const isBargeRow = activeBargeUUID === row.l_callUUID;
        const isInProgress = row.__bargeInProgress;
        const isRingingOrActive = / (Ringing|Active|Connecting)$/.test(
          status || "",
        );

        // If barge is in progress on THIS row → show status + CUT button
        if (isInProgress && isBargeRow && isRingingOrActive) {
          const isActive = / Active$/.test(status || "");
          const isConnecting = / (Connecting|Ringing)$/.test(status || "");

          return (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  background: isActive
                    ? "#dcfce7"
                    : isConnecting
                      ? "#fef3c7"
                      : "#fee2e2",
                  color: "#111827",
                }}
              >
                <Icon
                  name={isActive ? "call" : isConnecting ? "ring" : "warning"}
                  size={12}
                />
                {status}
              </span>

              <Tooltip content="End">
                <button
                  type="button"
                  onClick={() => endBarge(row.l_callUUID)}
                  style={{
                    border: "none",
                    background: "#fee2e2",
                    color: "#dc2626",
                    borderRadius: 8,
                    padding: "6px 8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  <Icon name="endcall" size={16} />
                  Cut
                </button>
              </Tooltip>
            </div>
          );
        }

        // If another row is barging → disable icons
        const otherBargeActive =
          !!activeBargeUUID && activeBargeUUID !== row.l_callUUID;

        // Check for active call status - handle multiple possible status values
        const callStatus = String(row.l_callStatus || "").toUpperCase();
        const isActiveCall = callStatus === "ONCALL";

        // Default actions when call is active and not barging yet
        if (isActiveCall) {
          const disabledStyles = {
            cursor: otherBargeActive ? "not-allowed" : "pointer",
            pointerEvents: otherBargeActive ? "none" : "auto",
            opacity: otherBargeActive ? 0.5 : 1,
          };

          return (
            <div style={{ display: "flex", gap: 8 }}>
              <Tooltip
                content={
                  otherBargeActive ? "Barge active on another call" : "Barge"
                }
              >
                <div
                  style={disabledStyles}
                  onClick={() =>
                    !otherBargeActive &&
                    makeCallBarge(
                      row.l_callUUID,
                      row.l_callServerIP,
                      authExtension,
                      "Barge",
                    )
                  }
                >
                  <Icon name="barge" color="#16a34a" size={16} />
                </div>
              </Tooltip>

              <Tooltip
                content={
                  otherBargeActive ? "Disabled while barge active" : "Listen"
                }
              >
                <div
                  style={disabledStyles}
                  onClick={() =>
                    !otherBargeActive &&
                    makeCallBarge(
                      row.l_callUUID,
                      row.l_callServerIP,
                      authExtension,
                      "Listen",
                    )
                  }
                >
                  <Icon name="listen" color="#f59e0b" size={16} />
                </div>
              </Tooltip>

              <Tooltip
                content={
                  otherBargeActive ? "Disabled while barge active" : "Whisper"
                }
              >
                <div
                  style={disabledStyles}
                  onClick={() =>
                    !otherBargeActive &&
                    makeCallBarge(
                      row.l_callUUID,
                      row.l_callServerIP,
                      authExtension,
                      "Whisper",
                    )
                  }
                >
                  <Icon name="wisper" color="#dc2626" size={16} />
                </div>
              </Tooltip>
            </div>
          );
        }

        // Finished/failed pill if present
        if (row.__bargeStatus && !row.__bargeInProgress) {
          const failed = String(row.__bargeStatus || "").includes("Failed");
          const ended = String(row.__bargeStatus || "").includes("Ended");

          return (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: failed ? "#fee2e2" : ended ? "#f3f4f6" : "#e5e7eb",
                color: "#111827",
              }}
            >
              <Icon
                name={failed ? "warning" : ended ? "check" : "info"}
                size={12}
              />
              {row.__bargeStatus}
            </span>
          );
        }

        // For non-active calls, show call status info or nothing
        if (!isActiveCall) {
          return (
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              {callStatus === "COMPLETED"
                ? "Call Ended"
                : callStatus === "FAILED"
                  ? "Failed"
                  : callStatus === "BUSY"
                    ? "Busy"
                    : callStatus === "MISSED"
                      ? "Missed"
                      : callStatus === "INIT"
                        ? "Ringing"
                        : "Not Active"}
            </span>
          );
        }

        return null;
      },
    },
  ];

  return (
    <div className="admin_dash_main_container">
      {/* Top Cards */}
      <div className="admin_dash_tabs_container">
        <div className="admin_dash_tabs_title_container">
          <p className="admin_dash_tabs_title">INVENTORY STATUS</p>

          <Button
            type="button"
            variant="empty"
            className="admin_dash_tabs_adv_metrics"
            onClick={() => setMetricsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={metricsOpen}
          >
            Advanced Metrics
          </Button>
        </div>

        <div className="admin_dash_tabs_row">
          {MetricsLoading
            ? Array.from({ length: 6 }).map((_, i) => (
              <div className="admin_dash_tabs_card skeleton" key={`sk-${i}`}>
                <div className="tab-icon-box skeleton-box" />
                <div className="tab-details">
                  <div className="tab-name skeleton-line" />
                  <div className="tab-value skeleton-line wide" />
                </div>
              </div>
            ))
            : tabs_data.map((tab, i) => (
              <div className="admin_dash_tabs_card" key={i}>
                <div className="tab-icon-box">
                  <Icon size={15} color={tab.color} name={tab.icon} />
                </div>
                <div className="tab-details">
                  <div className="tab-name">{tab.name}</div>
                  <div className="tab-value">{tab.value ?? "—"}</div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Body */}
      <div className="admindash_content_container">
        <div className="admindash_leftside_container">
          {userStatusDataLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                width: "100%",
              }}
            >
              <Loader />
            </div>
          ) : (
            <>
              {callStatusData.length > 0 && (
                <DonutChart
                  title="CALL STATUS"
                  value={total}
                  label="Total"
                  segments={callStatusData}
                  showLegend={false}
                  showPercent={true}
                  showTooltip={true}
                />
              )}

              <div className="dash_donut_legend_datas">
                <p className="dash_donut_datas">Available</p>
                <div
                  className="dash_donut_datas_color"
                  style={{ backgroundColor: "#4ADE80" }}
                >
                  <p className="dash_donut_datas_count">{available}</p>
                </div>
              </div>

              <div className="dash_donut_legend_datas">
                <p className="dash_donut_datas">Ringing</p>
                <div
                  className="dash_donut_datas_color"
                  style={{ backgroundColor: "#FACC15" }}
                >
                  <p className="dash_donut_datas_count">{ringing}</p>
                </div>
              </div>

              <div className="dash_donut_legend_datas">
                <p className="dash_donut_datas">In call</p>
                <div
                  className="dash_donut_datas_color"
                  style={{ backgroundColor: "#818CF8" }}
                >
                  <p className="dash_donut_datas_count">{incall}</p>
                </div>
              </div>

              <div className="dash_donut_legend_datas">
                <p className="dash_donut_datas">Not available</p>
                <div
                  className="dash_donut_datas_color"
                  style={{ backgroundColor: "#F87171" }}
                >
                  <p className="dash_donut_datas_count">{notavailable}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="admindash_rightside_container">
          <div className="admindash_rightside_container_wrapper">
            {/* Tab Switcher */}
            <div className="admindash_rightside_container_switcher">
              <div
                className={`admindash_rightside_container_tab_item ${activeTab === "user" ? "active" : ""
                  }`}
                onClick={() => setActiveTab("user")}
              >
                <Icon
                  name="user"
                  size={12}
                  style={{ color: activeTab === "user" ? "white" : "#94a3b8" }}
                />
                Users
              </div>
              <div
                className={`admindash_rightside_container_tab_item ${activeTab === "call" ? "active" : ""
                  }`}
                onClick={() => setActiveTab("call")}
              >
                <Icon
                  name="call"
                  size={12}
                  style={{ color: activeTab === "call" ? "white" : "#94a3b8" }}
                />
                Calls
              </div>

              {/* TODO:Filters */}
            </div>

            {/* Conditional Table */}
            <div className="admindash_rightside_container_tab_content">
              {activeTab === "call" ? (
                <Table
                  columns={callsColums}
                  data={callsMetrics}
                  totaldata={callsMetricsTotal}
                  loading={callsMetricsLoading}
                  pageSize={pageSize}
                  page={page}
                  serverSide
                  onPageChange={(pagevalues) => {
                    setTimeout(() => {
                      console.log(pagevalues);
                      setPage(pagevalues.currentPage);
                      setPageSize(pagevalues.pageSize);
                      setOffset(
                        pagevalues.pageSize * pagevalues.currentPage -
                        pagevalues.pageSize,
                      );
                    }, 0);
                  }}
                />
              ) : (
                <Table
                  columns={columns}
                  data={userStatusData}
                  totaldata={userStatusData?.length ?? 0}
                  loading={userStatusDataLoading}
                  serverSide={false}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Advance Metrics Modal — Single Page: Incoming then Outgoing */}
      {metricsOpen && (
        <div
          className="metrics_modal_overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target.classList.contains("metrics_modal_overlay")) {
              setMetricsOpen(false);
            }
          }}
        >
          <div className="metrics_modal_card">
            <div className="metrics_modal_header">
              <h3>Advance Metrics</h3>
              <button
                className="metrics_modal_close"
                onClick={() => setMetricsOpen(false)}
                aria-label="Close"
                title="Close"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="metrics_modal_body">
              {/* Incoming Section */}
              <div className="metrics_section">
                <div className="metrics_section_head">
                  <h4>
                    <Icon name="incoming" size={14} /> Incoming
                  </h4>
                </div>
                <div className="admin_dash_tabs_row">
                  {incoming_cards.map((tab, i) => (
                    <div className="admin_dash_tabs_card" key={`m-in-${i}`}>
                      <div className="tab-icon-box">
                        <Icon size={15} color={tab.color} name={tab.icon} />
                      </div>
                      <div className="tab-details">
                        <div className="tab-name">{tab.name}</div>
                        <div className="tab-value">{tab.value ?? "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outgoing Section */}
              <div className="metrics_section">
                <div className="metrics_section_head">
                  <h4>
                    <Icon name="outgoing" size={14} /> Outgoing
                  </h4>
                </div>
                <div className="admin_dash_tabs_row">
                  {outgoing_cards.map((tab, i) => (
                    <div className="admin_dash_tabs_card" key={`m-out-${i}`}>
                      <div className="tab-icon-box">
                        <Icon size={15} color={tab.color} name={tab.icon} />
                      </div>
                      <div className="tab-details">
                        <div className="tab-name">{tab.name}</div>
                        <div className="tab-value">{tab.value ?? "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* 
            <div className="metrics_modal_footer">
              <button className="metrics_modal_close_btn" onClick={() => setMetricsOpen(false)}>
                Close
              </button>
            </div> */}
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin_dashboard;
