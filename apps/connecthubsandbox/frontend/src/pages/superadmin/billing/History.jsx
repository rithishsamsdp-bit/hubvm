import React, { useEffect, useState, useMemo } from "react";
import "./styles/History.css";
import { useBillingStore } from "../../../store/superadmin/useBillingStore";
import { Loader, Input, Select, Table, DateTimeRangePicker, Icon } from "../../../components/Index.jsx";

const History = () => {
    const { rechargeHistory, rechargeHistoryTotal, isRechargeHistoryLoading, fetchRechargeHistory } = useBillingStore();
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
            dateFrom: dateFrom ? new Date(dateFrom.getTime() - dateFrom.getTimezoneOffset() * 60000).toISOString().split("T")[0] : null,
            dateTo: dateTo ? new Date(dateTo.getTime() - dateTo.getTimezoneOffset() * 60000).toISOString().split("T")[0] : null,
            sortField: sortField,
            sortOrder: sortOrder
        };
        fetchRechargeHistory(payload);
    }, [pageSize, offset, searchQuery, dateFrom, dateTo, sortField, sortOrder, fetchRechargeHistory]);

    const handlePageChange = (pagevalues) => {
        setTimeout(() => {
            setPage(pagevalues.currentPage);
            setPageSize(pagevalues.pageSize);
            setOffset(
                pagevalues.pageSize * pagevalues.currentPage -
                pagevalues.pageSize
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
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
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
            Cell: (row) => row.b_transaction_id ? <span style={{ fontFamily: "monospace", fontSize: "13px" }}>{row.b_transaction_id}</span> : "-"
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
            Cell: (row) => `₹${parseFloat(row.b_credit_balance || 0).toLocaleString()}`,
        },
        {
            title: "TDS",
            key: "b_tds",
            Cell: (row) => `${parseFloat(row.b_tds_percent || 0)}% (-₹${parseFloat(row.b_tds_amount || 0).toLocaleString()})`
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
            Cell: (row) => <span style={{ fontWeight: 600 }}>₹{parseFloat(row.b_total_amount || 0).toLocaleString()}</span>,
        },
        {
            title: "Payment By",
            key: "b_paymentDoneBy",
            width: 140,
            sort: true,
            Cell: (row) => row.b_paymentDoneBy || "Super Admin"
        },
        {
            title: "Status",
            key: "status",
            Cell: () => <span style={{ color: "#16a34a", fontWeight: "500", background: "#f0fdf4", padding: "4px 8px", borderRadius: "100px", fontSize: "12px" }}>Success</span>
        }
    ];

    return (
        <div className="recharge_content_container">
            <div className="recharge_content_filter_container">
                {/* Filter Strip */}
                <Input
                    placeholder="Search Account or Txn ID..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    width="300px"
                    suffixIcon="search"
                    suffixIconColor="#334155"
                />
                <Select
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    options={[
                        { label: "All Status", value: "all" },
                        { label: "Success", value: "success" },
                        { label: "Pending", value: "pending" },
                        { label: "Failed", value: "failed" }
                    ]}
                    width="150px"
                    showSearch={false}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
            <Table
                data={rechargeHistory}
                columns={columns}
                loading={isRechargeHistoryLoading}
                pagination={true}
                serverSide={true}
                page={page}
                pageSize={pageSize}
                totaldata={rechargeHistoryTotal}
                onPageChange={handlePageChange}
            />
        </div>
    );
};

export default History;
