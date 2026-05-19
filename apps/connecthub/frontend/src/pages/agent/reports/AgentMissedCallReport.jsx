import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../../components/Navbar.jsx";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { useMissedCallStore } from "../../../store/agent/reports/useMissedCallStore";

import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Download } from "lucide-react";

const AgentMissedCallReport = () => {
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
        getmissedcall,
        fetchmissedcall,
        fetchCdrCount,
        isfetchLoading,
        exportmissedcall
    } = useMissedCallStore();

    const formatDate = (date) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    useEffect(() => {
        navigate(`/agent-reports/agent-missed-calls-report?page=${page}&per_page=${pageSize}`);
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

    const columns = useMemo(() => [
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
    ], [page, pageSize]);

    const hasActiveFilters = searchString;

    return (
        <div className="flex flex-col w-full h-full overflow-hidden bg-slate-50/30">
            <Navbar
                title="Missed Calls Report"
                breadcrumbs={[
                    { label: "Dashboard", route: "/agent-dashboard" },
                    { label: "Reports", route: "/agent-reports" },
                    { label: "Missed Calls", active: true },
                ]}
            >
                <Button 
                    variant="default"
                    onClick={() => exportmissedcall(
                        pageSize,
                        offset,
                        searchString,
                        formatDate(startDate),
                        formatDate(endDate)
                    )}
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
                            placeholder="Search by name, Source, Destination"
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
        </div>
    );
};

export default AgentMissedCallReport;
