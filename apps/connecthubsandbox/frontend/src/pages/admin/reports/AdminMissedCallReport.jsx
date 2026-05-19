import { useEffect, useState } from "react";
import "./styles/AdminMissedCallReport.css";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Table,
    DateTimeRangePicker,
    Input,
    Button
} from "../../../components/Index.jsx";
import { useAdminMissedCallStore } from "../../../store/admin/reports/useAdminMissedCallStore";
import Icon from "../../../constants/Icon.jsx";

const AdminMissedCallReport = () => {
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
        getmissedcall,
        fetchmissedcall,
        fetchCdrCount,
        isfetchLoading,
        exportmissedcall
    } = useAdminMissedCallStore();

    const formatDate = (date) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    useEffect(() => {
        navigate(`/admin-reports/admin-missed-calls-report?page=${page}&per_page=${pageSize}`);
        setOffset((page - 1) * pageSize);
    }, [page, pageSize, navigate]);

    useEffect(() => {
        getmissedcall(
            pageSize,
            offset,
            searchString,
            formatDate(startDate),
            formatDate(endDate)
        );
    }, [
        pageSize,
        offset,
        searchString,
        startDate,
        endDate,
        getmissedcall,
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
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
            fixed: "left",
        },
        { title: "Member Name", key: "MemberName" },
        { title: "Extension", key: "MemberExtensionNumber" },
        { title: "Customer Phone", key: "CustomerPhoneNumber" },
        { title: "Call Date", key: "CallDateTime" },
        { title: "Direction", key: "CallDirection" },
        { title: "Disposition", key: "CallDisposition" },
        { title: "Line Number", key: "CallLineNumber" },
    ];


    return (
        <div className="admin_missed_call_report">
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">Missed Calls Report</p>
                    <span className="navbar_1_breadcrumb">
                        <span
                            className="navbar_1_breadcrumb_item"
                            onClick={() => {
                                navigate("/admin-dashboard")
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
                            Missed Calls Report
                        </span>
                    </span>
                </div>
                <div>
                    <Button onClick={() => exportmissedcall(pageSize,
                        offset,
                        searchString,
                        formatDate(startDate),
                        formatDate(endDate))}>
                        Export
                    </Button>
                </div>
            </div>
            <div className="admin_missed_call_report_container">
                <div className="admin_missed_call_report_filter_container">
                    <Input
                        type="text"
                        placeholder="Search by name, Source, Destination"
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
                        className="admin_missed_call_report_filter_clear_button"
                        onClick={handleClearFilters}
                    >
                        Clear all
                    </button>


                </div>
                <Table
                    columns={columns}
                    data={fetchmissedcall}
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
                                pagevalues.pageSize
                            );

                        }, 0);
                    }}
                />
            </div>
        </div>
    );
};

export default AdminMissedCallReport;
