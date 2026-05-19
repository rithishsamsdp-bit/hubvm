import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { DataTable } from "@/components/ui/table";
import WhatsAppPreview from "./components/WhatsAppPreview.jsx";
import { useEmergencyStore } from "../../../store/admin/useEmergencyStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, AlertTriangle, X } from "lucide-react";

const AdminEmergencyReports = ({
  alerts,
  fetchCdrData,
  fetchCdrCount,
  isfetchLoading,
  page,
  pageSize,
  offset,
  reportsCampaignFilter,
  reportsChannelFilter,
  reportsDispositionFilter,
  reportsDateRange,
  setPage,
  setPageSize,
  setOffset,
  setReportsCampaignFilter,
  setReportsChannelFilter,
  setReportsDispositionFilter,
  reportsResponseFilter,
  setReportsResponseFilter,
  setReportsDateRange,
}) => {
  const { exportAllReports } = useEmergencyStore();
  const [modalData, setModalData] = useState({
    open: false,
    title: "",
    content: null,
  });

  const campaignOptions = alerts.map((alert) => ({
    label: alert.name,
    value: alert.id,
  }));

  const columns = [
    {
      title: "S.no",
      key: "s_no",
      width: 60,
      Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
    },
    {
      title: "Timestamp",
      key: "c_createdOn",
      Cell: (row) => new Date(row.c_createdOn).toLocaleString(),
    },
    {
      title: "Campaign ID",
      key: "c_campaignId",
    },
    { title: "Campaign Name", key: "c_campaignName" },
    { title: "Member Name", key: "c_memberName" },
    { title: "Lead Number", key: "c_customerPhoneno" },
    {
      title: "Channel",
      key: "c_channel",
      width: 100,
      Cell: (row) => {
        const isWA = row.c_channel === "WA";
        const isSMS = row.c_channel === "SMS";
        return (
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                isWA
                  ? "bg-emerald-50 border-emerald-100 text-emerald-500"
                  : isSMS
                    ? "bg-blue-50 border-blue-100 text-blue-500"
                    : "bg-orange-50 border-orange-100 text-orange-500"
              }`}
            >
              {isWA ? (
                <MessageSquare className="w-3.5 h-3.5" />
              ) : isSMS ? (
                <MessageSquare className="w-3.5 h-3.5" />
              ) : (
                <Phone className="w-3.5 h-3.5" />
              )}
            </div>
            <span className="font-semibold text-slate-700 text-xs">
              {isWA ? "WhatsApp" : isSMS ? "SMS" : "IVR"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Disposition",
      key: "c_disposition",
      Cell: (row) => {
        const status = row.c_disposition.toLowerCase();
        const isSuccess =
          status === "answered" || status === "delivered" || status === "read";
        return (
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border tracking-wider ${
              isSuccess
                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                : "bg-orange-50 text-orange-600 border-orange-100"
            }`}
          >
            {row.c_disposition}
          </span>
        );
      },
    },
    {
      title: "Duration",
      key: "c_duration",
      Cell: (row) => `${row.c_duration}s`,
    },
    {
      title: "Message",
      key: "c_messageContent",
      width: 300,
      Cell: (row) => {
        const content = row.c_messageContent;
        if (!content) return <span className="text-slate-400">-</span>;

        let isWhatsApp = row.c_channel === "WA";
        let displayText = content;

        if (isWhatsApp) {
          try {
            const parsed =
              typeof content === "string" ? JSON.parse(content) : content;
            const body = parsed.components?.find(
              (c) => c.type?.toUpperCase() === "BODY",
            );
            displayText = body?.text || JSON.stringify(parsed);
          } catch (e) {
            displayText =
              typeof content === "string" ? content : JSON.stringify(content);
          }
        } else if (typeof content === "object") {
          displayText = JSON.stringify(content);
        }

        return (
          <span
            title="Click to view full message"
            className="cursor-pointer font-medium text-blue-600 hover:text-blue-800 hover:underline"
            onClick={() =>
              setModalData({
                open: true,
                title: isWhatsApp
                  ? "WhatsApp Message Preview"
                  : "Message Content",
                content: isWhatsApp ? (
                  <WhatsAppPreview data={content} />
                ) : (
                  displayText
                ),
              })
            }
          >
            {displayText.length > 50
              ? `${displayText.substring(0, 50)}...`
              : displayText}
          </span>
        );
      },
    },
    {
      title: "Response",
      key: "c_ivrResponse",
      width: 200,
      Cell: (row) => {
        const resp = row.c_ivrResponse;
        if (!resp) return <span className="text-slate-400">-</span>;

        let displayText = resp;
        if (typeof resp === "object") {
          try {
            const body = resp.components?.find(
              (c) => c.type?.toUpperCase() === "BODY",
            );
            displayText = body?.text || JSON.stringify(resp);
          } catch (e) {
            displayText = JSON.stringify(resp);
          }
        }

        return (
          <span className="font-medium text-slate-600">
            {displayText.length > 50
              ? `${displayText.substring(0, 50)}...`
              : displayText}
          </span>
        );
      },
    },
  ];

  return (
    <div className="w-full h-full p-6 bg-slate-50/50 overflow-y-auto flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={reportsCampaignFilter || "all"}
          onValueChange={(val) =>
            setReportsCampaignFilter(val === "all" ? "" : val)
          }
        >
          <SelectTrigger className="w-[250px] bg-white border-slate-200">
            <SelectValue placeholder="Filter by Campaign" />
          </SelectTrigger>
          <SelectContent>
            {[{ label: "All Campaigns", value: "all" }, ...campaignOptions].map(
              (opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Select
          value={reportsChannelFilter || "all"}
          onValueChange={(val) =>
            setReportsChannelFilter(val === "all" ? "" : val)
          }
        >
          <SelectTrigger className="w-[200px] bg-white border-slate-200">
            <SelectValue placeholder="Filter by Channel" />
          </SelectTrigger>
          <SelectContent>
            {[
              { label: "All Channels", value: "all" },
              { label: "IVR", value: "IVR" },
              { label: "WhatsApp", value: "WA" },
              { label: "SMS", value: "SMS" },
            ].map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={reportsDispositionFilter || "all"}
          onValueChange={(val) =>
            setReportsDispositionFilter(val === "all" ? "" : val)
          }
        >
          <SelectTrigger className="w-[200px] bg-white border-slate-200">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            {[
              { label: "All Status", value: "all" },
              { label: "ANSWER (IVR)", value: "ANSWER" },
              { label: "NO ANSWER (IVR)", value: "NO ANSWER" },
              { label: "BUSY (IVR)", value: "BUSY" },
              { label: "FAILED (IVR)", value: "FAILED" },
              { label: "READ (WA)", value: "read" },
              { label: "DELIVERED (WA)", value: "delivered" },
              { label: "SENT (WA)", value: "sent" },
              { label: "QUEUED (WA)", value: "queued" },
              { label: "DELIVERED (SMS)", value: "DELIVRD" },
              { label: "REJECTED (SMS)", value: "REJECTD" },
              { label: "SENT (SMS)", value: "SENT" },
            ].map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={reportsResponseFilter || "all"}
          onValueChange={(val) =>
            setReportsResponseFilter(val === "all" ? "" : val)
          }
        >
          <SelectTrigger className="w-[200px] bg-white border-slate-200">
            <SelectValue placeholder="Filter by Response" />
          </SelectTrigger>
          <SelectContent>
            {[
              { label: "All Responses", value: "all" },
              ...[...new Set(fetchCdrData.map((log) => log.c_ivrResponse))]
                .filter((r) => r && r !== "-")
                .map((r) => ({ label: r, value: r })),
            ].map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateTimeRangePicker
          key={reportsDateRange[0] ? "date-set" : "date-empty"}
          initialStart={reportsDateRange[0]}
          initialEnd={reportsDateRange[1]}
          onChange={(range) => {
            if (range.end) {
              const eod = new Date(range.end);
              eod.setHours(23, 59, 59, 999);
              setReportsDateRange([range.start, eod]);
            } else {
              setReportsDateRange([range.start, range.end]);
            }
          }}
        />
        {(() => {
          const hasActiveFilters =
            reportsCampaignFilter ||
            reportsChannelFilter ||
            reportsDispositionFilter ||
            reportsResponseFilter ||
            reportsDateRange[0] ||
            reportsDateRange[1];

          return hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-medium"
              onClick={() => {
                setReportsCampaignFilter("");
                setReportsChannelFilter("");
                setReportsDispositionFilter("");
                setReportsResponseFilter("");
                setReportsDateRange([null, null]);
              }}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear all
            </Button>
          ) : null;
        })()}
      </div>

      <div className="flex-1 overflow-hidden">
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
        open={modalData.open}
        onOpenChange={(isOpen) =>
          !isOpen && setModalData({ ...modalData, open: false })
        }
      >
        <DialogContent className="max-w-[600px] p-0 overflow-hidden bg-white">
          <DialogHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-lg font-black text-slate-800">
              {modalData.title}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 overflow-y-auto max-h-[70vh] text-slate-700">
            {modalData.content}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmergencyReports;
