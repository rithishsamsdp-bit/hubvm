import React, { useState } from 'react';
import { useEmergencyStore } from "../../../store/admin/useEmergencyStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Phone, CheckCircle2, Clock, XCircle, Search, Activity, Loader2 } from "lucide-react";
import Icon from "../../../constants/Icon.jsx";
import { cn } from "@/lib/utils";

const DonutChart = ({ data, total }) => {
    let cumulativePercent = 0;
    const radius = 35;
    const strokeWidth = 8;
    const center = 50;
    const circumference = 2 * Math.PI * radius;
    const safeTotal = total || 1;

    const combinedSuccess = data
        .filter(d => d.name.includes("Answered") || d.name.includes("Read") || d.name.includes("Delivered"))
        .reduce((sum, d) => sum + d.value, 0);

    return (
        <div className="relative flex justify-center items-center w-[120px] h-[120px]">
            <svg width="120" height="120" viewBox="0 0 100 100">
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke="rgba(0,0,0,0.05)"
                    strokeWidth={strokeWidth}
                />
                {data.map((segment, i) => {
                    const percent = (segment.value / safeTotal) * 100;
                    const gap = safeTotal > 0 ? 1.5 : 0;
                    const arcLength = (percent / 100) * circumference;
                    const dashArray = `${Math.max(0, arcLength - gap)} ${circumference}`;
                    const dashOffset = - (cumulativePercent / 100) * circumference;
                    cumulativePercent += percent;

                    return (
                        <circle
                            key={i}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="transparent"
                            stroke={segment.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                            transform={`rotate(-90 ${center} ${center})`}
                            strokeLinecap="round"
                            style={{
                                filter: `drop-shadow(0 0 4px ${segment.color}66)`,
                                transition: 'all 0.5s ease'
                            }}
                        />
                    );
                })}
                <text x="50" y="48" fill="#1e293b" textAnchor="middle" className="text-xl font-bold">
                    {total > 0 ? Math.round((combinedSuccess / total) * 100) : 0}%
                </text>
                <text x="50" y="62" fill="#64748b" textAnchor="middle" className="text-[10px] font-bold uppercase">
                    Success
                </text>
            </svg>
        </div>
    );
};

const AdminEmergencyDashboard = ({ dashboardStats }) => {
    const { 
        fetchResponseMembers, responseMembers, isFetchingResponseMembers,
        isLoadingKpis, isLoadingMissions, isLoadingCharts, isLoadingResponses
    } = useEmergencyStore();
    
    const [selectedResponse, setSelectedResponse] = useState(null);
    const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
    const [selectedResponseFilter, setSelectedResponseFilter] = useState("all");
    const [notRespondedSearch, setNotRespondedSearch] = useState("");
    const [failedSearch, setFailedSearch] = useState("");
    const [selectedCampaignId, setSelectedCampaignId] = useState("all");

    const {
        activeAlerts = 0,
        totalContacts = 0,
        successRate = 0,
        totalFallout = 0,
        totalReached = 0,
        totalResponded = 0,
        channelPulse = [],
        dispositionBreakdown = [],
        responseBreakdown = [],
        recentMissions = [],
        hourlyTrends = [],
        availableCampaigns = [],
        personnelStatusTable = {}
    } = dashboardStats || {};

    const handleCampaignFilterChange = (val) => {
        const id = (val === 'all' || val === '') ? null : val;
        setSelectedCampaignId(val);
        useEmergencyStore.getState().fetchDashboardData(id);
    };

    const filteredRespondedTable = (personnelStatusTable?.responded || []).filter(p => 
        selectedResponseFilter === "all" || p.response === selectedResponseFilter
    );

    const filteredNotRespondedTable = (personnelStatusTable?.notResponded || []).filter(p => 
        !notRespondedSearch || (p.name || '').toLowerCase().includes(notRespondedSearch.toLowerCase()) || (p.phone || '').includes(notRespondedSearch)
    );

    const filteredFailedTable = (personnelStatusTable?.failed || []).filter(p => 
        !failedSearch || (p.name || '').toLowerCase().includes(failedSearch.toLowerCase()) || (p.phone || '').includes(failedSearch)
    );

    const missionList = isLoadingMissions
        ? [1, 2, 3, 4, 5].map(i => ({ id: `sk-m-${i}`, isSkeleton: true, name: 'Loading...', status: 'Loading', startTime: '--:--' }))
        : (recentMissions && recentMissions.length > 0 ? recentMissions : []);

    const handleViewResponseMembers = async (respItem) => {
        setSelectedResponse(respItem);
        let filteredId = null;
        if (selectedCampaignId !== 'all' && selectedCampaignId !== '') {
            filteredId = parseInt(selectedCampaignId, 10);
            if (isNaN(filteredId)) filteredId = null;
        }

        const label = respItem.name ? String(respItem.name) : "";
        await fetchResponseMembers(label, filteredId);
        setIsResponseModalOpen(true);
    };

    return (
        <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto bg-slate-50/50 w-full">
            {/* DASHBOARD HEADER & FILTER */}
            <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm w-full">
                <div className="flex flex-col gap-1.5">
                    <h2 className="text-lg font-bold text-slate-800">Operational Overview</h2>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            LIVE
                        </span>
                        <span className="text-xs text-slate-500 font-medium">Last Sync: {new Date().toLocaleTimeString()}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-600">Scope:</span>
                    <Select value={selectedCampaignId} onValueChange={handleCampaignFilterChange} disabled={isLoadingKpis}>
                        <SelectTrigger className="w-[280px] bg-slate-50 border-slate-200 shadow-none font-medium">
                            <SelectValue placeholder="Select Campaign" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Overview: All Active Missions</SelectItem>
                            {(availableCampaigns || []).map(c => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* 1. Global Performance Metrics (Predictive Style Premium Cards) */}
            <div className="grid grid-cols-5 gap-4">
                {/* 1. Active Missions */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Megaphone className="w-16 h-16 text-[#ff5200]" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100">
                            <Megaphone className="w-5 h-5 text-[#ff5200]" />
                        </div>
                        <span className="text-sm font-semibold text-slate-600">Active Campaigns</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-black text-slate-800">{activeAlerts}</span>
                        <span className="text-xs font-medium text-slate-500 mt-1">Targeting all</span>
                    </div>
                </div>

                {/* 2. Total Audience */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Phone className="w-16 h-16 text-blue-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                            <Phone className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="text-sm font-semibold text-slate-600">Total Audience</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-black text-slate-800">{totalContacts.toLocaleString()}</span>
                        <span className="text-xs font-medium text-blue-600 mt-1">Across groups</span>
                    </div>
                </div>

                {/* 3. Responded Personnel */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <span className="text-sm font-semibold text-slate-600">Responded</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-black text-slate-800">{totalResponded.toLocaleString()}</span>
                        <span className="text-xs font-medium text-emerald-600 mt-1">
                            {totalContacts > 0 ? Math.round((totalResponded / totalContacts) * 100) : 0}% Engagement
                        </span>
                    </div>
                </div>

                {/* 4. Not Responded */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Clock className="w-16 h-16 text-amber-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100">
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <span className="text-sm font-semibold text-slate-600">No Response</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-black text-slate-800">
                            {Math.max(0, (totalContacts - totalFallout) - totalResponded).toLocaleString()}
                        </span>
                        <span className="text-xs font-medium text-amber-600 mt-1">Reached, no input</span>
                    </div>
                </div>

                {/* 5. Failed Delivery */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <XCircle className="w-16 h-16 text-red-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center border border-red-100">
                            <XCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <span className="text-sm font-semibold text-slate-600">Failed delivery</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-black text-slate-800">{totalFallout.toLocaleString()}</span>
                        <span className="text-xs font-medium text-red-600 mt-1">Unreachable</span>
                    </div>
                </div>
            </div>

            {/* 2. Personnel Status Breakdown Sections (Three Columns) */}
            <div className="grid grid-cols-3 gap-5">
                {/* A. RESPONDED BREAKDOWN */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <h3 className="text-sm font-bold text-slate-800">Response Breakdown</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={selectedResponseFilter} onValueChange={setSelectedResponseFilter}>
                                <SelectTrigger className="w-[140px] h-8 text-xs bg-white border-slate-200">
                                    <SelectValue placeholder="All Responses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Responses</SelectItem>
                                    {(responseBreakdown || [])
                                        .filter(r => !r.name.includes("Wrong Input"))
                                        .map(r => (
                                            <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-bold">
                                {filteredRespondedTable.length}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3 font-bold">Personnel Name</th>
                                    <th className="px-4 py-3 font-bold text-right">Response Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoadingResponses ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i}><td colSpan="2" className="px-4 py-3"><div className="h-10 bg-slate-100 rounded animate-pulse" /></td></tr>
                                    ))
                                ) : filteredRespondedTable.length > 0 ? (
                                    filteredRespondedTable.map((p, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-800">{p.name}</div>
                                                <div className="text-xs text-slate-500 font-medium">{p.phone}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="mb-1">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                        {p.response}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-medium flex items-center justify-end gap-1.5">
                                                    <span className={cn(
                                                        "px-1.5 py-0.5 rounded uppercase font-bold",
                                                        p.channel?.toLowerCase() === 'whatsapp' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                                                    )}>
                                                        {p.channel}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{p.time}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="2" className="px-4 py-8 text-center text-slate-500 text-sm">{selectedResponseFilter !== "all" ? `No responders for "${selectedResponseFilter}"` : "No responses"}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* B. NOT RESPONDED BREAKDOWN */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            <h3 className="text-sm font-bold text-slate-800">No Response</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input 
                                    type="text" 
                                    placeholder="Search..." 
                                    value={notRespondedSearch} 
                                    onChange={(e) => setNotRespondedSearch(e.target.value)} 
                                    className="h-8 pl-8 w-[140px] text-xs bg-white border-slate-200"
                                />
                            </div>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-bold">
                                {filteredNotRespondedTable.length}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-slate-500 uppercase font-bold bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3 font-bold">Personnel Name</th>
                                    <th className="px-4 py-3 font-bold text-right">Last Attempt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoadingResponses ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i}><td colSpan="2" className="px-4 py-3"><div className="h-10 bg-slate-100 rounded animate-pulse" /></td></tr>
                                    ))
                                ) : filteredNotRespondedTable.length > 0 ? (
                                    filteredNotRespondedTable.map((p, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-800">{p.name}</div>
                                                <div className="text-xs text-slate-500 font-medium">{p.phone}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="mb-1">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-600 uppercase">
                                                        Reached
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-medium flex items-center justify-end gap-1.5">
                                                    <span className={cn(
                                                        "px-1.5 py-0.5 rounded uppercase font-bold",
                                                        p.channel?.toLowerCase() === 'whatsapp' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                                                    )}>
                                                        {p.channel}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{p.time}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="2" className="px-4 py-8 text-center text-slate-500 text-sm">{notRespondedSearch ? `No matches for "${notRespondedSearch}"` : "All reached have responded"}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* C. FAILED BREAKDOWN */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                            <h3 className="text-sm font-bold text-slate-800">Failed delivery</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input 
                                    type="text" 
                                    placeholder="Search..." 
                                    value={failedSearch} 
                                    onChange={(e) => setFailedSearch(e.target.value)} 
                                    className="h-8 pl-8 w-[140px] text-xs bg-white border-slate-200"
                                />
                            </div>
                            <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100 font-bold">
                                {filteredFailedTable.length}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-slate-500 uppercase font-bold bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3 font-bold">Personnel Name</th>
                                    <th className="px-4 py-3 font-bold text-right">Failure Error</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredFailedTable.length > 0 ? (
                                    filteredFailedTable.map((p, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-800">{p.name}</div>
                                                <div className="text-xs text-slate-500 font-medium">{p.phone}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-[10px] font-bold text-red-500 uppercase">Unreachable / Timeout</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="2" className="px-4 py-8 text-center text-slate-500 text-sm">{failedSearch ? `No matches for "${failedSearch}"` : "No delivery failures"}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 2. MISSION RESPONSE PULSE (Redesigned) */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 mt-2">
                    <Activity className="w-5 h-5 text-[#ff5200]" />
                    <h3 className="text-lg font-bold text-slate-800">Campaign Response</h3>
                    <span className="ml-2 text-[10px] font-black text-[#ff5200] bg-orange-50 px-2 py-0.5 rounded border border-orange-200 tracking-wider">REAL-TIME TELEMETRY</span>
                </div>

                <div className="grid grid-cols-[1fr_2fr] gap-5">
                    {/* A. Global Engagement Overview */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
                        <div className="flex flex-col mb-6">
                            <span className="text-base font-bold text-slate-800">Engagement Overview</span>
                            <span className="text-xs font-medium text-slate-500">Total Audience vs Responded</span>
                        </div>
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative">
                                {isLoadingCharts ? (
                                    <div className="w-[140px] h-[140px] rounded-full bg-slate-100 animate-pulse" />
                                ) : (
                                    <svg width="140" height="140" viewBox="0 0 140 140">
                                        <circle cx="70" cy="70" r="60" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                                        <circle
                                            cx="70" cy="70" r="60"
                                            fill="transparent"
                                            stroke="#ff5200"
                                            strokeWidth="12"
                                            strokeDasharray={2 * Math.PI * 60}
                                            strokeDashoffset={(2 * Math.PI * 60) * (1 - (totalResponded / (totalContacts || 1)))}
                                            strokeLinecap="round"
                                            transform="rotate(-90 70 70)"
                                            style={{ transition: 'stroke-dashoffset 1s ease' }}
                                        />
                                        <text x="70" y="70" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-black fill-slate-800">
                                            {totalContacts > 0 ? Math.round((totalResponded / totalContacts) * 100) : 0}%
                                        </text>
                                        <text x="70" y="88" textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-bold tracking-widest fill-slate-400">
                                            RESPONSE
                                        </text>
                                    </svg>
                                )}
                            </div>
                            <div className="w-full flex flex-col gap-3">
                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50 border border-orange-100">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full bg-[#ff5200]" />
                                        <span className="text-xs font-bold text-slate-700">RESPONDED</span>
                                    </div>
                                    <span className="text-sm font-black text-slate-800">{totalResponded.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full bg-slate-500" />
                                        <span className="text-xs font-bold text-slate-700">NOT RESPONDED</span>
                                    </div>
                                    <span className="text-sm font-black text-slate-800">{Math.max(0, (totalContacts - totalFallout) - totalResponded).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full bg-slate-300" />
                                        <span className="text-xs font-bold text-slate-700">PENDING / FALLOUT</span>
                                    </div>
                                    <span className="text-sm font-black text-slate-800">{totalFallout.toLocaleString()}</span>
                                </div>
                                <div className="mt-2 pt-3 border-t border-slate-100 flex justify-between items-center px-1">
                                    <span className="text-xs font-semibold text-slate-500">Total Audience:</span>
                                    <span className="text-sm font-black text-slate-800">{totalContacts.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* B. Filtered Response Breakdown (List instead of Grid) */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
                        <div className="flex flex-col mb-5">
                            <span className="text-base font-bold text-slate-800">Campaign Response Breakdown</span>
                            <span className="text-xs font-medium text-slate-500">DTMF & WhatsApp Button Telemetry</span>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {isLoadingCharts ? (
                                <div className="flex flex-col gap-3">
                                    {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}
                                </div>
                            ) : responseBreakdown.length > 0 ? (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
                                        <tr>
                                            <th className="pb-3 pl-2">RESPONSE TYPE</th>
                                            <th className="pb-3 text-right">COUNT</th>
                                            <th className="pb-3 text-right">SHARE</th>
                                            <th className="pb-3 text-right pr-2">ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {responseBreakdown.map((resp, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-3 pl-2">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: resp.color }} />
                                                        <span className="font-bold text-slate-700">{resp.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-right font-black text-slate-800">
                                                    {resp.value.toLocaleString()}
                                                </td>
                                                <td className="py-3 text-right font-semibold text-slate-500">
                                                    {totalResponded > 0 ? Math.round((resp.value / totalResponded) * 100) : 0}%
                                                </td>
                                                <td className="py-3 text-right pr-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleViewResponseMembers(resp)} className="h-8 text-[10px] font-bold">
                                                        VIEW PERSONNEL
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 py-10">
                                    <CheckCircle2 className="w-10 h-10 opacity-20" />
                                    <p className="text-sm font-medium">Waiting for campaign-specific DTMF or WhatsApp button interactions...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-[1fr_2fr] gap-5">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col h-full">
                    <div className="flex flex-col mb-6">
                        <h3 className="text-base font-bold text-slate-800">Delivery Vector Distribution</h3>
                    </div>
                    {isLoadingCharts ? (
                        <div className="flex flex-col items-center gap-5">
                            <div className="w-[100px] h-[100px] rounded-full bg-slate-100 animate-pulse" />
                            <div className="w-full flex flex-col gap-3">
                                {Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="h-4 bg-slate-100 rounded w-full animate-pulse" />
                                ))}
                            </div>
                        </div>
                    ) : (() => {
                        const ringTotal = (dispositionBreakdown || []).reduce((acc, curr) => acc + curr.value, 0);
                        return (
                            <div className="flex flex-col gap-6 items-center flex-1 justify-center">
                                <DonutChart data={dispositionBreakdown || []} total={ringTotal} />
                                <div className="w-full flex flex-col gap-2.5">
                                    {(dispositionBreakdown || []).map(d => (
                                        <div key={d.name} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: d.color }} />
                                                <span className="text-xs font-bold text-slate-700">{d.name}</span>
                                            </div>
                                            <div className="text-xs font-black text-slate-800">
                                                {ringTotal > 0 ? ((d.value / ringTotal) * 100).toFixed(1) : '0.0'}%
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col h-full">
                    <div className="flex flex-col mb-5">
                        <h3 className="text-base font-bold text-slate-800">Campaign Deployment Timeline</h3>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
                                <tr>
                                    <th className="pb-3 pl-2">Target Campaign</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3 text-right">Audience</th>
                                    <th className="pb-3 text-right">Responded</th>
                                    <th className="pb-3 px-4">Progress</th>
                                    <th className="pb-3 text-right pr-2">T-Start</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(missionList || []).map((m, idx) => {
                                    const isSk = m.isSkeleton || isLoadingMissions;
                                    return (
                                        <tr key={m.id || `m-${idx}`} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 pl-2">
                                                {isSk ? <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /> : <span className="font-bold text-slate-800">{m.name}</span>}
                                            </td>
                                            <td className="py-3">
                                                {isSk ? <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" /> : 
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                    (m.status || '').toLowerCase() === 'running' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                                    (m.status || '').toLowerCase() === 'completed' ? "bg-slate-100 text-slate-600 border border-slate-200" :
                                                    "bg-orange-50 text-orange-600 border border-orange-100"
                                                )}>
                                                    {m.status}
                                                </span>}
                                            </td>
                                            <td className="py-3 text-right font-semibold text-slate-600">
                                                {isSk ? <div className="h-4 w-10 bg-slate-100 rounded animate-pulse ml-auto" /> : (m.totalAudience || 0).toLocaleString()}
                                            </td>
                                            <td className="py-3 text-right font-black text-emerald-600">
                                                {isSk ? <div className="h-4 w-10 bg-slate-100 rounded animate-pulse ml-auto" /> : (m.responded || 0).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                {isSk ? <div className="h-1.5 w-full bg-slate-100 rounded-full animate-pulse" /> : 
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                    <div className="bg-[#ff5200] h-1.5 rounded-full" style={{ width: `${m.progress || 0}%` }} />
                                                </div>}
                                            </td>
                                            <td className="py-3 text-right pr-2 text-[11px] font-medium text-slate-500">
                                                {isSk ? '--:--' : m.startTime}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* RESPONSE MEMBERS MODAL */}
            <Dialog open={isResponseModalOpen} onOpenChange={setIsResponseModalOpen}>
                <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden gap-0 bg-white">
                    <DialogHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: selectedResponse?.color || '#3b82f6' }}>
                                    <Megaphone className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-left">
                                    <DialogTitle className="text-xl font-black text-slate-800">
                                        Replying: "{selectedResponse?.name}"
                                    </DialogTitle>
                                    <p className="text-sm font-medium text-slate-500 mt-0.5">
                                        Total Responders: <span className="font-bold text-slate-700">{selectedResponse?.value} Personnel</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-0">
                        {isFetchingResponseMembers ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                                <Loader2 className="w-8 h-8 animate-spin text-[#ff5200]" />
                                <span className="text-sm font-medium">Retrieving personnel records...</span>
                            </div>
                        ) : responseMembers.length > 0 ? (
                            <div className="max-h-[450px] overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-[11px] text-slate-500 uppercase font-bold bg-slate-50 sticky top-0 border-b border-slate-100 z-10">
                                        <tr>
                                            <th className="px-5 py-3">#</th>
                                            <th className="px-5 py-3">Personnel Phone</th>
                                            <th className="px-5 py-3">Channel</th>
                                            <th className="px-5 py-3">Campaign ID</th>
                                            <th className="px-5 py-3">Campaign Name</th>
                                            <th className="px-5 py-3 text-right">Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {responseMembers.map((member, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-3 font-medium text-slate-500">{idx + 1}</td>
                                                <td className="px-5 py-3 font-bold text-slate-800">{member.phone}</td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {member.channel === 'WhatsApp' ? 
                                                            <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                                                                <Icon name="whatsapp" size={12} color="#25D366" />
                                                            </div> : 
                                                            <div className="w-5 h-5 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100">
                                                                <Icon name="campaign" size={12} color="#ff5200" />
                                                            </div>
                                                        }
                                                        <span className="font-semibold text-slate-700">{member.channel}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 font-medium text-slate-500">CAM-{member.campaignId}</td>
                                                <td className="px-5 py-3 font-bold text-slate-700">{member.campaignName || '---'}</td>
                                                <td className="px-5 py-3 font-medium text-slate-500 text-right">{new Date(member.time).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                                <XCircle className="w-10 h-10 opacity-20" />
                                <span className="text-sm font-medium">No personnel found for this response.</span>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminEmergencyDashboard;
