import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "../../../components/Index.jsx";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { usePerformanceStore } from "../../../store/admin/reports/usePerformanceStore";
import { useAuthStore } from "../../../store/useAuthStore.js";

import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, X } from "lucide-react";

const AdminPerformanceReport = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(
    parseInt(params.get("per_page")) || 10,
  );
  const [offset, setOffset] = useState((page - 1) * pageSize || 0);
  const [searchString, setSearchString] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const {
    performanceData,
    performanceCount,
    performanceLoading,
    getperformance,
    exportperformance,
  } = usePerformanceStore();

  const { authRole } = useAuthStore();

  const formatDate = (date, isEndDate = false) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (authRole === "TL") {
      navigate(`/tl-reports/tl-performance?page=${page}&per_page=${pageSize}`);
    } else {
      navigate(
        `/admin-reports/admin-performance?page=${page}&per_page=${pageSize}`,
      );
    }
    setOffset((page - 1) * pageSize);
  }, [page, pageSize, navigate, authRole]);

  useEffect(() => {
    getperformance(
      pageSize,
      offset,
      searchString,
      formatDate(startDate),
      formatDate(endDate, true),
    );
  }, [pageSize, offset, searchString, startDate, endDate, getperformance]);

  const handleClearFilters = () => {
    setSearchString("");
    setStartDate(new Date());
    setEndDate(new Date());
  };

  const handleDateChange = ({ start, end }) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handlePageChange = (pagevalues) => {
    setTimeout(() => {
      setPage(pagevalues.currentPage);
      setPageSize(pagevalues.pageSize);
      setOffset(
        pagevalues.pageSize * pagevalues.currentPage - pagevalues.pageSize,
      );
    }, 0);
  };

  const columns = useMemo(
    () => [
      {
        title: "S.no",
        key: "s_no",
        width: 50,
        Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        fixed: "left",
      },
      { title: "Name", key: "m_memberName", width: 100, fixed: "left" },
      {
        title: "Extension",
        key: "m_memberExtensionNo",
        width: 130,
        fixed: "left",
      },
      { title: "Inbound Total", key: "m_inboundTotal" },
      { title: "Inbound Ans", key: "m_inboundAnswered" },
      { title: "Inbound Unans", key: "m_inboundUnanswered" },
      { title: "Inbound Talk Time", key: "m_inboundTalkTime" },
      { title: "Outbound Total", key: "m_outboundTotal" },
      { title: "Outbound Ans", key: "m_outboundAnswered" },
      { title: "Outbound Unans", key: "m_outboundUnanswered" },
      { title: "Outbound Talk Time", key: "m_outboundTalkTime" },
      { title: "Ready Time", key: "m_readySeconds" },
      { title: "Not Ready Time", key: "m_notreadySeconds" },
      { title: "Break Time", key: "m_breakSeconds" },
      { title: "Lunch Time", key: "m_lunchSeconds" },
      { title: "Meeting Time", key: "m_meetingSeconds" },
      { title: "Query Time", key: "m_querySeconds" },
      { title: "Login Time", key: "m_loginSeconds" },
    ],
    [page, pageSize],
  );

  const hasActiveFilters = searchString;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <Navbar
        title="Performance Report"
        breadcrumbs={[
          {
            label: "Dashboard",
            route: authRole === "TL" ? "/tl-dashboard" : "/admin-dashboard",
          },
          {
            label: "Reports",
            route: authRole === "TL" ? "/tl-reports" : "/admin-reports",
          },
          { label: "Performance Report", active: true },
        ]}
      >
        <Button
          variant="default"
          onClick={() =>
            exportperformance(
              pageSize,
              offset,
              searchString,
              formatDate(startDate),
              formatDate(endDate, true),
            )
          }
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
              placeholder="Search by agent name"
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
            data={performanceData}
            loading={performanceLoading}
            totaldata={performanceCount}
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

export default AdminPerformanceReport;
