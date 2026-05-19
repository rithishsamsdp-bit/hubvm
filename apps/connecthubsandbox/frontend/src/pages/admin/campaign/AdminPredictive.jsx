import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../../../constants/Icon.jsx";
import { Button } from "../../../components/Index.jsx";
import AdminPredictiveDashboard from "./AdminPredictiveDashboard.jsx";
import AdminPredictiveCampaignCards from "./AdminPredictiveCampaignCards.jsx";
import AdminCampaignReport from "./AdminCampaignReport.jsx";
import { useCampaignStore } from "../../../store/admin/useCampaignStore.js";
import "./styles/AdminCampaign.css"; // Reuse general campaign layout styles

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
        startCampaign,
        stopCampaign,
    } = useCampaignStore();

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
        <div className="admin_phonenumber">
            {/* Top Bar */}
            <div className="navbar_2">
                <div>
                    <p className="navbar_2_heading">Predictive Dialer</p>
                    <span className="navbar_2_breadcrumb">
                        <span className="navbar_2_breadcrumb_item"
                            onClick={() => navigate("/admin-dashboard")}
                        >Dashboard</span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span
                            className="navbar_2_breadcrumb_item"
                            onClick={() => {
                                navigate(`/admin-predictive?tab=Dashboard`);
                                setActiveTab("Dashboard");
                            }}
                        >
                            Predictive Dialer
                        </span>

                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_2_breadcrumb_item active">{activeTab}</span>
                    </span>

                    {/* Tabs */}
                    <div className="navbar_2_tabs">
                        {tabs.map((tab) => (
                            <div
                                key={tab}
                                className={`navbar_2_tab_item ${activeTab === tab ? "active" : ""}`}
                                onClick={() => handleTabChange(tab)}
                            >
                                {tab}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <Button type="primary" onClick={handleCreateButtonClick}>
                        Create Campaign
                    </Button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="admin_phonenumber_tab_content">
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
                            await startCampaign(id);
                            getCampaignData(50, 0, "", "", "");
                        }}
                        handleStop={async (id) => {
                            await stopCampaign(id);
                            getCampaignData(50, 0, "", "", "");
                        }}
                        handleCreateButtonClick={handleCreateButtonClick}
                    />
                )}
                {activeTab === "Report" && <AdminCampaignReport />}
            </div>
        </div>
    );
};

export default AdminPredictive;
