import { useState } from "react";
import "./styles/CRM_integration.css";
import { useNavigate } from "react-router-dom";
import Icon from "../../../constants/Icon.jsx";
import {
    Button,
} from "../../../components/Index.jsx";
import { useAuthStore } from "../../../store/useAuthStore.js";

const CRM_integration = () => {
    const navigate = useNavigate();
    const { authRole } = useAuthStore();

    const crmCards = [
        { name: "Zoho CRM", icon: "zoho", iconSize: 55 },
        { name: "Salesforce", icon: "salesforce", iconSize: 60 },
        { name: "Leadsquared", icon: "leadsquared", iconSize: 70 },
        { name: "Freshworks", icon: "freshworks", iconSize: 60 },
    ];

    const handleConnect = (index) => {
        console.log(`Connecting to CRM at index ${index}`);
        // Add your connection logic here
    };

    return (
        <div className="crm_integration_page">
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">CRM Integration</p>
                    <span className="navbar_1_breadcrumb">
                        <span
                            className="navbar_1_breadcrumb_item"
                            onClick={() => {
                                if (authRole === "TL") {
                                    navigate("/tl-dashboard");
                                } else if (authRole === "ADMIN") {
                                    navigate("/admin-dashboard");
                                }
                            }}
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span
                            className="navbar_1_breadcrumb_item"
                            onClick={() => navigate("/admin/integration")}
                        >
                            Integration
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item active">
                            CRM integration
                        </span>
                    </span>
                </div>
            </div>

            <div className="crm_integration_container">
                <div className="crm_integration_header">
                    <p>Connect your CRM systems to streamline your workflow</p>
                </div>

                <div className="crm_cards_grid">
                    {crmCards.map((crm, index) => (
                        <div
                            key={index}
                            className="crm_card"
                        >
                              <Icon
                                    name={crm.icon}
                                    size={crm.iconSize}
                                    color="#ff5200"
                                />
                            <p className="crm_card_name">{crm.name}</p>
                            <Button variant="secondary" onClick={() => handleConnect(index)}>Connect</Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CRM_integration;
