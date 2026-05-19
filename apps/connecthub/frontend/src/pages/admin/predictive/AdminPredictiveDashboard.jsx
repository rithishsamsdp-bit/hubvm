import React, { useEffect, useState } from "react";
import { usePredictiveStore } from "../../../store/admin/predictive/usePredictiveStore";
import { useCampaignStore } from "../../../store/admin/useCampaignStore";
import { Select } from "@/components/ui/select";
import Icon from "../../../constants/Icon.jsx";

const AdminPredictiveDashboard = () => {
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const { predictiveDashboardData, getPredictiveDashboard } =
    usePredictiveStore();
  const { CampaignData } = useCampaignStore();

  useEffect(() => {
    getPredictiveDashboard(selectedCampaignId);
    const interval = setInterval(() => {
      getPredictiveDashboard(selectedCampaignId);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedCampaignId, getPredictiveDashboard]);

  const stats = predictiveDashboardData
    ? {
        totalLeads: predictiveDashboardData.totalLeads || 0,
        processed: predictiveDashboardData.processed || "0%",
        activeCampaigns: predictiveDashboardData.activeCampaigns || 0,
        stopped: predictiveDashboardData.stopped || 0,
        totalCalls: predictiveDashboardData.totalCalls || 0,
        successRate: predictiveDashboardData.successRate || 0,
        trend: predictiveDashboardData.trend || "Stable",
        calledLeads: predictiveDashboardData.completedLeads || 0,
        pendingLeads: predictiveDashboardData.newLeads || 0,
        totalRetries: predictiveDashboardData.totalRetries || 0,
        retrySuccess: predictiveDashboardData.retrySuccess || 0,
        answeredCount: predictiveDashboardData.answeredCount || 0,
        noAnswerCount: predictiveDashboardData.noAnswerCount || 0,
        failedCount: predictiveDashboardData.failedCount || 0,
        activeCalls: predictiveDashboardData.activeCalls || 0,
        availableAgents: predictiveDashboardData.availableAgents || 0,
        callsTodayRealTime: predictiveDashboardData.callsTodayRealTime || 0,
        connectedTodayRealTime:
          predictiveDashboardData.connectedTodayRealTime || 0,
        totalCallsRealTime: predictiveDashboardData.totalCallsRealTime || 0,
        totalConnectedRealTime:
          predictiveDashboardData.totalConnectedRealTime || 0,
        currentRatio: predictiveDashboardData.currentRatio || 0,
        campaignLiveStats: predictiveDashboardData.campaignLiveStats || [],
      }
    : {
        totalLeads: 0,
        processed: "0%",
        activeCampaigns: 0,
        stopped: 0,
        totalCalls: 0,
        successRate: 0,
        trend: "Idle",
        calledLeads: 0,
        pendingLeads: 0,
        totalRetries: 0,
        retrySuccess: 0,
        answeredCount: 0,
        noAnswerCount: 0,
        failedCount: 0,
        activeCalls: 0,
        availableAgents: 0,
        callsTodayRealTime: 0,
        connectedTodayRealTime: 0,
        totalCallsRealTime: 0,
        totalConnectedRealTime: 0,
        currentRatio: 0,
        campaignLiveStats: [],
      };

  const dailyData = predictiveDashboardData?.dailyCallVolume?.map((d) => ({
    day: d.name,
    answered: d.answered,
    noAnswer: d.noAnswer,
    failed: d.failed,
  })) || [
    { day: "Mon", answered: 400, noAnswer: 240, failed: 80 },
    { day: "Tue", answered: 300, noAnswer: 139, failed: 20 },
    { day: "Wed", answered: 200, noAnswer: 980, failed: 10 },
    { day: "Thu", answered: 278, noAnswer: 390, failed: 100 },
    { day: "Fri", answered: 189, noAnswer: 480, failed: 50 },
    { day: "Sat", answered: 239, noAnswer: 380, failed: 15 },
    { day: "Sun", answered: 349, noAnswer: 430, failed: 0 },
  ];

  // Calculate dynamic Y-axis scale based on max dailyData value
  const maxDataVal = Math.max(
    ...dailyData.map((d) =>
      Math.max(d.answered || 0, d.noAnswer || 0, d.failed || 0),
    ),
    10, // fallback minimum to prevent division by zero
  );
  const power = Math.floor(Math.log10(Math.max(maxDataVal / 4, 1)));
  const magnitude = Math.pow(10, power);
  let step = Math.ceil(maxDataVal / 4 / magnitude) * magnitude;
  // Adjust step to make numbers 'nicer' to read
  if (step === 3 * magnitude) step = 4 * magnitude;
  else if ([6, 7, 8, 9].includes(step / magnitude)) step = 10 * magnitude;

  const yAxisMax = step * 4;
  const yAxisLabels = [yAxisMax, step * 3, step * 2, step, 0].map((val) =>
    val >= 1000 ? (val / 1000).toFixed(val % 1000 !== 0 ? 1 : 0) + "K" : val,
  );

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Row 1: Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 flex justify-between items-center shadow-sm border border-slate-200">
          <div className="flex flex-col gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/10">
              <Icon name="groups" size={16} color="#3b82f6" />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Total Leads
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold text-slate-800 block mb-0.5">
              {stats.totalLeads.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
              Global Account
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 flex justify-between items-center shadow-sm border border-slate-200">
          <div className="flex flex-col gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-500/10">
              <Icon name="sandclock" size={16} color="#f59e0b" />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              New Leads
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold text-slate-800 block mb-0.5">
              {stats.pendingLeads.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
              Awaiting Dial
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 flex justify-between items-center shadow-sm border border-slate-200">
          <div className="flex flex-col gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10">
              <Icon name="call" size={16} color="#10b981" />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Answered
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold text-slate-800 block mb-0.5">
              {stats.answeredCount.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">
              Connected
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 flex justify-between items-center shadow-sm border border-slate-200">
          <div className="flex flex-col gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-500/10">
              <Icon name="unanswer" size={16} color="#64748b" />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              No Answer
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold text-slate-800 block mb-0.5">
              {stats.noAnswerCount.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              Did not pick up
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 flex justify-between items-center shadow-sm border border-slate-200">
          <div className="flex flex-col gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-rose-500/10">
              <Icon name="timer" size={16} color="#ef4444" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Failed</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold text-slate-800 block mb-0.5">
              {stats.failedCount.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
              System/Stale
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Grid Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Historical Volume Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-bold text-slate-800">
              Daily Call Volume
            </span>
            <Select
              options={[
                { label: "All Campaigns", value: "all" },
                ...(CampaignData && Array.isArray(CampaignData)
                  ? CampaignData.filter(
                      (c) => c.dialerType === "PREDICTIVE",
                    ).map((c) => ({
                      label: c.campaignName,
                      value: c.campaignId,
                    }))
                  : []),
              ]}
              value={selectedCampaignId || "all"}
              onValueChange={(val) => setSelectedCampaignId(val === "all" ? "" : val)}
              placeholder="All Campaigns"
              showSearch={false}
              triggerClassName="w-[200px] h-8 bg-slate-50 border-slate-200"
            />
          </div>

          <div className="flex-1 flex w-full relative pl-10 pr-2 pb-6 pt-2">
            <div className="absolute left-0 top-2 bottom-6 flex flex-col justify-between text-xs font-semibold text-slate-400 w-10">
              {yAxisLabels.map((l, i) => (
                <span key={i} className="leading-none">
                  {l}
                </span>
              ))}
            </div>
            <div className="flex-1 flex justify-between items-end gap-2 border-l border-b border-slate-200 relative pt-2">
              {dailyData.map((d, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center flex-1 h-full justify-end group"
                >
                  <div className="flex items-end gap-1 w-full max-w-[40px] h-full justify-center">
                    <div
                      className="w-1/3 rounded-t-sm transition-all duration-300 hover:opacity-80 relative"
                      style={{
                        height: `${(d.answered / yAxisMax) * 100}%`,
                        background: "#10b981",
                      }}
                      title={`Answered: ${d.answered}`}
                    />
                    <div
                      className="w-1/3 rounded-t-sm transition-all duration-300 hover:opacity-80 relative"
                      style={{
                        height: `${(d.noAnswer / yAxisMax) * 100}%`,
                        background: "#f59e0b",
                      }}
                      title={`No Answer: ${d.noAnswer}`}
                    />
                    <div
                      className="w-1/3 rounded-t-sm transition-all duration-300 hover:opacity-80 relative"
                      style={{
                        height: `${(d.failed / yAxisMax) * 100}%`,
                        background: "#ef4444",
                      }}
                      title={`Failed: ${d.failed}`}
                    />
                  </div>
                  <span className="absolute -bottom-6 text-xs font-semibold text-slate-500">
                    {d.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-6 mt-6 pt-4 text-xs font-semibold text-slate-500 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
              Answered
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
              No Answer
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-rose-500 rounded-sm"></div>
              Failed
            </div>
          </div>

          {/* Lead Status Overview */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="text-sm font-bold text-slate-800 mb-4">
              Lead Status Overview
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{
                  width: `${stats.totalLeads > 0 ? (stats.calledLeads / stats.totalLeads) * 100 : 0}%`,
                  transition: "width 0.5s ease",
                }}
                className="bg-emerald-500"
                title={`Completed: ${(stats.calledLeads || 0).toLocaleString()}`}
              ></div>
              <div
                style={{
                  width: `${stats.totalLeads > 0 ? (stats.totalRetries / stats.totalLeads) * 100 : 0}%`,
                  transition: "width 0.5s ease",
                }}
                className="bg-blue-500"
                title={`Retrying: ${(stats.totalRetries || 0).toLocaleString()}`}
              ></div>
              <div
                style={{
                  width: `${stats.totalLeads > 0 ? (stats.pendingLeads / stats.totalLeads) * 100 : 0}%`,
                  transition: "width 0.5s ease",
                }}
                className="bg-amber-500"
                title={`New: ${(stats.pendingLeads || 0).toLocaleString()}`}
              ></div>
            </div>
            <div className="flex justify-between md:justify-center flex-wrap gap-x-6 gap-y-2 mt-4 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div>
                Completed:{" "}
                <span className="text-slate-700">
                  {(stats.calledLeads || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></div>
                Retrying:{" "}
                <span className="text-slate-700">
                  {(stats.totalRetries || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></div>
                New:{" "}
                <span className="text-slate-700">
                  {(stats.pendingLeads || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-slate-200 rounded-sm"></div>
                Total:{" "}
                <span className="text-slate-700">
                  {(stats.totalLeads || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Mini Table + Retry Stats */}
        <div className="flex flex-col gap-6 h-full">
          {/* Live Campaign Table (Mini Version) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 shrink-0">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold text-slate-800">
                Active Campaigns
              </span>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar pr-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="font-semibold text-slate-500 pb-2 border-b border-slate-100 sticky top-0 bg-white">
                      Name
                    </th>
                    <th className="font-semibold text-slate-500 pb-2 border-b border-slate-100 text-center sticky top-0 bg-white">
                      Ratio
                    </th>
                    <th className="font-semibold text-slate-500 pb-2 border-b border-slate-100 text-center sticky top-0 bg-white">
                      Active
                    </th>
                    <th className="font-semibold text-slate-500 pb-2 border-b border-slate-100 text-center sticky top-0 bg-white">
                      Agents
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.campaignLiveStats.length > 0 ? (
                    stats.campaignLiveStats.map((camp, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                      >
                        <td
                          className="py-2.5 font-medium text-slate-700 truncate max-w-[100px]"
                          title={camp.campaignName}
                        >
                          {camp.campaignName}
                        </td>
                        <td className="py-2.5 text-center text-slate-600 font-semibold">
                          {camp.ratio}
                        </td>
                        <td className="py-2.5 text-center">
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">
                            {camp.activeCalls}
                          </span>
                        </td>
                        <td
                          className={`py-2.5 text-center font-bold ${camp.availableAgents > 0 ? "text-emerald-500" : "text-rose-500"}`}
                        >
                          {camp.availableAgents}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="py-4 text-center text-slate-400 font-medium"
                      >
                        None active
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Retry Statistics */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col shrink-0">
            <div className="flex items-center mb-4 pb-2 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-800">
                Retry Statistics
              </span>
            </div>
            <div className="flex items-center justify-center gap-8 py-4">
              <div className="relative w-24 h-24 rounded-full border-[6px] border-emerald-500 flex flex-col items-center justify-center bg-emerald-50 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <span className="text-xl font-black text-emerald-600">
                  {stats.successRate}%
                </span>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                  Success
                </span>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total Called
                    </span>
                  </div>
                  <span className="text-lg font-bold text-slate-800 pl-4 leading-none">
                    {stats.calledLeads}
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Answered
                    </span>
                  </div>
                  <span className="text-lg font-bold text-slate-800 pl-4 leading-none">
                    {stats.answeredCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPredictiveDashboard;
