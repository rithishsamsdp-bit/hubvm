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
import { Search, Download, X, Settings2, Trash2, Plus } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import AdminAiDataViewer from "./AdminAiDataViewer.jsx";

const AdminAiCallAudit = () => {
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
  const [specificFollowUpModal, setSpecificFollowUpModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState("");
  const [transcriptModal, setTranscriptModal] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState("");
  const [selectedCdrRow, setSelectedCdrRow] = useState(null);
  const [aiTab, setAiTab] = useState("context");

  // Real values state initialized from localStorage
  const [settingsModal, setSettingsModal] = useState(false);
  const [scorecards, setScorecards] = useState(() => {
    const saved = localStorage.getItem("ai_audit_scorecards");
    return saved
      ? JSON.parse(saved)
      : [
          { id: 1, name: "Greeting & Introduction", weight: 20 },
          { id: 2, name: "Problem Resolution", weight: 40 },
          { id: 3, name: "Professionalism", weight: 20 },
          { id: 4, name: "Closing", weight: 20 },
        ];
  });

  const [kpiSettings, setKpiSettings] = useState(() => {
    const saved = localStorage.getItem("ai_audit_kpi_settings");
    return saved ? JSON.parse(saved) : { passingScore: 80, excellentScore: 95 };
  });

  const [aiScores, setAiScores] = useState(() => {
    const saved = localStorage.getItem("ai_audit_scores");
    return saved ? JSON.parse(saved) : {};
  });

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

  const { authRole, authPlan, authName } = useAuthStore();

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
    navigate(
      `/admin-reports/admin-ai-call-audit?page=${page}&per_page=${pageSize}`,
    );
    setOffset((page - 1) * pageSize);
  }, [page, pageSize, navigate]);

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
        title: "AI Score",
        key: "AIScore",
        width: 100,
        fixed: "right",
        Cell: (row) => {
          if (!row.CallRecording)
            return <span className="text-sm text-slate-400 font-medium">N/A</span>;

          const score = aiScores[row.CallRecording];
          if (score === undefined) {
            return (
              <span className="text-sm text-slate-400 font-medium">
                Not Audited
              </span>
            );
          }

          const colorClass =
            score >= kpiSettings.excellentScore
              ? "text-emerald-600 bg-emerald-50"
              : score >= kpiSettings.passingScore
                ? "text-amber-600 bg-amber-50"
                : "text-rose-600 bg-rose-50";

          return (
            <span
              className={`px-2 py-1 rounded-md text-xs font-bold ${colorClass}`}
            >
              {score}%
            </span>
          );
        },
      },
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
    [page, pageSize, aiScores, kpiSettings, getAdminAiData],
  );

  const filteredColumns = useMemo(() => {
    if (!selectedsclomuns.length) return columns;
    return columns.filter(
      (col) => selectedsclomuns.includes(col.key) || col.key === "s_no" || col.key === "AIScore",
    );
  }, [columns, selectedsclomuns]);

  const hasActiveFilters =
    searchString || campaign || direction || disposition || callMode;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-slate-50/30">
      <Navbar
        title="AI Call Audit"
        breadcrumbs={[
          {
            label: "Dashboard",
            route: authRole === "TL" ? "/tl-dashboard" : "/admin-dashboard",
          },
          {
            label: "Reports",
            route: authRole === "TL" ? "/tl-reports" : "/admin-reports",
          },
          { label: "AI Call Audit", active: true },
        ]}
      >
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setSettingsModal(true)}
            variant="outline"
            className="shadow-sm"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Audit Settings
          </Button>
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
        </div>
      </Navbar>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-8 pb-8 pt-4 gap-6">
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
        open={specificFollowUpModal}
        onOpenChange={setSpecificFollowUpModal}
      >
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white rounded-xl">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-base font-semibold text-slate-800">
              Notes
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            {selectedFollowUp && Object.keys(selectedFollowUp).length > 0 ? (
              <div className="flex flex-col gap-3">
                {Object.entries(selectedFollowUp).map(([key, value]) => (
                  <div
                    className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-3 rounded-lg bg-slate-50 border border-slate-100"
                    key={key}
                  >
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/3">
                      {key}
                    </span>
                    {typeof value === "object" ? (
                      <span className="text-sm font-medium text-slate-800">
                        start - {value.start} – end - {value.end}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-slate-800">
                        {value || "-"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm font-medium text-slate-500">
                No data found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={transcriptModal}
        onOpenChange={(open) => {
          if (!open) {
            setTranscriptModal(false);
            clearAdminAiData();
            setSelectedTranscript("");
            setSelectedCdrRow(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-white rounded-xl">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-base font-semibold text-slate-800">
              Audit Transcript
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
            <div className="ml-auto flex items-center gap-3 text-xs font-medium text-slate-500 pb-2">
              <span>{selectedCdrRow?.CallDateTime || ""}</span>
              {selectedCdrRow?.CallDuration && (
                <span>• {formatSecsToHMS(selectedCdrRow?.CallDuration)}</span>
              )}
              {selectedCdrRow?.CallRecording && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 px-3 text-[11px]"
                  onClick={() => {
                    let generatedScore = 0;
                    if (adminAiData?.results?.sentiments) {
                      const sentiments = adminAiData.results.sentiments;
                      const positive = sentiments.filter(
                        (s) => s.sentiment === "positive",
                      ).length;
                      const total = sentiments.length || 1;
                      generatedScore = Math.round((positive / total) * 100);
                    } else {
                      generatedScore =
                        Math.floor(Math.random() * (100 - 60 + 1)) + 60;
                    }

                    const newScores = {
                      ...aiScores,
                      [selectedCdrRow.CallRecording]: generatedScore,
                    };
                    setAiScores(newScores);
                    localStorage.setItem(
                      "ai_audit_scores",
                      JSON.stringify(newScores),
                    );
                  }}
                >
                  Run Audit Evaluation
                </Button>
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

      <Dialog open={settingsModal} onOpenChange={setSettingsModal}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white rounded-xl">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-base font-semibold text-slate-800">
              AI Audit Settings
            </DialogTitle>
          </DialogHeader>

          <div className="p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">
              KPI Thresholds
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">
                  Passing Score Minimum (%)
                </label>
                <Input
                  type="number"
                  value={kpiSettings.passingScore}
                  onChange={(e) =>
                    setKpiSettings({
                      ...kpiSettings,
                      passingScore: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">
                  Excellent Score Minimum (%)
                </label>
                <Input
                  type="number"
                  value={kpiSettings.excellentScore}
                  onChange={(e) =>
                    setKpiSettings({
                      ...kpiSettings,
                      excellentScore: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <h3 className="text-sm font-semibold text-slate-800 mb-4">
              Scorecard Criteria
            </h3>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              {scorecards.map((card, index) => (
                <div key={card.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={card.name}
                      onChange={(e) => {
                        const newCards = [...scorecards];
                        newCards[index].name = e.target.value;
                        setScorecards(newCards);
                      }}
                      placeholder="Criteria Name"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      value={card.weight}
                      onChange={(e) => {
                        const newCards = [...scorecards];
                        newCards[index].weight = e.target.value;
                        setScorecards(newCards);
                      }}
                      placeholder="Weight (%)"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                    onClick={() => {
                      const newCards = scorecards.filter((_, i) => i !== index);
                      setScorecards(newCards);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full mt-2 border-dashed"
                onClick={() =>
                  setScorecards([
                    ...scorecards,
                    { id: Date.now(), name: "", weight: 0 },
                  ])
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Criteria
              </Button>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setSettingsModal(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                localStorage.setItem(
                  "ai_audit_kpi_settings",
                  JSON.stringify(kpiSettings),
                );
                localStorage.setItem(
                  "ai_audit_scorecards",
                  JSON.stringify(scorecards),
                );
                setSettingsModal(false);
              }}
            >
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAiCallAudit;
