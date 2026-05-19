import React from 'react';
import Icon from "../../../constants/Icon.jsx";
import { Button } from "../../../components/Index.jsx";

const AdminEmergencyAlerts = ({
    alerts,
    isLoadingAlerts,
    handleLaunchCampaign,
    handleStopCampaign,
    handleViewReport,
    handlePreviewFlow,
    handleCreateButtonClick
}) => {
    if (isLoadingAlerts) {
        return (
            <div className="admin_emergency_empty_container">
                <p>Loading alerts...</p>
            </div>
        );
    }

    if (alerts.length === 0) {
        return (
            <div className="admin_emergency_empty_container">
                <div className="admin_emergency_empty_state">
                    <div className="admin_emergency_empty_icon">
                        <Icon name="alert" size={48} color="#ff5200" />
                    </div>
                    <h3>No Active Emergency Alerts</h3>
                    <p>Launch an alert to reach your recipients via Call, WhatsApp, and SMS simultaneously or sequentially.</p>
                    <Button type="primary" onClick={handleCreateButtonClick}>
                        New Emergency Alert
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin_emergency_alerts_grid">
            {alerts.map(alert => (
                <div key={alert.id} className="alert_card">
                    <div className="alert_card_header">
                        <div className={`alert_priority_dot ${alert.priority.toLowerCase()}`} title={`Priority: ${alert.priority}`} />
                        <span className={`alert_status_badge ${alert.status.toLowerCase()}`}>
                            {alert.status}
                        </span>
                    </div>

                    <div className="alert_card_body">
                        <h3>{alert.name}</h3>
                        <div className="alert_meta_time">
                            <Icon name={alert.scheduledAt ? 'calender' : 'timer'} size={14} />
                            {alert.scheduledAt ? (
                                <span className="scheduled_text">
                                    {new Date(alert.scheduledAt.includes(' ') ? alert.scheduledAt.replace(' ', 'T') : alert.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                            ) : (
                                <span>{new Date(alert.launchedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            )}
                        </div>
                    </div>

                    <div className="alert_card_stats">
                        <div className="stats_row">
                            <span className="stats_label">Recipient Reach</span>
                            <span className="stats_count">{alert.stats.reached} / {alert.stats.total}</span>
                        </div>
                        <div className="stats_progress_bar">
                            <div
                                className="stats_progress_fill"
                                style={{ width: `${(alert.stats.reached / alert.stats.total) * 100}%` }}
                            />
                        </div>
                    </div>

                    <div className="alert_card_footer">
                        <div className="alert_channels_box">
                            {(alert.channels || []).map(ch => (
                                <div key={ch} className="channel_mini_icon active">
                                    <Icon
                                        name={(ch === 'CALL' || ch === 'IVR') ? 'alert' : ch === 'WA' ? 'whatsapp' : 'sms'}
                                        size={16}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="alert_card_actions">
                            {alert.status === 'DRAFT' || alert.status === 'SCHEDULED' ? (
                                <button className="btn_launch" onClick={(e) => { e.stopPropagation(); handleLaunchCampaign(alert.id); }}>
                                    <Icon name="alert" size={16} color="#fff" /> Launch
                                </button>
                            ) : alert.status === 'EXECUTING' ? (
                                <button className="btn_stop" onClick={(e) => { e.stopPropagation(); handleStopCampaign(alert.id); }}>
                                    <Icon name="close" size={16} color="#fff" />  Stop
                                </button>
                            ) : alert.status === 'COMPLETED' ? (
                                <button className="btn_launch" onClick={(e) => { e.stopPropagation(); handleLaunchCampaign(alert.id); }}>
                                    <Icon name="alert" size={16} color="#fff" /> Restart
                                </button>
                            ) : null}
                            <button className="btn_preview" onClick={(e) => { e.stopPropagation(); handlePreviewFlow(alert.id); }} title="Preview Campaign Flow">
                                <Icon name="timer" size={16} />
                            </button>
                            <button className="btn_report" onClick={(e) => { e.stopPropagation(); handleViewReport(alert.id); }} title="View Detailed Report">
                                <Icon name="rightarrow" size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AdminEmergencyAlerts;
