import { useEffect } from "react";
import { useSocketStore } from "../../store/useSocketStore";
import { useDashboardStore } from "../../store/agent/useDashboardStore";
import { Loader } from "../../components/Index.jsx";
import Navbar from "../../components/Navbar.jsx";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Timer,
  Coffee,
  LogIn,
  Voicemail,
  CheckCircle2,
  Headphones,
  BarChart3,
  Pause,
  TrendingUp,
  UtensilsCrossed,
  DoorOpen,
  HelpCircle,
  Presentation,
} from "lucide-react";

// SVG Donut Chart component
const DonutChart = ({ segments, size = 140, strokeWidth = 20 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  let cumulativeOffset = 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="transform -rotate-90"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth={strokeWidth}
      />
      {segments.map((seg, i) => {
        const dashLength = (seg.percent / 100) * circumference;
        const dashOffset = circumference - dashLength;
        const rotation = (cumulativeOffset / 100) * 360;
        cumulativeOffset += seg.percent;
        return (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeDashoffset={0}
            transform={`rotate(${rotation} ${center} ${center})`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        );
      })}
    </svg>
  );
};

const Dashboard = () => {
  const { socket } = useSocketStore();
  const { agentStats, getStats, chatLoading } = useDashboardStore();

  useEffect(() => {
    getStats();
  }, [socket, getStats]);

  // Helper function to format time values (assuming they're in seconds)
  const formatTime = (seconds) => {
    if (!seconds || seconds <= 0) return "0m";
    seconds = Math.max(0, seconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Hero KPI cards data
  const heroStats = [
    {
      label: "Total Calls",
      value: agentStats?.total_calls?.toString() || "0",
      icon: Phone,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Login Time",
      value: formatTime(agentStats?.login_time),
      icon: LogIn,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: "Available Time",
      value: formatTime(agentStats?.available_time),
      icon: Headphones,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
    },
    {
      label: "Total Break Time",
      value: formatTime(agentStats?.total_break_time),
      icon: Coffee,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
    {
      label: "Total Talk Time",
      value: formatTime(agentStats?.total_talktime),
      icon: Timer,
      color: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-100",
    },
  ];

  // Inbound call stats
  const inboundStats = [
    {
      label: "Total Inbound",
      value: agentStats?.inbound_calls || 0,
      icon: PhoneIncoming,
      color: "text-blue-500",
    },
    {
      label: "Answered",
      value: agentStats?.inbound_answered || 0,
      icon: CheckCircle2,
      color: "text-emerald-500",
    },
    {
      label: "Missed",
      value: agentStats?.inbound_missed || 0,
      icon: PhoneMissed,
      color: "text-rose-500",
    },
  ];

  // Outbound call stats
  const outboundStats = [
    {
      label: "Total Outbound",
      value: agentStats?.outbound_calls || 0,
      icon: PhoneOutgoing,
      color: "text-indigo-500",
    },
    {
      label: "Answered",
      value: agentStats?.outbound_answered || 0,
      icon: CheckCircle2,
      color: "text-emerald-500",
    },
    {
      label: "Unanswered",
      value: agentStats?.outbound_unanswered || 0,
      icon: PhoneOff,
      color: "text-orange-500",
    },
  ];

  // Call performance metrics
  const callPerformance = [
    {
      label: "Total Duration",
      value: formatTime(agentStats?.total_duration),
      icon: Timer,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      label: "Total Talk Time",
      value: formatTime(agentStats?.total_talktime),
      icon: Headphones,
      color: "text-violet-500",
      bg: "bg-violet-50",
    },
    {
      label: "Avg Duration",
      value: formatTime(agentStats?.avg_call_duration),
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
    },
    {
      label: "Avg Talk Time",
      value: formatTime(agentStats?.avg_talktime),
      icon: BarChart3,
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
    {
      label: "Voicemail",
      value: agentStats?.voicemail_count?.toString() || "0",
      icon: Voicemail,
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      label: "Idle Time",
      value: formatTime(agentStats?.idle_time),
      icon: Pause,
      color: "text-slate-500",
      bg: "bg-slate-100",
    },
  ];

  // Break details
  const breakDetails = [
    {
      label: "Break",
      value: formatTime(agentStats?.break_only_time),
      icon: Coffee,
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
    {
      label: "Lunch",
      value: formatTime(agentStats?.lunch_time),
      icon: UtensilsCrossed,
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
    {
      label: "Meeting",
      value: formatTime(agentStats?.meeting_time),
      icon: Presentation,
      color: "text-indigo-500",
      bg: "bg-indigo-50",
    },
    {
      label: "Query",
      value: formatTime(agentStats?.query_time),
      icon: HelpCircle,
      color: "text-cyan-500",
      bg: "bg-cyan-50",
    },
    {
      label: "Restroom",
      value: formatTime(agentStats?.restroom_time),
      icon: DoorOpen,
      color: "text-teal-500",
      bg: "bg-teal-50",
    },
    {
      label: "Not Ready",
      value: formatTime(agentStats?.notready_time),
      icon: Pause,
      color: "text-slate-500",
      bg: "bg-slate-100",
    },
  ];

  // Inbound answer rate
  const inboundTotal = agentStats?.inbound_calls || 0;
  const inboundAnswered = agentStats?.inbound_answered || 0;
  const answerRate =
    inboundTotal > 0 ? Math.round((inboundAnswered / inboundTotal) * 100) : 0;

  // Outbound answer rate
  const outboundTotal = agentStats?.outbound_calls || 0;
  const outboundAnswered = agentStats?.outbound_answered || 0;
  const outboundAnswerRate =
    outboundTotal > 0
      ? Math.round((outboundAnswered / outboundTotal) * 100)
      : 0;

  if (chatLoading) {
    return (
      <div className="flex flex-col w-full h-full bg-background overflow-hidden">
        <Navbar
          title="Dashboard"
          breadcrumbs={[{ label: "Dashboard", active: true }]}
        />
        <div className="flex items-center justify-center flex-1">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden select-none">
      <Navbar
        title="Dashboard"
        breadcrumbs={[{ label: "Dashboard", active: true }]}
      />

      <div className="w-full h-[calc(100%-90px)] overflow-y-auto overflow-x-hidden">
        <div className="p-6 flex flex-col gap-6">
          {/* ========== HERO KPI ROW ========== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {heroStats.map((stat, i) => {
              const IconComp = stat.icon;
              return (
                <div
                  key={i}
                  className={`bg-white border ${stat.border} rounded-xl p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-0.5`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}
                  >
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 truncate">
                      {stat.label}
                    </p>
                    <h3 className="text-xl font-bold text-slate-800 truncate">
                      {stat.value}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========== CALLS SECTION ========== */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Inbound Calls */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex flex-col">
                  <h4 className="text-sm font-bold text-slate-800 mb-0.5">
                    Inbound Calls
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Today's inbound call breakdown
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">
                    Answer Rate
                  </span>
                  <span
                    className={`text-sm font-bold ${answerRate >= 80 ? "text-emerald-600" : answerRate >= 50 ? "text-amber-600" : "text-rose-600"}`}
                  >
                    {answerRate}%
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-4">
                  {inboundStats.map((stat, i) => {
                    const IconComp = stat.icon;
                    return (
                      <div
                        key={i}
                        className="flex flex-col items-center text-center p-3 rounded-lg bg-slate-50/50 border border-slate-100"
                      >
                        <IconComp className={`w-5 h-5 mb-2 ${stat.color}`} />
                        <span className="text-2xl font-bold text-slate-800">
                          {stat.value}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 mt-1">
                          {stat.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    {inboundTotal > 0 && (
                      <>
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{
                            width: `${(inboundAnswered / inboundTotal) * 100}%`,
                          }}
                        />
                        <div
                          className="h-full bg-rose-400 transition-all duration-500"
                          style={{
                            width: `${((agentStats?.inbound_missed || 0) / inboundTotal) * 100}%`,
                          }}
                        />
                      </>
                    )}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{" "}
                      Answered
                    </span>
                    <span className="text-[10px] font-medium text-rose-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />{" "}
                      Missed
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Outbound Calls */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex flex-col">
                  <h4 className="text-sm font-bold text-slate-800 mb-0.5">
                    Outbound Calls
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Today's outbound call breakdown
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">
                    Connect Rate
                  </span>
                  <span
                    className={`text-sm font-bold ${outboundAnswerRate >= 80 ? "text-emerald-600" : outboundAnswerRate >= 50 ? "text-amber-600" : "text-rose-600"}`}
                  >
                    {outboundAnswerRate}%
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-4">
                  {outboundStats.map((stat, i) => {
                    const IconComp = stat.icon;
                    return (
                      <div
                        key={i}
                        className="flex flex-col items-center text-center p-3 rounded-lg bg-slate-50/50 border border-slate-100"
                      >
                        <IconComp className={`w-5 h-5 mb-2 ${stat.color}`} />
                        <span className="text-2xl font-bold text-slate-800">
                          {stat.value}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 mt-1">
                          {stat.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    {outboundTotal > 0 && (
                      <>
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{
                            width: `${(outboundAnswered / outboundTotal) * 100}%`,
                          }}
                        />
                        <div
                          className="h-full bg-orange-400 transition-all duration-500"
                          style={{
                            width: `${((agentStats?.outbound_unanswered || 0) / outboundTotal) * 100}%`,
                          }}
                        />
                      </>
                    )}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{" "}
                      Answered
                    </span>
                    <span className="text-[10px] font-medium text-orange-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />{" "}
                      Unanswered
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========== CALL PERFORMANCE ========== */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-sm font-bold text-slate-800 mb-0.5">
                Call Performance
              </h4>
              <span className="text-[11px] text-slate-500">
                Duration & talk time metrics for today
              </span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {callPerformance.map((stat, i) => {
                  const IconComp = stat.icon;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center text-center p-4 rounded-lg border border-slate-100 hover:shadow-sm transition-all"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${stat.bg} ${stat.color}`}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-lg font-bold text-slate-800">
                        {stat.value}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 mt-1">
                        {stat.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========== DONUT CHARTS + ACTIVITY ========== */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Call Distribution Donut */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h4 className="text-sm font-bold text-slate-800 mb-0.5">
                  Call Distribution
                </h4>
                <span className="text-[11px] text-slate-500">
                  Inbound & outbound breakdown
                </span>
              </div>
              <div className="p-5 flex items-center justify-center gap-6">
                <div className="relative">
                  <DonutChart
                    segments={(() => {
                      const total = inboundTotal + outboundTotal;
                      if (total === 0)
                        return [{ percent: 100, color: "#e2e8f0" }];
                      return [
                        {
                          percent: (inboundAnswered / total) * 100,
                          color: "#10b981",
                        },
                        {
                          percent:
                            ((agentStats?.inbound_missed || 0) / total) * 100,
                          color: "#f43f5e",
                        },
                        {
                          percent: (outboundAnswered / total) * 100,
                          color: "#6366f1",
                        },
                        {
                          percent:
                            ((agentStats?.outbound_unanswered || 0) / total) *
                            100,
                          color: "#f97316",
                        },
                      ].filter((s) => s.percent > 0);
                    })()}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-800">
                      {inboundTotal + outboundTotal}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Total
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    {
                      label: "Inbound Answered",
                      value: inboundAnswered,
                      color: "bg-emerald-500",
                    },
                    {
                      label: "Inbound Missed",
                      value: agentStats?.inbound_missed || 0,
                      color: "bg-rose-500",
                    },
                    {
                      label: "Outbound Answered",
                      value: outboundAnswered,
                      color: "bg-indigo-500",
                    },
                    {
                      label: "Outbound Failed",
                      value: agentStats?.outbound_unanswered || 0,
                      color: "bg-orange-500",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`}
                      />
                      <span className="text-[11px] text-slate-600">
                        {item.label}
                      </span>
                      <span className="text-[11px] font-bold text-slate-800 ml-auto">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Time Distribution Donut */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h4 className="text-sm font-bold text-slate-800 mb-0.5">
                  Time Distribution
                </h4>
                <span className="text-[11px] text-slate-500">
                  How your time was spent today
                </span>
              </div>
              <div className="p-5 flex items-center justify-center gap-6">
                <div className="relative">
                  <DonutChart
                    segments={(() => {
                      const login = agentStats?.login_time || 0;
                      const avail = agentStats?.available_time || 0;
                      const brk = agentStats?.total_break_time || 0;
                      const nr = agentStats?.notready_time || 0;
                      const total = login + avail + brk + nr;
                      if (total === 0)
                        return [{ percent: 100, color: "#e2e8f0" }];
                      return [
                        { percent: (login / total) * 100, color: "#3b82f6" },
                        { percent: (avail / total) * 100, color: "#8b5cf6" },
                        { percent: (brk / total) * 100, color: "#f59e0b" },
                        { percent: (nr / total) * 100, color: "#ef4444" },
                      ].filter((s) => s.percent > 0);
                    })()}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-slate-800">
                      {formatTime(
                        (agentStats?.login_time || 0) +
                          (agentStats?.available_time || 0) +
                          (agentStats?.total_break_time || 0) +
                          (agentStats?.notready_time || 0),
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Total
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    {
                      label: "On Duty",
                      value: formatTime(agentStats?.login_time),
                      color: "bg-blue-500",
                    },
                    {
                      label: "Available",
                      value: formatTime(agentStats?.available_time),
                      color: "bg-violet-500",
                    },
                    {
                      label: "Break",
                      value: formatTime(agentStats?.total_break_time),
                      color: "bg-amber-500",
                    },
                    {
                      label: "Not Ready",
                      value: formatTime(agentStats?.notready_time),
                      color: "bg-red-500",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`}
                      />
                      <span className="text-[11px] text-slate-600">
                        {item.label}
                      </span>
                      <span className="text-[11px] font-bold text-slate-800 ml-auto">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Break Details */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h4 className="text-sm font-bold text-slate-800 mb-0.5">
                  Break Details
                </h4>
                <span className="text-[11px] text-slate-500">
                  Individual break type durations
                </span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3">
                  {breakDetails.map((stat, i) => {
                    const IconComp = stat.icon;
                    return (
                      <div
                        key={i}
                        className={`flex flex-col items-center text-center p-3 rounded-lg border border-slate-100 ${stat.bg}/30`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${stat.bg} ${stat.color}`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span className="text-xl font-bold text-slate-800">
                          {stat.value}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 mt-0.5">
                          {stat.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
