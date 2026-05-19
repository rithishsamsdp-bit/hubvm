// Table.jsx
import React, { useState, useMemo, useEffect, useCallback } from "react";
import "./styles/Table.css";
import icons from "../constants/icon.js";
import Icon from "../constants/Icon.jsx";

const Table = ({
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
  onSelectChange = () => { },
  onPageChange = () => { },
  onRowClick = null,
  clickableRows = false,
}) => {
  // **Ensure data is an array**
  const safeData = Array.isArray(data)
    ? data
    : data != null
      ? [data]
      : [];


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
    (newPage, newSize = perPageEnabled, newSearch = search, newSort = sortConfig) => {
      onPageChange({
        currentPage: newPage,
        pageSize: newSize,
        search: newSearch,
        sortConfig: newSort,
      });
    },
    [perPageEnabled, search, sortConfig, onPageChange]
  );

  // Filter → Sort → Paginate
  const filtered = useMemo(() => {
    return safeData.filter((row) =>
      columns.some((col) => {
        const v = row[col.key];
        return typeof v === "string" && v.toLowerCase().includes(search.toLowerCase());
      })
    );
  }, [safeData, columns, search]);

  // 2) Sort
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

  // 3) Paginate (unless serverSide)
  const totalCount = typeof totaldata === "number" && totaldata >= 0 ? totaldata : filtered.length;
  const totalPages = Math.ceil(totalCount / perPageEnabled);

  // const paginated = useMemo(() => {
  //   if (!pagination) return sorted;
  //   const start = (currentPage - 1) * perPageEnabled;
  //   return sorted.slice(start, start + perPageEnabled);
  // }, [sorted, currentPage, perPageEnabled, pagination]);


  const paginated = useMemo(() => {
    if (!pagination) return sorted;
    if (serverSide) return sorted;
    const start = (currentPage - 1) * perPageEnabled;
    return sorted.slice(start, start + perPageEnabled);
  }, [sorted, currentPage, perPageEnabled, pagination, serverSide]);

  // Selection → parent
  useEffect(() => {
    onSelectChange(selectedRows);
  }, [selectedRows, onSelectChange]);

  // Responsive auto–pageSize until user picks manually
  useEffect(() => {
    const updatePerPage = () => {
      if (manualPageSize) return;               // once manual, skip auto
      const autoSize = window.innerHeight > 800 ? 25 : pageSize;
      if (perPageEnabled !== autoSize) {
        setPerPageEnabled(autoSize);
        setCurrentPage(1);
        triggerPageChange(1, autoSize);
      }
    };

    updatePerPage();                            // initial apply
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

  const handlePerPageChange = (e) => {
    const size = Number(e.target.value);
    setManualPageSize(true);                   // user took control
    setPerPageEnabled(size);
    setCurrentPage(1);
    triggerPageChange(1, size);
  };

  const handleSelect = (row, checked) => {
    setSelectedRows((prev) =>
      checked ? [...prev, row] : prev.filter((r) => r !== row)
    );
  };
  const isChecked = (row) => selectedRows.includes(row);

  // Sticky offsets (unchanged)
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

  // Render…
  return (
    <div className="custom-table-container" style={height ? { height } : {}}>
      {searchable && (
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={handleSearch}
          className="custom-search"
        />
      )}

      <div className="custom-table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              {selectable && (
                <th
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 20,
                    background: "#F5F5F5",
                    borderBottom: "1px solid #E2E8F0",
                    width: 50,
                  }}
                >
                  Select
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={
                    col.sort
                      ? () => handleSort(col.key)
                      : undefined
                  }
                  className={`${sortable ? "sortable" : ""} ${col.fixed ? `fixed-${col.fixed}` : ""
                    }`}
                  style={{
                    ...(col.width ? { width: col.width, minWidth: col.width } : {}),
                    ...(col.fixed
                      ? { position: "sticky", ...stickyOffsets[col.key] }
                      : {}),
                    zIndex: col.fixed ? stickyOffsets[col.key].zIndex + 10 : 15,
                    background: "#F5F5F5",
                    borderBottom: "1px solid #E2E8F0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {col.titleIcon && (
                      <Icon
                        name={col.titleIcon}
                        size={14}
                        style={{ color: col.titleIconColor ?? "#6B7280", marginBottom: 2 }}
                      />
                    )}
                    <span>{col.title}</span>
                  </div>
                  {sortable && sortConfig.key === col.key && (
                    <span>{sortConfig.direction === "ASC" ? " ↑" : " ↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {loading ? (
            <tbody className="table-loading-tbody">
              <tr>
                <td
                  className="table-loading-td"
                  colSpan={columns.length + (selectable ? 1 : 0)}
                >
                  <svg className="tabel-loader" viewBox="0 0 100 100">
                    <circle
                      className="arc-bg"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#fadfd2"
                      strokeWidth="12"
                    />
                    <circle
                      className="arc"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#FF5200"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray="250"
                      strokeDashoffset="80"
                    />
                  </svg>
                </td>
              </tr>
            </tbody>
          ) : paginated.length === 0 ? (
            <tbody className="table-no-data-tbody">
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="table-no-data-td"
                >
                  No data found.
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="table-data-body">
              {paginated.map((row, idx) => (
                <tr
                  key={row.id ?? idx}
                  className={clickableRows ? "clickable-row" : ""}
                  onClick={() => clickableRows && onRowClick && onRowClick(row)}
                  style={clickableRows ? { cursor: "pointer" } : {}}
                >
                  {selectable && (
                    <td
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 5,
                        background: "inherit",
                        width: 50,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked(row)}
                        onChange={(e) => handleSelect(row, e.target.checked)}
                      />
                    </td>
                  )}
                  {columns.map((col, ci) => (
                    <td
                      key={`${col.key}-${ci}`}
                      className={col.fixed ? `fixed-${col.fixed}` : ""}
                      style={{
                        ...(col.width ? { width: col.width, minWidth: col.width } : {}),
                        ...(col.fixed
                          ? { position: "sticky", ...stickyOffsets[col.key] }
                          : {}),
                        background: "inherit",
                      }}
                    >
                      {/* {col.Cell ? col.Cell(row) : row[col.key]} */}
                      {col.Cell ? col.Cell(row, idx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      {!loading && (pagination || showtotal) && (
        <div className="table-pagination-controls">
          {showtotal && totalCount > 0 && (
            <div className="table-total-showing-text">
              <p>
                Showing{" "}
                {pagination
                  ? `${(currentPage - 1) * perPageEnabled + 1} - ${Math.min(
                    currentPage * perPageEnabled,
                    totalCount
                  )}`
                  : `1 - ${filtered.length}`}{" "}
                of {totalCount}
              </p>
            </div>
          )}
          {(!showtotal || totalCount === 0) && (
            <div></div>
          )}
          {pagination && (
            <div className="table-pagination-buttons">
              <div className="table-go-to-page">
                <p>Go to</p>
                <input
                  className="table-go-to-input"
                  value={goToPage}
                  placeholder={String(currentPage)}
                  onChange={e => setGoToPage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleGoToPage()}
                />
              </div>

              <button
                onClick={() => {
                  const np = Math.max(currentPage - 1, 1);
                  setCurrentPage(np);
                  triggerPageChange(np);
                }}
                disabled={currentPage === 1}
                className="table-pagination-next-button"
              >
                <img src={icons.pagination_left_icon} alt="prev" />
              </button>

              {/* middle pages… */}
              {(() => {
                const btns = [];
                const max = 5;
                let start = Math.max(1, currentPage - 2);
                let end = Math.min(totalPages, start + max - 1);
                if (end - start < max - 1) start = Math.max(1, end - max + 1);

                // first
                btns.push(
                  <button
                    key={1}
                    className={`table-pagination-button ${currentPage === 1 ? "active" : ""}`}
                    onClick={() => {
                      setCurrentPage(1);
                      triggerPageChange(1);
                    }}
                  >
                    1
                  </button>
                );
                if (start > 2) {
                  btns.push(
                    <img
                      key="l"
                      src={icons.pagination_more_icon}
                      alt="…"
                      className="table-ellipsis"
                    />
                  );
                }
                for (let i = Math.max(2, start); i <= end; i++) {
                  btns.push(
                    <button
                      key={i}
                      className={`table-pagination-button ${currentPage === i ? "active" : ""}`}
                      onClick={() => {
                        setCurrentPage(i);
                        triggerPageChange(i);
                      }}
                    >
                      {i}
                    </button>
                  );
                }
                if (end < totalPages - 1) {
                  btns.push(
                    <img
                      key="r"
                      src={icons.pagination_more_icon}
                      alt="…"
                      className="table-ellipsis"
                    />
                  );
                }
                if (end < totalPages) {
                  btns.push(
                    <button
                      key={totalPages}
                      className={`table-pagination-button ${currentPage === totalPages ? "active" : ""
                        }`}
                      onClick={() => {
                        setCurrentPage(totalPages);
                        triggerPageChange(totalPages);
                      }}
                    >
                      {totalPages}
                    </button>
                  );
                }
                return btns;
              })()}

              <button
                onClick={() => {
                  const np = Math.min(currentPage + 1, totalPages);
                  setCurrentPage(np);
                  triggerPageChange(np);
                }}
                disabled={currentPage === totalPages}
                className="table-pagination-next-button"
              >
                <img src={icons.pagination_right_icon} alt="next" />
              </button>

              <select
                className="table-limit-select"
                value={perPageEnabled}
                onChange={handlePerPageChange}
              >
                {[10, 25, 35].map((n) => (
                  <option key={n} value={n}>
                    {n}/page
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Table;
