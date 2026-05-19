import React, { useState, useEffect, useCallback } from "react";
import Icon from "../../../constants/Icon.jsx";
import { usePredictiveStore } from "../../../store/admin/predictive/usePredictiveStore.js";
import { useDashboardStore } from "../../../store/admin/useDashboardStore.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import telephonyaxios from "../../../services/telephonyaxios.js";
import { Loader } from "../../../components/Index.jsx";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  X,
  Play,
  Square,
  Edit2,
  Trash2,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const CampaignProgressBar = ({ campaign }) => {
  const [stats, setStats] = useState({ progress: 0, text: "0/0" });

  useEffect(() => {
    let isMounted = true;
    const fetchProgress = async () => {
      try {
        const res = await telephonyaxios.get(
          `/telephony/campaign/predective/dashboard?campaign_id=${campaign.campaignId}`,
        );
        const data = res.data?.data;
        if (isMounted && data) {
          const total = data.totalLeads || 0;
          const completed = data.completedLeads || 0;
          const percentage = total > 0 ? (completed / total) * 100 : 0;
          setStats({
            progress: percentage,
            text: `${completed}/${total}`,
          });
        }
      } catch (error) {
        console.error("Failed to fetch progress:", error);
      }
    };

    fetchProgress();
    const interval = setInterval(fetchProgress, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [campaign.campaignId]);

  return (
    <div className="flex flex-col gap-2 mt-4">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Progress
        </span>
        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
          {stats.progress.toFixed(1)}% ({stats.text})
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-500 ease-in-out"
          style={{ width: `${stats.progress}%` }}
        />
      </div>
    </div>
  );
};

const AdminPredictiveCampaignCards = ({
  campaigns,
  isLoading,
  handleEdit,
  handleDelete,
  handleStart,
  handleStop,
  handleCreateButtonClick,
}) => {
  const { getCampaignLeads } = usePredictiveStore();
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [noAnswerCount, setNoAnswerCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isLeadsLoading, setIsLeadsLoading] = useState(false);
  const [activeCampaignName, setActiveCampaignName] = useState("");
  const [activeCampaignId, setActiveCampaignId] = useState(null);

  const { userStatusData, getUserStatusData } = useDashboardStore();
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [membersModalCampaignName, setMembersModalCampaignName] = useState("");
  const [campaignGroupsData, setCampaignGroupsData] = useState([]);

  const [membersPage, setMembersPage] = useState(1);
  const [membersPageSize, setMembersPageSize] = useState(10);
  const [membersStatusFilter, setMembersStatusFilter] = useState("");

  // Pagination & Search state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalSearch, setModalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debouncedSearch = useDebounce(modalSearch, 500);

  const fetchLeadsData = useCallback(
    async (campaignId, currentPage, size, search, status, lastResult) => {
      setIsLeadsLoading(true);
      try {
        const offset = (currentPage - 1) * size;
        const result = await getCampaignLeads(
          campaignId,
          size,
          offset,
          search,
          status,
          lastResult,
        );
        if (result) {
          setSelectedLeads(result.leads || []);
          setLeadsCount(result.totalCount || 0);
          setNewLeadsCount(result.newCount || 0);
          setAnsweredCount(result.answeredCount || 0);
          setNoAnswerCount(result.noAnswerCount || 0);
          setFailedCount(result.failedCount || 0);
        }
      } catch (error) {
        console.error("Error fetching leads:", error);
      } finally {
        setIsLeadsLoading(false);
      }
    },
    [getCampaignLeads],
  );

  useEffect(() => {
    if (showLeadsModal && activeCampaignId) {
      fetchLeadsData(
        activeCampaignId,
        page,
        pageSize,
        debouncedSearch,
        statusFilter,
      );
    }
  }, [
    showLeadsModal,
    activeCampaignId,
    page,
    pageSize,
    debouncedSearch,
    statusFilter,
    fetchLeadsData,
  ]);

  const handleCardClick = (campaignId, campaignName) => {
    setActiveCampaignId(campaignId);
    setActiveCampaignName(campaignName);
    setPage(1);
    setModalSearch("");
    setStatusFilter("");
    setShowLeadsModal(true);
  };

  const handleViewMembersClick = (campaignId, campaignName) => {
    setActiveCampaignId(campaignId);
    setMembersModalCampaignName(campaignName);
    setMembersPage(1);
    setMembersStatusFilter("");
    setShowMembersModal(true);
  };

  useEffect(() => {
    let isMounted = true;
    if (showMembersModal) {
      getUserStatusData();
      const fetchGroups = async () => {
        try {
          const res = await telephonyaxios.post(
            "/telephony/membergroup/fetch",
            {
              limit: 1000,
              offset: 0,
              searchString: "",
              sortField: "m_membergroupName",
              sortOrder: "DESC",
            },
          );
          if (isMounted && res?.data?.data?.totalRecords) {
            setCampaignGroupsData(res.data.data.totalRecords);
          }
        } catch (error) {
          console.error("Failed to fetch member groups", error);
        }
      };
      fetchGroups();
    }
    return () => {
      isMounted = false;
    };
  }, [showMembersModal, getUserStatusData]);

  const handlePageChange = (pageValues) => {
    setPage(pageValues.currentPage);
    setPageSize(pageValues.pageSize);
  };

  // Filter for Predictive campaigns only
  const predictiveCampaigns = Array.isArray(campaigns)
    ? campaigns.filter((c) => c.dialerType === "PREDICTIVE")
    : [];

  // Members Modal Data Calculation
  const calculateMembers = () => {
    if (!showMembersModal) return [];

    const activeGroups = campaignGroupsData.filter(
      (g) =>
        g.campaignNames && g.campaignNames.includes(membersModalCampaignName),
    );

    const groupMap = new Map();
    activeGroups.forEach((g) => {
      (g.members || []).forEach((m) => {
        if (!groupMap.has(m.m_memberId)) {
          groupMap.set(m.m_memberId, m);
        }
      });
    });

    let allMembers = Array.from(groupMap.values()).map((m) => {
      const liveInfo = userStatusData.find(
        (u) =>
          String(u.l_membermemberId) === String(m.m_memberId) ||
          String(u.l_memberName) === String(m.m_memberName),
      );

      return {
        memberName: m.m_memberName,
        extension: liveInfo?.l_memberExtention || "N/A",
        status: liveInfo?.l_memberStatus || "LOGGED OUT",
        activeCampaign: liveInfo?.l_memberCampaignName || "N/A",
        lastUpdated: liveInfo?.l_memberLastUpdated || "N/A",
      };
    });

    if (membersStatusFilter) {
      allMembers = allMembers.filter(
        (m) => m.status.toUpperCase() === membersStatusFilter.toUpperCase(),
      );
    }

    return allMembers;
  };

  const membersList = calculateMembers();
  const membersPaginationTotal = membersList.length;
  const paginatedMembersList = membersList.slice(
    (membersPage - 1) * membersPageSize,
    membersPage * membersPageSize,
  );

  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
        <Loader />
        <p className="text-slate-500 font-medium italic mt-4">
          Loading predictive campaigns...
        </p>
      </div>
    );
  }

  if (predictiveCampaigns.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-6">
          <Icon name="campaign" size={32} color="#60a5fa" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">
          No Predictive Campaigns Found
        </h3>
        <p className="text-slate-500 max-w-sm text-center mb-8">
          Create a predictive campaign to enjoy advanced automated dialing
          features.
        </p>
        <Button onClick={handleCreateButtonClick}>
          Create Predictive Campaign
        </Button>
      </div>
    );
  }

  const leadColumns = [
    {
      title: "Lead ID",
      key: "p_leadID",
      Cell: (row) => (
        <span
          title={row.p_leadID}
          className="cursor-help font-mono text-[10px] text-slate-500"
        >
          {row.p_leadID?.slice(-8) || "N/A"}
        </span>
      ),
    },
    { title: "Phone Number", key: "p_leadPhoneNumber" },
    {
      title: "Status",
      key: "p_leadStatus",
      Cell: (row) => {
        const status = row.p_leadStatus?.toUpperCase() || "NEW";
        return (
          <Badge
            variant="outline"
            className={cn(
              "font-bold text-[10px] px-2 py-0",
              status === "NEW" && "bg-blue-50 text-blue-600 border-blue-100",
              status === "CALLING" &&
                "bg-amber-50 text-amber-600 border-amber-100",
              status === "COMPLETED" &&
                "bg-emerald-50 text-emerald-600 border-emerald-100",
              status === "FAILED" && "bg-rose-50 text-rose-600 border-rose-100",
            )}
          >
            {status}
          </Badge>
        );
      },
    },
    { title: "Last Result", key: "p_leadLastResult" },
    {
      title: "Next Dialing Time",
      key: "p_leadnextCallTime",
      Cell: (row) => (
        <span className="text-slate-600">
          {row.p_leadnextCallTime
            ? new Date(row.p_leadnextCallTime * 1000).toLocaleString()
            : "N/A"}
        </span>
      ),
    },
    { title: "Total Attempts", key: "p_totalAttempts" },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {predictiveCampaigns.map((campaign) => {
          const rules =
            typeof campaign.campaignRules === "string"
              ? JSON.parse(campaign.campaignRules)
              : campaign.campaignRules;

          const strategy = rules?.Strategy || rules?.retryStrategy || "Static";
          const ratio =
            strategy === "Adaptive" && rules?.minRatio && rules?.maxRatio
              ? `${rules.minRatio}-${rules.maxRatio}`
              : rules?.ratio || rules?.maxRatio || 1;
          const maxChannels = rules?.limits?.maxChannels || "-";
          const maxRetry =
            rules?.limits?.maxtotalattempts || rules?.maxRetry || 0;
          const isActive = campaign.campaignStatus === "ACTIVE";

          return (
            <div
              key={campaign.campaignId}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h3
                    className="text-base font-bold text-slate-800 leading-tight truncate max-w-[180px]"
                    title={campaign.campaignName}
                  >
                    {campaign.campaignName}
                  </h3>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                    {campaign.dialerType}
                  </span>
                </div>
                <Badge
                  className={cn(
                    "font-bold text-[10px] px-2 py-0.5",
                    isActive
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : "bg-slate-400 hover:bg-slate-500",
                  )}
                >
                  {campaign.campaignStatus || "INACTIVE"}
                </Badge>
              </div>

              <div className="p-5 flex-1 flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-md text-blue-600">
                      <Icon name="timer" size={12} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">
                        Ratio
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {ratio}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 rounded-md text-emerald-600">
                      <Icon name="campaign" size={12} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">
                        Channels
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {maxChannels}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 rounded-md text-amber-600">
                      <Icon name="rightarrow" size={12} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">
                        Strategy
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {strategy}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                    <div className="p-1.5 bg-rose-100 rounded-md text-rose-600">
                      <Icon name="calender" size={12} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">
                        Retries
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {maxRetry}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-medium">
                      Lifecycle
                    </span>
                    <span className="text-slate-800 font-bold">
                      {!rules?.limits?.startDate && !rules?.limits?.endDate
                        ? "No Limit"
                        : `${rules?.limits?.startDate} - ${rules?.limits?.endDate}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-medium">Hours</span>
                    <span className="text-slate-800 font-bold">
                      {rules?.callinghours?.start} - {rules?.callinghours?.end}
                    </span>
                  </div>
                  <CampaignProgressBar campaign={campaign} />
                </div>

                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                      DID Group
                    </span>
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {campaign.didGroupName || "Default"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                      Form
                    </span>
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {campaign.f_formName || "None"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() =>
                      handleCardClick(
                        campaign.campaignId,
                        campaign.campaignName,
                      )
                    }
                    title="View Leads"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                    onClick={() =>
                      handleViewMembersClick(
                        campaign.campaignId,
                        campaign.campaignName,
                      )
                    }
                    title="Members"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                    onClick={() => handleEdit(campaign.campaignId)}
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => handleDelete(campaign.campaignId)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {isActive ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 font-bold px-4"
                    onClick={() => handleStop(campaign.campaignId)}
                  >
                    <Square className="h-3 w-3 mr-2 fill-current" /> STOP
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-8 font-bold px-4 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleStart(campaign.campaignId)}
                  >
                    <Play className="h-3 w-3 mr-2 fill-current" /> START
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leads Modal */}
      <Dialog
        width="750px"
        open={showLeadsModal}
        onOpenChange={setShowLeadsModal}
      >
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-2 border-b border-slate-100 shrink-0">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Campaign Leads:{" "}
                <span className="text-blue-600">{activeCampaignName}</span>
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col p-6 gap-6 min-h-0">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 shrink-0">
              {[
                { label: "Total", value: leadsCount, color: "slate" },
                { label: "New", value: newLeadsCount, color: "blue" },
                { label: "Answered", value: answeredCount, color: "emerald" },
                { label: "No Answer", value: noAnswerCount, color: "amber" },
                { label: "Failed", value: failedCount, color: "rose" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col"
                >
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "text-lg font-bold",
                      `text-${item.color}-600`,
                    )}
                  >
                    {item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between gap-4 shrink-0">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by Phone or Lead ID..."
                  className="pl-10 h-10"
                  value={modalSearch}
                  onChange={(e) => {
                    setModalSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select
                value={statusFilter || "ALL"}
                onValueChange={(val) => {
                  setStatusFilter(val === "ALL" ? "" : val);
                  setPage(1);
                }}
                options={[
                  { label: "All Status", value: "ALL" },
                  { label: "New", value: "NEW" },
                  { label: "Calling", value: "CALLING" },
                  { label: "Completed", value: "COMPLETED" },
                  { label: "Failed", value: "FAILED" },
                ]}
                triggerClassName="w-[180px] h-10"
              />
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-hidden border border-slate-200 rounded-xl flex flex-col bg-white">
              <div className="flex-1 overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                      {leadColumns.map((col) => (
                        <TableHead
                          key={col.key}
                          className="font-bold text-slate-600 h-10"
                        >
                          {col.title}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLeadsLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={leadColumns.length}
                          className="h-64 text-center"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Loader />
                            <span className="text-slate-400 font-medium mt-2">
                              Fetching leads...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : selectedLeads.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={leadColumns.length}
                          className="h-64 text-center text-slate-400 italic"
                        >
                          No leads found for this filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedLeads.map((lead, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/50">
                          {leadColumns.map((col) => (
                            <TableCell key={col.key} className="py-2.5">
                              {col.Cell ? (
                                col.Cell(lead)
                              ) : (
                                <span className="text-slate-700 font-medium">
                                  {lead[col.key] || "N/A"}
                                </span>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between shrink-0">
                <div className="text-xs font-medium text-slate-500">
                  Showing{" "}
                  <span className="text-slate-800 font-bold">
                    {Math.min((page - 1) * pageSize + 1, leadsCount)}
                  </span>{" "}
                  to{" "}
                  <span className="text-slate-800 font-bold">
                    {Math.min(page * pageSize, leadsCount)}
                  </span>{" "}
                  of{" "}
                  <span className="text-slate-800 font-bold">
                    {leadsCount.toLocaleString()}
                  </span>{" "}
                  leads
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Rows:</span>
                    <select
                      className="bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      disabled={page === 1 || isLeadsLoading}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="h-8 min-w-[32px] flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg text-xs font-bold px-2">
                      {page}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      disabled={page * pageSize >= leadsCount || isLeadsLoading}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Members Modal */}
      <Dialog open={showMembersModal} onOpenChange={setShowMembersModal}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-2 border-b border-slate-100 shrink-0">
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              Campaign Members:{" "}
              <span className="text-emerald-600">
                {membersModalCampaignName}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col p-6 gap-6 min-h-0">
            <div className="flex justify-end shrink-0">
              <Select
                value={membersStatusFilter || "ALL"}
                onValueChange={(val) => {
                  setMembersStatusFilter(val === "ALL" ? "" : val);
                  setMembersPage(1);
                }}
                options={[
                  { label: "All Status", value: "ALL" },
                  { label: "Available", value: "AVAILABLE" },
                  { label: "In Call", value: "INCALL" },
                  { label: "Unavailable", value: "UNAVAILABLE" },
                  { label: "Logged Out", value: "LOGGED OUT" },
                ]}
                triggerClassName="w-[180px] h-10"
              />
            </div>

            <div className="flex-1 overflow-hidden border border-slate-200 rounded-xl flex flex-col bg-white">
              <div className="flex-1 overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-bold text-slate-600 h-10">
                        Member Name
                      </TableHead>
                      <TableHead className="font-bold text-slate-600 h-10">
                        Extension
                      </TableHead>
                      <TableHead className="font-bold text-slate-600 h-10">
                        Status
                      </TableHead>
                      <TableHead className="font-bold text-slate-600 h-10">
                        Active Campaign
                      </TableHead>
                      <TableHead className="font-bold text-slate-600 h-10">
                        Last Updated
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMembersList.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-64 text-center text-slate-400 italic"
                        >
                          {membersList.length === 0
                            ? "No members currently assigned."
                            : "No members match filter."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedMembersList.map((member, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/50">
                          <TableCell className="py-2.5 font-bold text-slate-700">
                            {member.memberName}
                          </TableCell>
                          <TableCell className="py-2.5 font-mono text-xs">
                            {member.extension}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-bold text-[10px] px-2 py-0",
                                member.status === "AVAILABLE" &&
                                  "bg-emerald-50 text-emerald-600 border-emerald-100",
                                member.status === "INCALL" &&
                                  "bg-blue-50 text-blue-600 border-blue-100",
                                member.status === "UNAVAILABLE" &&
                                  "bg-amber-50 text-amber-600 border-amber-100",
                                member.status === "LOGGED OUT" &&
                                  "bg-slate-50 text-slate-400 border-slate-200",
                              )}
                            >
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5 text-xs text-slate-500">
                            {member.activeCampaign}
                          </TableCell>
                          <TableCell className="py-2.5 text-xs text-slate-400">
                            {member.lastUpdated}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {membersPaginationTotal > 0 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between shrink-0">
                  <div className="text-xs font-medium text-slate-500">
                    Showing{" "}
                    <span className="text-slate-800 font-bold">
                      {Math.min(
                        (membersPage - 1) * membersPageSize + 1,
                        membersPaginationTotal,
                      )}
                    </span>{" "}
                    to{" "}
                    <span className="text-slate-800 font-bold">
                      {Math.min(
                        membersPage * membersPageSize,
                        membersPaginationTotal,
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="text-slate-800 font-bold">
                      {membersPaginationTotal}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Rows:</span>
                      <select
                        className="bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer"
                        value={membersPageSize}
                        onChange={(e) => {
                          setMembersPageSize(Number(e.target.value));
                          setMembersPage(1);
                        }}
                      >
                        {[10, 25, 50, 100].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        disabled={membersPage === 1}
                        onClick={() => setMembersPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="h-8 min-w-[32px] flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold px-2">
                        {membersPage}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        disabled={
                          membersPage * membersPageSize >=
                          membersPaginationTotal
                        }
                        onClick={() => setMembersPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPredictiveCampaignCards;
