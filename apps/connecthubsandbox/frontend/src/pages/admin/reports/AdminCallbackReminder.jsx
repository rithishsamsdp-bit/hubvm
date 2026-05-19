import { useEffect, useState } from "react";
import "./styles/AdminCallbackReminder.css";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Table,
    Input,
    DateTimeRangePicker
} from "../../../components/Index.jsx";
import { useCallbackReminder } from "../../../store/admin/reports/useCallbackReminder";
import { useAuthStore } from "../../../store/useAuthStore.js";
import Icon from "../../../constants/Icon.jsx";

const AdminCallbackReminder = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);

    const [page, setPage] = useState(parseInt(params.get("page")) || 1);
    const [pageSize, setPageSize] = useState(parseInt(params.get("per_page")) || 10);
    const [offset, setOffset] = useState((page - 1) * pageSize || 0);
    const [searchString, setSearchString] = useState("");
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    const {
        getCallbackReminder,
        callbackReminderData,
        callbackReminderCount,
        callbackReminderLoading,
    } = useCallbackReminder();

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
            navigate(`/tl-reports/tl-callback-reminder?page=${page}&per_page=${pageSize}`);
        } else {
            navigate(`/admin-reports/admin-callback-reminder?page=${page}&per_page=${pageSize}`);
        }
        setOffset((page - 1) * pageSize);
    }, [page, pageSize, navigate]);

    useEffect(() => {
        getCallbackReminder(
            pageSize,
            offset,
            searchString,
            "c_createdOn",
            "DESC" ,
            formatDate(startDate),
            formatDate(endDate, true)
        );
    }, [
        pageSize,
        offset,
        searchString,
        getCallbackReminder,
        startDate,
        endDate,
    ]);

    const handleClearFilters = () => {
        setSearchString("");
    };

    const handleDateChange = ({ start, end }) => {
        setStartDate(start);
        setEndDate(end);
    };

    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return "-";
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleString('en-IN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            return dateTimeString;
        }
    };

    const columns = [
        {
            title: "S.no",
            key: "s_no",
            width: 80,
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        },
        { 
            title: "Phone Number", 
            key: "c_phonenumber",
            width: 150,
        },
        { 
            title: "Member Name", 
            key: "m_memberName",
            width: 200,
            Cell: (row) => row.m_memberName || "-"
        },
        { 
            title: "Extension No", 
            key: "c_memberExtensionNo",
            width: 120,
        },
        { 
            title: "Reminder Time", 
            key: "c_timestamp",
            width: 200,
            Cell: (row) => formatDateTime(row.c_timestamp)
        },
        { 
            title: "Created On", 
            key: "c_createdOn",
            width: 200,
            Cell: (row) => formatDateTime(row.c_createdOn)
        },
    ];

    return (
        <div className="agent_callback_reminder_report">
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">Callback Reminder Report</p>
                    <span className="navbar_1_breadcrumb">
                        <span
                            className="navbar_1_breadcrumb_item"
                            onClick={() => { navigate("/agent-dashboard") }}
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item" onClick={() => { navigate("/agent-reports") }}>
                            Reports
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item active">
                            Callback Reminder Report
                        </span>
                    </span>
                </div>
            </div>
            <div className="agent_callback_reminder_report_container">
                <div className="agent_callback_reminder_report_filter_container">
                    <Input
                        type="text"
                        placeholder="Search phone, extension, or name"
                        value={searchString}
                        onChange={(e) => setSearchString(e.target.value)}
                        width="400px"
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
                        className="agent_callback_reminder_report_filter_clear_button"
                        onClick={handleClearFilters}
                    >
                        Clear all
                    </button>
                </div>

                <Table
                    columns={columns}
                    data={callbackReminderData}
                    loading={callbackReminderLoading}
                    totaldata={callbackReminderCount}
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

export default AdminCallbackReminder;