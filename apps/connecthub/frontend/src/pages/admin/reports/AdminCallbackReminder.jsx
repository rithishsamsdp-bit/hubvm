import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "../../../components/Index.jsx";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { useCallbackReminder } from "../../../store/admin/reports/useCallbackReminder";
import { useAuthStore } from "../../../store/useAuthStore.js";

import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

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
    }, [page, pageSize, navigate, authRole]);

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
        setStartDate(new Date());
        setEndDate(new Date());
    };

    const handleDateChange = ({ start, end }) => {
        setStartDate(start);
        setEndDate(end);
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

    const columns = useMemo(() => [
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
    ], [page, pageSize]);

    const hasActiveFilters = searchString;

    return (
        <div className="flex flex-col w-full h-full overflow-hidden">
            <Navbar
                title="Callback Reminder Report"
                breadcrumbs={[
                    {
                        label: "Dashboard",
                        route: authRole === "TL" ? "/tl-dashboard" : "/admin-dashboard",
                    },
                    {
                        label: "Reports",
                        route: authRole === "TL" ? "/tl-reports" : "/admin-reports",
                    },
                    { label: "Callback Reminder Report", active: true },
                ]}
            />

            <div className="w-full h-[calc(100%-90px)] p-6 flex flex-col gap-4 overflow-hidden">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search phone, extension, or name"
                            value={searchString}
                            onChange={(e) => setSearchString(e.target.value)}
                            className="pl-9"
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
                        data={callbackReminderData}
                        loading={callbackReminderLoading}
                        totaldata={callbackReminderCount}
                        pagination={true}
                        page={page}
                        serverSide
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                    />
                </div>
            </div>
        </div>
    );
};

export default AdminCallbackReminder;