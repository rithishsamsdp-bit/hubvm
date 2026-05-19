import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "../../../components/Index.jsx";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useSmsDLRReportStore } from "../../../store/admin/reports/useSmsDLRReportStore.js";

import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Search, Download, X } from "lucide-react";

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

    const handlePageChange = useCallback((pagevalues) => {
        setTimeout(() => {
            setPage(pagevalues.currentPage);
            setPageSize(pagevalues.pageSize);
            setOffset(
                pagevalues.pageSize * pagevalues.currentPage - pagevalues.pageSize
            );
        }, 0);
    }, []);

    const columns = useMemo(() => [
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
                    className="cursor-pointer text-blue-600 hover:text-blue-800 hover:underline transition-colors"
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
    ], [page, pageSize]);

    const hasActiveFilters = searchString || direction;

    return (
        <div className="flex flex-col w-full h-full overflow-hidden bg-slate-50/30">
            <Navbar
                title="SMS Delivery Response Report"
                breadcrumbs={[
                    {
                        label: "Dashboard",
                        route: authRole === "TL" ? "/tl-dashboard" : "/admin-dashboard",
                    },
                    {
                        label: "Reports",
                        route: authRole === "TL" ? "/tl-reports" : "/admin-reports",
                    },
                    { label: "SMS Delivery Response Report", active: true },
                ]}
            >
                <Button
                    variant="default"
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
                    <Download className="w-4 h-4 mr-2" />
                    Export
                </Button>
            </Navbar>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-8 pb-8 pt-4 gap-6">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search by destination, content"
                            value={searchString}
                            onChange={(e) => {
                                setSearchString(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9"
                        />
                    </div>

                    <div className="w-[150px]">
                        <Select
                            options={[
                                { label: "Inbound", value: "Inbound" },
                                { label: "Outbound", value: "Outbound" },
                            ]}
                            value={direction}
                            onValueChange={(val) => {
                                setDirection(val);
                                setPage(1);
                            }}
                            placeholder="Direction"
                            showSearch={false}
                            allowClear={true}
                            onClear={() => setDirection("")}
                        />
                    </div>

                    <DateTimeRangePicker
                        type="range"
                        showTime={false}
                        initialStart={startDate}
                        initialEnd={endDate}
                        onChange={handleDateChange}
                        format="YYYY-MM-DD"
                    />

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-medium"
                            onClick={handleClearFilters}
                        >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Clear all
                        </Button>
                    )}
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={fetchSmsDLRData}
                        loading={isFetchLoading}
                        totaldata={fetchSmsDLRCount}
                        pagination={true}
                        page={page}
                        serverSide
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                    />
                </div>
            </div>

            <Dialog
                open={modalData.open}
                onOpenChange={(open) => {
                    if (!open) {
                        setModalData({ ...modalData, open: false });
                    }
                }}
            >
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white rounded-xl">
                    <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <DialogTitle className="text-base font-semibold text-slate-800">
                            {modalData.title}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                            {modalData.content}
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SmsDLRreport;
