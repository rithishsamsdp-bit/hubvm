import { useState, useEffect, useRef } from "react";
import "./styles/AdminUsers.css";
import { Button } from "../../../components/Index.jsx";
import Icon from "../../../constants/Icon.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import AdminUsersList from "./AdminUsersList.jsx";
import AdminTlMapping from "./AdminTlMapping.jsx";
import { useAuthStore } from "../../../store/useAuthStore.js";

const tabs = ["Users", "Tl mapping"];

const getValidTab = (tabParam) => {
    return tabs.find((tab) => tab.toLowerCase() === tabParam?.toLowerCase()) || "Users";
};

const AdminUsers = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const { authRole } = useAuthStore();
    const tabParam = params.get("tab");
    const initialTab = getValidTab(tabParam);
    const [activeTab, setActiveTab] = useState(initialTab);



    const [batchModalOpen, setbatchModalOpen] = useState(false);

    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    const exportRef = useRef(null);
    const handleExport = () => {
        if (exportRef.current) {
            exportRef.current();
        } else {
            console.warn("Export function not ready yet");
        }
    };

    const handleClickOutside = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
            setOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleTabChange = (tab) => {
        console.log(tab)
        setActiveTab(tab);
        if (authRole === "TL") {
            navigate(`/tl-users?tab=${encodeURIComponent(tab)}`);
        } else if (authRole === "ADMIN") {
            navigate(`/admin-users?tab=${encodeURIComponent(tab)}`);
        }
    };

    useEffect(() => {
        const currentTab = params.get("tab");
        const matchedTab = getValidTab(currentTab);

        if (!currentTab || !tabs.includes(matchedTab)) {
            if (authRole === "TL") {
                navigate(`/tl-users?tab=Users`, { replace: true });
            } else if (authRole === "ADMIN") {
                navigate(`/admin-users?tab=Users`, { replace: true });
            }
        } else if (currentTab !== matchedTab) {
            // Correct casing in URL
            if (authRole === "TL") {
                navigate(`/tl-users?tab=${encodeURIComponent(matchedTab)}`, { replace: true });
            } else if (authRole === "ADMIN") {
                navigate(`/admin-users?tab=${encodeURIComponent(matchedTab)}`, { replace: true });
            }
        }

        setActiveTab(matchedTab);
    }, [location.search]);

    const handleCreateButtonClick = () => {
        if (activeTab === "Phone Number") setbatchModalOpen(true);
        else console.log("Unknown tab action");
    };

    return (
        <div className="admin_users">
            {/* Top Bar */}
            <div className="navbar_2">
                <div>
                    <p className="navbar_2_heading">Users</p>
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
                                    navigate(`/tl-users?tab=Users`, { replace: true })
                                }
                                else if (authRole === "ADMIN") {
                                    navigate(`/admin-users?tab=Users`, { replace: true });

                                }
                                setActiveTab("Users");
                            }}
                        >
                            Users
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
                    <div>
                        {!["Users", "Tl mapping"].includes(activeTab) && (

                            <Button type="primary" onClick={handleCreateButtonClick}>
                                {activeTab === "Tl mapping"
                                    ? "Create Mapping"
                                    : "Action"
                                }
                            </Button>
                        )}
                        {
                            activeTab == "Users" && (
                                <div className="navbar_1_button_container">
                                    <div className="admin_users_dropdown" ref={dropdownRef}>
                                        <Button variant="secondary" onClick={() => setOpen(!open)} >
                                            Add Agent ▾
                                        </Button>
                                        {open && (
                                            <div className="admin_users_dropdown_menu">
                                                <div
                                                    className="admin_users_dropdown_item"
                                                    onClick={() => setbatchModalOpen(true)}
                                                >
                                                    File Upload
                                                </div>
                                                <div
                                                    className="admin_users_dropdown_item"
                                                    onClick={() => {
                                                        setOpen(false);
                                                        navigate("/admin-users/admin-user-creation?role=USER");
                                                    }}
                                                >
                                                    Entry Upload
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="secondary"
                                        onClick={() => navigate("/admin-users/admin-user-creation?role=ADMIN")}
                                    >
                                        Add Admin
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => navigate("/admin-users/admin-user-creation?role=TL")}
                                    >
                                        Add TL
                                    </Button>
                                    <Button onClick={handleExport}>Export</Button>
                                </div>

                            )
                        }
                    </div>
                )}
            </div>

            {/* Tab Content */}
            <div className="admin_users_tab_content">
                {activeTab === "Users" && <AdminUsersList externalModalOpen={batchModalOpen} onExternalModalClose={() => setbatchModalOpen(false)}
                    exportRef={exportRef}
                />}
                {activeTab === "Tl mapping" && (

                    <AdminTlMapping />
                )}

            </div>
        </div>
    );
};

export default AdminUsers;
