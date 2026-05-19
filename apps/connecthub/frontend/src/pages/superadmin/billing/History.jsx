import React, { useEffect, useState, useMemo } from "react";
import { useBillingStore } from "../../../store/superadmin/useBillingStore";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/table";
import { Search } from "lucide-react";

const History = () => {
  const {
    callDeductHistory,
    callDeductHistoryTotal,
    isCallDeductHistoryLoading,
    fetchCallDeductHistory,
  } = useBillingStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState(new Date());
  const [dateTo, setDateTo] = useState(new Date());

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [offset, setOffset] = useState(0);

  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");

  useEffect(() => {
    const payload = {
      limit: pageSize,
      offset: offset,
      searchString: searchQuery,
      dateFrom: dateFrom
        ? new Date(dateFrom.getTime() - dateFrom.getTimezoneOffset() * 60000)
            .toISOString()
            .split("T")[0] + " 00:00:00"
        : null,
      dateTo: dateTo
        ? new Date(dateTo.getTime() - dateTo.getTimezoneOffset() * 60000)
            .toISOString()
            .split("T")[0] + " 23:59:59"
        : null,
      sortField: sortField,
      sortOrder: sortOrder,
    };
    fetchCallDeductHistory(payload);
  }, [
    pageSize,
    offset,
    searchQuery,
    dateFrom,
    dateTo,
    sortField,
    sortOrder,
    fetchCallDeductHistory,
  ]);

  const handlePageChange = (pagevalues) => {
    setTimeout(() => {
      setPage(pagevalues.currentPage);
      setPageSize(pagevalues.pageSize);
      setOffset(
        pagevalues.pageSize * pagevalues.currentPage - pagevalues.pageSize,
      );
      if (pagevalues.sortConfig) {
        setSortField(pagevalues.sortConfig.key || "created_at");
        setSortOrder(pagevalues.sortConfig.direction || "DESC");
      }
    }, 0);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setPage(1);
    setOffset(0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const columns = [
    {
      title: "S.no",
      key: "s_no",
      width: 50,
      Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
    },
    {
      title: "Date",
      key: "created_at",
      width: 150,
      sort: true,
      Cell: (row) => formatDate(row.created_at),
    },
    {
      title: "Account ID",
      key: "account_id",
      width: 100,
      sort: true,
    },
    {
      title: "From",
      key: "b_from",
      width: 120,
      sort: true,
    },
    {
      title: "CDR Sec",
      key: "b_CDR_billsec",
      width: 100,
      sort: true,
      Cell: (row) => `${row.b_CDR_billsec}s`,
    },
    {
      title: "Pulse Sec",
      key: "b_pulsebill_overall_sec",
      width: 100,
      sort: true,
      Cell: (row) => `${row.b_pulsebill_overall_sec}s`,
    },
    {
      title: "Pulse",
      key: "b_pulseBilling",
      width: 80,
      sort: true,
    },
    {
      title: "Rate",
      key: "rate",
      width: 80,
      sort: true,
      Cell: (row) => `₹${parseFloat(row.rate || 0).toFixed(2)}`,
    },
    {
      title: "Deduct Amt",
      key: "deduct_amount",
      sort: true,
      Cell: (row) => (
        <span className="font-medium text-red-500">
          -₹{parseFloat(row.deduct_amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: "Balance",
      key: "available_balance",
      sort: true,
      Cell: (row) => (
        <span className="font-semibold text-slate-800">
          ₹{parseFloat(row.available_balance || 0).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center bg-slate-50/50">
        <div className="relative w-[300px] group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            type="text"
            placeholder="Search Account ID or From..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <DateTimeRangePicker
            type="range"
            initialStart={dateFrom}
            initialEnd={dateTo}
            showTime={false}
            onChange={({ start, end }) => {
              setDateFrom(start);
              setDateTo(end);
            }}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <DataTable
          columns={columns}
          data={callDeductHistory}
          loading={isCallDeductHistoryLoading}
          totaldata={callDeductHistoryTotal}
          page={page}
          serverSide
          pageSize={pageSize}
          pagination={true}
          showtotal={true}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
};

export default History;
