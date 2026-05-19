import React, { useEffect } from "react";
import "./styles/SuperAdminBilling.css";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../../../constants/Icon.jsx";
import Configuration from "./Configuration.jsx";
import Recharge from "./Recharge.jsx";
import Statement from "./Statement.jsx";
import History from "./History.jsx";
import BillingDashboard from "./BillingDashboard.jsx";
import { Button } from "../../../components/Index.jsx";
import { useBillingStore } from "../../../store/superadmin/useBillingStore";

const tabs = ["Dashboard", "Configuration", "Recharge", "Statement", "History"];

const SuperAdminBilling = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const activeTab = params.get("tab") || "Dashboard";

    useEffect(() => {
        if (!params.get("tab")) {
            navigate(`?tab=Dashboard`, { replace: true });
        }
    }, [navigate, params]);

    const handleTabChange = (tab) => {
        navigate(`?tab=${tab}`);
    };

    return (
        <div className="superadmin_billing">
            <div className="superadmin_billing_navbar_2">
                <div>
                    <p className="billing_navbar_2_heading">Billing Management</p>
                    <span className="superadmin_phonenumber_navbar_breadcrumb">
                        <span
                            className="superadmin_phonenumber-breadcrumb-item"
                            onClick={() => navigate("/superadmin-dashboard")}
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span
                            className="superadmin_phonenumber-breadcrumb-item"
                            onClick={() => {
                                navigate(`/superadmin-billing?tab=${encodeURIComponent("Dashboard")}`, {
                                    replace: true,
                                });
                            }}
                        >
                            Billing
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="superadmin_phonenumber-breadcrumb-item active">
                            {activeTab}
                        </span>
                    </span>

                    <div className="billing_navbar_2_tabs">
                        {tabs.map((tab) => (
                            <div
                                key={tab}
                                className={`billing_navbar_2_tab_item ${activeTab === tab ? "active" : ""}`}
                                onClick={() => handleTabChange(tab)}
                            >
                                {tab}
                            </div>
                        ))}
                    </div>
                </div>

                {(activeTab === "Statement" || activeTab === "History") && (
                    <div className="navbar_2_actions">
                        <Button
                            variant="primary"
                            onClick={() => useBillingStore.getState().exportRechargeHistory()}
                        >
                            Export
                        </Button>
                    </div>
                )}
            </div>

            <div className="superadmin_billing_content">
                {activeTab === "Dashboard" && <BillingDashboard />}
                {activeTab === "Configuration" && <Configuration />}
                {activeTab === "Recharge" && <Recharge />}
                {activeTab === "Statement" && <Statement />}
                {activeTab === "History" && <History />}
            </div>
        </div>
    );
};

export default SuperAdminBilling;
