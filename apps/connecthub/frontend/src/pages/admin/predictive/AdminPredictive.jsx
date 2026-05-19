import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "../../../components/Index.jsx";
import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminPredictiveDashboard from "./AdminPredictiveDashboard.jsx";
import AdminPredictiveCampaignCards from "./AdminPredictiveCampaignCards.jsx";
import AdminPredictiveReport from "./AdminPredictiveReport.jsx";
import { useCampaignStore } from "../../../store/admin/useCampaignStore.js";
import { usePredictiveStore } from "../../../store/admin/predictive/usePredictiveStore.js";

const tabs = ["Dashboard", "Campaigns", "Report"];

const AdminPredictive = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);

    const {
        getCampaignData,
        CampaignTabelLoading,
        CampaignData,
        deleteCampaign,
    } = useCampaignStore();

    const {
        startPredictiveCampaign,
        stopPredictiveCampaign,
        exportPredictiveReport,
        reportFilters
    } = usePredictiveStore();

    const initialTab = params.get("tab") && tabs.includes(params.get("tab"))
        ? params.get("tab")
        : "Dashboard";

    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        getCampaignData(50, 0, "", "", "");
    }, []);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        navigate(`/admin-predictive?tab=${encodeURIComponent(tab)}`);
    };

    const handleCreateButtonClick = () => {
        navigate("/admin-create-campaign");
    };

    return (
        <div className="flex flex-col w-full h-full bg-background overflow-hidden">
            <Navbar
                title="Predictive Dialer"
                breadcrumbs={[
                    { label: "Dashboard", route: "/admin-dashboard" },
                    { 
                        label: "Predictive Dialer", 
                        onClick: () => {
                            navigate(`/admin-predictive?tab=Dashboard`);
                            setActiveTab("Dashboard");
                        } 
                    },
                    { label: activeTab, active: true },
                ]}
                bottomContent={
                    <div className="flex gap-6">
                        {tabs.map((tab) => (
                            <div
                                key={tab}
                                className={cn(
                                    "pb-3 text-sm font-semibold cursor-pointer relative",
                                    activeTab === tab
                                        ? "text-primary"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                                onClick={() => handleTabChange(tab)}
                            >
                                {tab}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full" />
                                )}
                            </div>
                        ))}
                    </div>
                }
            >
                {activeTab === "Report" ? (
                    <Button onClick={() => {
                        const formatDateStr = (date, isEndDate = false) => {
                            if (!date) return null;
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, "0");
                            const day = String(date.getDate()).padStart(2, "0");
                            const time = isEndDate ? "23:59:59" : "00:00:00";
                            return `${year}-${month}-${day} ${time}`;
                        };
                        exportPredictiveReport(
                            50, 
                            0, 
                            "c_callDateTime", 
                            "DESC", 
                            reportFilters.searchString, 
                            formatDateStr(reportFilters.startDate), 
                            formatDateStr(reportFilters.endDate, true),
                            reportFilters.disposition
                        );
                    }}>
                        <Download className="w-4 h-4 mr-2" /> Export CSV
                    </Button>
                ) : activeTab === "Campaigns" ? (
                    <Button onClick={handleCreateButtonClick}>
                        <Plus className="w-4 h-4 mr-2" /> Create Campaign
                    </Button>
                ) : null}
            </Navbar>

            {/* Tab Content */}
            <div className={`flex-1 min-h-0 w-full p-6 bg-slate-50 ${
                activeTab === "Report"
                    ? "overflow-hidden flex flex-col"
                    : "overflow-y-auto overflow-x-hidden"
            }`}>
                <div className={activeTab === "Report" ? "flex flex-col h-full" : "flex flex-col gap-4 w-full min-h-full"}>
                    {activeTab === "Report" && <AdminPredictiveReport />}
                    {activeTab === "Dashboard" && <AdminPredictiveDashboard />}
                    {activeTab === "Campaigns" && (
                        <AdminPredictiveCampaignCards
                            campaigns={CampaignData}
                            isLoading={CampaignTabelLoading}
                            handleEdit={(id) => navigate(`/admin-edit-campaign?editId=${id}`)}
                            handleDelete={async (id) => {
                                await deleteCampaign(id);
                                getCampaignData(50, 0, "", "", "");
                            }}
                            handleStart={async (id) => {
                                await startPredictiveCampaign(id);
                                getCampaignData(50, 0, "", "", "");
                            }}
                            handleStop={async (id) => {
                                await stopPredictiveCampaign(id);
                                getCampaignData(50, 0, "", "", "");
                            }}
                            handleCreateButtonClick={handleCreateButtonClick}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPredictive;
