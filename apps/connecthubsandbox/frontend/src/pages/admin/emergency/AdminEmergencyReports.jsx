import React, { useState } from 'react';
import Icon from "../../../constants/Icon.jsx";
import { Select, DateTimeRangePicker, Table, Button, Modal } from "../../../components/Index.jsx";
import WhatsAppPreview from './components/WhatsAppPreview.jsx';
import { useEmergencyStore } from "../../../store/admin/useEmergencyStore";

const AdminEmergencyReports = ({
    alerts,
    fetchCdrData,
    fetchCdrCount,
    isfetchLoading,
    page,
    pageSize,
    offset,
    reportsCampaignFilter,
    reportsChannelFilter,
    reportsDispositionFilter,
    reportsDateRange,
    setPage,
    setPageSize,
    setOffset,
    setReportsCampaignFilter,
    setReportsChannelFilter,
    setReportsDispositionFilter,
    reportsResponseFilter,
    setReportsResponseFilter,
    setReportsDateRange
}) => {
    const { exportAllReports } = useEmergencyStore();
    const [modalData, setModalData] = useState({
        open: false,
        title: "",
        content: null
    });

    const campaignOptions = alerts.map(alert => ({
        label: alert.name,
        value: alert.id
    }));

    const columns = [
        {
            title: "S.no",
            key: "s_no",
            width: 60,
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        },
        {
            title: "Timestamp",
            key: "c_createdOn",
            Cell: (row) => new Date(row.c_createdOn).toLocaleString()
        },
        {
            title: "Campaign ID",
            key: "c_campaignId"
        },
        { title: "Campaign Name", key: "c_campaignName" },
        { title: "Member Name", key: "c_memberName" },
        { title: "Lead Number", key: "c_customerPhoneno" },
        {
            title: "Channel",
            key: "c_channel",
            width: 100,
            Cell: (row) => {
                const getIconConfig = (channel) => {
                    switch (channel) {
                        case 'WA': return { name: 'whatsapp', color: '#25D366', label: 'WhatsApp' };
                        case 'SMS': return { name: 'sms', color: '#007AFF', label: 'SMS' };
                        default: return { name: 'alert', color: '#ff5200', label: 'IVR' };
                    }
                };
                const config = getIconConfig(row.c_channel);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon name={config.name} size={16} color={config.color} />
                        <span>{config.label}</span>
                    </div>
                );
            }
        },
        {
            title: "Disposition",
            key: "c_disposition",
            Cell: (row) => (
                <span className={`status_capsule ${row.c_disposition.toLowerCase()}`}>
                    {row.c_disposition}
                </span>
            )
        },
        {
            title: "Duration",
            key: "c_duration",
            Cell: (row) => `${row.c_duration}s`
        },
        {
            title: "Message",
            key: "c_messageContent",
            width: 300,
            Cell: (row) => {
                const content = row.c_messageContent;
                if (!content) return "-";

                let isWhatsApp = row.c_channel === 'WA';
                let displayText = content;

                if (isWhatsApp) {
                    try {
                        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
                        const body = parsed.components?.find(c => c.type?.toUpperCase() === 'BODY');
                        displayText = body?.text || JSON.stringify(parsed);
                    } catch (e) {
                        displayText = typeof content === 'string' ? content : JSON.stringify(content);
                    }
                } else if (typeof content === 'object') {
                    displayText = JSON.stringify(content);
                }

                return (
                    <span
                        title="Click to view full message"
                        style={{ cursor: "pointer", color: "#2563eb" }}
                        onClick={() =>
                            setModalData({
                                open: true,
                                title: isWhatsApp ? "WhatsApp Message Preview" : "Message Content",
                                content: isWhatsApp ? <WhatsAppPreview data={content} /> : displayText,
                            })
                        }
                    >
                        {displayText.length > 50
                            ? `${displayText.substring(0, 50)}...`
                            : displayText}
                    </span>
                );
            }
        },
        {
            title: "Response",
            key: "c_ivrResponse",
            width: 200,
            Cell: (row) => {
                const resp = row.c_ivrResponse;
                if (!resp) return "-";

                let displayText = resp;
                if (typeof resp === 'object') {
                    try {
                        const body = resp.components?.find(c => c.type?.toUpperCase() === 'BODY');
                        displayText = body?.text || JSON.stringify(resp);
                    } catch (e) {
                        displayText = JSON.stringify(resp);
                    }
                }

                return (
                    <span style={{ color: '#475569' }}>
                        {displayText.length > 50
                            ? `${displayText.substring(0, 50)}...`
                            : displayText}
                    </span>
                );
            }
        }
    ];

    const filteredColumns = columns; // Alias for standardization

    return (
        <div className="admin_emergency_reports_container">
            <div className="admin_emergency_reports_filter_bar">
                <Select
                    placeholder="Filter by Campaign"
                    width="250px"
                    value={reportsCampaignFilter}
                    onChange={setReportsCampaignFilter}
                    options={[{ label: "All Campaigns", value: "" }, ...campaignOptions]}
                    showSearch
                />
                <Select
                    placeholder="Filter by Channel"
                    width="200px"
                    value={reportsChannelFilter}
                    onChange={setReportsChannelFilter}
                    options={[
                        { label: "All Channels", value: "" },
                        { label: "IVR", value: "IVR" },
                        { label: "WhatsApp", value: "WA" },
                        { label: "SMS", value: "SMS" }
                    ]}
                />
                <Select
                    placeholder="Filter by Status"
                    width="200px"
                    value={reportsDispositionFilter}
                    onChange={setReportsDispositionFilter}
                    options={[
                        { label: "All Status", value: "" },
                        { label: "ANSWER (IVR)", value: "ANSWER" },
                        { label: "NO ANSWER (IVR)", value: "NO ANSWER" },
                        { label: "BUSY (IVR)", value: "BUSY" },
                        { label: "FAILED (IVR)", value: "FAILED" },
                        { label: "READ (WA)", value: "read" },
                        { label: "DELIVERED (WA)", value: "delivered" },
                        { label: "SENT (WA)", value: "sent" },
                        { label: "QUEUED (WA)", value: "queued" },
                        { label: "DELIVERED (SMS)", value: "DELIVRD" },
                        { label: "REJECTED (SMS)", value: "REJECTD" },
                        { label: "SENT (SMS)", value: "SENT" }
                    ]}
                />
                <Select
                    placeholder="Filter by Response"
                    width="200px"
                    value={reportsResponseFilter}
                    onChange={setReportsResponseFilter}
                    options={[
                        { label: "All Responses", value: "" },
                        ...([...new Set(fetchCdrData.map(log => log.c_ivrResponse))]
                            .filter(r => r && r !== "-")
                            .map(r => ({ label: r, value: r })))
                    ]}
                    showSearch
                />
                <DateTimeRangePicker
                    key={reportsDateRange[0] ? "date-set" : "date-empty"}
                    value={{ start: reportsDateRange[0], end: reportsDateRange[1] }}
                    onChange={(range) => {
                        if (range.end) {
                            const eod = new Date(range.end);
                            eod.setHours(23, 59, 59, 999);
                            setReportsDateRange([range.start, eod]);
                        } else {
                            setReportsDateRange([range.start, range.end]);
                        }
                    }}
                />
                <Button
                    variant="outlined"
                    onClick={() => {
                        setReportsCampaignFilter("");
                        setReportsChannelFilter("");
                        setReportsDispositionFilter("");
                        setReportsResponseFilter("");
                        setReportsDateRange([null, null]);
                    }}
                >
                    Clear
                </Button>
            </div>

            <Table
                columns={filteredColumns}
                data={fetchCdrData}
                loading={isfetchLoading}
                totaldata={fetchCdrCount}
                page={page}
                serverSide
                pageSize={pageSize}
                onPageChange={(pagevalues) => {
                    setTimeout(() => {
                        setPage(pagevalues.currentPage);
                        setPageSize(pagevalues.pageSize);
                        setOffset(
                            pagevalues.pageSize * pagevalues.currentPage -
                            pagevalues.pageSize,
                        );
                    }, 0);
                }}
            />

            <Modal
                open={modalData.open}
                onClose={() => setModalData({ ...modalData, open: false })}
                width="600px"
                closeOnOverlayClick={true}
            >
                <div className="admin_emergency_report_modal_header">
                    <p className="admin_emergency_report_modal_title">{modalData.title}</p>
                    <Button
                        variant="empty"
                        onClick={() => setModalData({ ...modalData, open: false })}
                    >
                        <Icon name="close" color="#0F172A" size="14" />
                    </Button>
                </div>
                <div className="admin_emergency_report_modal_body">
                    {modalData.content}
                </div>
            </Modal>
        </div>
    );
};

export default AdminEmergencyReports;
