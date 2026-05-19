import * as React from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Search,
  Loader2,
} from "lucide-react";
import Icon from "../../constants/Icon.jsx";

import { cn } from "@/lib/utils";

function Table({ className, ...props }) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  DataTable,
};

const DataTable = ({
  columns = [],
  data = [],
  page = 1,
  pageSize = 10,
  totaldata = 0,
  loading = false,
  searchable = false,
  sortable = true,
  selectable = false,
  pagination = true,
  showtotal = true,
  serverSide = false,
  height = "",
  onSelectChange = () => {},
  onPageChange = () => {},
  onRowClick = null,
  clickableRows = false,
}) => {
  // Ensure data is an array
  const safeData = Array.isArray(data) ? data : data != null ? [data] : [];

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(page);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "ASC" });
  const [selectedRows, setSelectedRows] = useState([]);
  const [goToPage, setGoToPage] = useState("");
  const [perPageEnabled, setPerPageEnabled] = useState(pageSize);
  const [manualPageSize, setManualPageSize] = useState(false);

  // Keep in sync when parent props change
  useEffect(() => setCurrentPage(page), [page]);
  useEffect(() => setPerPageEnabled(pageSize), [pageSize]);

  // Centralized callback
  const triggerPageChange = useCallback(
    (
      newPage,
      newSize = perPageEnabled,
      newSearch = search,
      newSort = sortConfig,
    ) => {
      onPageChange({
        currentPage: newPage,
        pageSize: newSize,
        search: newSearch,
        sortConfig: newSort,
      });
    },
    [perPageEnabled, search, sortConfig, onPageChange],
  );

  // Filter
  const filtered = useMemo(() => {
    return safeData.filter((row) =>
      columns.some((col) => {
        const v = row[col.key];
        return (
          typeof v === "string" &&
          v.toLowerCase().includes(search.toLowerCase())
        );
      }),
    );
  }, [safeData, columns, search]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortable || !sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortConfig.key],
        bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === "ASC" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "ASC" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortConfig, sortable]);

  // Paginate
  const totalCount =
    typeof totaldata === "number" && totaldata >= 0
      ? totaldata
      : filtered.length;
  const totalPages = Math.ceil(totalCount / perPageEnabled);

  const paginated = useMemo(() => {
    if (!pagination) return sorted;
    if (serverSide) return sorted;
    const start = (currentPage - 1) * perPageEnabled;
    return sorted.slice(start, start + perPageEnabled);
  }, [sorted, currentPage, perPageEnabled, pagination, serverSide]);

  // Selection
  useEffect(() => {
    onSelectChange(selectedRows);
  }, [selectedRows, onSelectChange]);

  // Responsive auto-pageSize until user picks manually (same as legacy Table.jsx)
  useEffect(() => {
    const updatePerPage = () => {
      if (manualPageSize) return; // once manual, skip auto
      const autoSize = window.innerHeight > 800 ? 25 : pageSize;
      if (perPageEnabled !== autoSize) {
        setPerPageEnabled(autoSize);
        setCurrentPage(1);
        triggerPageChange(1, autoSize);
      }
    };

    updatePerPage(); // initial apply
    window.addEventListener("resize", updatePerPage);
    return () => window.removeEventListener("resize", updatePerPage);
  }, [manualPageSize, pageSize, perPageEnabled, triggerPageChange]);

  // Handlers
  const handleSearch = (e) => {
    const v = e.target.value;
    setSearch(v);
    setCurrentPage(1);
    triggerPageChange(1, perPageEnabled, v);
  };

  const handleSort = (key) => {
    if (!sortable) return;
    setSortConfig((prev) => {
      const dir = prev.key === key && prev.direction === "ASC" ? "DESC" : "ASC";
      const next = { key, direction: dir };
      triggerPageChange(currentPage, perPageEnabled, search, next);
      return next;
    });
  };

  const handleGoToPage = () => {
    const p = Number(goToPage);
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p);
      triggerPageChange(p);
      setGoToPage("");
    }
  };

  const handlePerPageChange = (size) => {
    const s = Number(size);
    setManualPageSize(true);
    setPerPageEnabled(s);
    setCurrentPage(1);
    triggerPageChange(1, s);
  };

  const handleSelect = (row, checked) => {
    setSelectedRows((prev) =>
      checked ? [...prev, row] : prev.filter((r) => r !== row),
    );
  };
  const isChecked = (row) => selectedRows.includes(row);

  // Sticky offsets
  const getStickyOffsets = () => {
    let left = selectable ? 50 : 0,
      right = 0,
      offsets = {};
    columns
      .filter((c) => c.fixed === "left")
      .forEach((c) => {
        offsets[c.key] = { left, zIndex: 10 + left / 10 };
        left += c.width || 100;
      });
    columns
      .filter((c) => c.fixed === "right")
      .reverse()
      .forEach((c) => {
        offsets[c.key] = { right, zIndex: 10 + right / 10 };
        right += c.width || 100;
      });
    return offsets;
  };
  const stickyOffsets = getStickyOffsets();

  return (
    <div
      className="flex flex-col w-full h-full space-y-4"
      style={height ? { height } : {}}
    >
      {searchable && (
        <div className="relative w-[300px]">
          <Input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={handleSearch}
            className="w-full pr-10"
          />
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      )}

      <div className="rounded-xl border bg-white flex-1 overflow-hidden relative flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-30 shadow-sm">
              <TableRow className="hover:bg-transparent bg-[#F5F5F5] border-b border-border">
                {selectable && (
                  <TableHead
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 20,
                      width: 50,
                    }}
                    className="bg-[#F5F5F5]"
                  >
                    <span className="sr-only">Select</span>
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    onClick={col.sort ? () => handleSort(col.key) : undefined}
                    className={`${
                      sortable && col.sort
                        ? "cursor-pointer hover:bg-[#E2E8F0] transition-colors"
                        : ""
                    } ${
                      col.fixed
                        ? col.fixed === "right"
                          ? "shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                          : "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                        : ""
                    } h-10 bg-[#F5F5F5]`}
                    style={{
                      ...(col.width
                        ? { width: col.width, minWidth: col.width }
                        : {}),
                      ...(col.fixed
                        ? { position: "sticky", ...stickyOffsets[col.key] }
                        : {}),
                      zIndex: col.fixed ? 40 : 15,
                    }}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-[#0F172A] text-[12px] xl:text-[13px] 2xl:text-[14px]">
                      {col.titleIcon && (
                        <Icon
                          name={col.titleIcon}
                          size={14}
                          style={{ color: col.titleIconColor ?? "#64748b" }}
                        />
                      )}
                      <span>{col.title}</span>
                      {sortable && col.sort && (
                        <div className="flex flex-col ml-1">
                          <ArrowUp
                            className={`h-3 w-3 -mb-1 ${
                              sortConfig.key === col.key &&
                              sortConfig.direction === "ASC"
                                ? "text-slate-900"
                                : "text-slate-300"
                            }`}
                          />
                          <ArrowDown
                            className={`h-3 w-3 ${
                              sortConfig.key === col.key &&
                              sortConfig.direction === "DESC"
                                ? "text-slate-900"
                                : "text-slate-300"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            {loading ? (
              <TableBody>
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="h-[400px] text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-10 w-10 animate-spin text-primary opacity-80" />
                      <p className="text-sm font-medium text-slate-500 animate-pulse">Loading data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : paginated.length === 0 ? (

              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="h-24 text-center text-slate-500"
                  >
                    No data found.
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : (
              <TableBody>
                {paginated.map((row, idx) => (
                  <TableRow
                    key={row.id ?? idx}
                    className={`${clickableRows ? "cursor-pointer" : ""} hover:bg-slate-50 border-b border-border transition-colors`}
                    onClick={() =>
                      clickableRows && onRowClick && onRowClick(row)
                    }
                  >
                    {selectable && (
                      <TableCell
                        style={{
                          position: "sticky",
                          left: 0,
                          zIndex: 5,
                          background: "inherit",
                          width: 50,
                        }}
                        className="bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked(row)}
                          onChange={(e) => handleSelect(row, e.target.checked)}
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    {columns.map((col, ci) => (
                      <TableCell
                        key={`${col.key}-${ci}`}
                        style={{
                          ...(col.width
                            ? { width: col.width, minWidth: col.width }
                            : {}),
                          ...(col.fixed
                            ? {
                                position: "sticky",
                                ...stickyOffsets[col.key],
                                zIndex: 5,
                                background: "white",
                              }
                            : {}),
                        }}
                        className={`${
                          col.fixed
                            ? col.fixed === "right"
                              ? "shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                              : "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                            : ""
                        } py-2 px-4 text-slate-600 font-normal text-[12px] xl:text-[13px] 2xl:text-[14px]`}
                      >
                        {col.Cell ? col.Cell(row, idx) : row[col.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            )}
          </table>
        </div>
      </div>

      {!loading && (pagination || showtotal) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-3 w-full rounded-md mt-auto">
          {showtotal && totalCount > 0 ? (
            <div className="text-sm text-slate-500 order-2 sm:order-1">
              Showing{" "}
              {pagination
                ? `${(currentPage - 1) * perPageEnabled + 1} - ${Math.min(
                    currentPage * perPageEnabled,
                    totalCount,
                  )}`
                : `1 - ${filtered.length}`}{" "}
              of {totalCount}
            </div>
          ) : (
            <div className="hidden sm:block"></div>
          )}

          {pagination && (
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 lg:gap-8 order-1 sm:order-2">
              <div className="hidden md:flex items-center space-x-2">
                <p className="text-sm font-medium text-slate-600">Go to</p>
                <Input
                  className="h-8 w-[60px] text-center bg-white"
                  value={goToPage}
                  placeholder={String(currentPage)}
                  onChange={(e) => setGoToPage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGoToPage()}
                />
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  className="h-8 w-8 xl:h-9 xl:w-9 2xl:h-10 2xl:w-10 p-0 bg-white cursor-pointer"
                  onClick={() => {
                    const np = Math.max(currentPage - 1, 1);
                    setCurrentPage(np);
                    triggerPageChange(np);
                  }}
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center space-x-1">
                  {(() => {
                    const btns = [];
                    // Show fewer buttons on small screens
                    const max = typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 5;
                    let start = Math.max(1, currentPage - Math.floor(max / 2));
                    let end = Math.min(totalPages, start + max - 1);
                    if (end - start < max - 1) start = Math.max(1, end - max + 1);

                    // first
                    if (start > 1) {
                      btns.push(
                        <Button
                          key={1}
                          variant={currentPage === 1 ? "default" : "outline"}
                          className={`h-8 w-8 xl:h-9 xl:w-9 2xl:h-10 2xl:w-10 p-0 cursor-pointer ${currentPage === 1 ? "bg-primary text-primary-foreground" : "bg-white text-slate-600"}`}
                          onClick={() => {
                            setCurrentPage(1);
                            triggerPageChange(1);
                          }}
                        >
                          1
                        </Button>,
                      );
                      if (start > 2) {
                        btns.push(
                          <div
                            key="l"
                            className="h-8 w-8 flex items-center justify-center text-slate-500"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </div>,
                        );
                      }
                    }

                    for (let i = start; i <= end; i++) {
                      btns.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          className={`h-8 w-8 xl:h-9 xl:w-9 2xl:h-10 2xl:w-10 p-0 cursor-pointer ${currentPage === i ? "bg-primary text-primary-foreground" : "bg-white text-slate-600"}`}
                          onClick={() => {
                            setCurrentPage(i);
                            triggerPageChange(i);
                          }}
                        >
                          {i}
                        </Button>,
                      );
                    }

                    if (end < totalPages) {
                      if (end < totalPages - 1) {
                        btns.push(
                          <div
                            key="r"
                            className="h-8 w-8 flex items-center justify-center text-slate-500"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </div>,
                        );
                      }
                      btns.push(
                        <Button
                          key={totalPages}
                          variant={
                            currentPage === totalPages ? "default" : "outline"
                          }
                          className={`h-8 w-8 xl:h-9 xl:w-9 2xl:h-10 2xl:w-10 p-0 cursor-pointer ${currentPage === totalPages ? "bg-primary text-primary-foreground" : "bg-white text-slate-600"}`}
                          onClick={() => {
                            setCurrentPage(totalPages);
                            triggerPageChange(totalPages);
                          }}
                        >
                          {totalPages}
                        </Button>,
                      );
                    }
                    return btns;
                  })()}
                </div>

                <Button
                  variant="outline"
                  className="h-8 w-8 xl:h-9 xl:w-9 2xl:h-10 2xl:w-10 p-0 bg-white cursor-pointer"
                  onClick={() => {
                    const np = Math.min(currentPage + 1, totalPages);
                    setCurrentPage(np);
                    triggerPageChange(np);
                  }}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Select
                  value={String(perPageEnabled)}
                  onValueChange={(val) => handlePerPageChange(val)}
                >
                  <SelectTrigger className="h-8 xl:h-9 2xl:h-10 w-[110px] bg-white">
                    <SelectValue placeholder={String(perPageEnabled)} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 25, 35].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
