import React, { useEffect, useState, useMemo } from "react";
import { useBillingStore } from "../../../store/superadmin/useBillingStore";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/table";
import { Search } from "lucide-react";

const Statement = () => {
  const {
    rechargeHistory,
    rechargeHistoryTotal,
    isRechargeHistoryLoading,
    fetchRechargeHistory,
  } = useBillingStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(new Date());
  const [dateTo, setDateTo] = useState(new Date());

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [offset, setOffset] = useState(0);

  const [sortField, setSortField] = useState("b_creditCreatedOn");
  const [sortOrder, setSortOrder] = useState("DESC");

  useEffect(() => {
    const payload = {
      limit: pageSize,
      offset: offset,
      searchString: searchQuery,
      dateFrom: dateFrom
        ? new Date(dateFrom.getTime() - dateFrom.getTimezoneOffset() * 60000)
            .toISOString()
            .split("T")[0]
        : null,
      dateTo: dateTo
        ? new Date(dateTo.getTime() - dateTo.getTimezoneOffset() * 60000)
            .toISOString()
            .split("T")[0]
        : null,
      sortField: sortField,
      sortOrder: sortOrder,
    };
    fetchRechargeHistory(payload);
  }, [
    pageSize,
    offset,
    searchQuery,
    dateFrom,
    dateTo,
    sortField,
    sortOrder,
    fetchRechargeHistory,
  ]);

  const handlePageChange = (pagevalues) => {
    setTimeout(() => {
      setPage(pagevalues.currentPage);
      setPageSize(pagevalues.pageSize);
      setOffset(
        pagevalues.pageSize * pagevalues.currentPage - pagevalues.pageSize,
      );
      if (pagevalues.sortConfig) {
        setSortField(pagevalues.sortConfig.key || "b_creditCreatedOn");
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
      key: "b_creditCreatedOn",
      width: 150,
      sort: true,
      Cell: (row) => formatDate(row.b_creditCreatedOn),
    },
    {
      title: "Transaction ID",
      key: "b_transaction_id",
      width: 150,
      sort: true,
      Cell: (row) =>
        row.b_transaction_id ? (
          <span className="font-mono text-[13px]">{row.b_transaction_id}</span>
        ) : (
          "-"
        ),
    },
    {
      title: "Account Name",
      key: "b_creditAccountName",
      width: 250,
      sort: true,
    },
    {
      title: "Recharge Amt",
      key: "b_credit_balance",
      sort: true,
      Cell: (row) =>
        `₹${parseFloat(row.b_credit_balance || 0).toLocaleString()}`,
    },
    {
      title: "TDS",
      key: "b_tds",
      Cell: (row) =>
        `${parseFloat(row.b_tds_percent || 0)}% (-₹${parseFloat(row.b_tds_amount || 0).toLocaleString()})`,
    },
    {
      title: "GST (18%)",
      key: "b_gst_amount",
      Cell: (row) => `+₹${parseFloat(row.b_gst_amount || 0).toLocaleString()}`,
    },
    {
      title: "Total Payable",
      key: "b_total_amount",
      sort: true,
      Cell: (row) => (
        <span className="font-bold text-slate-800">
          ₹{parseFloat(row.b_total_amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: "Payment By",
      key: "b_paymentDoneBy",
      width: 140,
      sort: true,
      Cell: (row) => row.b_paymentDoneBy || "Super Admin",
    },
    {
      title: "Status",
      key: "status",
      Cell: () => (
        <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full text-xs">
          Success
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full  overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center bg-slate-50/50">
        <div className="relative w-[300px] group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            type="text"
            placeholder="Search Account or Txn ID..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="w-[150px]">
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val)}
            options={[
              { label: "All Status", value: "all" },
              { label: "Success", value: "success" },
              { label: "Pending", value: "pending" },
              { label: "Failed", value: "failed" },
            ]}
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
          data={rechargeHistory}
          loading={isRechargeHistoryLoading}
          totaldata={rechargeHistoryTotal}
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

export default Statement;
