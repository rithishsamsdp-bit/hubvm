import React, { useEffect, useMemo } from "react";
import { useBillingStore } from "../../../store/superadmin/useBillingStore";
import { Loader } from "../../../components/Index.jsx";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
    Users,
    Settings,
    Wallet,
    CreditCard,
    TrendingUp,
    IndianRupee,
    Calendar,
    BarChart3,
    CheckCircle2,
    Plus,
    User,
    AlertTriangle
} from "lucide-react";

const BillingDashboard = () => {
    const {
        billingDashboard, fetchBillingDashboard, isBillingDashboardLoading,
        rechargedCustomers, fetchRechargedCustomers, isRechargedCustomersLoading
    } = useBillingStore();
    const navigate = useNavigate();

    useEffect(() => {
        fetchBillingDashboard();
        fetchRechargedCustomers({ limit: 10000 });
    }, []);

    const todayStats = billingDashboard?.today_stats || {};
    const dailyTrend = billingDashboard?.daily_recharge_trend || {};
    const recentActivity = billingDashboard?.recent_activity || [];

    // Build stat cards from API data
    const stats = useMemo(() => [
        {
            label: "Total Customers",
            value: todayStats.total_customer ?? 0,
            icon: Users,
            gradient: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)"
        },
        {
            label: "Billing Enabled",
            value: todayStats.billing_enabled ?? 0,
            icon: Settings,
            gradient: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)"
        },
        {
            label: "Available Balance",
            value: `₹${(todayStats.available_balance ?? 0).toLocaleString("en-IN")}`,
            icon: Wallet,
            gradient: "linear-gradient(135deg, #10b981 0%, #34d399 100%)"
        },
        {
            label: "Recharge Today",
            value: `₹${(todayStats.recharge_today ?? 0).toLocaleString("en-IN")}`,
            icon: CreditCard,
            gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
        },
        {
            label: "Monthly Recharge",
            value: `₹${(todayStats.monthly_recharge ?? 0).toLocaleString("en-IN")}`,
            icon: TrendingUp,
            gradient: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)"
        }
    ], [todayStats]);

    // Build chart data from API
    const trendData = useMemo(() => {
        const dates = dailyTrend.dates || {};
        return Object.entries(dates).map(([date, amount]) => {
            const d = new Date(date);
            const dayLabel = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
            return { date, dayLabel, amount: Number(amount) };
        });
    }, [dailyTrend]);

    const maxTrend = useMemo(() => {
        if (trendData.length === 0) return 1;
        return Math.max(...trendData.map(t => t.amount));
    }, [trendData]);

    const yAxisMarkers = useMemo(() => {
        return [
            maxTrend,
            Math.round(maxTrend * 0.75),
            Math.round(maxTrend * 0.5),
            Math.round(maxTrend * 0.25),
            0
        ];
    }, [maxTrend]);

    // Top 10 customers by balance (from rechargedCustomers API)
    const topCustomers = useMemo(() => {
        const sorted = [...rechargedCustomers]
            .sort((a, b) => parseFloat(b.b_credit_balance || 0) - parseFloat(a.b_credit_balance || 0))
            .slice(0, 10);
        const maxBalance = sorted.length > 0 ? parseFloat(sorted[0].b_credit_balance || 0) : 0;
        return sorted.map(c => ({
            ...c,
            relativeBalance: maxBalance > 0 ? (parseFloat(c.b_credit_balance || 0) / maxBalance) * 100 : 0
        }));
    }, [rechargedCustomers]);

    // Low balance customers (from rechargedCustomers API)
    const lowBalanceCustomers = useMemo(() => {
        return rechargedCustomers
            .filter(c => parseFloat(c.b_credit_balance || 0) < 5000)
            .sort((a, b) => parseFloat(a.b_credit_balance || 0) - parseFloat(b.b_credit_balance || 0))
            .slice(0, 5);
    }, [rechargedCustomers]);

    if (isBillingDashboardLoading) {
        return (
            <div className="flex flex-col gap-5 min-h-[400px] items-center justify-center animate-fade-in">
                <Loader />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {stats.map((stat, i) => {
                    const IconComp = stat.icon;
                    return (
                        <div key={i} className="bg-white p-3 rounded-2xl flex items-center gap-3 shadow-sm border border-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: stat.gradient }}
                            >
                                <IconComp size={20} color="#fff" strokeWidth={2.2} />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm text-slate-500 font-medium truncate">{stat.label}</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1 truncate">{stat.value}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Middle Grid: Chart + Recent Activity */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5">
                {/* Daily Recharge Trends */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h4 className="text-lg font-bold text-slate-900 m-0">
                                <BarChart3 size={18} className="inline mr-2 align-text-bottom text-indigo-500" />
                                Daily Recharge Trends
                            </h4>
                            <span className="text-[13px] text-slate-500">Recharge amounts by date</span>
                        </div>
                        <div className="flex gap-5">
                            <div className="text-right">
                                <span className="block text-[11px] text-slate-400 uppercase tracking-wide font-semibold">Total GST</span>
                                <span className="text-[15px] font-bold text-slate-800">₹{(dailyTrend.total_gst ?? 0).toLocaleString("en-IN")}</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-[11px] text-slate-400 uppercase tracking-wide font-semibold">Total TDS</span>
                                <span className="text-[15px] font-bold text-slate-800">₹{(dailyTrend.total_tds ?? 0).toLocaleString("en-IN")}</span>
                            </div>
                        </div>
                    </div>

                    {trendData.length > 0 ? (
                        <div className="h-[240px] flex items-end pt-5 gap-4 relative">
                            {/* Y-Axis */}
                            <div className="flex flex-col justify-between h-full pb-6 w-9 text-right">
                                {yAxisMarkers.map((val, i) => (
                                    <span key={i} className="text-[11px] font-semibold text-slate-400">
                                        {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                                    </span>
                                ))}
                            </div>
                            {/* Bars */}
                            <div className="flex-1 h-full flex justify-around items-end relative z-[1]">
                                {trendData.map((t, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2.5 flex-1 h-full">
                                        <div className="w-7 flex-1 bg-slate-50 rounded-md relative flex items-end">
                                            <div
                                                className="w-full rounded-md relative cursor-pointer transition-all duration-500 hover:brightness-110 group"
                                                style={{
                                                    height: `${(t.amount / maxTrend) * 100}%`,
                                                    background: "linear-gradient(to top, #6366f1, #818cf8)"
                                                }}
                                            >
                                                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                                                    ₹{t.amount.toLocaleString("en-IN")}
                                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-slate-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-semibold text-slate-400">{t.dayLabel}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[200px] text-slate-500 gap-3">
                            <Calendar size={36} strokeWidth={1.5} className="opacity-30" />
                            <p className="text-sm font-medium">No recharge data available</p>
                        </div>
                    )}
                </div>

                {/* Low Balance Alerts */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                        <h4 className="text-lg font-bold text-slate-900 m-0">
                            <AlertTriangle size={18} className="inline mr-2 align-text-bottom text-red-500" />
                            Low Balance Alerts
                        </h4>
                        <span className="text-[13px] text-slate-500">Accounts below ₹5,000 threshold</span>
                    </div>
                    <div className="flex flex-col gap-3 p-4 max-h-[300px] overflow-y-auto">
                        {lowBalanceCustomers.length > 0 ? (
                            lowBalanceCustomers.map((customer, index) => (
                                <div key={index} className="flex justify-between items-center p-3 bg-red-50/30 border border-red-100 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_0_4px_#fee2e2]"></div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 m-0">{customer.b_billingAccountName}</p>
                                            <span className="text-[11px] text-slate-400">ID: {customer.b_billingAccountId}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-bold text-red-500">
                                            ₹{parseFloat(customer.b_credit_balance || 0).toLocaleString("en-IN")}
                                        </span>
                                        <Button
                                            size="sm"
                                            className="text-xs"
                                            onClick={() => navigate(`/superadmin-billing?tab=Recharge&customer=${customer.b_billingAccountId}`)}
                                        >
                                            Recharge
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[200px] text-slate-500 gap-3">
                                <CheckCircle2 size={36} strokeWidth={1.5} className="text-emerald-500" />
                                <p className="text-sm font-medium text-slate-600">All accounts healthy</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Grid: Top Customers + Recent Activity */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* Top 10 Customers by Balance */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                        <h4 className="text-lg font-bold text-slate-900 m-0">Top 10 Customers by Balance</h4>
                        <span className="text-[13px] text-slate-500">Highest credit accounts</span>
                    </div>
                    <div className="flex flex-col gap-0 max-h-[350px] overflow-y-auto">
                        {isRechargedCustomersLoading ? (
                            <div className="flex flex-col items-center justify-center h-[200px] text-slate-400 gap-3">
                                <Loader />
                                <p className="text-sm">Loading customers...</p>
                            </div>
                        ) : topCustomers.length > 0 ? (
                            topCustomers.map((customer, index) => (
                                <div key={index} className="flex justify-between items-center px-4 py-3 border-b border-slate-100 last:border-b-0 transition-all duration-200 hover:bg-slate-50 hover:pl-5 group">
                                    <div className="flex items-center gap-4">
                                        <span className={`text-[13px] font-extrabold w-6 text-center ${
                                            index === 0 ? "text-amber-500" :
                                            index === 1 ? "text-slate-500" :
                                            index === 2 ? "text-amber-700" :
                                            "text-slate-400"
                                        }`}>
                                            {index + 1}
                                        </span>
                                        <div className="flex flex-col">
                                            <p className="text-sm font-semibold text-slate-800 m-0">{customer.b_billingAccountName}</p>
                                            <span className="text-[11px] text-slate-400">ID: {customer.b_billingAccountId}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-5">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[15px] font-bold text-slate-900 tabular-nums">
                                                ₹{parseFloat(customer.b_credit_balance || 0).toLocaleString("en-IN")}
                                            </span>
                                            <div className="w-[60px] h-1 bg-slate-100 rounded-sm overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-sm transition-all duration-1000" style={{ width: `${customer.relativeBalance}%` }}></div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="w-7 h-7 rounded-md opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 p-0 min-w-0"
                                            onClick={() => navigate(`/superadmin-billing?tab=Recharge&customer=${customer.b_billingAccountId}`)}
                                        >
                                            <Plus size={14} />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[200px] text-slate-400 gap-3">
                                <User size={36} strokeWidth={1.5} className="opacity-20" />
                                <p className="text-sm font-medium">No customer data available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h4 className="text-lg font-bold text-slate-900 m-0">
                                <TrendingUp size={18} className="inline mr-2 align-text-bottom text-emerald-500" />
                                Recent Activity
                            </h4>
                            <span className="text-[13px] text-slate-500">Latest recharges</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-5">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((item, index) => (
                                <div key={index} className="flex gap-4 relative">
                                    {index !== recentActivity.length - 1 && (
                                        <div className="absolute left-[14px] top-[30px] bottom-[-20px] w-[2px] bg-slate-100"></div>
                                    )}
                                    <div className="w-[30px] h-[30px] bg-sky-50 text-sky-500 rounded-full flex items-center justify-center shrink-0 z-[1]">
                                        <IndianRupee size={14} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-600 m-0">
                                            <strong className="text-slate-900">{item.customer_name}</strong> recharged with{" "}
                                            <span className="text-emerald-500 font-semibold">₹{(item.amount ?? 0).toLocaleString("en-IN")}</span>
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[200px] text-slate-500 gap-3">
                                <IndianRupee size={36} strokeWidth={1.5} className="opacity-30" />
                                <p className="text-sm font-medium">No recent activity</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillingDashboard;