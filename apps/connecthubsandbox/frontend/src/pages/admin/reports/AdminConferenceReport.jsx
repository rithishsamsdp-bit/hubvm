import { useEffect, useState } from "react";
import "./styles/AdminConferenceReport.css";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Table,
    DateTimeRangePicker,
    Input,
    Button
} from "../../../components/Index.jsx";
import { useConferenceStore } from "../../../store/admin/reports/useConferenceStore.js";
import { useAuthStore } from "../../../store/useAuthStore.js";
import Icon from "../../../constants/Icon.jsx";

const AdminConferenceReport = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);

    const [page, setPage] = useState(parseInt(params.get("page")) || 1);
    const [pageSize, setPageSize] = useState(
        parseInt(params.get("per_page")) || 10
    );
    const [offset, setOffset] = useState((page - 1) * pageSize || 0);
    const [searchString, setSearchString] = useState("");
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    const {
        getConferenceData,
        fetchConferenceData,
        fetchConferenceCount,
        isfetchLoading,
        exportcdr
    } = useConferenceStore();

    const { authRole } = useAuthStore();


    const formatDate = (date, isEndDate = false) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const time = isEndDate ? "23:59:59" : "00:00:00";
        return `${year}-${month}-${day} ${time}`;
    };

    useEffect(() => {
        if (authRole === "TL") {
            navigate(`/tl-reports/tl-conference-report?page=${page}&per_page=${pageSize}`);
        } else {
            navigate(`/admin-reports/admin-conference-report?page=${page}&per_page=${pageSize}`);
        }
        setOffset((page - 1) * pageSize);
    }, [page, pageSize, navigate]);

    useEffect(() => {
        getConferenceData(
            pageSize,
            offset,
            searchString,
            formatDate(startDate),
            formatDate(endDate, true)
        );
    }, [
        pageSize,
        offset,
        searchString,
        startDate,
        endDate,
        getConferenceData,
    ]);

    const handleClearFilters = () => {
        setSearchString("");
        setStartDate(new Date());
        setEndDate(new Date());
    };

    const handleDateChange = ({ start, end }) => {
        setStartDate(start);
        setEndDate(end);
    };

    const columns = [
        {
            title: "S.no",
            key: "s_no",
            width: 50,
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1
        },
        { title: "Customer Numbers", key: "customerNumbers" },
        { title: "Total Customer Count", key: "totalRecords" },
        { title: "Conference Name", key: "p_confName" },
        { title: "start time", key: "p_confStartTime" },
        { title: "Duration", key: "p_confHours" },
        {
            title: "Recording",
            key: "url",
            width: 260,
            Cell: (row) => {
                if (!row.url) return <span>No Recording</span>;
                return (
                    <audio
                        controls
                        preload="none"
                        style={{ width: "250px" }}
                    >
                        <source src={row.url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                );
            },
        },

    ];

    return (
        <div className="admin_conference_report">
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">Conference Report</p>
                    <span className="navbar_1_breadcrumb">
                        <span
                            className="navbar_1_breadcrumb_item"
                            onClick={() => {
                                if (authRole === "TL") {
                                    navigate("/tl-dashboard")
                                }
                                else if (authRole === "ADMIN") {
                                    navigate("/admin-dashboard")
                                };
                            }}
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item" onClick={() => { navigate("/admin-reports") }}>
                            Reports
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item active">
                            Conference Report
                        </span>
                    </span>
                </div>
                <div>
                    <Button onClick={() => exportcdr(pageSize,
                        offset,
                        searchString,
                        formatDate(startDate),
                        formatDate(endDate, true))}>
                        Export
                    </Button>
                </div>
            </div>
            <div className="admin_conference_report_container">
                <div className="admin_conference_report_filter_container">
                    <Input
                        type="text"
                        placeholder="Search by number"
                        value={searchString}
                        onChange={(e) => setSearchString(e.target.value)}
                        width="300px"
                        suffixIcon="search"
                        suffixIconColor="#334155"
                    />

                    <DateTimeRangePicker
                        type="range"
                        showTime={false}
                        initialStart={startDate}
                        initialEnd={endDate}
                        onChange={handleDateChange}
                        format="YYYY-MM-DD"
                    />
                    <button
                        className="admin_conference_report_filter_clear_button"
                        onClick={handleClearFilters}
                    >
                        Clear all
                    </button>


                </div>
                
                <Table
                    columns={columns}
                    data={fetchConferenceData}
                    loading={isfetchLoading}
                    totaldata={fetchConferenceCount}
                    page={page}
                    serverSide
                    pageSize={pageSize}
                    onPageChange={(pagevalues) => {
                        setTimeout(() => {
                            setPage(pagevalues.currentPage);
                            setPageSize(pagevalues.pageSize);
                            setOffset(
                                pagevalues.pageSize * pagevalues.currentPage -
                                pagevalues.pageSize
                            );
                        }, 0);
                    }}
                />
            </div>
        </div>
    );
};

export default AdminConferenceReport;
