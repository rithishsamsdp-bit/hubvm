import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "./styles/AdminCampaignReport.css";
import { Table, Input, Button } from "../../../components/Index.jsx";
import { useCdrStore } from "../../../store/admin/reports/useCdrStore.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import Icon from "../../../constants/Icon.jsx";

const AdminCampaignReport = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortField, setSortField] = useState("c_callDateTime");
    const [sortOrder, setSortOrder] = useState("DESC");
    const [searchString, setSearchString] = useState("");
    const debouncedSearchString = useDebounce(searchString, 500);

    const { getCdrData, fetchCdrData, fetchCdrCount, isfetchLoading, exportcdr } = useCdrStore();

    const fetchFilteredData = useCallback(() => {
        const offset = (page - 1) * pageSize;
        getCdrData(
            pageSize,
            offset,
            sortField,
            sortOrder,
            debouncedSearchString,
            null, // campaign
            null, // disposition
            null, // callMode
            null, // agentDisposition
            null, // direction
            null, // startDate
            null, // endDate
            "Predictive" // dialMethod
        );
    }, [page, pageSize, sortField, sortOrder, debouncedSearchString, getCdrData]);

    useEffect(() => {
        fetchFilteredData();
    }, [fetchFilteredData]);

    const handleExport = () => {
        const offset = (page - 1) * pageSize;
        exportcdr(
            pageSize,
            offset,
            sortField,
            sortOrder,
            debouncedSearchString,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            "Predictive"
        );
    };

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
        { title: "Campaign", key: "CampaignName" },
        { title: "Member", key: "MemberName" },
        { title: "Ext No", key: "MemberExtensionNumber" },
        {
            title: "Recording",
            key: "CallRecording",
            Cell: (row) => (
                row.CallRecording ? (
                    <a href={row.CallRecording} target="_blank" rel="noopener noreferrer">
                        <Icon name="play" size={16} color="#4F46E5" />
                    </a>
                ) : "-"
            )
        }
    ];

    return (
        <div className="admin_campaign_report_container">
            <div className="admin_campaign_report_header">
                <div className="admin_campaign_report_search">
                    <Input
                        type="text"
                        placeholder="Search by Customer Phone, Extension..."
                        width="350px"
                        suffixIcon="search"
                        onChange={(e) => setSearchString(e.target.value)}
                        value={searchString}
                    />
                </div>
                <div className="admin_campaign_report_actions">
                    <Button variant="outline" onClick={handleExport}>
                        <Icon name="download" size={16} /> Export CSV
                    </Button>
                </div>
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
        </div>
    );
};

export default AdminCampaignReport;
