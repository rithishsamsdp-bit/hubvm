import React, { useState, useEffect, useCallback } from 'react';
import Icon from "../../../constants/Icon.jsx";
import { Button, Modal, Table, Loader, Input, Popover, Select } from "../../../components/Index.jsx";
import { usePredictiveStore } from "../../../store/admin/predictive/usePredictiveStore.js";
import { useDashboardStore } from "../../../store/admin/useDashboardStore.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import "./styles/AdminPredictiveCampaignCards.css";
import telephonyaxios from "../../../services/telephonyaxios.js";

const CampaignProgressBar = ({ campaign }) => {
    const [stats, setStats] = useState({ progress: 0, text: '0/0' });

    useEffect(() => {
        let isMounted = true;
        const fetchProgress = async () => {
            try {
                const res = await telephonyaxios.get(`/telephony/campaign/predective/dashboard?campaign_id=${campaign.campaignId}`);
                const data = res.data?.data;
                if (isMounted && data) {
                    const total = data.totalLeads || 0;
                    const completed = data.completedLeads || 0;
                    const percentage = total > 0 ? (completed / total) * 100 : 0;
                    setStats({
                        progress: percentage,
                        text: `${completed}/${total}`
                    });
                }
            } catch (error) {
                console.error("Failed to fetch progress:", error);
            }
        };

        fetchProgress();
        const interval = setInterval(fetchProgress, 10000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [campaign.campaignId]);

    return (
        <div className="progress_bar_wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span>Progress</span>
                <span>{stats.progress.toFixed(1)}% ({stats.text})</span>
            </div>
            <div className="progress_bar_container" style={{ marginTop: '0' }}>
                <div className="progress_fill" style={{ width: `${stats.progress}%`, transition: 'width 0.5s ease-in-out' }} />
            </div>
        </div>
    );
};

const AdminPredictiveCampaignCards = ({
    campaigns,
    isLoading,
    handleEdit,
    handleDelete,
    handleStart,
    handleStop,
    handleCreateButtonClick
}) => {
    const { getCampaignLeads } = usePredictiveStore();
    const [showLeadsModal, setShowLeadsModal] = useState(false);
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [leadsCount, setLeadsCount] = useState(0);
    const [newLeadsCount, setNewLeadsCount] = useState(0);
    const [answeredCount, setAnsweredCount] = useState(0);
    const [noAnswerCount, setNoAnswerCount] = useState(0);
    const [failedCount, setFailedCount] = useState(0);
    const [isLeadsLoading, setIsLeadsLoading] = useState(false);
    const [activeCampaignName, setActiveCampaignName] = useState("");
    const [activeCampaignId, setActiveCampaignId] = useState(null);

    const { userStatusData, getUserStatusData } = useDashboardStore();
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [membersModalCampaignName, setMembersModalCampaignName] = useState("");
    const [campaignGroupsData, setCampaignGroupsData] = useState([]);

    const [membersPage, setMembersPage] = useState(1);
    const [membersPageSize, setMembersPageSize] = useState(10);
    const [membersStatusFilter, setMembersStatusFilter] = useState("");

    // Pagination & Search state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [modalSearch, setModalSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const debouncedSearch = useDebounce(modalSearch, 500);

    const fetchLeadsData = useCallback(async (campaignId, currentPage, size, search, status, lastResult) => {
        setIsLeadsLoading(true);
        try {
            const offset = (currentPage - 1) * size;
            const result = await getCampaignLeads(campaignId, size, offset, search, status, lastResult);
            if (result) {
                setSelectedLeads(result.leads || []);
                setLeadsCount(result.totalCount || 0);
                setNewLeadsCount(result.newCount || 0);
                setAnsweredCount(result.answeredCount || 0);
                setNoAnswerCount(result.noAnswerCount || 0);
                setFailedCount(result.failedCount || 0);
            }
        } catch (error) {
            console.error("Error fetching leads:", error);
        } finally {
            setIsLeadsLoading(false);
        }
    }, [getCampaignLeads]);

    useEffect(() => {
        if (showLeadsModal && activeCampaignId) {
            fetchLeadsData(activeCampaignId, page, pageSize, debouncedSearch, statusFilter);
        }
    }, [showLeadsModal, activeCampaignId, page, pageSize, debouncedSearch, statusFilter, fetchLeadsData]);

    const handleCardClick = (campaignId, campaignName) => {
        setActiveCampaignId(campaignId);
        setActiveCampaignName(campaignName);
        setPage(1);
        setModalSearch("");
        setStatusFilter("");
        setShowLeadsModal(true);
    };

    const handleViewMembersClick = (campaignId, campaignName) => {
        setActiveCampaignId(campaignId);
        setMembersModalCampaignName(campaignName);
        setMembersPage(1);
        setMembersStatusFilter("");
        setShowMembersModal(true);
    };

    useEffect(() => {
        let isMounted = true;
        if (showMembersModal) {
            getUserStatusData();
            const fetchGroups = async () => {
                try {
                    const res = await telephonyaxios.post('/telephony/membergroup/fetch', {
                        limit: 1000, 
                        offset: 0,
                        searchString: "",
                        sortField: "m_membergroupName",
                        sortOrder: "DESC"
                    });
                    if (isMounted && res?.data?.data?.totalRecords) {
                        setCampaignGroupsData(res.data.data.totalRecords);
                    }
                } catch (error) {
                    console.error("Failed to fetch member groups", error);
                }
            };
            fetchGroups();
        }
        return () => { isMounted = false; };
    }, [showMembersModal, getUserStatusData]);

    const handlePageChange = (pageValues) => {
        setPage(pageValues.currentPage);
        setPageSize(pageValues.pageSize);
    };

    // Filter for Predictive campaigns only
    const predictiveCampaigns = Array.isArray(campaigns) ? campaigns.filter(c => c.dialerType === "PREDICTIVE") : [];

    // Members Modal Data Calculation
    const calculateMembers = () => {
        if (!showMembersModal) return [];

        const activeGroups = campaignGroupsData.filter(g => 
            (g.campaignNames && g.campaignNames.includes(membersModalCampaignName))
        );

        const groupMap = new Map();
        activeGroups.forEach(g => {
            (g.members || []).forEach(m => {
                if (!groupMap.has(m.m_memberId)) {
                    groupMap.set(m.m_memberId, m);
                }
            });
        });

        let allMembers = Array.from(groupMap.values()).map(m => {
            const liveInfo = userStatusData.find(u => 
                String(u.l_membermemberId) === String(m.m_memberId) || 
                String(u.l_memberName) === String(m.m_memberName)
            );

            return {
                memberName: m.m_memberName,
                extension: liveInfo?.l_memberExtention || "N/A",
                status: liveInfo?.l_memberStatus || "LOGGED OUT",
                activeCampaign: liveInfo?.l_memberCampaignName || "N/A",
                lastUpdated: liveInfo?.l_memberLastUpdated || "N/A"
            };
        });

        if (membersStatusFilter) {
            allMembers = allMembers.filter(m => m.status.toUpperCase() === membersStatusFilter.toUpperCase());
        }

        return allMembers;
    };

    const membersList = calculateMembers();
    const membersPaginationTotal = membersList.length;
    const paginatedMembersList = membersList.slice((membersPage - 1) * membersPageSize, membersPage * membersPageSize);

    if (isLoading) {
        return (
            <div className="admin_predictive_empty_container">
                <p>Loading predictive campaigns...</p>
            </div>
        );
    }

    if (predictiveCampaigns.length === 0) {
        return (
            <div className="admin_predictive_empty_container">
                <div className="admin_predictive_empty_state">
                    <div className="admin_predictive_empty_icon">
                        <Icon name="campaign" size={48} color="#3b82f6" />
                    </div>
                    <h3>No Predictive Campaigns Found</h3>
                    <p>Create a predictive campaign to enjoy advanced automated dialing features.</p>
                    <Button type="primary" onClick={handleCreateButtonClick}>
                        Create Predictive Campaign
                    </Button>
                </div>
            </div>
        );
    }

    const leadColumns = [
        {
            title: "Lead ID",
            key: "p_leadID",
            Cell: (row) => <span title={row.p_leadID} style={{ cursor: 'help' }}>{row.p_leadID?.slice(-8) || "N/A"}</span>
        },
        { title: "Phone Number", key: "p_leadPhoneNumber" },
        {
            title: "Status",
            key: "p_leadStatus",
            Cell: (row) => (
                <span className={`status_pill ${row.p_leadStatus?.toLowerCase() || "new"}`}>
                    {row.p_leadStatus || "NEW"}
                </span>
            )
        },
        { title: "Last Result", key: "p_leadLastResult" },
        {
            title: "Next Dialing Time",
            key: "p_leadnextCallTime",
            Cell: (row) => row.p_leadnextCallTime ? new Date(row.p_leadnextCallTime * 1000).toLocaleString() : "N/A"
        },
        { title: "Total Attempts", key: "p_totalAttempts" },
    ];

    return (
        <div className="admin_predictive_campaigns_container">
            <div className="admin_predictive_alerts_grid">
                {predictiveCampaigns.map(campaign => {
                    const rules = typeof campaign.campaignRules === 'string'
                        ? JSON.parse(campaign.campaignRules)
                        : campaign.campaignRules;

                    const strategy = rules?.Strategy || rules?.retryStrategy || "Static";
                    const ratio = strategy === "Adaptive" && rules?.minRatio && rules?.maxRatio
                        ? `${rules.minRatio}-${rules.maxRatio}`
                        : (rules?.ratio || rules?.maxRatio || 1);
                    const maxChannels = rules?.limits?.maxChannels || "-";
                    const maxRetry = rules?.limits?.maxtotalattempts || rules?.maxRetry || 0;

                    return (
                        <div key={campaign.campaignId} className="predictive_card">
                            <div className="predictive_card_header">
                                <h3 className="predictive_card_title">{campaign.campaignName}</h3>
                                <span className={`status_pill ${campaign.campaignStatus?.toLowerCase() || "inactive"}`}>
                                    {campaign.campaignStatus || "INACTIVE"}
                                </span>
                            </div>

                            <div className="predictive_card_body">
                                <div className="predictive_meta_info">
                                    <div className="meta_item" title="Dialing Ratio">
                                        <Icon name="timer" size={14} />
                                        <span>Ratio: {ratio}</span>
                                    </div>
                                    <div className="meta_item" title="Max Channels">
                                        <Icon name="campaign" size={14} />
                                        <span>Channels: {maxChannels}</span>
                                    </div>
                                    <div className="meta_item" title="Retry Strategy">
                                        <Icon name="rightarrow" size={14} />
                                        <span>Strategy: {strategy}</span>
                                    </div>
                                    <div className="meta_item" title="Max Retries">
                                        <Icon name="calender" size={14} />
                                        <span>Retries: {maxRetry}</span>
                                    </div>
                                </div>

                                <div className="predictive_card_stats">
                                    <div className="stats_row">
                                        <span className="stats_label">Campaign Lifetime</span>
                                        <span className="stats_value">
                                            {(!rules?.limits?.startDate && !rules?.limits?.endDate)
                                                ? "No Limit"
                                                : `${rules?.limits?.startDate} - ${rules?.limits?.endDate}`}
                                        </span>
                                    </div>
                                    <div className="stats_row">
                                        <span className="stats_label">Calling Hours</span>
                                        <span className="stats_value">{rules?.callinghours?.start} - {rules?.callinghours?.end}</span>
                                    </div>
                                    <CampaignProgressBar campaign={campaign} />
                                </div>

                                <div className="card_context_details">
                                    <div className="context_item">
                                        <span className="context_label">DID GROUP</span>
                                        <span className="context_value">{campaign.didGroupName || "Default group"}</span>
                                    </div>
                                    <div className="context_item">
                                        <span className="context_label">FORM</span>
                                        <span className="context_value">{campaign.f_formName || "No form"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="predictive_card_footer">
                                <div className="card_action_buttons">
                                    <button
                                        className="btn_icon_only"
                                        onClick={() => handleCardClick(campaign.campaignId, campaign.campaignName)}
                                        title="View Leads"
                                    >
                                        <Icon name="groups" size={18} />
                                    </button>
                                    <button
                                        className="btn_icon_only"
                                        title="View Campaign Members"
                                        onClick={() => handleViewMembersClick(campaign.campaignId, campaign.campaignName)}
                                    >
                                        <Icon name="users" size={18} />
                                    </button>
                                    <button
                                        className="btn_icon_only"
                                        onClick={() => handleEdit(campaign.campaignId)}
                                        title="Edit"
                                    >
                                        <Icon name="edit" size={18} />
                                    </button>
                                    <button
                                        className="btn_icon_only delete"
                                        onClick={() => handleDelete(campaign.campaignId)}
                                        title="Delete"
                                    >
                                        <Icon name="deletee" size={18} />
                                    </button>
                                </div>
                                {campaign.campaignStatus === "ACTIVE" ? (
                                    <button
                                        className="btn_toggle stop"
                                        onClick={() => handleStop(campaign.campaignId)}
                                    >
                                        STOP
                                    </button>
                                ) : (
                                    <button
                                        className="btn_toggle start"
                                        onClick={() => handleStart(campaign.campaignId)}
                                    >
                                        START
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Leads Modal */}
            <Modal
                open={showLeadsModal}
                onClose={() => setShowLeadsModal(false)}
                width="90%"
            >
                <div className="predictive_leads_modal_container">
                    <div className="predictive_leads_modal_header_container">
                        <h2 className="predictive_leads_modal_header">
                            Campaign Leads: {activeCampaignName}
                        </h2>
                        <Button variant="empty" onClick={() => setShowLeadsModal(false)}>
                            <Icon name="close" color="#0F172A" size="14" />
                        </Button>
                    </div>

                    <div className="predictive_leads_modal_body">
                        <div className="leads_modal_toolbar_container">
                            <div className="leads_modal_toolbar">
                                <div className="leads_summary">
                                    <div className="summary_card total">
                                        <span className="summary_label">Total Leads</span>
                                        <span className="summary_value">{leadsCount}</span>
                                    </div>
                                    <div className="summary_card new">
                                        <span className="summary_label">New</span>
                                        <span className="summary_value">{newLeadsCount}</span>
                                    </div>
                                    <div className="summary_card answered">
                                        <span className="summary_label">Answered</span>
                                        <span className="summary_value">{answeredCount}</span>
                                    </div>
                                    <div className="summary_card no-answer">
                                        <span className="summary_label">No Answer</span>
                                        <span className="summary_value">{noAnswerCount}</span>
                                    </div>
                                    <div className="summary_card failed">
                                        <span className="summary_label">Failed</span>
                                        <span className="summary_value">{failedCount}</span>
                                    </div>
                                </div>

                                <div className="modal_header_search" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <Input
                                        placeholder="Search by Phone or Lead ID"
                                        value={modalSearch}
                                        onChange={(e) => {
                                            setModalSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        width="300px"
                                        suffixIcon="search"
                                    />
                                    <Select
                                        placeholder="Status: All"
                                        showSearch={false}
                                        width="160px"
                                        value={statusFilter}
                                        onChange={(val) => {
                                            setStatusFilter(val);
                                            setPage(1);
                                        }}
                                        options={[
                                            { label: "Status: All", value: "" },
                                            { label: "New", value: "NEW" },
                                            { label: "Calling", value: "CALLING" },
                                            { label: "Completed", value: "COMPLETED" },
                                            { label: "Failed", value: "FAILED" },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="custom_leads_table_wrapper">
                            <div className="leads_table_scroll_area">
                                <table className="custom_leads_table">
                                    <thead>
                                        <tr>
                                            {leadColumns.map(col => (
                                                <th key={col.key}>{col.title}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLeadsLoading ? (
                                            <tr>
                                                <td colSpan={leadColumns.length} style={{ textAlign: 'center', padding: '40px' }}>
                                                    <Loader />
                                                </td>
                                            </tr>
                                        ) : selectedLeads.length === 0 ? (
                                            <tr>
                                                <td colSpan={leadColumns.length} style={{ textAlign: 'center', padding: '40px' }}>
                                                    No leads found
                                                </td>
                                            </tr>
                                        ) : (
                                            selectedLeads.map((lead, idx) => (
                                                <tr key={idx}>
                                                    {leadColumns.map(col => (
                                                        <td key={col.key}>
                                                            {col.Cell ? col.Cell(lead) : lead[col.key] || "N/A"}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Compact Custom Pagination */}
                            <div className="custom_table_pagination">
                                <div className="pagination_info">
                                    Showing {Math.min((page - 1) * pageSize + 1, leadsCount)} to {Math.min(page * pageSize, leadsCount)} of {leadsCount} leads
                                </div>
                                <div className="pagination_controls">
                                    <div className="page_size_selector">
                                        <span>Rows per page:</span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value));
                                                setPage(1);
                                            }}
                                        >
                                            {[10, 25, 50, 100].map(size => (
                                                <option key={size} value={size}>{size}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="page_buttons">
                                        <button
                                            disabled={page === 1 || isLeadsLoading}
                                            onClick={() => setPage(p => p - 1)}
                                            className="pag_btn"
                                        >
                                            <Icon name="leftarrow" size={14} />
                                        </button>
                                        <span className="current_page_num">{page}</span>
                                        <button
                                            disabled={page * pageSize >= leadsCount || isLeadsLoading}
                                            onClick={() => setPage(p => p + 1)}
                                            className="pag_btn"
                                        >
                                            <Icon name="rightarrow" size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Members Modal */}
            <Modal
                open={showMembersModal}
                onClose={() => setShowMembersModal(false)}
                width="60%"
            >
                <div className="predictive_leads_modal_container">
                    <div className="predictive_leads_modal_header_container">
                        <h2 className="predictive_leads_modal_header">
                            Campaign Members: {membersModalCampaignName}
                        </h2>
                        <Button variant="empty" onClick={() => setShowMembersModal(false)}>
                            <Icon name="close" color="#0F172A" size="14" />
                        </Button>
                    </div>

                    <div className="predictive_leads_modal_body">
                        <div className="leads_modal_toolbar_container" style={{ marginBottom: "16px" }}>
                            <div className="leads_modal_toolbar" style={{ justifyContent: "flex-end" }}>
                                <div className="modal_header_search" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <Select
                                        placeholder="Status: All"
                                        showSearch={false}
                                        width="160px"
                                        value={membersStatusFilter}
                                        onChange={(val) => {
                                            setMembersStatusFilter(val);
                                            setMembersPage(1);
                                        }}
                                        options={[
                                            { label: "Status: All", value: "" },
                                            { label: "Available", value: "AVAILABLE" },
                                            { label: "In Call", value: "INCALL" },
                                            { label: "Unavailable", value: "UNAVAILABLE" },
                                            { label: "Logged Out", value: "LOGGED OUT" },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="custom_leads_table_wrapper">
                            <div className="leads_table_scroll_area">
                                <table className="custom_leads_table">
                                    <thead>
                                        <tr>
                                            <th>Member Name</th>
                                            <th>Extension</th>
                                            <th>Status</th>
                                            <th>Selected Campaign</th>
                                            <th>Last Updated</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedMembersList.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                                                    {membersList.length === 0 ? "No members currently assigned to this campaign." : "No members match the selected status."}
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedMembersList.map((member, idx) => (
                                                <tr key={idx}>
                                                    <td>{member.memberName}</td>
                                                    <td>{member.extension}</td>
                                                    <td>
                                                        <span className={`status_pill ${member.status.toLowerCase()}`}>
                                                            {member.status}
                                                        </span>
                                                    </td>
                                                    <td>{member.activeCampaign}</td>
                                                    <td>{member.lastUpdated}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {membersPaginationTotal > 0 && (
                                <div className="custom_table_pagination">
                                    <div className="pagination_info">
                                        Showing {Math.min((membersPage - 1) * membersPageSize + 1, membersPaginationTotal)} to {Math.min(membersPage * membersPageSize, membersPaginationTotal)} of {membersPaginationTotal} members
                                    </div>
                                    <div className="pagination_controls">
                                        <div className="page_size_selector">
                                            <span>Rows per page:</span>
                                            <select
                                                value={membersPageSize}
                                                onChange={(e) => {
                                                    setMembersPageSize(Number(e.target.value));
                                                    setMembersPage(1);
                                                }}
                                            >
                                                {[10, 25, 50, 100].map(size => (
                                                    <option key={size} value={size}>{size}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="page_buttons">
                                            <button
                                                disabled={membersPage === 1}
                                                onClick={() => setMembersPage(p => p - 1)}
                                                className="pag_btn"
                                            >
                                                <Icon name="leftarrow" size={14} />
                                            </button>
                                            <span className="current_page_num">{membersPage}</span>
                                            <button
                                                disabled={membersPage * membersPageSize >= membersPaginationTotal}
                                                onClick={() => setMembersPage(p => p + 1)}
                                                className="pag_btn"
                                            >
                                                <Icon name="rightarrow" size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminPredictiveCampaignCards;
