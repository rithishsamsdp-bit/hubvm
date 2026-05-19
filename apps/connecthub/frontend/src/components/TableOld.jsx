import { useEffect, useState } from "react";
// import "./style/TableOld.css";
import icons from "../constants/icon.js";

const Table = ({
  columns = [],
  dataSource = [],
  pagination = true,
  perpage = true,
  showtotal = true,
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState("");
  const [total, setTotal] = useState(dataSource.length);
  const [goToPage, setGoToPage] = useState("");
  const [paginationEnabled, setPaginationEnabled] = useState(pagination);
  const [perPageEnabled, setPerPageEnabled] = useState(perpage);
  const [showTotalEnabled, setShowTotalEnabled] = useState(showtotal);

  useEffect(() => {
    fetchData();
  }, [page, limit, dataSource]);

  const { pagination_left_icon, pagination_right_icon, pagination_more_icon } =
    icons;

  const fetchData = () => {
    setLoading(true);
    setTimeout(() => {
      const start = (page - 1) * limit;
      const end = start + limit;
      setData(dataSource.slice(start, end));
      setTotal(dataSource.length);
      setLoading(false);
    }, 300);
  };

  useEffect(() => {
    const updatePerPage = () => {
      if (window.innerHeight > 800) {
        setLimit(25);
      } else {
        setLimit(10);
      }
    };

    {
      /* Example: How to get the table height */
    }
    {
      /* You can use a ref to get the table height */
    }

    updatePerPage(); // Set the initial value
    window.addEventListener("resize", updatePerPage); // Update on window resize

    return () => {
      window.removeEventListener("resize", updatePerPage); // Cleanup on unmount
    };
  }, []);

  const totalPages = Math.ceil(total / limit);

  const handleGoToPage = () => {
    const p = Number(goToPage);
    if (p >= 1 && p <= totalPages) {
      setPage(p);
      setGoToPage("");
    }
  };

  const getPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    buttons.push(
      <button
        key={1}
        className={`table-pagination-button ${page === 1 ? "active" : ""}`}
        onClick={() => setPage(1)}
      >
        1
      </button>
    );

    if (startPage > 2) {
      buttons.push(
        <img src={pagination_more_icon} alt="icon" className="table-ellipsis" />
      );
    }

    for (let i = Math.max(2, startPage); i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={`table-pagination-button ${page === i ? "active" : ""}`}
          onClick={() => setPage(i)}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages - 1) {
      buttons.push(
        <img src={pagination_more_icon} alt="icon" className="table-ellipsis" />
      );
    }

    if (endPage < totalPages) {
      buttons.push(
        <button
          key={totalPages}
          className={`table-pagination-button ${
            page === totalPages ? "active" : ""
          }`}
          onClick={() => setPage(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  const calculateLeftOffset = (columnIndex, columns) => {
    let offset = 0;
    for (let i = 0; i < columnIndex; i++) {
      if (columns[i].fixed === "left") {
        offset += parseInt(columns[i].width) || 0;
      }
    }
    return offset;
  };

  const calculateRightOffset = (columnIndex, columns) => {
    let offset = 0;
    for (let i = columnIndex + 1; i < columns.length; i++) {
      if (columns[i].fixed === "right") {
        offset += parseInt(columns[i].width) || 0;
      }
    }
    return offset;
  };

  const flattenedColumns = columns.flatMap((col) =>
    col.children && Array.isArray(col.children) ? col.children : [col]
  );

  return (
    <div className="table-container">
      <div className="table-wrapper">
        {" "}
        <table className="table-data">
          <thead className="table-header">
            <tr>
              {columns.map((col, idx) => {
                const isLeftFixed = col.fixed === "left";
                const isRightFixed = col.fixed === "right";
                const style = isLeftFixed
                  ? { left: `${calculateLeftOffset(idx, columns)}px` }
                  : isRightFixed
                  ? { right: `${calculateRightOffset(idx, columns)}px` }
                  : {};
                const stickyClass =
                  col.fixed === "left"
                    ? "table-sticky-left-head"
                    : col.fixed === "right"
                    ? "table-sticky-right-head"
                    : "";

                if (col.children && Array.isArray(col.children)) {
                  return (
                    <th
                      key={idx}
                      colSpan={col.children.length}
                      className={stickyClass}
                      style={style}
                    >
                      {col.title}
                    </th>
                  );
                }
                return (
                  <th
                    key={col.key}
                    rowSpan="2"
                    style={style}
                    className={stickyClass}
                  >
                    {col.title}
                  </th>
                );
              })}
            </tr>

            <tr>
              {columns.map((col) =>
                col.children && Array.isArray(col.children)
                  ? col.children.map((child) => (
                      <th key={child.key}>{child.title}</th>
                    ))
                  : null
              )}
            </tr>
          </thead>

          {loading ? (
            <tbody className="table-loading-tbody">
              <tr>
                <td colSpan={columns.length + 1}>
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
          ) : data.length ? (
            data.map((item, idx) => (
              <tbody key={idx} className="table-data-tbody">
                <tr>
                  {flattenedColumns.map((col) => {
                    const parentColIndex = columns.findIndex(
                      (c) =>
                        c.key === col.key ||
                        (c.children &&
                          c.children.some((child) => child.key === col.key))
                    );

                    const parentCol = columns[parentColIndex];

                    const isLeftFixed = parentCol?.fixed === "left";
                    const isRightFixed = parentCol?.fixed === "right";

                    const style = {
                      minWidth: col.width,
                      ...(isLeftFixed && {
                        left: `${calculateLeftOffset(
                          parentColIndex,
                          columns
                        )}px`,
                      }),
                      ...(isRightFixed && {
                        right: `${calculateRightOffset(
                          parentColIndex,
                          columns
                        )}px`,
                      }),
                    };

                    const stickyClass = isLeftFixed
                      ? "table-sticky-left-data"
                      : isRightFixed
                      ? "table-sticky-right-data"
                      : "";

                    return (
                      <td key={col.key} className={stickyClass} style={style}>
                        {typeof col.render === "function"
                          ? col.render(item[col.key], item)
                          : item[col.key]}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            ))
          ) : (
            <tbody className="table-no-data-tbody">
              <tr>
                <td colSpan={columns.length + 1}>No data found</td>
              </tr>
            </tbody>
          )}
        </table>
      </div>

      <div className="table-pagination-controls">
        {(showTotalEnabled && (
          <div className="table-total-showing-text">
            <p>
              Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)}
              of {total} results
            </p>
          </div>
        )) || <div className="table-total-showing-text"></div>}

        <div className="table-pagination-buttons">
          {paginationEnabled && (
            <>
              <div className="table-go-to-page">
                <p>Go to</p>
                <input
                  value={goToPage}
                  onChange={(e) => setGoToPage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGoToPage()}
                  placeholder={page}
                  className="table-go-to-input"
                />
              </div>
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="table-pagination-next-button"
              >
                <img src={pagination_left_icon} alt="icon" />
              </button>
              {getPaginationButtons()}
              <button
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={page === totalPages}
                className="table-pagination-next-button"
              >
                <img src={pagination_right_icon} alt="icon" />
              </button>
            </>
          )}

          {perPageEnabled && (
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="table-limit-select"
            >
              {[10, 25, 35].map((num) => (
                <option key={num} value={num}>
                  {num}/page
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
};

export default Table;
