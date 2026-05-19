import { useEffect, useState } from "react";
import "./styles/AdminPerformanceReport.css";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Button,
  Table,
  DateTimeRangePicker,
  Input,
} from "../../../components/Index.jsx";
import { usePerformanceStore } from "../../../store/admin/reports/usePerformanceStore";
import { useAuthStore } from "../../../store/useAuthStore.js";
import Icon from "../../../constants/Icon.jsx";

const AdminPerformanceReport = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(
    parseInt(params.get("per_page")) || 10
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
    exportperformance
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
      navigate(`/admin-reports/admin-performance?page=${page}&per_page=${pageSize}`);
    }
    setOffset((page - 1) * pageSize);
  }, [page, pageSize, navigate]);

  useEffect(() => {
    getperformance(
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
    getperformance,
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

  const columns = [
    {
      title: "S.no",
      key: "s_no",
      width: 50,
      Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
      fixed: "left",
    },
    { title: "Name", key: "m_memberName", width: 100, fixed: "left" },
    { title: "Extension", key: "m_memberExtensionNo", width: 130, fixed: "left" },
    { title: "Inbound Total", key: "m_inboundTotal" },

    { title: "Inbound Ans", key: "m_inboundAnswered" },
    { title: "Inbound Unans", key: "m_inboundUnanswered" },
    { title: "Inbound Talk Time", key: "m_inboundTalkTime" },
    { title: "Outbound Total", key: "m_outboundTotal" },
    { title: "Outbound Ans", key: "m_outboundAnswered" },
    { title: "Outbound Unans", key: "m_outboundUnanswered" },
    { title: "Outbound Talk Time", key: "m_outboundTalkTime" },

    { title: "ready Time", key: "m_readySeconds" },
    { title: "Not Ready Time", key: "m_notreadySeconds" },
    { title: "Break Time", key: "m_breakSeconds" },
    { title: "Lunch Time", key: "m_lunchSeconds" },
    { title: "Meeting Time", key: "m_meetingSeconds" },
    { title: "query Time", key: "m_querySeconds" },
    { title: "Login Time", key: "m_loginSeconds" },
  ];

  return (
    <div className="admin_full_process_report">
      <div className="navbar_1">
        <div>
          <p className="navbar_1_heading">Performance Report</p>
          <span className="navbar_1_breadcrumb">
            <span
              className="navbar_1_breadcrumb_item"
              onClick={() => {
                if (authRole === "TL") {
                  navigate("/tl-dashboard")
                }
                else if (authRole === "ADMIN") {
                  navigate("/admin-dashboard")
                };
              }}
            >
              Dashboard
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span className="navbar_1_breadcrumb_item" onClick={() => { navigate("/admin-reports") }}>
              Reports
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span className="navbar_1_breadcrumb_item active">
              performance Report
            </span>
          </span>
        </div>
        <div>
          <Button onClick={() => {
            exportperformance(
              pageSize,
              offset,
              searchString,
              formatDate(startDate),
              formatDate(endDate, true)
            )
          }}>Export</Button>
        </div>
      </div>
      <div className="admin_full_process_report_container">
        <div className="admin_full_process_report_filter_container">
          <Input
            type="text"
            placeholder="Search by agent name"
            value={searchString}
            onChange={(e) => setSearchString(e.target.value)}
            width="300px"
            suffixIcon="search"
            suffixIconColor="#334155"
          />
          <DateTimeRangePicker
            type="range"
            showTime={false}
            initialStart={startDate}
            initialEnd={endDate}
            onChange={handleDateChange}
            format="YYYY-MM-DD"
          />

          <button
            className="admin_full_process_report_filter_clear_button"
            onClick={handleClearFilters}
          >
            Clear all
          </button>
        </div>
        <Table
          columns={columns}
          data={performanceData}
          loading={performanceLoading}
          totaldata={performanceCount}
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
  );
};

export default AdminPerformanceReport;
