import { useEffect, useState } from "react";
import "./styles/DLRreport.css";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Select,
    Table,
    DateTimeRangePicker,
    Input,
    Button,
    Modal,
} from "../../../components/Index.jsx";
import { useAuthStore } from "../../../store/useAuthStore.js";
import Icon from "../../../constants/Icon.jsx";
import { useSmsDLRReportStore } from "../../../store/admin/reports/useSmsDLRReportStore.js";

const SmsDLRreport = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);

    const [page, setPage] = useState(parseInt(params.get("page")) || 1);
    const [pageSize, setPageSize] = useState(
        parseInt(params.get("per_page")) || 10
    );
    const [offset, setOffset] = useState((page - 1) * pageSize || 0);
    const [searchString, setSearchString] = useState("");
    const [status, setStatus] = useState("");
    const [direction, setDirection] = useState("");
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [sortField, setSortField] = useState("activityTimestamp");
    const [sortOrder, setSortOrder] = useState("DESC");
    const [modalData, setModalData] = useState({
        open: false,
        title: "",
        content: "",
    });

    const {
        getSmsDLRData,
        fetchSmsDLRData,
        fetchSmsDLRCount,
        isFetchLoading,
        exportSmsDLR,
    } = useSmsDLRReportStore();

    const { authRole } = useAuthStore();

    const formatDate = (date, isEndDate = false) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const time = isEndDate ? "23:59:59" : "00:00:00";
        return `${year}-${month}-${day} ${time}`;
    };

    const formatDisplayDate = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "-";

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    useEffect(() => {
        if (authRole === "TL") {
            navigate(`/tl-reports/tl-sms-delivery-response?page=${page}&per_page=${pageSize}`);
        } else {
            navigate(`/admin-reports/admin-sms-delivery-response?page=${page}&per_page=${pageSize}`);
        }
        setOffset((page - 1) * pageSize);
    }, [page, pageSize, navigate, authRole]);

    useEffect(() => {
        getSmsDLRData(
            pageSize,
            offset,
            sortField,
            sortOrder,
            searchString,
            status,
            direction,
            formatDate(startDate),
            formatDate(endDate, true)
        );
    }, [
        pageSize,
        offset,
        sortField,
        sortOrder,
        searchString,
        status,
        direction,
        startDate,
        endDate,
        getSmsDLRData,
    ]);

    const handleClearFilters = () => {
        setSearchString("");
        setStatus("");
        setDirection("");
        setStartDate(new Date());
        setEndDate(new Date());
        setPage(1);
    };

    const handleDateChange = ({ start, end }) => {
        setStartDate(start);
        setEndDate(end);
        setPage(1);
    };

    const columns = [
        {
            title: "S.no",
            key: "s_no",
            width: 50,
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        },
        {
            title: "Member Name",
            key: "memberName",
            width: 150,
            Cell: (row) => <span>{row.memberName || "-"}</span>,
        },
        {
            title: "Source Number",
            key: "m_src",
            width: 120,
            Cell: (row) => <span>{row.m_src || "-"}</span>,
        },
        {
            title: "Destination",
            key: "m_dst",
            width: 120,
            Cell: (row) => <span>{row.m_dst || "-"}</span>,
        },
        {
            title: "Timestamp",
            key: "activityTimestamp",
            width: 150,
            Cell: (row) => formatDisplayDate(row.activityTimestamp),
        },
        {
            title: "Direction",
            key: "direction",
            width: 100
        },
        {
            title: "Message",
            key: "m_receiveMsg",
            width: 200,
            Cell: (row) => (
                <span
                    title={row.m_receiveMsg}
                    style={{ cursor: "pointer", color: "#2563eb" }}
                    onClick={() =>
                        setModalData({
                            open: true,
                            title: "Message",
                            content: row.m_receiveMsg,
                        })
                    }
                >
                    {row.m_receiveMsg?.length > 30
                        ? `${row.m_receiveMsg.substring(0, 30)}...`
                        : row.m_receiveMsg || "-"}
                </span>
            ),
        }
    ];

    return (
        <div className="admin_dlr_report">
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">SMS Delivery Response Report</p>
                    <span className="navbar_1_breadcrumb">
                        <span
                            className="navbar_1_breadcrumb_item"
                            onClick={() => {
                                if (authRole === "TL") {
                                    navigate("/tl-dashboard");
                                } else if (authRole === "ADMIN") {
                                    navigate("/admin-dashboard");
                                }
                            }}
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span
                            className="navbar_1_breadcrumb_item"
                            onClick={() => {
                                navigate("/admin-reports");
                            }}
                        >
                            Reports
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item active">
                            SMS Delivery Response Report
                        </span>
                    </span>
                </div>
                <div>
                    <Button
                        onClick={() =>
                            exportSmsDLR(
                                pageSize,
                                offset,
                                sortField,
                                sortOrder,
                                searchString,
                                status,
                                direction,
                                formatDate(startDate),
                                formatDate(endDate, true)
                            )
                        }
                    >
                        Export
                    </Button>
                </div>
            </div>
            <div className="admin_dlr_report_container">
                <div className="admin_dlr_report_filter_container">
                    <Input
                        type="text"
                        placeholder="Search by destination, content"
                        value={searchString}
                        onChange={(e) => {
                            setSearchString(e.target.value);
                            setPage(1);
                        }}
                        width="300px"
                        suffixIcon="search"
                        suffixIconColor="#334155"
                    />

                    <Select
                        mode="single"
                        width="150px"
                        placeholder="Direction"
                        showSearch={false}
                        value={direction}
                        onChange={(val) => {
                            setDirection(val);
                            setPage(1);
                        }}
                        options={[
                            { label: "Inbound", value: "Inbound" },
                            { label: "Outbound", value: "Outbound" },
                        ]}
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
                        className="admin_dlr_report_filter_clear_button"
                        onClick={handleClearFilters}
                    >
                        Clear all
                    </button>
                </div>

                <Table
                    columns={columns}
                    data={fetchSmsDLRData}
                    loading={isFetchLoading}
                    totaldata={fetchSmsDLRCount}
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
            <Modal
                open={modalData.open}
                onClose={() => setModalData({ ...modalData, open: false })}
                width="600px"
                closeOnOverlayClick={true}
            >
                <div className="admin_dlr_modal_header_container">
                    <p className="admin_dlr_modal_header">{modalData.title}</p>
                    <Button
                        variant="empty"
                        onClick={() => setModalData({ ...modalData, open: false })}
                    >
                        <Icon name="close" color="#0F172A" size="14" />
                    </Button>
                </div>
                <div className="admin_dlr_modal_body">
                    <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {modalData.content}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SmsDLRreport;
