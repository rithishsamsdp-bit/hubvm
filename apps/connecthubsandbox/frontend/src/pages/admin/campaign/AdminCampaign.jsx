import { useState, useEffect } from "react";
import "./styles/AdminCampaign.css";
import { Button } from "../../../components/Index.jsx";
import Icon from "../../../constants/Icon.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import AdminCampaignList from "./AdminCampaignList.jsx";
import AdminLeadUpload from "./AdminLeadUpload.jsx";
import AdminFormBuilderList from "../../../formbuilder/AdminFormBuilderList.jsx";
import AdminPhoneNumberGroup from "./AdminPhoneNumberGroup.jsx";
import AdminMemberGroup from "./AdminMemberGroup.jsx";
import { useAuthStore } from "../../../store/useAuthStore.js";

const tabs = ["Campaign", "Form Builder", "Phone Number Group", "Member group", "Upload Leads"];

const AdminCampaign = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const { authRole } = useAuthStore();

    const initialTab = params.get("tab") && tabs.includes(params.get("tab"))
        ? params.get("tab")
        : "Campaign";

    const [activeTab, setActiveTab] = useState(initialTab);
    const [memberGroupModalOpen, setMemberGroupModalOpen] = useState(false);
    const [phoneNumberGroupModalOpen, setPhoneNumberMemberGroupModalOpen] = useState(false);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (authRole === "TL") {
            navigate(`/tl-campaign?tab=${encodeURIComponent(tab)}`);
        } else if (authRole === "ADMIN") {
            navigate(`/admin-campaign?tab=${encodeURIComponent(tab)}`);
        }
    };

    useEffect(() => {
        const currentTab = params.get("tab");
        if (!currentTab || !tabs.includes(currentTab)) {
            if (authRole === "TL") {
                navigate(`/tl-campaign?tab=${encodeURIComponent("Campaign")}`, {
                    replace: true,
                });
            } else if (authRole === "ADMIN") {
                navigate(`/admin-campaign?tab=${encodeURIComponent("Campaign")}`, {
                    replace: true,
                });
            }
        } else {
            setActiveTab(currentTab);
        }
    }, []);

    const handleCreateButtonClick = () => {
        if (activeTab === "Campaign") {
            navigate("/admin-create-campaign");
        }
        else if (activeTab === "Phone Number Group") {
            setPhoneNumberMemberGroupModalOpen(true);
        }
        else if (activeTab === "Member group") {
            setMemberGroupModalOpen(true);
        }
        else if (activeTab === "Form Builder") {
            navigate("/admin-campaign/admin-create-formbuilder");
        }
        else {
            console.log("Unknown tab action");
        }
    };


    return (
        <div className="admin_phonenumber">
            {/* Top Bar */}
            <div className="navbar_2">
                <div>
                    <p className="navbar_2_heading">Campaign</p>
                    <span className="navbar_2_breadcrumb">
                        <span className="navbar_2_breadcrumb_item"
                            onClick={() => {
                                if (authRole === "TL") {
                                    navigate("/tl-dashboard")
                                } else if (authRole === "ADMIN") {
                                    navigate("/admin-dashboard")
                                }
                            }
                            }
                        >Dashboard</span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span
                            className="navbar_2_breadcrumb_item"
                            onClick={() => {

                                if (authRole === "TL") {
                                    navigate(`/tl-campaign?tab=${encodeURIComponent("Campaign")}`, {
                                        replace: true,
                                    });
                                } else if (authRole === "ADMIN") {
                                    navigate(`/admin-campaign?tab=${encodeURIComponent("Campaign")}`, {
                                        replace: true,
                                    });
                                }
                                setActiveTab("Campaign");
                            }}
                        >
                            Campaign
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

                {authRole !== "TL" && activeTab !== "Upload Leads" && (
                    <div>
                        <Button type="primary" onClick={handleCreateButtonClick}>
                            {activeTab === "Campaign" ? "Create Campaign"
                                : activeTab === "Phone Number Group" ? "Create Phone Number Group"
                                    : activeTab === "Member group" ? "Create Member Group"
                                        : activeTab === "Form Builder" ? "Create Form Builder"
                                            : "Action"}
                        </Button>
                    </div>
                )}


            </div>

            {/* Tab Content */}
            <div className="admin_phonenumber_tab_content">
                {activeTab === "Campaign" && <AdminCampaignList />}
                {activeTab === "Form Builder" && <AdminFormBuilderList />}
                {activeTab === "Phone Number Group" && <AdminPhoneNumberGroup externalModalOpen={phoneNumberGroupModalOpen}
                    onExternalModalClose={() => setPhoneNumberMemberGroupModalOpen(false)} />}
                {activeTab === "Member group" && <AdminMemberGroup externalModalOpen={memberGroupModalOpen}
                    onExternalModalClose={() => setMemberGroupModalOpen(false)} />}
                {activeTab === "Upload Leads" && <AdminLeadUpload />}
            </div>


        </div>
    );
};

export default AdminCampaign;
