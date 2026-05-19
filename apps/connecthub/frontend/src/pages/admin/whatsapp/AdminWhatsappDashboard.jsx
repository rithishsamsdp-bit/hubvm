import { useState, useEffect, useMemo } from "react";
import { useWhatsappStore } from "../../../store/admin/whatsapp/useWhatsappStore.js";
import { Select } from "@/components/ui/select";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import DonutChart from "../DonutChart.jsx";
import BarChart from "../BarChart.jsx";
import {
  Send,
  CheckCheck,
  BookOpen,
  XCircle,
  ArrowUpFromLine,
} from "lucide-react";

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ name, value, Icon, color, bg }) => (
  <div className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
      style={{ backgroundColor: bg }}
    >
      <Icon className="w-5 h-5" style={{ color }} />
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate">
        {name}
      </span>
      <span className="text-2xl font-bold text-slate-800 leading-tight">
        {value.toLocaleString()}
      </span>
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const AdminWhatsappDashboard = () => {
  const {
    campaigns,
    templates,
    getCampaigns,
    getTemplates,
    dashboardStats,
    getDashboardStats,
  } = useWhatsappStore();

  const [dateRange, setDateRange] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  });

  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const campaignOptions = (campaigns || []).map((c) => ({
    label: c.campaignName,
    value: c.campaignId,
  }));
  const templateOptions = (templates || []).map((t) => ({
    label: t.templateName,
    value: t.templateId,
  }));

  useEffect(() => {
    const formattedStart = dateRange?.start ? dateRange.start.toISOString() : null;
    const formattedEnd = dateRange?.end ? dateRange.end.toISOString() : null;
    getCampaigns(100, 0, "", null, null, formattedStart, formattedEnd);
    getTemplates(100, 0, "", null, null, formattedStart, formattedEnd);
    getDashboardStats(formattedStart, formattedEnd, selectedCampaign, selectedTemplate);
  }, [dateRange, selectedCampaign, selectedTemplate]);

  const stats = [
    {
      name: "Total Request",
      value: dashboardStats?.counts?.totalRequest || 0,
      Icon: ArrowUpFromLine,
      color: "#0EA5E9",
      bg: "#E0F2FE",
    },
    {
      name: "Total Sent",
      value: dashboardStats?.counts?.totalSent || 0,
      Icon: Send,
      color: "#F59E0B",
      bg: "#FEF3C7",
    },
    {
      name: "Total Delivered",
      value: dashboardStats?.counts?.totalDelivered || 0,
      Icon: CheckCheck,
      color: "#8B5CF6",
      bg: "#EDE9FE",
    },
    {
      name: "Total Read",
      value: dashboardStats?.counts?.totalRead || 0,
      Icon: BookOpen,
      color: "#25D366",
      bg: "#DCFCE7",
    },
    {
      name: "Total Failed",
      value: dashboardStats?.counts?.totalFailed || 0,
      Icon: XCircle,
      color: "#EF4444",
      bg: "#FEE2E2",
    },
  ];

  const donutData =
    dashboardStats?.donutData?.length > 0
      ? dashboardStats.donutData
      : [
          { name: "Sent", value: 0, color: "#F59E0B" },
          { name: "Read", value: 0, color: "#25D366" },
          { name: "Failed", value: 0, color: "#EF4444" },
        ];

  const totalDonutValue = donutData.reduce((acc, curr) => acc + curr.value, 0);

  const barData = useMemo(() => {
    if (!dashboardStats?.barData || !dateRange.start || !dateRange.end) return [];
    const filledData = [];
    const curr = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    while (curr <= end) {
      const dateStr = curr.toISOString().split("T")[0];
      const existing = dashboardStats.barData.find((d) => d.date === dateStr);
      const label = new Date(curr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
      filledData.push({
        label,
        date: dateStr,
        sent: existing ? existing.sent : 0,
        read: existing ? existing.read : 0,
      });
      curr.setDate(curr.getDate() + 1);
    }
    return filledData;
  }, [dashboardStats?.barData, dateRange]);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header: Title + Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          WhatsApp Overview
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <DateTimeRangePicker
            type="range"
            initialStart={dateRange.start}
            initialEnd={dateRange.end}
            onChange={({ start, end }) => setDateRange({ start, end })}
          />

          <div className="w-[200px]">
            <Select
              placeholder="Select Campaign"
              options={campaignOptions}
              value={selectedCampaign}
              onValueChange={(val) => setSelectedCampaign(val)}
              showSearch
              allowClear
              onClear={() => setSelectedCampaign("")}
            />
          </div>

          <div className="w-[200px]">
            <Select
              placeholder="Select Template"
              options={templateOptions}
              value={selectedTemplate}
              onValueChange={(val) => setSelectedTemplate(val)}
              showSearch
              allowClear
              onClear={() => setSelectedTemplate("")}
            />
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <DonutChart
            title="MESSAGE STATUS"
            value={totalDonutValue}
            label="Total"
            segments={donutData}
            showLegend
            showPercent
            showTooltip
            legendPosition="bottom"
          />
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <BarChart
            title="SENT VS READ TREND"
            subtitle="Last 7 Days"
            data={barData}
            height={250}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminWhatsappDashboard;
