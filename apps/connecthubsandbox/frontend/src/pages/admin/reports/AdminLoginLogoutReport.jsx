import { useEffect, useState } from "react";
import "./styles/AdminLoginLogoutReport.css";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Button,
    Table,
    DateTimeRangePicker,
    Input,
} from "../../../components/Index.jsx";
import { useLoginLoutStore } from "../../../store/admin/reports/useLoginLoutStore";
import { useAuthStore } from "../../../store/useAuthStore.js";
import Icon from "../../../constants/Icon.jsx";

const AdminLoginLogoutReport = () => {
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
        getloginlogout,
        loginlogoutData,
        loginlogoutCount,
        loginlogoutLoading,
        exportloginlogout
    } = useLoginLoutStore();

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
            navigate(`/tl-reports/tl-login-logout?page=${page}&per_page=${pageSize}`);
        } else {
            navigate(`/admin-reports/admin-login-logout?page=${page}&per_page=${pageSize}`);
        }
        setOffset((page - 1) * pageSize);
    }, [page, pageSize, navigate]);

    useEffect(() => {
        getloginlogout(
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
        getloginlogout,
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
        },
        { title: "Name", key: "memberName" },
        { title: "Work Date", key: "workDate" },
        { title: "Login Time", key: "loginTime" },
        { title: "Logout Time", key: "logoutTime" },
        { title: "Duration", key: "durationFormatted" },

    ];

    return (
        <div className="admin_login_logout_report">
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">Login Logout Report</p>
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
                            Login Logout Report
                        </span>
                    </span>
                </div>
                <div>
                    <Button onClick={() => {
                        exportloginlogout(pageSize,
                            offset,
                            searchString,
                            formatDate(startDate),
                            formatDate(endDate, true))
                    }}>
                        Export
                    </Button>
                </div>
            </div>
            <div className="admin_login_logout_report_container">
                <div className="admin_login_logout_report_filter_container">

                    <Input
                        type="text"
                        placeholder="Search by agent name"
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
                        className="admin_login_logout_report_filter_clear_button"
                        onClick={handleClearFilters}
                    >
                        Clear all
                    </button>
                </div>

                <Table
                    columns={columns}
                    data={loginlogoutData}
                    loading={loginlogoutLoading}
                    totaldata={loginlogoutCount}
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

export default AdminLoginLogoutReport;


