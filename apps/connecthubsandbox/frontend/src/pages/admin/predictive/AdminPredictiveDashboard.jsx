import React, { useEffect, useState } from 'react';
import { usePredictiveStore } from '../../../store/admin/predictive/usePredictiveStore';
import { useCampaignStore } from '../../../store/admin/useCampaignStore';
import Icon from '../../../constants/Icon';
import './styles/AdminPredictiveDashboard.css';

const AdminPredictiveDashboard = () => {
    const [selectedCampaignId, setSelectedCampaignId] = useState("");
    const { predictiveDashboardData, getPredictiveDashboard } = usePredictiveStore();
    const { CampaignData } = useCampaignStore();

    useEffect(() => {
        getPredictiveDashboard(selectedCampaignId);
        const interval = setInterval(() => {
            getPredictiveDashboard(selectedCampaignId);
        }, 10000);
        return () => clearInterval(interval);
    }, [selectedCampaignId, getPredictiveDashboard]);

    const stats = predictiveDashboardData ? {
        totalLeads: predictiveDashboardData.totalLeads || 0,
        processed: predictiveDashboardData.processed || "0%",
        activeCampaigns: predictiveDashboardData.activeCampaigns || 0,
        stopped: predictiveDashboardData.stopped || 0,
        totalCalls: predictiveDashboardData.totalCalls || 0,
        successRate: predictiveDashboardData.successRate || 0,
        trend: predictiveDashboardData.trend || "Stable",
        calledLeads: predictiveDashboardData.completedLeads || 0,
        pendingLeads: predictiveDashboardData.newLeads || 0,
        totalRetries: predictiveDashboardData.totalRetries || 0,
        retrySuccess: predictiveDashboardData.retrySuccess || 0,
        answeredCount: predictiveDashboardData.answeredCount || 0,
        noAnswerCount: predictiveDashboardData.noAnswerCount || 0,
        failedCount: predictiveDashboardData.failedCount || 0,
        activeCalls: predictiveDashboardData.activeCalls || 0,
        availableAgents: predictiveDashboardData.availableAgents || 0,
        callsTodayRealTime: predictiveDashboardData.callsTodayRealTime || 0,
        connectedTodayRealTime: predictiveDashboardData.connectedTodayRealTime || 0,
        totalCallsRealTime: predictiveDashboardData.totalCallsRealTime || 0,
        totalConnectedRealTime: predictiveDashboardData.totalConnectedRealTime || 0,
        currentRatio: predictiveDashboardData.currentRatio || 0,
        campaignLiveStats: predictiveDashboardData.campaignLiveStats || []
    } : {
        totalLeads: 0, processed: "0%", activeCampaigns: 0, stopped: 0,
        totalCalls: 0, successRate: 0, trend: "Idle",
        calledLeads: 0, pendingLeads: 0, totalRetries: 0, retrySuccess: 0,
        answeredCount: 0, noAnswerCount: 0, failedCount: 0,
        activeCalls: 0, availableAgents: 0, callsTodayRealTime: 0,
        connectedTodayRealTime: 0, totalCallsRealTime: 0, totalConnectedRealTime: 0,
        currentRatio: 0, campaignLiveStats: []
    };

    const dailyData = predictiveDashboardData?.dailyCallVolume?.map(d => ({
        day: d.name,
        answered: d.answered,
        noAnswer: d.noAnswer,
        failed: d.failed
    })) || [
            { day: 'Mon', answered: 400, noAnswer: 240, failed: 80 },
            { day: 'Tue', answered: 300, noAnswer: 139, failed: 20 },
            { day: 'Wed', answered: 200, noAnswer: 980, failed: 10 },
            { day: 'Thu', answered: 278, noAnswer: 390, failed: 100 },
            { day: 'Fri', answered: 189, noAnswer: 480, failed: 50 },
            { day: 'Sat', answered: 239, noAnswer: 380, failed: 15 },
            { day: 'Sun', answered: 349, noAnswer: 430, failed: 0 }
        ];

    // Calculate dynamic Y-axis scale based on max dailyData value
    const maxDataVal = Math.max(
        ...dailyData.map(d => Math.max(d.answered || 0, d.noAnswer || 0, d.failed || 0)),
        10 // fallback minimum to prevent division by zero
    );
    const power = Math.floor(Math.log10(Math.max(maxDataVal / 4, 1)));
    const magnitude = Math.pow(10, power);
    let step = Math.ceil((maxDataVal / 4) / magnitude) * magnitude;
    // Adjust step to make numbers 'nicer' to read
    if (step === 3 * magnitude) step = 4 * magnitude;
    else if ([6, 7, 8, 9].includes(step / magnitude)) step = 10 * magnitude;

    const yAxisMax = step * 4;
    const yAxisLabels = [yAxisMax, step * 3, step * 2, step, 0].map(val =>
        val >= 1000 ? (val / 1000).toFixed(val % 1000 !== 0 ? 1 : 0) + 'K' : val
    );

    return (
        <div className="admin_predictive_dashboard">
            {/* Row 1: Header Stats */}
            <div className="predictive_dashboard_header">
                <div className="stat_card_premium" style={{ "--accent-color": "#3b82f6" }}>
                    <div className="stat_card_left">
                        <div className="stat_card_icon">
                            <Icon name="groups" size={16} color="#3b82f6" />
                        </div>
                        <span className="stat_card_label">Total Leads</span>
                    </div>
                    <div className="stat_card_right">
                        <span className="stat_card_value">{stats.totalLeads.toLocaleString()}</span>
                        <span className="stat_card_trend trend_up">Global Account</span>
                    </div>
                </div>

                <div className="stat_card_premium" style={{ "--accent-color": "#f59e0b" }}>
                    <div className="stat_card_left">
                        <div className="stat_card_icon">
                            <Icon name="sandclock" size={16} color="#f59e0b" />
                        </div>
                        <span className="stat_card_label">New Leads</span>
                    </div>
                    <div className="stat_card_right">
                        <span className="stat_card_value">{stats.pendingLeads.toLocaleString()}</span>
                        <span className="stat_card_trend">Awaiting Dial</span>
                    </div>
                </div>

                <div className="stat_card_premium" style={{ "--accent-color": "#10b981" }}>
                    <div className="stat_card_left">
                        <div className="stat_card_icon">
                            <Icon name="call" size={16} color="#10b981" />
                        </div>
                        <span className="stat_card_label">Answered</span>
                    </div>
                    <div className="stat_card_right">
                        <span className="stat_card_value">{stats.answeredCount.toLocaleString()}</span>
                        <span className="stat_card_trend trend_up">Connected</span>
                    </div>
                </div>

                <div className="stat_card_premium" style={{ "--accent-color": "#64748b" }}>
                    <div className="stat_card_left">
                        <div className="stat_card_icon">
                            <Icon name="unanswer" size={16} color="#64748b" />
                        </div>
                        <span className="stat_card_label">No Answer</span>
                    </div>
                    <div className="stat_card_right">
                        <span className="stat_card_value">{stats.noAnswerCount.toLocaleString()}</span>
                        <span className="stat_card_trend">Did not pick up</span>
                    </div>
                </div>

                <div className="stat_card_premium" style={{ "--accent-color": "#ef4444" }}>
                    <div className="stat_card_left">
                        <div className="stat_card_icon">
                            <Icon name="timer" size={16} color="#ef4444" />
                        </div>
                        <span className="stat_card_label">Failed</span>
                    </div>
                    <div className="stat_card_right">
                        <span className="stat_card_value">{stats.failedCount.toLocaleString()}</span>
                        <span className="stat_card_trend trend_down">System/Stale</span>
                    </div>
                </div>
            </div>

            {/* Row 2: Grid Content */}
            <div className="predictive_dashboard_grid">
                {/* Left Column: Historical Volume Chart */}
                <div className="dashboard_panel chart_panel">
                    <div className="panel_title" style={{ marginBottom: "15px" }}>
                        <span>Daily Call Volume</span>
                        <select
                            className="dashboard_filter_select"
                            value={selectedCampaignId}
                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                        >
                            <option value="">All Campaigns</option>
                            {CampaignData && Array.isArray(CampaignData) && CampaignData.filter(c => c.dialerType === "PREDICTIVE").map(campaign => (
                                <option key={campaign.campaignId} value={campaign.campaignId}>
                                    {campaign.campaignName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="vertical_bars">
                        <div className="chart_y_axis">
                            {yAxisLabels.map((l, i) => <span key={i}>{l}</span>)}
                        </div>
                        <div className="bars_wrapper">
                            {dailyData.map((d, index) => (
                                <div key={index} className="chart_bar_group">
                                    <div className="grouped_bars_container">
                                        <div className="chart_bar" style={{ height: `${(d.answered / yAxisMax) * 100}%`, background: '#10b981' }} data-value={d.answered} title="Answered" />
                                        <div className="chart_bar" style={{ height: `${(d.noAnswer / yAxisMax) * 100}%`, background: '#f59e0b' }} data-value={d.noAnswer} title="No Answer" />
                                        <div className="chart_bar" style={{ height: `${(d.failed / yAxisMax) * 100}%`, background: '#ef4444' }} data-value={d.failed} title="Failed" />
                                    </div>
                                    <span className="bar_label">{d.day}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="chart_legend" style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px', fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '3px' }}></div>
                            Answered
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '3px' }}></div>
                            No Answer
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '3px' }}></div>
                            Failed
                        </div>
                    </div>
                    {/* Lead Status Overview */}
                    <div className="lead_status_overview" style={{ borderTop: '1px solid #e2e8f0', marginTop: '24px', paddingTop: '20px' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '15px' }}>Lead Status Overview</div>
                        <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                            <div style={{ width: `${stats.totalLeads > 0 ? (stats.calledLeads / stats.totalLeads) * 100 : 0}%`, background: '#10b981', transition: 'width 0.5s ease' }} title={`Completed: ${(stats.calledLeads || 0).toLocaleString()}`}></div>
                            <div style={{ width: `${stats.totalLeads > 0 ? (stats.totalRetries / stats.totalLeads) * 100 : 0}%`, background: '#3b82f6', transition: 'width 0.5s ease' }} title={`Retrying: ${(stats.totalRetries || 0).toLocaleString()}`}></div>
                            <div style={{ width: `${stats.totalLeads > 0 ? (stats.pendingLeads / stats.totalLeads) * 100 : 0}%`, background: '#f59e0b', transition: 'width 0.5s ease' }} title={`New: ${(stats.pendingLeads || 0).toLocaleString()}`}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px' }}></div>
                                Completed: {(stats.calledLeads || 0).toLocaleString()}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '10px', height: '10px', background: '#3b82f6', borderRadius: '2px' }}></div>
                                Retrying: {(stats.totalRetries || 0).toLocaleString()}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '2px' }}></div>
                                New: {(stats.pendingLeads || 0).toLocaleString()}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '10px', height: '10px', background: '#e2e8f0', borderRadius: '2px' }}></div>
                                Total: {(stats.totalLeads || 0).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Mini Table + Retry Stats */}
                <div className="dashboard_panel_stack">
                    {/* Live Campaign Table (Mini Version) */}
                    <div className="dashboard_panel mini_table_panel">
                        <div className="panel_title">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0px 5px 24px' }}>
                                <div className="live_pulse" style={{ width: '8px', height: '8px' }}></div>
                                <span style={{ fontSize: '0.9rem' }}>Active Campaigns</span>
                            </div>
                        </div>
                        <div className="campaign_live_table_wrapper mini_version">
                            <table className="campaign_live_table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Ratio</th>
                                        <th>Active</th>
                                        <th>Agents</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.campaignLiveStats.length > 0 ? (
                                        stats.campaignLiveStats.map((camp, idx) => (
                                            <tr key={idx}>
                                                <td className="camp_name_cell">{camp.campaignName}</td>
                                                <td>{camp.ratio}</td>
                                                <td className="active_cell">{camp.activeCalls}</td>
                                                <td className="agent_cell" style={{ color: camp.availableAgents > 0 ? '#10b981' : '#ef4444' }}>
                                                    {camp.availableAgents}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="4" className="no_data_cell">None active</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Retry Statistics */}
                    <div className="dashboard_panel">
                        <div className="panel_title">
                            <span>Retry Statistics</span>
                        </div>
                        <div className="retry_stats_center mini_retry">
                            <div className="retry_circle" style={{ width: '90px', height: '90px' }}>
                                <span className="retry_main_val" style={{ fontSize: '1.2rem' }}>{stats.successRate}%</span>
                                <span className="retry_sub_val" style={{ fontSize: '0.6rem' }}>Success</span>
                            </div>
                            <div className="retry_details_list">
                                <div className="retry_detail_item">
                                    <div className="retry_dot" style={{ background: '#10b981' }} />
                                    <span className="retry_label">Total Called</span>
                                    <span className="retry_value">{stats.calledLeads}</span>
                                </div>
                                <div className="retry_detail_item">
                                    <div className="retry_dot" style={{ background: '#3b82f6' }} />
                                    <span className="retry_label">Answered</span>
                                    <span className="retry_value">{stats.answeredCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPredictiveDashboard;
