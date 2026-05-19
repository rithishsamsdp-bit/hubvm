import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "../../../components/Index.jsx";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { useConferenceStore } from "../../../store/admin/reports/useConferenceStore.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, X } from "lucide-react";

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
    }, [page, pageSize, navigate, authRole]);

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
                if (!row.url) return <span className="text-sm text-slate-400 font-medium">No Recording</span>;
                return (
                    <audio
                        controls
                        preload="none"
                        style={{ width: "240px", height: "35px" }}
                    >
                        <source src={row.url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                );
            },
        },
    ], [page, pageSize]);

    const hasActiveFilters = searchString;

    return (
        <div className="flex flex-col w-full h-full overflow-hidden">
            <Navbar
                title="Conference Report"
                breadcrumbs={[
                    {
                        label: "Dashboard",
                        route: authRole === "TL" ? "/tl-dashboard" : "/admin-dashboard",
                    },
                    {
                        label: "Reports",
                        route: authRole === "TL" ? "/tl-reports" : "/admin-reports",
                    },
                    { label: "Conference Report", active: true },
                ]}
            >
                <Button 
                    variant="default"
                    onClick={() => {
                        exportcdr(
                            pageSize,
                            offset,
                            searchString,
                            formatDate(startDate),
                            formatDate(endDate, true)
                        );
                    }}
                >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                </Button>
            </Navbar>

            <div className="w-full h-[calc(100%-90px)] p-6 flex flex-col gap-4 overflow-hidden">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search by number"
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
                        data={fetchConferenceData}
                        loading={isfetchLoading}
                        totaldata={fetchConferenceCount}
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

export default AdminConferenceReport;
