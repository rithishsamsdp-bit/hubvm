import React, { useState, useEffect } from "react";
import "./styles/AdminEmergency.css";
import { Button, Modal, Input, Table, Select, DateTimeRangePicker, Popupconfirm, Icon } from "../../../components/Index.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { useEmergencyStore } from "../../../store/admin/useEmergencyStore";
import { toast } from "../../../store/useToastStore";

// Separate modular components
import AdminEmergencyDashboard from "./AdminEmergencyDashboard";
import AdminEmergencyAlerts from "./AdminEmergencyAlerts";
import AdminEmergencyGroups from "./AdminEmergencyGroups";
import AdminEmergencyReports from "./AdminEmergencyReports";

import WhatsAppPreview from "./components/WhatsAppPreview.jsx";

const tabs = ["Dashboard", "Alerts", "Groups", "Reports"];

const AdminEmergency = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        groups, fetchGroups,
        alerts, fetchAlerts, isLoadingAlerts,
        createGroup, fetchGroupContacts, updateGroup, deleteGroup,
        launchCampaign, stopCampaign, fetchCampaignReport, fetchAllReports,
        allLogs, allLogsCount, isAllReportsLoading,
        dashboardStats, fetchDashboardData
    } = useEmergencyStore();

    const [activeTab, setActiveTab] = useState(() => {
        // Recover from localStorage on refresh, fallback to location state then Dashboard
        return localStorage.getItem("emergency_active_tab") || (location.state?.activeTab) || "Dashboard";
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [reportPage, setReportPage] = useState(1);
    const [reportPageSize] = useState(10);
    const [detailModalData, setDetailModalData] = useState({ open: false, title: "", content: "" });
    const [isEditing, setIsEditing] = useState(false);
    const [editingGroupId, setEditingGroupId] = useState(null);
    const [newGroupName, setNewGroupName] = useState("");
    const [contacts, setContacts] = useState([]); // Array of { name, phone }
    const [currentPage, setCurrentPage] = useState(1);
    const [manualContact, setManualContact] = useState({ name: "", phone: "" });

    // Preview Flow State
    const [isPreviewFlowModalOpen, setIsPreviewFlowModalOpen] = useState(false);
    const [selectedFlowData, setSelectedFlowData] = useState(null);
    const [isFetchingFlow, setIsFetchingFlow] = useState(false);

    // Reports Tab State
    const [reportsPage, setReportsPage] = useState(1);
    const [reportsPageSize, setReportsPageSize] = useState(10);
    const [reportsOffset, setReportsOffset] = useState(0);
    const [reportsCampaignFilter, setReportsCampaignFilter] = useState("");
    const [reportsChannelFilter, setReportsChannelFilter] = useState("");
    const [reportsDispositionFilter, setReportsDispositionFilter] = useState("");
    const [reportsResponseFilter, setReportsResponseFilter] = useState("");
    const [reportsDateRange, setReportsDateRange] = useState(() => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return [start, end];
    });

    // Confirmation Popup State
    const [confirmPopup, setConfirmPopup] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
        confirmText: "Confirm",
        type: "primary" // primary, danger
    });

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
            localStorage.setItem("emergency_active_tab", location.state.activeTab);
        }
    }, [location.state]);

    useEffect(() => {
        localStorage.setItem("emergency_active_tab", activeTab);
    }, [activeTab]);

    useEffect(() => {
        setReportsPage(1);
    }, [reportsCampaignFilter, reportsChannelFilter, reportsDispositionFilter, reportsResponseFilter, reportsDateRange]);

    useEffect(() => {
        if (activeTab === 'Dashboard') { // Changed from 'DASHBOARD'
            fetchDashboardData();
        }
    }, [activeTab]);

    useEffect(() => {
        setReportsOffset((reportsPage - 1) * reportsPageSize);
    }, [reportsPage, reportsPageSize]);

    useEffect(() => {
        if (activeTab === 'Alerts' || activeTab === 'Reports') fetchAlerts(); // Changed from 'ALERTS', 'REPORTS'
        if (activeTab === 'Groups') fetchGroups(); // Changed from 'GROUPS'
        if (activeTab === 'Reports') { // Changed from 'REPORTS'
            fetchAllReports(
                reportsPageSize,
                reportsOffset,
                reportsCampaignFilter,
                reportsChannelFilter,
                reportsDispositionFilter,
                reportsDateRange[0],
                reportsDateRange[1],
                reportsResponseFilter
            );
        }
    }, [activeTab, reportsPage, reportsPageSize, reportsOffset, reportsCampaignFilter, reportsChannelFilter, reportsDispositionFilter, reportsDateRange, reportsResponseFilter]);

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            toast.error("Please enter a group name");
            return;
        }
        if (contacts.length === 0) {
            toast.error("Please add at least one contact");
            return;
        }
        const success = await createGroup({
            name: newGroupName,
            contacts: contacts,
            contactCount: contacts.length
        });
        if (success) {
            handleCloseModal();
            fetchGroups();
        }
    };
    const handleUpdateGroup = async () => {
        if (!newGroupName.trim()) {
            toast.error("Please enter a group name");
            return;

        }
        if (contacts.length === 0) {
            toast.error("Please add at least one contact");
            return;

        }
        const success = await updateGroup(editingGroupId, {
            name: newGroupName,
            contacts: contacts
        });
        if (success) {
            handleCloseModal();
            fetchGroups();

        }

    };


    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditing(false);
        setEditingGroupId(null);
        setNewGroupName("");
        setContacts([]);
        setManualContact({ name: "", phone: "" });
        setCurrentPage(1);
    };

    const handleDeleteGroup = (group) => {
        setConfirmPopup({
            isOpen: true,
            title: "Delete Group",
            message: `Are you sure you want to delete the group "${group.name}" ? This action cannot be undone.`,
            confirmText: "Delete",
            onConfirm: async () => {
                const success = await deleteGroup(group.id);
                if (success) {
                    fetchGroups();
                }
                setConfirmPopup(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleViewContacts = async (group) => {
        setIsEditing(true);
        setEditingGroupId(group.id);
        setNewGroupName(group.name);
        const fetchedContacts = await fetchGroupContacts(group.id);
        setContacts(fetchedContacts.map(c => ({ ...c, id: Math.random().toString() })));
        setIsModalOpen(true);
    };

    const handleLaunchCampaign = (campaignId) => {
        setConfirmPopup({
            isOpen: true,
            title: "Launch Campaign",
            message: "Are you sure you want to launch this emergency alert now?",
            confirmText: "Launch",
            onConfirm: async () => {
                const success = await launchCampaign(campaignId);
                if (success) {
                    setActiveTab('Alerts'); // Changed from 'ALERTS'
                    fetchAlerts();
                }
                setConfirmPopup(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleStopCampaign = (campaignId) => {
        setConfirmPopup({
            isOpen: true,
            title: "Emergency Stop",
            message: "Are you sure you want to STOP this active emergency alert? This cannot be undone.",
            confirmText: "Stop Campaign",
            onConfirm: async () => {
                await stopCampaign(campaignId);
                fetchAlerts();
                setConfirmPopup(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split("\n");
            const newContacts = lines.slice(1).map(line => {
                const [name, phone] = line.split(",").map(item => item?.trim());
                if (name && phone) return { name, phone, id: Math.random().toString() };
                return null;
            }).filter(Boolean);
            if (newContacts.length > 0) {
                setContacts(prev => [...prev, ...newContacts]);
                setCurrentPage(1); // Reset to first page on upload
                toast.success(`Imported ${newContacts.length} contacts`);
            }
        };
        reader.readAsText(file);
    };

    const handleViewReport = async (campaignId) => {
        setIsLoadingReport(true);
        setIsReportModalOpen(true);
        const data = await fetchCampaignReport(campaignId);
        if (data) {
            setReportData(data);
        }
        setIsLoadingReport(false);
    };

    const handlePreviewFlow = async (campaignId) => {
        setIsFetchingFlow(true);
        setIsPreviewFlowModalOpen(true);
        const { getCampaignDetails } = useEmergencyStore.getState();
        const data = await getCampaignDetails(campaignId);
        if (data && data.orchestration) {
            setSelectedFlowData(data);
        }
        setIsFetchingFlow(false);
    };

    const handleCloseReportModal = () => {
        setIsReportModalOpen(false);
        setReportData(null);
        setReportPage(1);
    };

    const addManualContact = () => {
        setContacts(prev => [...prev, { name: "", phone: "", id: Math.random().toString() }]);
        // Stay on current page, or move to last page? Let's stay.
    };

    const updateContact = (id, field, value) => {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const removeContact = (id) => {
        setContacts(prev => prev.filter(c => c.id !== id));
    };

    const downloadSampleCSV = () => {
        const csvContent = "data:text/csv;charset=utf-8,Name,Phone\nJohn Doe,919876543210\nJane Smith,919876543211";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "emergency_contacts_sample.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCreateButtonClick = () => {
        navigate("/admin-emergency-create");
    };

    return (
        <div className="admin_emergency_dashboard_root">
            {/* Top Bar - navbar_2 Style */}
            <div className="navbar_2">
                <div>
                    <p className="navbar_2_heading">Emergency</p>
                    <span className="navbar_2_breadcrumb">
                        <span className="navbar_2_breadcrumb_item"
                            onClick={() => navigate("/admin-dashboard")}
                        >Dashboard</span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_2_breadcrumb_item"
                            onClick={() => setActiveTab("Dashboard")}
                        >Emergency</span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_2_breadcrumb_item active">{activeTab}</span>
                    </span>

                    {/* Tabs Row */}
                    <div className="navbar_2_tabs">
                        {tabs.map((tab) => (
                            <div
                                key={tab}
                                className={`navbar_2_tab_item ${activeTab === tab ? "active" : ""} `}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    {activeTab === 'Alerts' ? (
                        <Button type="primary" onClick={handleCreateButtonClick}>
                            New Emergency Alert
                        </Button>
                    ) : activeTab === 'Groups' ? (
                        <Button type="primary" onClick={() => setIsModalOpen(true)}>
                            Create New Group
                        </Button>
                    ) : activeTab === 'Reports' ? (
                        <Button
                            variant="primary"
                            onClick={() => {
                                const { exportAllReports } = useEmergencyStore.getState();
                                exportAllReports(
                                    reportsCampaignFilter,
                                    reportsChannelFilter,
                                    reportsDispositionFilter,
                                    reportsDateRange[0],
                                    reportsDateRange[1],
                                    reportsResponseFilter
                                );
                            }}
                        >
                            Export
                        </Button>
                    ) : null}
                </div>
            </div>

            {/* Modular Tab Content */}
            <div className="admin_emergency_dashboard_content">
                {activeTab === 'Dashboard' && (
                    <AdminEmergencyDashboard
                        dashboardStats={dashboardStats}
                    />
                )}
                {activeTab === 'Alerts' && (
                    <AdminEmergencyAlerts
                        alerts={alerts}
                        isLoadingAlerts={isLoadingAlerts}
                        handleLaunchCampaign={handleLaunchCampaign}
                        handleStopCampaign={handleStopCampaign}
                        handleViewReport={handleViewReport}
                        handlePreviewFlow={handlePreviewFlow}
                        handleCreateButtonClick={handleCreateButtonClick}
                    />
                )}
                {activeTab === 'Groups' && (
                    <AdminEmergencyGroups
                        groups={groups}
                        handleViewContacts={handleViewContacts}
                        handleDeleteGroup={handleDeleteGroup}
                    />
                )}
                {activeTab === 'Reports' && (
                    <AdminEmergencyReports
                        alerts={alerts}
                        fetchCdrData={allLogs}
                        fetchCdrCount={allLogsCount}
                        isfetchLoading={isAllReportsLoading}
                        page={reportsPage}
                        pageSize={reportsPageSize}
                        offset={reportsOffset}
                        reportsCampaignFilter={reportsCampaignFilter}
                        reportsChannelFilter={reportsChannelFilter}
                        reportsDispositionFilter={reportsDispositionFilter}
                        reportsResponseFilter={reportsResponseFilter}
                        reportsDateRange={reportsDateRange}
                        setPage={setReportsPage}
                        setPageSize={setReportsPageSize}
                        setOffset={setReportsOffset}
                        setReportsCampaignFilter={setReportsCampaignFilter}
                        setReportsChannelFilter={setReportsChannelFilter}
                        setReportsDispositionFilter={setReportsDispositionFilter}
                        setReportsResponseFilter={setReportsResponseFilter}
                        setReportsDateRange={setReportsDateRange}
                    />
                )}
            </div>

            <Modal
                open={isModalOpen}
                onClose={handleCloseModal}
                width="800px"
            >
                <div className="admin_emergency_modal_content">
                    <div className="admin_emergency_modal_header">
                        <h3>{isEditing ? "View/Edit Group" : "Create Contact Group"}</h3>
                        <Button variant="empty" onClick={handleCloseModal}>
                            <Icon name="close" size={20} />
                        </Button>
                    </div>

                    <div className="admin_emergency_modal_form">
                        <div className="modal_meta_row">
                            <div className="meta_input_group meta_group_name">
                                {isEditing ? (
                                    <h1 className="modal_group_heading">{newGroupName}</h1>
                                ) : (
                                    <>
                                        <label className="form_label">Group Name</label>
                                        <Input
                                            placeholder="e.g. Finance Team"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                        />
                                    </>
                                )}
                            </div>

                            {!isEditing && (
                                <div className="meta_input_group meta_csv_upload_area">
                                    <label className="form_label">Import CSV<span><button className="download_sample_link" onClick={downloadSampleCSV}>
                                        <Icon name="download" size={12} /> Download Sample Format
                                    </button></span></label>

                                    <div className="modal_csv_upload" onClick={() => document.getElementById("modalCsvInput").click()}>
                                        <input type="file" id="modalCsvInput" hidden accept=".csv" onChange={handleFileUpload} />
                                        <Icon name="upload" size={18} color="#ff5200" />
                                        <span>Click to upload contact list (CSV)</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal_table_container">
                            <table className="modal_contact_table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>#</th>
                                        <th>Contact Name</th>
                                        <th style={{ width: '250px' }}>Phone Number</th>
                                        <th style={{ width: '80px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contacts.length > 0 ? (
                                        contacts.slice((currentPage - 1) * 10, currentPage * 10).map((contact, index) => (
                                            <tr key={contact.id}>
                                                <td>{(currentPage - 1) * 10 + index + 1}</td>
                                                <td>
                                                    <input
                                                        className="table_input_minimal"
                                                        placeholder="Enter name"
                                                        value={contact.name}
                                                        onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        className="table_input_minimal"
                                                        placeholder="e.g. 919876543210"
                                                        value={contact.phone}
                                                        onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <Button variant="empty" onClick={() => removeContact(contact.id)}>
                                                        <Icon name="deletee" size={14} color="#ef4444" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="no_contacts_empty">
                                                No contacts yet. Import a CSV or add manually.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {contacts.length > 10 && (
                                <div className="modal_pagination_footer">
                                    <div className="pagination_info">
                                        Showing {(currentPage - 1) * 10 + 1} - {Math.min(currentPage * 10, contacts.length)} of {contacts.length}
                                    </div>
                                    <button
                                        className="page_btn"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                    >
                                        <Icon name="leftarrow" size={12} />
                                    </button>
                                    {Array.from({ length: Math.ceil(contacts.length / 10) }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            className={`page_btn ${currentPage === page ? 'active' : ''} `}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        className="page_btn"
                                        disabled={currentPage === Math.ceil(contacts.length / 10)}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                    >
                                        <Icon name="rightarrow" size={12} />
                                    </button>
                                </div>
                            )}

                            <button className="table_add_row_btn" onClick={addManualContact}>
                                <Icon name="plus" size={14} /> Add New Contact Row
                            </button>
                        </div>

                        <div className="admin_emergency_modal_footer">
                            <Button variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                            <Button variant="primary" onClick={isEditing ? handleUpdateGroup : handleCreateGroup}>
                                {isEditing ? "Save Changes" : "Create Group"}
                            </Button>
                        </div>

                    </div>


                </div>
            </Modal>

            <Modal
                open={isReportModalOpen}
                onClose={handleCloseReportModal}
                width="1100px"
            >
                <div className="admin_emergency_modal_content report_modal">
                    <div className="admin_emergency_modal_header">
                        <h3>Campaign Status Report {reportData && `#${reportData.logs?.[0]?.c_campaignId} `}</h3>
                        <Button variant="empty" onClick={handleCloseReportModal}>
                            <Icon name="close" size={20} />
                        </Button>
                    </div>

                    {isLoadingReport ? (
                        <div className="report_loading">Loading report data...</div>
                    ) : reportData ? (
                        <div className="admin_emergency_modal_body report_body">
                            <div className="report_summary_grid">
                                {Object.entries(reportData.summary).map(([label, value]) => (
                                    <div key={label} className="summary_item glass_morphism">
                                        <span className="summary_label">{label}</span>
                                        <h2 className="summary_value">{value}</h2>
                                    </div>
                                ))}
                            </div>

                            <div className="report_table_wrapper scrollable_table">
                                <table className="report_logs_table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Lead Number</th>
                                            <th>Channel</th>
                                            <th>Status</th>
                                            <th>Time</th>
                                            <th>Duration</th>
                                            <th style={{ width: '300px' }}>Message</th>
                                            <th style={{ width: '200px' }}>Response</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.logs.slice((reportPage - 1) * reportPageSize, reportPage * reportPageSize).map((log, idx) => (
                                            <tr key={log.c_logId}>
                                                <td>{(reportPage - 1) * reportPageSize + idx + 1}</td>
                                                <td>{log.c_customerPhoneno}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Icon
                                                            name={log.c_channel === 'WA' ? 'whatsapp' : (log.c_channel === 'SMS' ? 'sms' : 'alert')}
                                                            size={14}
                                                            color={log.c_channel === 'WA' ? '#25D366' : (log.c_channel === 'SMS' ? '#007AFF' : '#ff5200')}
                                                        />
                                                        <span style={{ fontSize: '12px' }}>{log.c_channel === 'WA' ? 'WhatsApp' : (log.c_channel === 'SMS' ? 'SMS' : 'IVR')}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`status_capsule ${log.c_disposition.toLowerCase()} `}>
                                                        {log.c_disposition}
                                                    </span>
                                                </td>
                                                <td>{new Date(log.c_createdOn).toLocaleTimeString()}</td>
                                                <td>{log.c_duration}s</td>
                                                <td>
                                                    {(() => {
                                                        const content = log.c_messageContent;
                                                        if (!content) return "-";

                                                        const isWhatsApp = log.c_channel === 'WA';
                                                        let data = content;
                                                        if (typeof content === 'string' && (content.startsWith('{') || content.startsWith('['))) {
                                                            try { data = JSON.parse(content); } catch (e) { }
                                                        }

                                                        let displayText = content;
                                                        if (isWhatsApp) {
                                                            const body = data.components?.find(c => c.type?.toUpperCase() === 'BODY');
                                                            displayText = body?.text || JSON.stringify(data);
                                                        } else if (typeof data === 'object') {
                                                            displayText = JSON.stringify(data);
                                                        }

                                                        return (
                                                            <span
                                                                style={{ cursor: 'pointer', color: '#2563eb' }}
                                                                onClick={() => setDetailModalData({
                                                                    open: true,
                                                                    title: isWhatsApp ? "WhatsApp Message Preview" : "Message Content",
                                                                    content: isWhatsApp ? <WhatsAppPreview data={content} /> : displayText
                                                                })}
                                                            >
                                                                {displayText.length > 30 ? `${displayText.substring(0, 30)}...` : displayText}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td>
                                                    {(() => {
                                                        const resp = log.c_ivrResponse;
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
                                                                {displayText.length > 30 ? `${displayText.substring(0, 30)}...` : displayText}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {reportData.logs.length > reportPageSize && (
                                <div className="modal_pagination_footer">
                                    <div className="pagination_info">
                                        Showing {(reportPage - 1) * reportPageSize + 1} - {Math.min(reportPage * reportPageSize, reportData.logs.length)} of {reportData.logs.length}
                                    </div>
                                    <button
                                        className="page_btn"
                                        disabled={reportPage === 1}
                                        onClick={() => setReportPage(prev => prev - 1)}
                                    >
                                        <Icon name="leftarrow" size={12} />
                                    </button>
                                    {Array.from({ length: Math.ceil(reportData.logs.length / reportPageSize) }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === Math.ceil(reportData.logs.length / reportPageSize) || Math.abs(p - reportPage) <= 1)
                                        .map((p, i, arr) => (
                                            <React.Fragment key={p}>
                                                {i > 0 && arr[i - 1] !== p - 1 && <span style={{ color: '#94a3b8' }}>...</span>}
                                                <button
                                                    className={`page_btn ${reportPage === p ? 'active' : ''} `}
                                                    onClick={() => setReportPage(p)}
                                                >
                                                    {p}
                                                </button>
                                            </React.Fragment>
                                        ))}
                                    <button
                                        className="page_btn"
                                        disabled={reportPage === Math.ceil(reportData.logs.length / reportPageSize)}
                                        onClick={() => setReportPage(prev => prev + 1)}
                                    >
                                        <Icon name="rightarrow" size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="report_error">No report data available.</div>
                    )}
                </div>
            </Modal>

            <Popupconfirm
                isOpen={confirmPopup.isOpen}
                title={confirmPopup.title}
                message={confirmPopup.message}
                confirmText={confirmPopup.confirmText}
                onConfirm={confirmPopup.onConfirm}
                onCancel={() => setConfirmPopup(prev => ({ ...prev, isOpen: false }))}
            />

            <Modal
                open={detailModalData.open}
                onClose={() => setDetailModalData({ ...detailModalData, open: false })}
                width="600px"
                closeOnOverlayClick={true}
            >
                <div className="admin_emergency_report_modal_header">
                    <p className="admin_emergency_report_modal_title">{detailModalData.title}</p>
                    <Button variant="empty" onClick={() => setDetailModalData({ ...detailModalData, open: false })}>
                        <Icon name="close" color="#0F172A" size="14" />
                    </Button>
                </div>
                <div className="admin_emergency_report_modal_body">
                    {detailModalData.content}
                </div>
            </Modal>

            {/* Campaign Flow Preview Modal */}
            <Modal
                open={isPreviewFlowModalOpen}
                onClose={() => setIsPreviewFlowModalOpen(false)}
                width="900px"
            >
                <div className="admin_emergency_modal_content flow_preview_modal">
                    <div className="admin_emergency_modal_header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="modal_icon_circle"><Icon name="timer" size={20} color="#ff5200" /></div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Campaign  Flow</h3>
                                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Campaign: <b>{selectedFlowData?.metadata?.e_campaignName || 'Unnamed'}</b></p>
                            </div>
                        </div>
                        <Button variant="empty" onClick={() => setIsPreviewFlowModalOpen(false)}>
                            <Icon name="close" size={20} />
                        </Button>
                    </div>

                    <div className="admin_emergency_modal_body" style={{ background: '#f8fafc', padding: '32px' }}>
                        {isFetchingFlow ? (
                            <div className="fetching_flow_loader">
                                <div className="pulse_visual"><span></span><span></span><span></span></div>
                                <p>Retrieving Campaign sequence...</p>
                            </div>
                        ) : selectedFlowData?.orchestration ? (
                            <div className="orchestration_visualizer_box">
                                <div className="visualizer_stage_row" style={{ justifyContent: 'center' }}>
                                    {selectedFlowData.orchestration.stages.map((stage, idx) => (
                                        <React.Fragment key={stage.id}>
                                            <div className="visual_stage_node">
                                                <div className="node_header">
                                                    <div className="node_idx">Stage {idx + 1}</div>
                                                </div>
                                                <div className="node_channels">
                                                    {stage.channels.map(ch => (
                                                        <div key={ch} className="channel_detail_group">
                                                            <div className="mini_channel_badge">
                                                                <Icon name={ch === 'IVR' ? 'campaign' : (ch === 'WA' ? 'whatsapp' : 'sms')} size={14} />
                                                                <span>{ch}</span>
                                                            </div>
                                                            <div className="trigger_details">
                                                                {stage.triggers?.[ch] && Object.entries(stage.triggers[ch])
                                                                    .filter(([key, val]) => (val === true || (ch === 'WA' && key === 'read' && val === false)) && key !== 'timeout')
                                                                    .map(([key, val]) => (
                                                                        <span key={key} className="trigger_tag">
                                                                            {key === 'read' && val === false ? 'Not Read' : (ch === 'IVR' && key === 'failed') ? 'Invalid Input' : (key.charAt(0).toUpperCase() + key.slice(1)).replace(/([A-Z])/g, ' $1')}
                                                                        </span>
                                                                    ))
                                                                }
                                                                {ch === 'WA' && stage.triggers?.WA?.timeout && (
                                                                    <span className="trigger_tag timeout">Timeout: {stage.triggers.WA.timeout}m</span>
                                                                )}
                                                            </div>
                                                            {ch === 'WA' && stage.waConfig?.buttonReplies && Object.keys(stage.waConfig.buttonReplies).length > 0 && (
                                                                <div className="wa_replies_preview">
                                                                    <div className="replies_title"><Icon name="reply" size={10} /> Button Replies:</div>
                                                                    {Object.entries(stage.waConfig.buttonReplies).map(([btn, reply]) => (
                                                                        <div key={btn} className="reply_item">
                                                                            <b>{btn}:</b> {reply}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="node_meta_details">
                                                    {stage.executionMode === 'STAGGERED' && (
                                                        <div className="meta_info_stagger">
                                                            <Icon name="timer" size={12} /> Staggered: {stage.interChannelDelay}m interval
                                                        </div>
                                                    )}
                                                    <div className="node_action_ribbon">
                                                        {stage.action === 'NEXT' ? (
                                                            <span className="action_next">Next Stage</span>
                                                        ) : stage.action === 'RETRY' ? (
                                                            <div className="action_retry_info">
                                                                <span className="action_retry">Retry Sequence</span>
                                                                <div className="retry_params">
                                                                    <span>Max: {stage.retryCount}</span>
                                                                    <span>Delay: {stage.retryDelay}m</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="action_stop">End Flow</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {idx < selectedFlowData.orchestration.stages.length - 1 && (
                                                <div className="visual_connector_line">
                                                    {selectedFlowData.orchestration.stages[idx + 1].waitDuration > 0 && (
                                                        <div className="connector_label">
                                                            <div className="label_val"><Icon name="timer" size={10} /> {selectedFlowData.orchestration.stages[idx + 1].waitDuration}m</div>
                                                            <div className="label_text">Delay</div>
                                                        </div>
                                                    )}
                                                    <div className="connector_arrow"><Icon name="rightarrow" size={12} /></div>
                                                </div>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flow_error">No Campaign Flow data found for this campaign.</div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminEmergency;
