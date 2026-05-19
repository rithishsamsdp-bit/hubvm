import React, { useState } from 'react';
import Icon from "../../../constants/Icon.jsx";
import { Modal, Button, Table, Select } from "../../../components/Index.jsx";
import { useEmergencyStore } from "../../../store/admin/useEmergencyStore";

const DonutChart = ({ data, total }) => {
    let cumulativePercent = 0;
    const radius = 35;
    const strokeWidth = 8;
    const center = 50;
    const circumference = 2 * Math.PI * radius;
    const safeTotal = total || 1;

    const combinedSuccess = data
        .filter(d => d.name.includes("Answered") || d.name.includes("Read") || d.name.includes("Delivered"))
        .reduce((sum, d) => sum + d.value, 0);

    return (
        <div className="donut_chart_wrapper_small" style={{ marginBottom: '20px' }}>
            <svg width="100" height="100" viewBox="0 0 100 100">
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke="rgba(0,0,0,0.05)"
                    strokeWidth={strokeWidth}
                />
                {data.map((segment, i) => {
                    const percent = (segment.value / safeTotal) * 100;
                    const gap = safeTotal > 0 ? 1.5 : 0;
                    const arcLength = (percent / 100) * circumference;
                    const dashArray = `${Math.max(0, arcLength - gap)} ${circumference}`;
                    const dashOffset = - (cumulativePercent / 100) * circumference;
                    cumulativePercent += percent;

                    return (
                        <circle
                            key={i}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="transparent"
                            stroke={segment.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                            transform={`rotate(-90 ${center} ${center})`}
                            strokeLinecap="round"
                            style={{
                                filter: `drop-shadow(0 0 4px ${segment.color}66)`,
                                transition: 'all 0.5s ease'
                            }}
                        />
                    );
                })}
                <text x="50" y="48" className="gauge_text" fill="#1e293b" style={{ fontSize: '1.2rem', fontWeight: '900' }}>
                    {total > 0 ? Math.round((combinedSuccess / total) * 100) : 0}%
                </text>
                <text x="50" y="62" className="gauge_text" fill="#64748b" style={{ fontSize: '0.6rem', fontWeight: '700', textTransform: 'uppercase' }}>
                    Success
                </text>
            </svg>
        </div>
    );
};

const AdminEmergencyDashboard = ({ dashboardStats }) => {
    const { 
        fetchResponseMembers, responseMembers, isFetchingResponseMembers,
        isLoadingKpis, isLoadingMissions, isLoadingCharts, isLoadingResponses
    } = useEmergencyStore();
    
    const [selectedResponse, setSelectedResponse] = useState(null);
    const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
    const [selectedResponseFilter, setSelectedResponseFilter] = useState("");
    const [notRespondedSearch, setNotRespondedSearch] = useState("");
    const [failedSearch, setFailedSearch] = useState("");
    const [selectedCampaignId, setSelectedCampaignId] = useState("all");

    const {
        activeAlerts = 0,
        totalContacts = 0,
        successRate = 0,
        totalFallout = 0,
        totalReached = 0,
        totalResponded = 0,
        channelPulse = [],
        dispositionBreakdown = [],
        responseBreakdown = [],
        recentMissions = [],
        hourlyTrends = [],
        availableCampaigns = [],
        personnelStatusTable = {}
    } = dashboardStats || {};

    const handleCampaignFilterChange = (val) => {
        const id = (val === 'all' || val === '') ? null : val;
        setSelectedCampaignId(val);
        useEmergencyStore.getState().fetchDashboardData(id);
    };

    const filteredRespondedTable = (personnelStatusTable?.responded || []).filter(p => 
        !selectedResponseFilter || p.response === selectedResponseFilter
    );

    const filteredNotRespondedTable = (personnelStatusTable?.notResponded || []).filter(p => 
        !notRespondedSearch || (p.name || '').toLowerCase().includes(notRespondedSearch.toLowerCase()) || (p.phone || '').includes(notRespondedSearch)
    );

    const filteredFailedTable = (personnelStatusTable?.failed || []).filter(p => 
        !failedSearch || (p.name || '').toLowerCase().includes(failedSearch.toLowerCase()) || (p.phone || '').includes(failedSearch)
    );

    const pulseList = isLoadingCharts
        ? [1, 2, 3].map(i => ({ id: `sk-p-${i}`, isSkeleton: true, name: 'Loading...', color: '#e2e8f0' }))
        : (channelPulse && channelPulse.length > 0 ? channelPulse : []);

    const missionList = isLoadingMissions
        ? [1, 2, 3, 4, 5].map(i => ({ id: `sk-m-${i}`, isSkeleton: true, name: 'Loading...', status: 'Loading', startTime: '--:--' }))
        : (recentMissions && recentMissions.length > 0 ? recentMissions : []);

    const handleViewResponseMembers = async (respItem) => {
        setSelectedResponse(respItem);
        let filteredId = null;
        if (selectedCampaignId !== 'all' && selectedCampaignId !== '') {
            filteredId = parseInt(selectedCampaignId, 10);
            if (isNaN(filteredId)) filteredId = null;
        }

        const label = respItem.name ? String(respItem.name) : "";
        await fetchResponseMembers(label, filteredId);
        setIsResponseModalOpen(true);
    };

    return (
        <div className="emergency_dashboard_container">
            {/* DASHBOARD HEADER & FILTER */}
            <div className="admin_emergency_dashboard_top_row">
                <div className="dashboard_title_section">
                    <h2 className="dashboard_subtitle">Operational Overview</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="live_indicator">LIVE</span>
                        <span className="last_sync_text">Last Sync: {new Date().toLocaleTimeString()}</span>
                    </div>
                </div>

                <div className="dashboard_filter_section">
                    <span className="filter_label">Scope:</span>
                    <Select
                        options={[{ value: 'all', label: 'Overview: All Active Missions' }, ...(availableCampaigns || []).map(c => ({ value: String(c.id), label: c.name }))]}
                        onChange={handleCampaignFilterChange}
                        value={selectedCampaignId}
                        isLoading={isLoadingKpis}
                    />
                </div>
            </div>

            {/* 1. Global Performance Metrics (Predictive Style Premium Cards) */}
            <div className="predictive_dashboard_header" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>

                {/* 1. Active Missions */}
                <div className="stat_card_premium" style={{ "--accent-color": "#ff5200" }}>
                    <div className="stat_card_left">
                        <div className="stat_card_icon">
                            <Icon name="campaign" size={16} color="#ff5200" />
                        </div>
                        <span className="stat_card_label">Active Campaigns</span>
                    </div>
                    <div className="stat_card_right">
                        <span className="stat_card_value">{activeAlerts}</span>
                        <span className="stat_card_trend">Targeting all</span>
                    </div>
                </div>

                {/* 2. Total Audience */}
                <div className="stat_card_premium" style={{ "--accent-color": "#3b82f6" }}>
                    <div className="stat_card_left">
                        <div className="stat_card_icon">
                            <Icon name="phonenumber" size={16} color="#3b82f6" />
                        </div>
                        <span className="stat_card_label">Total Audience</span>
                    </div>
                    <div className="stat_card_right">
                        <span className="stat_card_value">{totalContacts.toLocaleString()}</span>
                        <span className="stat_card_trend text_success">Across groups</span>
                    </div>
                </div>

                {/* 3. Responded Personnel */}
                <div className="stat_card_premium" style={{ "--accent-color": "#10b981" }}>
                    <div className="stat_card_left">
                        <div className="stat_card_icon">
                            <Icon name="verified" size={16} color="#10b981" />
                        </div>
                        <span className="stat_card_label">Responded</span>
                    </div>
                    <div className="stat_card_right">
                        <span className="stat_card_value">{totalResponded.toLocaleString()}</span>
                        <span className="stat_card_trend trend_up">{totalContacts > 0 ? Math.round((totalResponded / totalContacts) * 100) : 0}% Engagement</span>
                    </div>
                </div>

                {/* 4. Not Responded */}
                <div className="stat_card_premium" style={{ "--accent-color": "#f59e0b" }}>
                    <div className="stat_card_left">
                        <div className="stat_card_icon">
                            <Icon name="timer" size={16} color="#f59e0b" />
                        </div>
                        <span className="stat_card_label">No Response</span>
                    </div>
                    <div className="stat_card_right">
                        <span className="stat_card_value">{Math.max(0, (totalContacts - totalFallout) - totalResponded).toLocaleString()}</span>
                        <span className="stat_card_trend trend_neutral">Reached, no input</span>
                    </div>
                </div>

                {/* 5. Failed Delivery */}
                <div className="stat_card_premium" style={{ "--accent-color": "#ef4444" }}>
                    <div className="stat_card_left">
                        <div className="stat_card_icon">
                            <Icon name="error" size={16} color="#ef4444" />
                        </div>
                        <span className="stat_card_label">Failed delivery</span>
                    </div>
                    <div className="stat_card_right">
                        <span className="stat_card_value">{totalFallout.toLocaleString()}</span>
                        <span className="stat_card_trend trend_down">Unreachable</span>
                    </div>
                </div>
            </div>

            {/* 2. Personnel Status Breakdown Sections (Three Columns) */}
            <div className="engagement_breakdown_area" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>

                {/* A. RESPONDED BREAKDOWN */}
                <div className="dashboard_section glass_morphism breakdown_detailed">
                    <div className="admin_emergency_section_header" style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="status_indicator_dot" style={{ backgroundColor: '#10b981' }} />
                            <h3 style={{ margin: 0 }}>Response Breakdown</h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Select
                                placeholder="All Responses"
                                value={selectedResponseFilter}
                                onChange={setSelectedResponseFilter}
                                width="140px"
                                variant="minimal"
                                options={[
                                    { label: "All Responses", value: "" },
                                    ...(responseBreakdown || [])
                                        .filter(r => !r.name.includes("Wrong Input"))
                                        .map(r => ({ label: r.name, value: r.name }))
                                ]}
                            />
                            <span className="section_count_tag">{filteredRespondedTable.length}</span>
                        </div>
                    </div>
                    <div className="compact_table_container">
                        <table className="breakdown_personnel_table compact">
                            <thead>
                                <tr>
                                    <th>Personnel Name</th>
                                    <th>Response Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingResponses ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i}><td colSpan="2"><div className="skeleton_text" style={{ width: '100%', height: '30px' }} /></td></tr>
                                    ))
                                ) : (filteredRespondedTable).length > 0 ? (
                                    filteredRespondedTable.map((p, i) => (
                                        <tr key={i}>
                                            <td className="p_name_cell">
                                                <div className="p_col_main">{p.name}</div>
                                                <div className="p_col_sub">{p.phone}</div>
                                            </td>
                                            <td>
                                                <div className="p_col_response"><span className="response_blob">{p.response}</span></div>
                                                <div className="p_col_meta"><span className={`channel_tag ${p.channel?.toLowerCase()}`}>{p.channel}</span> · {p.time}</div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="2" className="empty_row">{selectedResponseFilter ? `No responders for "${selectedResponseFilter}"` : "No responses"}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* B. NOT RESPONDED BREAKDOWN */}
                <div className="dashboard_section glass_morphism breakdown_detailed">
                    <div className="admin_emergency_section_header" style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="status_indicator_dot" style={{ backgroundColor: '#f59e0b' }} />
                            <h3 style={{ margin: 0 }}>No Response</h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="header_search_input">
                                <Icon name="search" size={14} color="#64748b" />
                                <input 
                                    type="text" 
                                    placeholder="Search..." 
                                    value={notRespondedSearch} 
                                    onChange={(e) => setNotRespondedSearch(e.target.value)} 
                                />
                            </div>
                            <span className="section_count_tag">{filteredNotRespondedTable.length}</span>
                        </div>
                    </div>
                    <div className="compact_table_container">
                        <table className="breakdown_personnel_table compact">
                            <thead>
                                <tr>
                                    <th>Personnel Name</th>
                                    <th>Last Attempt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingResponses ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i}><td colSpan="2"><div className="skeleton_text" style={{ width: '100%', height: '30px' }} /></td></tr>
                                    ))
                                ) : (filteredNotRespondedTable).length > 0 ? (
                                    filteredNotRespondedTable.map((p, i) => (
                                        <tr key={i}>
                                            <td className="p_name_cell">
                                                <div className="p_col_main">{p.name}</div>
                                                <div className="p_col_sub">{p.phone}</div>
                                            </td>
                                            <td>
                                                <div className="status_pill pending">Reached</div>
                                                <div className="p_col_meta"><span className={`channel_tag ${p.channel?.toLowerCase()}`}>{p.channel}</span> · {p.time}</div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="2" className="empty_row">{notRespondedSearch ? `No matches for "${notRespondedSearch}"` : "All reached have responded"}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* C. FAILED BREAKDOWN */}
                <div className="dashboard_section glass_morphism breakdown_detailed">
                    <div className="admin_emergency_section_header" style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="status_indicator_dot" style={{ backgroundColor: '#ef4444' }} />
                            <h3 style={{ margin: 0 }}>Failed delivery</h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="header_search_input">
                                <Icon name="search" size={14} color="#64748b" />
                                <input 
                                    type="text" 
                                    placeholder="Search..." 
                                    value={failedSearch} 
                                    onChange={(e) => setFailedSearch(e.target.value)} 
                                />
                            </div>
                            <span className="section_count_tag">{filteredFailedTable.length}</span>
                        </div>
                    </div>
                    <div className="compact_table_container">
                        <table className="breakdown_personnel_table compact">
                            <thead>
                                <tr>
                                    <th>Personnel Name</th>
                                    <th>Failure Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(filteredFailedTable).length > 0 ? (
                                    filteredFailedTable.map((p, i) => (
                                        <tr key={i}>
                                            <td className="p_name_cell">
                                                <div className="p_col_main">{p.name}</div>
                                                <div className="p_col_sub">{p.phone}</div>
                                            </td>
                                            <td className="p_error_cell">Unreachable / Timeout</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="2" className="empty_row">{failedSearch ? `No matches for "${failedSearch}"` : "No delivery failures"}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 2. MISSION RESPONSE PULSE (Redesigned) */}
            <div className="response_pulse_section">
                <div className="admin_emergency_section_header" style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon name="verified" size={20} color="#ff5200" />
                        <h3 style={{ margin: 0 }}>Campaign Response</h3>
                        <span className="live_indicator">REAL-TIME TELEMETRY</span>
                    </div>
                </div>

                <div className="response_pulse_layout">
                    {/* A. Global Engagement Overview */}
                    <div className="response_overview_card glass_morphism">
                        <div className="overview_header">
                            <span className="overview_title">Engagement Overview</span>
                            <span className="overview_subtitle">Total Audience vs Responded</span>
                        </div>
                        <div className="overview_body">
                            <div className="overview_chart_container">
                                {isLoadingCharts ? (
                                    <div className="skeleton_circle" />
                                ) : (
                                    <svg width="140" height="140" viewBox="0 0 140 140">
                                        <circle cx="70" cy="70" r="60" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                                        <circle
                                            cx="70" cy="70" r="60"
                                            fill="transparent"
                                            stroke="#ff5200"
                                            strokeWidth="12"
                                            strokeDasharray={2 * Math.PI * 60}
                                            strokeDashoffset={(2 * Math.PI * 60) * (1 - (totalResponded / (totalContacts || 1)))}
                                            strokeLinecap="round"
                                            transform="rotate(-90 70 70)"
                                            style={{ transition: 'stroke-dashoffset 1s ease' }}
                                        />
                                        <text x="70" y="70" textAnchor="middle" dominantBaseline="middle" className="overview_percent_text">
                                            {totalContacts > 0 ? Math.round((totalResponded / totalContacts) * 100) : 0}%
                                        </text>
                                        <text x="70" y="85" textAnchor="middle" dominantBaseline="middle" className="overview_label_text">
                                            RESPONSE
                                        </text>
                                    </svg>
                                )}
                            </div>
                            <div className="overview_stats">
                                <div className="overview_stat_item">
                                    <span className="stat_dot" style={{ backgroundColor: '#ff5200' }} />
                                    <div className="stat_info">
                                        <span className="stat_label">RESPONDED</span>
                                        <span className="stat_value" title="Actionable interactions received">{totalResponded.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="overview_stat_item">
                                    <span className="stat_dot" style={{ backgroundColor: '#64748b' }} />
                                    <div className="stat_info">
                                        <span className="stat_label">NOT RESPONDED</span>
                                        <span className="stat_value" title="Reached but no input">{Math.max(0, (totalContacts - totalFallout) - totalResponded).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="overview_stat_item">
                                    <span className="stat_dot" style={{ backgroundColor: '#cbd5e1' }} />
                                    <div className="stat_info">
                                        <span className="stat_label">PENDING / FALLOUT</span>
                                        <span className="stat_value" title="Not successfully reached">{totalFallout.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="overview_total_footer">
                                    <span>Total Audience: <b>{totalContacts.toLocaleString()}</b></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* B. Filtered Response Breakdown (List instead of Grid) */}
                    <div className="response_detailed_breakdown glass_morphism">
                        <div className="breakdown_header">
                            <span className="breakdown_title">Campaign Response Breakdown</span>
                            <span className="breakdown_subtitle">DTMF & WhatsApp Button Telemetry</span>
                        </div>
                        <div className="breakdown_list_container">
                            {isLoadingCharts ? (
                                [1, 2, 3, 4].map(i => <div key={i} className="breakdown_item skeleton" />)
                            ) : responseBreakdown.length > 0 ? (
                                <table className="breakdown_list_table">
                                    <thead>
                                        <tr>
                                            <th>RESPONSE TYPE</th>
                                            <th>COUNT</th>
                                            <th>SHARE</th>
                                            <th>ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {responseBreakdown.map((resp, idx) => (
                                            <tr key={idx} className="breakdown_row">
                                                <td className="resp_name_cell">
                                                    <span className="resp_dot" style={{ backgroundColor: resp.color }} />
                                                    {resp.name}
                                                </td>
                                                <td className="resp_value_cell">{resp.value.toLocaleString()}</td>
                                                <td className="resp_percent_cell">
                                                    {totalResponded > 0 ? Math.round((resp.value / totalResponded) * 100) : 0}%
                                                </td>
                                                <td>
                                                    <button className="view_resp_btn" onClick={() => handleViewResponseMembers(resp)}>
                                                        VIEW PERSONNEL
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="breakdown_empty">
                                    <Icon name="verified" size={32} color="#cbd5e1" />
                                    <p>Waiting for campaign-specific DTMF or WhatsApp button interactions...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bottom_analytics_row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                <div className={`dashboard_section glass_morphism disposition_health ${isLoadingCharts ? 'skeleton' : ''}`} style={{ height: 'auto' }}>
                    <div className="admin_emergency_section_header">
                        <h3>Delivery Vector Distribution</h3>
                    </div>
                    {isLoadingCharts ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                            <div className="skeleton_circle" style={{ width: '100px', height: '100px' }} />
                            <div style={{ width: '100%' }}>
                                {Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="skeleton_text" style={{ width: '100%', marginBottom: '12px' }} />
                                ))}
                            </div>
                        </div>
                    ) : (() => {
                        const ringTotal = (dispositionBreakdown || []).reduce((acc, curr) => acc + curr.value, 0);
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <DonutChart data={dispositionBreakdown || []} total={ringTotal} />
                                </div>
                                <div className="disposition_list" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                    {(dispositionBreakdown || []).map(d => (
                                        <div key={d.name} className="disposition_item">
                                            <div className="dis_label">
                                                <span className="status_dot_indicator" style={{ backgroundColor: d.color }} />
                                                {d.name}
                                            </div>
                                            <div className="dis_value">
                                                {ringTotal > 0 ? ((d.value / ringTotal) * 100).toFixed(1) : '0.0'}%
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                <div className={`dashboard_section glass_morphism missions_flow ${isLoadingMissions ? 'skeleton' : ''}`} style={{ height: 'auto' }}>
                    <div className="admin_emergency_section_header">
                        <h3>Campaign Deployment Timeline</h3>
                    </div>
                    <div className="mission_timeline_table_wrapper">
                        <table className="mission_timeline_table">
                            <thead>
                                <tr>
                                    <th>Target Campaign</th>
                                    <th>Status</th>
                                    <th>Audience</th>
                                    <th>Responded</th>
                                    <th>Progress</th>
                                    <th>T-Start</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(missionList || []).map((m, idx) => {
                                    const isSk = m.isSkeleton || isLoadingMissions;
                                    return (
                                        <tr key={m.id || `m-${idx}`}>
                                            <td className="mission_name">{isSk ? <div className="skeleton_text" style={{ width: '120px' }} /> : m.name}</td>
                                            <td>{isSk ? <div className="skeleton_text" style={{ width: '60px' }} /> : <span className={`status_capsule ${(m.status || '').toLowerCase()}`}>{m.status}</span>}</td>
                                            <td className="mission_stat_num">{isSk ? <div className="skeleton_text" style={{ width: '40px' }} /> : (m.totalAudience || 0).toLocaleString()}</td>
                                            <td className="mission_stat_num text_success">{isSk ? <div className="skeleton_text" style={{ width: '40px' }} /> : (m.responded || 0).toLocaleString()}</td>
                                            <td>
                                                <div className="timeline_progress">
                                                    <div className="timeline_fill" style={{ width: `${m.progress || 0}%` }} />
                                                </div>
                                            </td>
                                            <td className="mission_time">{isSk ? '--:--' : m.startTime}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* RESPONSE MEMBERS MODAL */}
            <Modal
                open={isResponseModalOpen}
                onClose={() => setIsResponseModalOpen(false)}
                width="800px"
            >
                <div className="admin_emergency_modal_content">
                    <div className="admin_emergency_modal_header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="modal_icon_circle" style={{ backgroundColor: selectedResponse?.color }}>
                                <Icon name="campaign" size={20} color="#fff" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Replying: "{selectedResponse?.name}"</h3>
                                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Total Responders: <b>{selectedResponse?.value} Personnel</b></p>
                            </div>
                        </div>
                        <Button variant="empty" onClick={() => setIsResponseModalOpen(false)}>
                            <Icon name="close" size={20} />
                        </Button>
                    </div>

                    <div className="admin_emergency_modal_body report_body">
                        {isFetchingResponseMembers ? (
                            <div className="report_loading">Retrieving personnel records...</div>
                        ) : responseMembers.length > 0 ? (
                            <div className="report_table_wrapper scrollable_table" style={{ maxHeight: '450px' }}>
                                <table className="report_logs_table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Personnel Phone</th>
                                            <th>Channel</th>
                                            <th>Campaign ID</th>
                                            <th>Campaign Name</th>
                                            <th>Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {responseMembers.map((member, idx) => (
                                            <tr key={idx}>
                                                <td>{idx + 1}</td>
                                                <td className="mission_name">{member.phone}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Icon
                                                            name={member.channel === 'WhatsApp' ? 'whatsapp' : 'campaign'}
                                                            size={14}
                                                            color={member.channel === 'WhatsApp' ? '#25D366' : '#ff5200'}
                                                        />
                                                        <span>{member.channel}</span>
                                                    </div>
                                                </td>
                                                <td>CAM-{member.campaignId}</td>
                                                <td className="mission_name">{member.campaignName || '---'}</td>
                                                <td>{new Date(member.time).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="report_empty">No personnel found for this response.</div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminEmergencyDashboard;
