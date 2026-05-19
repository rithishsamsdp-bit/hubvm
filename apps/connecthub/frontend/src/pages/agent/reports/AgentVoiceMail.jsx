import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../../components/Navbar.jsx";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { useVoiceMail } from "../../../store/agent/reports/useVoiceMail";
import { useAuthStore } from "../../../store/useAuthStore.js";

import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

const AgentVoiceMail = () => {
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
        getVoiceMail,
        voiceMailData,
        voiceMailCount,
        voiceMailLoading,
    } = useVoiceMail();

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
            navigate(`/tl-reports/tl-voicemail?page=${page}&per_page=${pageSize}`);
        } else {
            navigate(`/agent-reports/agent-voicemail?page=${page}&per_page=${pageSize}`);
        }
        setOffset((page - 1) * pageSize);
    }, [page, pageSize, navigate, authRole]);

    useEffect(() => {
        getVoiceMail(
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
        getVoiceMail,
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
        },
        { title: "Number", key: "c_customerPhoneno" },
        { title: "Date", key: "c_callDateTime" },
        {
            title: "Recording",
            key: "c_recUrl",
            width: 280,
            Cell: (row) => {
                if (!row.c_recUrl) return <span className="text-sm text-slate-400 font-medium">No Recording</span>;
                return (
                    <audio
                        controls
                        preload="none"
                        style={{ width: "240px", height: "35px" }}
                    >
                        <source src={row.c_recUrl} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                );
            },
        },
    ], [page, pageSize]);

    const hasActiveFilters = searchString;

    return (
        <div className="flex flex-col w-full h-full overflow-hidden bg-slate-50/30">
            <Navbar
                title="Voice Mail Report"
                breadcrumbs={[
                    { label: "Dashboard", route: authRole === "TL" ? "/tl-dashboard" : "/agent-dashboard" },
                    { label: "Reports", route: authRole === "TL" ? "/tl-reports" : "/agent-reports" },
                    { label: "Voice Mail Report", active: true },
                ]}
            />
            
            <div className="w-full h-[calc(100%-90px)] p-6 flex flex-col gap-4 overflow-hidden">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search number"
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
                        data={voiceMailData}
                        loading={voiceMailLoading}
                        totaldata={voiceMailCount}
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

export default AgentVoiceMail;
