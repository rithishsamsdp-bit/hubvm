import React, { useState, useEffect } from "react";
import "./styles/AdminPhoneNumber.css";
import { Button } from "../../../components/Index.jsx";
import Icon from "../../../constants/Icon.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import AdminPhoneNumberList from "./AdminPhoneNumberList.jsx";
import AdminQueue from "./AdminQueue.jsx";
import AdminCallFlowList from "./AdminCallFlowList.jsx";
import AdminVoiceMailList from ".././AdminVoiceMailList.jsx";
import AdminNumberBlocking from "./AdminNumberBlocking.jsx";
import { useAuthStore } from "../../../store/useAuthStore.js";
import AdminHoliday from "./AdminHoliday.jsx";

const tabs = ["Phone Number", "Queue", "Call Flow", "Holidays", "Number Blocking"];
// , "Holidays", "Number Blocking"
const getValidTab = (tabParam) => {
  return tabs.find((tab) => tab.toLowerCase() === tabParam?.toLowerCase()) || "Phone Number";
};

const AdminPhoneNumber = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const { authRole } = useAuthStore();

  const tabParam = params.get("tab");
  const initialTab = getValidTab(tabParam);
  const [activeTab, setActiveTab] = useState(initialTab);

  const [callFlowModalOpen, setCallFlowModalOpen] = useState(false);
  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [numberBlockingModalOpen, setNumberBlockingModalOpen] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (authRole === "TL") {
      navigate(`/tl-phonenumber?tab=${encodeURIComponent(tab)}`);
    } else if (authRole === "ADMIN") {
      navigate(`/admin-phonenumber?tab=${encodeURIComponent(tab)}`);
    }
  };

  useEffect(() => {
    const currentTab = params.get("tab");
    const matchedTab = getValidTab(currentTab);

    if (!currentTab || !tabs.includes(matchedTab)) {
      if (authRole === "TL") {
        navigate(`/tl-phonenumber?tab=Phone%20Number`, { replace: true });
      } else if (authRole === "ADMIN") {
        navigate(`/admin-phonenumber?tab=Phone%20Number`, { replace: true });
      }
    } else if (currentTab !== matchedTab) {
      // Correct casing in URL
      if (authRole === "TL") {
        navigate(`/tl-phonenumber?tab=${encodeURIComponent(matchedTab)}`, { replace: true });
      } else if (authRole === "ADMIN") {
        navigate(`/admin-phonenumber?tab=${encodeURIComponent(matchedTab)}`, { replace: true });
      }
    }

    setActiveTab(matchedTab);
  }, [location.search]);

  const handleCreateButtonClick = () => {
    if (activeTab === "Phone Number") return;
    if (activeTab === "Queue") setQueueModalOpen(true);
    else if (activeTab === "Call Flow") setCallFlowModalOpen(true);
    else if (activeTab === "Voice Mail") navigate("/admin-create-voicemail");
    else if (activeTab === "Holidays") setHolidayModalOpen(true);
    else if (activeTab === "Number Blocking") setNumberBlockingModalOpen(true);
    else console.log("Unknown tab action");
  };

  return (
    <div className="admin_phonenumber">
      {/* Top Bar */}
      <div className="navbar_2">
        <div>
          <p className="navbar_2_heading">Phone Number</p>
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
                  navigate(`/tl-phonenumber?tab=Phone%20Number`, { replace: true })
                }
                else if (authRole === "ADMIN") {
                  navigate(`/admin-phonenumber?tab=Phone%20Number`, { replace: true });

                }
                setActiveTab("Phone Number");
              }}
            >
              Phone Number
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
            {activeTab !== "Phone Number" && (
              <Button type="primary" onClick={handleCreateButtonClick}>
                {activeTab === "Call Flow"
                  ? "Create Flow"
                  : activeTab === "Queue"
                    ? "Create Queue"
                    : activeTab === "Voice Mail"
                      ? "Create Voice Mail"
                      : activeTab === "Holidays"
                        ? "Add Holidays"
                        : activeTab === "Number Blocking"
                          ? "Block Number"
                          : "Action"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="admin_phonenumber_tab_content">
        {activeTab === "Phone Number" && <AdminPhoneNumberList />}
        {activeTab === "Queue" && (
          <AdminQueue
            externalModalOpen={queueModalOpen}
            onExternalModalClose={() => setQueueModalOpen(false)}
          />
        )}
        {activeTab === "Call Flow" && (
          <AdminCallFlowList
            externalModalOpen={callFlowModalOpen}
            onExternalModalClose={() => setCallFlowModalOpen(false)}
          />
        )}
        {activeTab === "Voice Mail" && <AdminVoiceMailList />}
        {activeTab === "Holidays" && (
          <AdminHoliday
            externalModalOpen={holidayModalOpen}
            onExternalModalClose={() => setHolidayModalOpen(false)}
          />
        )}
        {activeTab === "Number Blocking" && (
          <AdminNumberBlocking
            externalModalOpen={numberBlockingModalOpen}
            onExternalModalClose={() => setNumberBlockingModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPhoneNumber;
