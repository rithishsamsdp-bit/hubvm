import { useState, useMemo } from "react";
import "./styles/Integration.css";
import { useNavigate } from "react-router-dom";
import Icon from "../../constants/Icon.jsx";
import { useAuthStore } from "../../store/useAuthStore.js";

const Integration = () => {
    const [hoveredItem, setHoveredItem] = useState(null);
    const navigate = useNavigate();
    const { authRole } = useAuthStore();

    const handleMouseEnter = (index) => {
        setHoveredItem(index);
    };

    const handleMouseLeave = () => {
        setHoveredItem(null);
    };

    const handleClick = (path) => {
        navigate(path);
        console.log("Navigate to:", path);
    };

    const renderItem = (text, index, path) => (
        <div
            className="integration_sites_items_container"
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(path)}
            key={index}
        >
            <p className="integration_sites_items_text">{text}</p>
            <Icon name="rightarrow" size={8} color={
                hoveredItem === index
                    ? "#ff5200"
                    : "#334155"
            } />
        </div>
    );

    const integrationItems = useMemo(
        () =>
            [
                { text: "API integration", path: "/admin/integration/API_integration" },
                { text: "CRM integration", path: "/admin/integration/crm" },
                { text: "SSO", path: "/admin/integration/sso" },
            ].map((item, index) => renderItem(item.text, index, item.path)),
        [hoveredItem]
    );

    return (
        <div className="integration_page">
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">Integration</p>
                    <span className="navbar_1_breadcrumb">
                        <span
                            className="navbar_1_breadcrumb_item"
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
                        <span className="navbar_1_breadcrumb_item active">
                            Integration
                        </span>
                    </span>
                </div>
            </div>

            <div className="integration_container">
                <div className="integration_sites_container_1">
                    <div className="integration_sites_header_container">
                        <p className="integration_sites_header">Integrations</p>
                    </div>
                    <div className="integration_sites_container_1_body_container">
                        {integrationItems}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Integration;
