import { useEffect, useState, useMemo } from "react";
import { Navbar } from "../../components/Index.jsx";
import { useApiLogsStore } from "../../store/superadmin/useApiLogsStore.js";
import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, X } from "lucide-react";

const METHOD_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "GET", value: "GET" },
  { label: "POST", value: "POST" },
  { label: "PUT", value: "PUT" },
  { label: "DELETE", value: "DELETE" },
  { label: "PATCH", value: "PATCH" },
];

const getStatusVariant = (code) => {
  if (!code) return "default";
  if (code >= 200 && code < 300) return "active";
  if (code >= 400 && code < 500) return "pending";
  if (code >= 500) return "inactive";
  return "default";
};

const formatDate = (date, isEndDate = false) => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const time = isEndDate ? "23:59:59" : "00:00:00";
  return `${year}-${month}-${day} ${time}`;
};

const SuperAdminApiLogs = () => {
  const { logs, totalCount, isLoading, fetchLogs } = useApiLogsStore();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [offset, setOffset] = useState(0);

  const [accountId, setAccountId] = useState("");
  const [podName, setPodName] = useState("");
  const [method, setMethod] = useState("ALL");
  const [statusCode, setStatusCode] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    fetchLogs({
      limit: pageSize,
      offset,
      account_id: accountId,
      pod_name: podName,
      method: method === "ALL" ? "" : method,
      status_code: statusCode,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate, true),
    });
  }, [pageSize, offset, accountId, podName, method, statusCode, startDate, endDate, fetchLogs]);

  const handleClearFilters = () => {
    setAccountId("");
    setPodName("");
    setMethod("ALL");
    setStatusCode("");
    setStartDate(new Date());
    setEndDate(new Date());
    setPage(1);
    setOffset(0);
  };

  const handlePageChange = (pagevalues) => {
    setTimeout(() => {
      setPage(pagevalues.currentPage);
      setPageSize(pagevalues.pageSize);
      setOffset(pagevalues.pageSize * pagevalues.currentPage - pagevalues.pageSize);
    }, 0);
  };

  const handleDateChange = ({ start, end }) => {
    setStartDate(start);
    setEndDate(end);
  };

  const columns = useMemo(
    () => [
      {
        title: "S.No",
        key: "s_no",
        width: 60,
        Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        fixed: "left",
      },
      { title: "Account ID", key: "r_account_id", width: 100 },
      { title: "Pod Name", key: "r_pod_name", width: 160 },
      {
        title: "Method",
        key: "r_method",
        width: 80,
        Cell: (row) => (
          <span className="font-mono text-xs font-semibold">{row.r_method}</span>
        ),
      },
      {
        title: "URL",
        key: "r_url",
        width: 280,
        Cell: (row) => (
          <span
            className="text-xs truncate block max-w-[260px]"
            title={row.r_url}
          >
            {row.r_url}
          </span>
        ),
      },
      {
        title: "Status",
        key: "r_status_code",
        width: 80,
        Cell: (row) => (
          <StatusBadge
            text={String(row.r_status_code ?? "")}
            variant={getStatusVariant(row.r_status_code)}
          />
        ),
      },
      {
        title: "Duration (s)",
        key: "r_duration",
        width: 100,
        Cell: (row) =>
          row.r_duration != null ? row.r_duration.toFixed(3) : "—",
      },
      { title: "Timestamp", key: "r_timestamp", width: 160 },
    ],
    [page, pageSize],
  );

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <Navbar
        title="API Logs"
        breadcrumbs={[
          { label: "Onboard", route: "/superadmin-onboard" },
          { label: "API Logs", active: true },
        ]}
      />

      <div className="w-full h-[calc(100%-90px)] overflow-y-auto overflow-x-hidden p-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-medium">Account ID</span>
              <Input
                placeholder="Account ID"
                value={accountId}
                onChange={(e) => { setAccountId(e.target.value); setPage(1); setOffset(0); }}
                className="w-36 h-8 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-medium">Pod Name</span>
              <Input
                placeholder="Pod name"
                value={podName}
                onChange={(e) => { setPodName(e.target.value); setPage(1); setOffset(0); }}
                className="w-44 h-8 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-medium">Method</span>
              <Select
                value={method}
                onValueChange={(v) => { setMethod(v); setPage(1); setOffset(0); }}
                options={METHOD_OPTIONS}
                className="w-28 h-8 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-medium">Status Code</span>
              <Input
                placeholder="e.g. 200"
                value={statusCode}
                onChange={(e) => { setStatusCode(e.target.value); setPage(1); setOffset(0); }}
                className="w-28 h-8 text-sm"
                type="number"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-medium">Date Range</span>
              <DateTimeRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={handleDateChange}
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            data={logs}
            loading={isLoading}
            totalRecords={totalCount}
            pageSize={pageSize}
            currentPage={page}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default SuperAdminApiLogs;
