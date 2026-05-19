import React, { useState, useEffect, useMemo } from "react";
import "./styles/AdminWhatsappDashboard.css";
import Icon from "../../../constants/Icon.jsx";
import { useWhatsappStore } from "../../../store/admin/whatsapp/useWhatsappStore.js";
import { useNow } from "../../../utils/time.js";
import Select from "../../../components/Select.jsx";
import DateTimeRangePicker from "../../../components/DateTimeRangePicker.jsx";
import DonutChart from "../DonutChart.jsx";
import BarChart from "../BarChart.jsx";

const AdminWhatsappDashboard = () => {
    const {
        campaigns,
        templates,
        getCampaigns,
        getTemplates,
        dashboardStats,
        getDashboardStats
    } = useWhatsappStore();

    // Default: Today
    const [dateRange, setDateRange] = useState(() => {
        const start = new Date();
        start.setDate(start.getDate() - 6); // Last 7 days including today
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return { start, end };
    });
    const [selectedCampaign, setSelectedCampaign] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState("");

    const campaignOptions = (campaigns || []).map(c => ({ label: c.campaignName, value: c.campaignId }));
    const templateOptions = (templates || []).map(t => ({ label: t.templateName, value: t.templateId }));

    const now = useNow(1000);

    useEffect(() => {
        const formattedStart = dateRange?.start ? dateRange.start.toISOString() : null;
        const formattedEnd = dateRange?.end ? dateRange.end.toISOString() : null;

        getCampaigns(100, 0, "", null, null, formattedStart, formattedEnd);
        getTemplates(100, 0, "", null, null, formattedStart, formattedEnd);

        // Fetch Dashboard Stats
        getDashboardStats(formattedStart, formattedEnd, selectedCampaign, selectedTemplate);
    }, [dateRange, selectedCampaign, selectedTemplate]);


    const stats = [
        { name: "Total Request", value: dashboardStats?.counts?.totalRequest || 0, icon: "outgoing", color: "#0EA5E9" },
        { name: "Total Sent", value: dashboardStats?.counts?.totalSent || 0, icon: "sent", color: "#F59E0B" },
        { name: "Total Delivered", value: dashboardStats?.counts?.totalDelivered || 0, icon: "delivered", color: "#8B5CF6" }, // Purple
        { name: "Total Read", value: dashboardStats?.counts?.totalRead || 0, icon: "delivered", color: "#25D366" },
        { name: "Total Failed", value: dashboardStats?.counts?.totalFailed || 0, icon: "failed", color: "#EF4444" },
    ];

    const donutData = dashboardStats?.donutData?.length > 0 ? dashboardStats.donutData : [
        { name: "Sent", value: 0, color: "#F59E0B" },
        { name: "Read", value: 0, color: "#25D366" },
        { name: "Failed", value: 0, color: "#EF4444" },
    ];

    // Calculate total for Donut label
    const totalDonutValue = donutData.reduce((acc, curr) => acc + curr.value, 0);

    const barData = useMemo(() => {
        if (!dashboardStats?.barData || !dateRange.start || !dateRange.end) return [];
        
        const filledData = [];
        const curr = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        
        // Loop through each day in the range
        while (curr <= end) {
            const dateStr = curr.toISOString().split("T")[0];
            const existing = dashboardStats.barData.find(d => d.date === dateStr);
            
            const dt = new Date(curr);
            const label = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); // "15 Apr"

            filledData.push({
                label: label,
                date: dateStr,
                sent: existing ? existing.sent : 0,
                read: existing ? existing.read : 0
            });
            
            curr.setDate(curr.getDate() + 1);
        }
        return filledData;
    }, [dashboardStats?.barData, dateRange]);

    return (
        <div className="admin_wa_dash_container">
            <div className="admin_wa_dash_header">
                <div className="admin_wa_dash_title_group">
                    <div className="admin_wa_dash_title">WHATSAPP OVERVIEW</div>
                    <div className="admin_wa_balance_widget">
                        <div className="balance_icon_circle">
                            <Icon name="account_balance_wallet" size={20} color="#fff" />
                        </div>
                        {/* <div className="balance_info">
                            <span className="balance_label">Available Credits</span>
                            <span className="balance_amount">₹ 1,250.00</span>
                        </div> */}
                    </div>
                </div>

                <div className="admin_wa_dash_filters">
                    <div className="admin_wa_filter_item">
                        <DateTimeRangePicker
                            type="range"
                            initialStart={dateRange.start}
                            initialEnd={dateRange.end}
                            onChange={({ start, end }) => setDateRange({ start, end })}
                        />
                    </div>
                    <div className="admin_wa_filter_item">
                        <Select
                            placeholder="Select Campaign"
                            options={campaignOptions}
                            value={selectedCampaign}
                            onChange={(val) => setSelectedCampaign(val)}
                            width="200px"
                            showSearch={true}
                        />
                    </div>
                    <div className="admin_wa_filter_item">
                        <Select
                            placeholder="Select Template"
                            options={templateOptions}
                            value={selectedTemplate}
                            onChange={(val) => setSelectedTemplate(val)}
                            width="200px"
                            showSearch={true}
                        />
                    </div>
                </div>
            </div>

            {/* Detailed Message Stats Row */}
            <div className="admin_wa_dash_cards_row">
                {stats.map((stat, index) => (
                    <div className="admin_wa_dash_card" key={`msg-${index}`}>
                        <div className="wa_dash_icon_box">
                            <Icon name={stat.icon} size={20} color={stat.color} />
                        </div>
                        <div className="wa_dash_card_details">
                            <div className="wa_dash_card_name">{stat.name}</div>
                            <div className="wa_dash_card_value">{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="admin_wa_dash_charts_row">
                <div className="admin_wa_chart_card">
                    <DonutChart
                        title="MESSAGE STATUS"
                        value={totalDonutValue}
                        label="Total"
                        segments={donutData}
                        showLegend={true}
                        showPercent={true}
                        showTooltip={true}
                        legendPosition="bottom"
                    />
                </div>
                <div className="admin_wa_chart_card" style={{ flex: 2 }}>
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
