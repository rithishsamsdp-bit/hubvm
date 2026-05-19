import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "../../../components/Index.jsx";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { useCdrStore } from "../../../store/admin/reports/useCdrStore";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { formatSecsToHMS } from "../../../utils/helpers.js";

import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Download, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import AdminAiDataViewer from "./AdminAiDataViewer.jsx";

const AdminCdrReport = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(
    parseInt(params.get("per_page")) || 10,
  );
  const [offset, setOffset] = useState((page - 1) * pageSize || 0);
  const [searchString, setSearchString] = useState("");
  const [direction, setDirection] = useState("");
  const [campaign, setCampaign] = useState("");
  const [disposition, setDisposition] = useState("");
  const [callMode, setCallMode] = useState("");
  const [agentDisposition, setAgentDisposition] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [sortField, setSortField] = useState("c_callDateTime");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [specificFollowUpModal, setSpecificFollowUpModal] = useState("");
  const [selectedFollowUp, setSelectedFollowUp] = useState("");
  const [transcriptModal, setTranscriptModal] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState("");
  const [selectedCdrRow, setSelectedCdrRow] = useState(null);
  const [aiTab, setAiTab] = useState("context");

  const {
    getCdrData,
    fetchCdrData,
    fetchCdrCount,
    isfetchLoading,
    exportcdr,
    getCampaignlist,
    fetchCampaignList,
    campaignLoading,
    getAdminAiData,
    adminAiData,
    adminAiDataLoading,
    clearAdminAiData,
  } = useCdrStore();

  const { authRole, authPlan } = useAuthStore();

  const formatDate = (date, isEndDate = false) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const time = isEndDate ? "23:59:59" : "00:00:00";
    return `${year}-${month}-${day} ${time}`;
  };

  useEffect(() => {
    getCampaignlist();
  }, [getCampaignlist]);

  useEffect(() => {
    if (authRole === "TL") {
      navigate(`/tl-reports/tl-cdrReport?page=${page}&per_page=${pageSize}`);
    } else {
      navigate(
        `/admin-reports/admin-cdrReport?page=${page}&per_page=${pageSize}`,
      );
    }
    setOffset((page - 1) * pageSize);
  }, [page, pageSize, navigate, authRole]);

  useEffect(() => {
    getCdrData(
      pageSize,
      offset,
      sortField,
      sortOrder,
      searchString,
      campaign,
      disposition,
      callMode,
      agentDisposition,
      direction,
      formatDate(startDate),
      formatDate(endDate, true),
    );
  }, [
    pageSize,
    offset,
    sortField,
    sortOrder,
    searchString,
    campaign,
    disposition,
    callMode,
    agentDisposition,
    direction,
    startDate,
    endDate,
    getCdrData,
  ]);

  const handleClearFilters = () => {
    setSearchString("");
    setDirection("");
    setCampaign("");
    setDisposition("");
    setCallMode("");
    setAgentDisposition("");
    setStartDate(new Date());
    setEndDate(new Date());
  };

  const handleDateChange = ({ start, end }) => {
    setStartDate(start);
    setEndDate(end);
  };

  const campaignOptions = useMemo(
    () =>
      Array.isArray(fetchCampaignList)
        ? fetchCampaignList.map((camp) => ({
            label: camp.c_campaignName,
            value: String(camp.c_campaignId),
          }))
        : [],
    [fetchCampaignList],
  );

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
    if (lower.includes("no")) return "inactive";
    if (lower.includes("busy") || lower.includes("dtmf")) return "pending";
    if (lower.includes("failed")) return "inactive";
    if (lower.includes("missed")) return "pending";
    return "default";
  };

  const selectedsclomuns = Array.isArray(
    authPlan?.permissions?.reports?.columns?.cdrreport,
  )
    ? authPlan.permissions.reports.columns.cdrreport
    : [];

  const columns = useMemo(
    () => [
      {
        title: "S.no",
        key: "s_no",
        width: 50,
        Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        fixed: "left",
      },
      { title: "AccountCode", key: "AccountCode", width: 100, fixed: "left" },
      { title: "CampaignName", key: "CampaignName" },
      { title: "Member Name", key: "MemberName" },
      { title: "Customer Phone Number", key: "CustomerPhoneNumber" },
      { title: "Call Date-Time", key: "CallDateTime", width: 100 },
      { title: "Call Direction", key: "CallDirection", width: 120 },
      {
        title: "Call Disposition",
        key: "CallDisposition",
        width: 170,
        Cell: (row) => {
          const value = row.CallDisposition;
          if (!value) return null;
          return (
            <StatusBadge text={value} variant={getDispositionVariant(value)} />
          );
        },
      },
      {
        title: "Call Duration",
        key: "CallDuration",
        width: 60,
        Cell: (row) => formatSecsToHMS(row.CallDuration),
      },
      { title: "Call Mode", key: "CallMode", width: 80 },
      {
        title: "WrapUp Duration",
        key: "WrapUpDuration",
        width: 60,
        Cell: (row) => formatSecsToHMS(row.WrapUpDuration),
      },
      { title: "Call Line Number", key: "CallLineNumber" },
      { title: "Member Extension Number", key: "MemberExtensionNumber" },
      { title: "Member PhoneNumber", key: "MemberPhoneNumber" },
      { title: "Member Extension Name", key: "MemberExtensionName" },
      { title: "Member Registered IP", key: "MemberRegisteredIP" },
      { title: "Call Disconnection End", key: "CallDisconnectionEnd" },
      {
        title: "Follow up",
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
              setSpecificFollowUpModal(true);
            }}
          >
            Follow up
          </Button>
        ),
      },
      {
        title: "Transcript",
        key: "Transcript",
        fixed: "right",
        width: 80,
        Cell: (row) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedTranscript(row.CallRecording || "");
              setSelectedCdrRow(row);
              if (row.CallRecording) {
                getAdminAiData(row.CallRecording);
              }
              setTranscriptModal(true);
            }}
          >
            View
          </Button>
        ),
      },
      {
        title: "Call Recording",
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
    [page, pageSize, getAdminAiData],
  );

  const filteredColumns = useMemo(() => {
    if (!selectedsclomuns.length) return columns;
    return columns.filter(
      (col) => selectedsclomuns.includes(col.key) || col.key === "s_no",
    );
  }, [columns, selectedsclomuns]);

  const hasActiveFilters =
    searchString || campaign || direction || disposition || callMode;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-slate-50/30">
      <Navbar
        title="CDR Report"
        breadcrumbs={[
          {
            label: "Dashboard",
            route: authRole === "TL" ? "/tl-dashboard" : "/admin-dashboard",
          },
          {
            label: "Reports",
            route: authRole === "TL" ? "/tl-reports" : "/admin-reports",
          },
          { label: "CDR Report", active: true },
        ]}
      >
        <Button
          variant="default"
          onClick={() =>
            exportcdr(
              pageSize,
              offset,
              sortField,
              sortOrder,
              searchString,
              campaign,
              disposition,
              callMode,
              agentDisposition,
              direction,
              formatDate(startDate),
              formatDate(endDate, true),
            )
          }
          disabled={!campaign}
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
              placeholder="Search by name, Source, Destination"
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="w-[200px]">
            <Select
              options={campaignOptions}
              value={campaign ? String(campaign) : ""}
              onValueChange={setCampaign}
              placeholder="Select Campaign"
              showSearch={true}
              allowClear={true}
              onClear={() => setCampaign("")}
              isLoading={campaignLoading}
            />
          </div>

          <div className="w-[140px]">
            <Select
              options={[
                { label: "Outbound", value: "Outbound" },
                { label: "Inbound", value: "Inbound" },
              ]}
              value={direction}
              onValueChange={setDirection}
              placeholder="Direction"
              showSearch={false}
              allowClear={true}
              onClear={() => setDirection("")}
            />
          </div>

          <div className="w-[140px]">
            <Select
              options={[
                { label: "Answered", value: "ANSWERED" },
                { label: "No Answer", value: "NO ANSWER" },
                { label: "Voice Mail", value: "VOICEMAIL" },
              ]}
              value={disposition}
              onValueChange={setDisposition}
              placeholder="Disposition"
              showSearch={false}
              allowClear={true}
              onClear={() => setDisposition("")}
            />
          </div>

          <div className="w-[140px]">
            <Select
              options={[
                { label: "Browser", value: "BROWSER" },
                { label: "Softphone", value: "SOFTPHONE" },
              ]}
              value={callMode}
              onValueChange={setCallMode}
              placeholder="Call Mode"
              showSearch={false}
              allowClear={true}
              onClear={() => setCallMode("")}
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
            columns={filteredColumns}
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
      </div>

      <Dialog
        open={!!specificFollowUpModal}
        onOpenChange={(v) => !v && setSpecificFollowUpModal(false)}
      >
        <DialogContent className="sm:max-w-[627px] p-0 gap-0">
          <DialogHeader className="px-6 py-5 border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-800">
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

      <Dialog
        open={transcriptModal}
        onOpenChange={(v) => {
          if (!v) {
            setTranscriptModal(false);
            clearAdminAiData();
            setSelectedTranscript("");
            setSelectedCdrRow(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[627px] p-0 gap-0">
          <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-white">
            <DialogTitle className="text-lg font-bold text-slate-800">
              Transcript
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-4 px-6 pt-4 pb-2 bg-slate-50 border-b border-slate-100">
            <button
              className={`pb-2 text-sm font-semibold transition-all border-b-2 ${aiTab === "context" ? "text-primary border-primary" : "text-slate-500 border-transparent hover:text-slate-700"}`}
              onClick={() => setAiTab("context")}
            >
              Context
            </button>
            <button
              className={`pb-2 text-sm font-semibold transition-all border-b-2 ${aiTab === "transcript" ? "text-primary border-primary" : "text-slate-500 border-transparent hover:text-slate-700"}`}
              onClick={() => setAiTab("transcript")}
            >
              Transcript
            </button>
            <div className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-500 pb-2">
              <span>{selectedCdrRow?.CallDateTime || ""}</span>
              {selectedCdrRow?.CallDuration && (
                <span>• {formatSecsToHMS(selectedCdrRow?.CallDuration)}</span>
              )}
            </div>
          </div>

          <div className="max-h-[540px] overflow-y-auto p-4 bg-white">
            <AdminAiDataViewer
              aiData={adminAiData}
              isLoading={adminAiDataLoading}
              audioSrc={selectedTranscript}
              tab={aiTab}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCdrReport;
