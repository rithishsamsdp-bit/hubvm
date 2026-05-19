import React, { useState, useEffect } from "react";
import "./styles/AdminWhatsapp.css";
import { Button } from "../../../components/Index.jsx";
import Icon from "../../../constants/Icon.jsx";
import { useNavigate, useLocation } from "react-router-dom";

import { useAuthStore } from "../../../store/useAuthStore.js";
import AdminWhatsappTemplate from "./AdminWhatsappTemplate.jsx";
import AdminWhatsappCampaign from "./AdminWhatsappCampaign.jsx";
import AdminWhatsappDashboard from "./AdminWhatsappDashboard.jsx";
import AdminWhatsappGroups from "./AdminWhatsappGroups.jsx";

const tabs = ["Dashboard", "Template", "Campaign", "Groups"];

const getValidTab = (tabParam) => {
    return tabs.find((tab) => tab.toLowerCase() === tabParam?.toLowerCase()) || "Dashboard";
};

const AdminWhatsapp = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const { authRole } = useAuthStore();

    const tabParam = params.get("tab");
    const initialTab = getValidTab(tabParam);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (authRole === "TL") {
            navigate(`/tl-whatsapp?tab=${encodeURIComponent(tab)}`);
        } else if (authRole === "ADMIN") {
            navigate(`/admin-whatsapp?tab=${encodeURIComponent(tab)}`);
        }
    };

    useEffect(() => {
        const currentTab = params.get("tab");
        const matchedTab = getValidTab(currentTab);

        if (!currentTab || !tabs.includes(matchedTab)) {
            if (authRole === "TL") {
                navigate(`/tl-whatsapp?tab=Dashboard`, { replace: true });
            } else if (authRole === "ADMIN") {
                navigate(`/admin-whatsapp?tab=Dashboard`, { replace: true });
            }
        } else if (currentTab !== matchedTab) {
            // Correct casing in URL
            if (authRole === "TL") {
                navigate(`/tl-whatsapp?tab=${encodeURIComponent(matchedTab)}`, { replace: true });
            } else if (authRole === "ADMIN") {
                navigate(`/admin-whatsapp?tab=${encodeURIComponent(matchedTab)}`, { replace: true });
            }
        }

        setActiveTab(matchedTab);
    }, [location.search]);

    const handleCreateButtonClick = () => {
        if (activeTab === "Template") {
            navigate('/admin-whatsapp/create-template');
        } else if (activeTab === "Campaign") {
            navigate('/admin-whatsapp/create-campaign');
        } else if (activeTab === "Groups") {
            setIsGroupModalOpen(true);
        }

    };

    return (
        <div className="admin_whatsapp_template">
            {/* Top Bar */}
            <div className="navbar_2">
                <div>
                    <p className="navbar_2_heading">Whatsapp</p>
                    <span className="navbar_2_breadcrumb">
                        <span
                            className="navbar_2_breadcrumb_item"
                            onClick={() => {
                                if (authRole === "TL") {
                                    navigate("/tl-dashboard")
                                }
                                else if (authRole === "ADMIN") {
                                    navigate("/admin-dashboard")
                                };
                            }}
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span
                            className="navbar_2_breadcrumb_item"
                            onClick={() => {
                                if (authRole === "TL") {
                                    navigate(`/tl-whatsapp?tab=Dashboard`, { replace: true })
                                }
                                else if (authRole === "ADMIN") {
                                    navigate(`/admin-whatsapp?tab=Dashboard`, { replace: true });

                                }
                                setActiveTab("Dashboard");
                            }}
                        >
                            Whatsapp
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
                {authRole === "TL" ? null : (
                    <div className="admin_whatsapp_template_navbar_button_container">
                        {activeTab !== "Dashboard" && (
                            <Button type="primary" onClick={handleCreateButtonClick}>
                                {activeTab === "Template"
                                    ? "Create Template"
                                    : activeTab === "Campaign"
                                        ? "Create Campaign"
                                        : activeTab === "Groups"
                                            ? "Create Group"
                                            : "Action"}
                            </Button>
                        )}
                    </div>
                )}

            </div>

            {/* Tab Content */}
            <div className="admin_whatsapp_template_tab_content">
                {activeTab === "Dashboard" && <AdminWhatsappDashboard />}
                {activeTab === "Template" && <AdminWhatsappTemplate />}
                {activeTab === "Campaign" && <AdminWhatsappCampaign />}
                {activeTab === "Groups" && <AdminWhatsappGroups isModalOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} />}


            </div>
        </div>
    );
};

export default AdminWhatsapp;
