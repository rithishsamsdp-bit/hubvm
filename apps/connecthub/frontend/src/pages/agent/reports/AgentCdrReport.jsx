import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../../components/Navbar.jsx";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { useCdrStore } from "../../../store/agent/reports/useCdrStore";
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
import { Search, X } from "lucide-react";

const AgentCdrReport = () => {
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
  const [campaign, setCampaign] = useState([]);
  const [disposition, setDisposition] = useState("");
  const [callMode, setCallMode] = useState("");
  const [agentDisposition, setAgentDisposition] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [sortField, setSortField] = useState("c_callDateTime");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [specificFollowUpModal, setSpecificFollowUpModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState("");

  const { getCdrData, fetchCdrData, fetchCdrCount, isfetchLoading } =
    useCdrStore();

  const formatDate = (date, isEndDate = false) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const time = isEndDate ? "23:59:59" : "00:00:00";
    return `${year}-${month}-${day} ${time}`;
  };

  useEffect(() => {
    navigate(
      `/agent-reports/agent-cdrReport?page=${page}&per_page=${pageSize}`,
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
    setCampaign([]);
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
          const value = row.CallDisposition?.toLowerCase() || "";

          let bgColor = "bg-slate-100 text-slate-700 border-slate-200";
          if (value.includes("answered")) {
            bgColor = "bg-emerald-50 text-emerald-600 border-emerald-100";
          } else if (
            value.includes("no") ||
            value.includes("missed") ||
            value.includes("failed")
          ) {
            bgColor = "bg-rose-50 text-rose-600 border-rose-100";
          } else if (value.includes("busy") || value.includes("dtmf")) {
            bgColor = "bg-amber-50 text-amber-600 border-amber-100";
          }

          return (
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border tracking-wider ${bgColor}`}
            >
              {row.CallDisposition}
            </span>
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
        title: "Call Recording",
        key: "CallRecording",
        fixed: "right",
        width: 280,
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

  const hasActiveFilters = searchString || direction || disposition || callMode;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-slate-50/30">
      <Navbar
        title="CDR Report"
        breadcrumbs={[
          { label: "Dashboard", route: "/agent-dashboard" },
          { label: "Reports", route: "/agent-reports" },
          { label: "CDR Report", active: true },
        ]}
      />

      <div className="w-full h-[calc(100%-90px)] p-6 flex flex-col gap-4 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by Campaign name, Source, Destination"
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              className="pl-9"
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
            columns={columns}
            data={fetchCdrData}
            loading={isfetchLoading}
            totaldata={fetchCdrCount}
            page={page}
            serverSide
            pageSize={pageSize}
            onPageChange={(pagevalues) => {
              setTimeout(() => {
                setPage(pagevalues.currentPage);
                setPageSize(pagevalues.pageSize);
                setOffset(
                  pagevalues.pageSize * pagevalues.currentPage -
                    pagevalues.pageSize,
                );
              }, 0);
            }}
          />
        </div>

        <Dialog
          open={specificFollowUpModal}
          onOpenChange={setSpecificFollowUpModal}
        >
          <DialogContent className="max-w-[600px] p-0 overflow-hidden bg-white">
            <DialogHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
              <DialogTitle className="text-lg font-black text-slate-800">
                Notes
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 overflow-y-auto max-h-[70vh] text-slate-700">
              {selectedFollowUp && Object.keys(selectedFollowUp).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(selectedFollowUp).map(([key, value]) => (
                    <div
                      className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b border-slate-50 last:border-0"
                      key={key}
                    >
                      <span className="font-semibold text-slate-900 w-1/3 shrink-0 capitalize">
                        {key}
                      </span>
                      {typeof value === "object" ? (
                        <span className="text-slate-600">
                          start - {value.start} — end - {value.end}
                        </span>
                      ) : (
                        <span className="text-slate-600 break-words">
                          {value || "-"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p className="font-medium">No data found</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AgentCdrReport;
