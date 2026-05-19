import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePredictiveStore } from "../../../store/admin/predictive/usePredictiveStore.js";
import { useCampaignStore } from "../../../store/admin/useCampaignStore.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { formatSecsToHMS } from "../../../utils/helpers.js";

import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, X, FileText } from "lucide-react";

const AdminPredictiveReport = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(
    parseInt(params.get("per_page")) || 10,
  );
  const [offset, setOffset] = useState((page - 1) * pageSize || 0);
  const [sortField, setSortField] = useState("c_callDateTime");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [followUpModal, setFollowUpModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState("");

  const {
    getPredictiveReportData,
    fetchCdrData,
    fetchCdrCount,
    isfetchLoading,
    reportFilters,
    setReportFilters,
  } = usePredictiveStore();

  const { CampaignData, getCampaignData } = useCampaignStore();

  useEffect(() => {
    getCampaignData(1000, 0, "", "c_campaignName", "ASC");
  }, [getCampaignData]);

  const [searchLocal, setSearchLocal] = useState(reportFilters.searchString);
  const debouncedSearchLocal = useDebounce(searchLocal, 500);

  useEffect(() => {
    setReportFilters({ searchString: debouncedSearchLocal });
  }, [debouncedSearchLocal, setReportFilters]);

  // Sync page & per_page to URL (same pattern as AdminCdrReport)
  useEffect(() => {
    const currentTab = params.get("tab") || "Report";
    navigate(
      `/admin-predictive?tab=${encodeURIComponent(currentTab)}&page=${page}&per_page=${pageSize}`,
      { replace: true },
    );
    setOffset((page - 1) * pageSize);
  }, [page, pageSize, navigate]);

  const formatDate = (date, isEndDate = false) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const time = isEndDate ? "23:59:59" : "00:00:00";
    return `${year}-${month}-${day} ${time}`;
  };

  useEffect(() => {
    getPredictiveReportData(
      pageSize,
      offset,
      sortField,
      sortOrder,
      reportFilters.searchString,
      formatDate(reportFilters.startDate),
      formatDate(reportFilters.endDate, true),
      reportFilters.disposition,
      reportFilters.campaignId,
    );
  }, [
    pageSize,
    offset,
    sortField,
    sortOrder,
    reportFilters,
    getPredictiveReportData,
  ]);

  const handleClearFilters = () => {
    setSearchLocal("");
    setReportFilters({
      searchString: "",
      disposition: "",
      campaignId: "",
      startDate: new Date(),
      endDate: new Date(),
    });
    setPage(1);
  };

  const handleDateChange = ({ start, end }) => {
    setReportFilters({ startDate: start, endDate: end });
    setPage(1);
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
        setSortOrder(pagevalues.sortConfig.direction || "DESC");
      }
    }, 0);
  }, []);

  const getDispositionVariant = (value) => {
    const lower = (value || "").toLowerCase();
    if (lower.includes("answered")) return "active";
    if (lower.includes("no") || lower.includes("failed")) return "inactive";
    if (lower.includes("busy")) return "pending";
    return "default";
  };

  const campaignOptions = useMemo(
    () =>
      (Array.isArray(CampaignData) ? CampaignData : [])
        .filter((c) => c.dialerType === "PREDICTIVE")
        .map((c) => ({ label: c.campaignName, value: String(c.campaignId) })),
    [CampaignData],
  );

  const columns = useMemo(
    () => [
      {
        title: "S.No",
        key: "s_no",
        width: 50,
        fixed: "left",
        Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
      },
      {
        title: "Customer Phone",
        key: "CustomerPhoneNumber",
        width: 150,
        fixed: "left",
      },
      { title: "DateTime", key: "CallDateTime", width: 160, sort: true },
      {
        title: "Duration",
        key: "CallDuration",
        width: 100,
        Cell: (row) => formatSecsToHMS(row.CallDuration),
      },
      {
        title: "Disposition",
        key: "CallDisposition",
        width: 140,
        Cell: (row) => {
          const value = row.CallDisposition;
          if (!value) return null;
          return (
            <StatusBadge text={value} variant={getDispositionVariant(value)} />
          );
        },
      },
      { title: "Dial Method", key: "DialMethod", width: 120 },
      { title: "Campaign", key: "CampaignName", width: 150 },
      {
        title: "Member",
        key: "MemberName",
        width: 150,
        Cell: (row) =>
          row.CallDisposition === "ANSWERED" ? row.MemberName : "-",
      },
      {
        title: "Ext No",
        key: "MemberExtensionNumber",
        width: 80,
        Cell: (row) =>
          row.CallDisposition === "ANSWERED" ? row.MemberExtensionNumber : "-",
      },
      {
        title: "Follow Up",
        key: "FollowUpData",
        width: 100,
        fixed: "right",
        Cell: (row) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedFollowUp(row.FollowUpData);
              setFollowUpModal(true);
            }}
          >
            Follow up
          </Button>
        ),
      },
      {
        title: "Recording",
        key: "CallRecording",
        fixed: "right",
        width: 300,
        Cell: (row) => {
          if (!row.CallRecording)
            return (
              <span className="text-sm text-slate-400 font-medium">
                No Recording
              </span>
            );
          return (
            <audio
              controls
              preload="none"
              style={{ width: "240px", height: "35px" }}
            >
              <source src={row.CallRecording} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          );
        },
      },
    ],
    [page, pageSize],
  );

  const hasActiveFilters =
    searchLocal || reportFilters.disposition || reportFilters.campaignId;

  return (
    <div className="flex flex-col w-full h-full gap-4 overflow-hidden">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by name, Source, Destination"
            value={searchLocal}
            onChange={(e) => setSearchLocal(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="w-[150px]">
          <Select
            options={[
              { label: "Answered", value: "ANSWERED" },
              { label: "No Answer", value: "NO ANSWER" },
              { label: "Busy", value: "BUSY" },
              { label: "Failed", value: "FAILED" },
            ]}
            value={reportFilters.disposition}
            onValueChange={(val) => {
              setReportFilters({ disposition: val });
              setPage(1);
            }}
            placeholder="Disposition"
            showSearch={false}
            allowClear
            onClear={() => {
              setReportFilters({ disposition: "" });
              setPage(1);
            }}
          />
        </div>

        <div className="w-[200px]">
          <Select
            options={campaignOptions}
            value={
              reportFilters.campaignId ? String(reportFilters.campaignId) : ""
            }
            onValueChange={(val) => {
              setReportFilters({ campaignId: val });
              setPage(1);
            }}
            placeholder="Select Campaign"
            showSearch
            allowClear
            onClear={() => {
              setReportFilters({ campaignId: "" });
              setPage(1);
            }}
          />
        </div>

        <DateTimeRangePicker
          type="range"
          showTime={false}
          initialStart={reportFilters.startDate}
          initialEnd={reportFilters.endDate}
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

      {/* DataTable */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={fetchCdrData}
          loading={isfetchLoading}
          totaldata={fetchCdrCount}
          pagination={true}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Follow Up Notes Dialog */}
      <Dialog
        open={!!followUpModal}
        onOpenChange={(v) => !v && setFollowUpModal(false)}
      >
        <DialogContent className="sm:max-w-[627px] p-0 gap-0">
          <DialogHeader className="px-6 py-5 border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Notes
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 max-h-[400px] overflow-y-auto">
            {selectedFollowUp &&
            typeof selectedFollowUp === "object" &&
            Object.keys(selectedFollowUp).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(selectedFollowUp).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <span className="text-[13px] font-semibold text-slate-600 min-w-[120px] shrink-0">
                      {key}
                    </span>
                    {typeof value === "object" ? (
                      <span className="text-[13px] text-slate-800">
                        start - {value.start} – end - {value.end}
                      </span>
                    ) : (
                      <span className="text-[13px] text-slate-800">
                        {value || "-"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8 font-medium">
                No data found
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPredictiveReport;
