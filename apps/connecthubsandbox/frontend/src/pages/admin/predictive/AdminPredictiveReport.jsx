import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "./styles/AdminPredictiveReport.css";
import { Table, Input, Button, Select, Modal, DateTimeRangePicker } from "../../../components/Index.jsx";
import { usePredictiveStore } from "../../../store/admin/predictive/usePredictiveStore.js";
import { useCampaignStore } from "../../../store/admin/useCampaignStore.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import Icon from "../../../constants/Icon.jsx";

const AdminPredictiveReport = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);

    const {
        getPredictiveReportData,
        fetchCdrData,
        fetchCdrCount,
        isfetchLoading,
        reportFilters,
        setReportFilters
    } = usePredictiveStore();

    const { CampaignData, getCampaignData } = useCampaignStore();

    useEffect(() => {
        getCampaignData(1000, 0, "", "c_campaignName", "ASC");
    }, [getCampaignData]);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortField, setSortField] = useState("c_callDateTime");
    const [sortOrder, setSortOrder] = useState("DESC");
    const [followUpModal, setFollowUpModal] = useState(false);
    const [selectedFollowUp, setSelectedFollowUp] = useState("");

    // For search, we still use a local state then sync to store via debounce
    const [searchLocal, setSearchLocal] = useState(reportFilters.searchString);
    const debouncedSearchLocal = useDebounce(searchLocal, 500);

    useEffect(() => {
        setReportFilters({ searchString: debouncedSearchLocal });
    }, [debouncedSearchLocal, setReportFilters]);

    const formatDate = (date, isEndDate = false) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const time = isEndDate ? "23:59:59" : "00:00:00";
        return `${year}-${month}-${day} ${time}`;
    };

    const fetchFilteredData = useCallback(() => {
        const offset = (page - 1) * pageSize;
        getPredictiveReportData(
            pageSize,
            offset,
            sortField,
            sortOrder,
            reportFilters.searchString,
            formatDate(reportFilters.startDate),
            formatDate(reportFilters.endDate, true),
            reportFilters.disposition,
            reportFilters.campaignId
        );
    }, [page, pageSize, sortField, sortOrder, reportFilters, getPredictiveReportData]);

    useEffect(() => {
        fetchFilteredData();
    }, [fetchFilteredData]);

    const handleClearFilters = () => {
        setSearchLocal("");
        setReportFilters({
            searchString: "",
            disposition: "",
            campaignId: "",
            startDate: new Date(),
            endDate: new Date(),
        });
        setPage(1);
    };

    const handleDateChange = ({ start, end }) => {
        setReportFilters({ startDate: start, endDate: end });
        setPage(1);
    };

    const handleDispositionChange = (val) => {
        setReportFilters({ disposition: val });
        setPage(1);
    };

    // This handles the export when called from parent via any mechanism
    // but for now we keep it here if needed
    const handleExport = () => {
        const offset = (page - 1) * pageSize;
        exportPredictiveCdr(
            pageSize,
            offset,
            sortField,
            sortOrder,
            debouncedSearchString,
            null,
            null
        );
    };

    // Expose handleExport to parent if needed, but we'll use store directly in AdminPredictive

    const onPageChange = (pagevalues) => {
        setPage(pagevalues.currentPage);
        setPageSize(pagevalues.pageSize);
        setSortField(pagevalues.sortConfig.key);
        setSortOrder(pagevalues.sortConfig.direction);
    };

    const columns = [
        {
            title: "S.No",
            key: "s_no",
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        },
        { title: "Customer Phone", key: "CustomerPhoneNumber" },
        { title: "DateTime", key: "CallDateTime" },
        { title: "Duration", key: "CallDuration" },
        { title: "Disposition", key: "CallDisposition" },
        { title: "Dial Method", key: "DialMethod" },
        { title: "Campaign", key: "CampaignName" },
        {
            title: "Member",
            key: "MemberName",
            Cell: (row) => row.CallDisposition === "ANSWERED" ? row.MemberName : "-"
        },
        {
            title: "Ext No",
            key: "MemberExtensionNumber",
            Cell: (row) => row.CallDisposition === "ANSWERED" ? row.MemberExtensionNumber : "-"
        },
        {
            title: "Follow Up",
            key: "FollowUpData",
            width: 100,
            Cell: (row) => (
                <div className="admin_callflow_list_action_conatiner">
                    <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                            setSelectedFollowUp(row.FollowUpData);
                            setFollowUpModal(true);
                        }}
                    >
                        Follow up
                    </Button>
                </div>
            )
        },
        {
            title: "Recording",
            key: "CallRecording",
            width: 300,
            Cell: (row) => {
                if (!row.CallRecording) return <span>No Recording</span>;
                return (
                    <audio controls preload="none" style={{ width: "280px" }}>
                        <source src={row.CallRecording} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                );
            }
        }
    ];

    return (
        <div className="admin_predictive_report_container" >
            <div className="admin_predictive_report_filter_container">
                <Input
                    type="text"
                    placeholder="Search by Customer Phone, Extension..."
                    width="350px"
                    suffixIcon="search"
                    onChange={(e) => setSearchLocal(e.target.value)}
                    value={searchLocal}
                />
                <Select
                    mode="single"
                    width="150px"
                    placeholder="Disposition"
                    showSearch={false}
                    value={reportFilters.disposition}
                    onChange={handleDispositionChange}
                    options={[
                        { label: "Answered", value: "ANSWERED" },
                        { label: "No Answer", value: "NO ANSWER" },
                        { label: "Busy", value: "BUSY" },
                        { label: "Failed", value: "FAILED" },
                    ]}
                />
                <Select
                    mode="single"
                    width="180px"
                    placeholder="Campaign"
                    showSearch={true}
                    value={reportFilters.campaignId}
                    onChange={(val) => {
                        setReportFilters({ campaignId: val });
                        setPage(1);
                    }}
                    options={
                        (Array.isArray(CampaignData) ? CampaignData : [])
                            .filter(c => c.dialerType === "PREDICTIVE")
                            .map(c => ({ label: c.campaignName, value: String(c.campaignId) }))
                    }
                />
                <DateTimeRangePicker
                    type="range"
                    showTime={false}
                    initialStart={reportFilters.startDate}
                    initialEnd={reportFilters.endDate}
                    onChange={handleDateChange}
                    format="YYYY-MM-DD"
                />
                {/* Space for future filters similar to CDR report */}
                <button
                    className="admin_predictive_report_filter_clear_button"
                    onClick={handleClearFilters}
                >
                    Clear all
                </button>
            </div>

            <Table
                columns={columns}
                data={fetchCdrData}
                loading={isfetchLoading}
                totaldata={fetchCdrCount}
                page={page}
                serverSide
                pageSize={pageSize}
                onPageChange={onPageChange}
            />

            <Modal
                open={followUpModal}
                width="627px"
                onClose={() => setFollowUpModal(false)}
                style={{ padding: '24px', borderRadius: '16px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Notes</p>
                    <Button variant="empty" onClick={() => setFollowUpModal(false)}>
                        <Icon name="close" color="#0F172A" size={14} />
                    </Button>
                </div>
                {selectedFollowUp && Object.keys(selectedFollowUp).length > 0 ? (
                    <div className="notes-container">
                        {Object.entries(selectedFollowUp).map(([key, value]) => (
                            <div className="note-row" key={key}>
                                <span className="note-key">{key}</span>
                                {typeof value === "object" ? (
                                    <span className="note-value">
                                        start - {value.start} – end - {value.end}
                                    </span>
                                ) : (
                                    <span className="note-value">{value || "-"}</span>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No data found</p>
                )}
            </Modal>

        </div>
    );
};

export default AdminPredictiveReport;
