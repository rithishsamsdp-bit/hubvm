import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "../../../components/Index.jsx";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { useBreakStore } from "../../../store/admin/reports/useBreakStore";
import { useAuthStore } from "../../../store/useAuthStore.js";

import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, X } from "lucide-react";

const AdminBreakReport = () => {
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
  const [sortField, setSortField] = useState("c_callDateTime");
  const [sortOrder, setSortOrder] = useState("ASC");

  const {
    getBreak,
    BreakData,
    breakDataCount,
    breakDataLoading,
    exportbreak,
  } = useBreakStore();

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
      navigate(
        `/tl-reports/tl-break-report?page=${page}&per_page=${pageSize}`,
      );
    } else {
      navigate(
        `/admin-reports/admin-break-report?page=${page}&per_page=${pageSize}`,
      );
    }
    setOffset((page - 1) * pageSize);
  }, [page, pageSize, navigate, authRole]);

  useEffect(() => {
    getBreak(
      pageSize,
      offset,
      searchString,
      formatDate(startDate),
      formatDate(endDate, true),
    );
  }, [pageSize, offset, searchString, startDate, endDate, getBreak]);

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
        pagevalues.pageSize * pagevalues.currentPage - pagevalues.pageSize,
      );
      if (pagevalues.sortConfig) {
        setSortField(pagevalues.sortConfig.key || "c_callDateTime");
        setSortOrder(pagevalues.sortConfig.direction || "ASC");
      }
    }, 0);
  }, []);

  const columns = useMemo(
    () => [
      {
        title: "S.no",
        key: "s_no",
        width: 50,
        Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
      },
      { title: "Name", key: "m_memberName" },
      { title: "Extension", key: "m_memberExtensionNo" },
      { title: "Date", key: "m_productionDate" },
      { title: "Break Time", key: "m_breakSeconds" },
      { title: "Lunch Time", key: "m_lunchSeconds" },
      { title: "Meeting Time", key: "m_meetingSeconds" },
      { title: "Query Time", key: "m_querySeconds" },
    ],
    [page, pageSize],
  );

  const hasActiveFilters = searchString;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <Navbar
        title="Break Report"
        breadcrumbs={[
          {
            label: "Dashboard",
            route: authRole === "TL" ? "/tl-dashboard" : "/admin-dashboard",
          },
          {
            label: "Reports",
            route: authRole === "TL" ? "/tl-reports" : "/admin-reports",
          },
          { label: "Break Report", active: true },
        ]}
      >
        <Button
          variant="default"
          onClick={() =>
            exportbreak(
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
            data={BreakData}
            loading={breakDataLoading}
            totaldata={breakDataCount}
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

export default AdminBreakReport;
