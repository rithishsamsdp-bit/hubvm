import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "../../../components/Index.jsx";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuthStore } from "../../../store/useAuthStore.js";

import AdminPhoneNumberList from "./AdminPhoneNumberList.jsx";
import AdminQueue from "./AdminQueue.jsx";
import AdminCallFlowList from "./AdminCallFlowList.jsx";
import AdminVoiceMailList from ".././AdminVoiceMailList.jsx";
import AdminNumberBlocking from "./AdminNumberBlocking.jsx";
import AdminHoliday from "./AdminHoliday.jsx";

const tabs = ["Phone Number", "Queue", "Call Flow", "Holidays", "Number Blocking"];

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
    const path = authRole === "TL" ? "/tl-phonenumber" : "/admin-phonenumber";
    navigate(`${path}?tab=${encodeURIComponent(tab)}`);
  };

  useEffect(() => {
    const currentTab = params.get("tab");
    const matchedTab = getValidTab(currentTab);

    if (!currentTab || !tabs.includes(matchedTab)) {
      const path = authRole === "TL" ? "/tl-phonenumber" : "/admin-phonenumber";
      navigate(`${path}?tab=Phone%20Number`, { replace: true });
    } else if (currentTab !== matchedTab) {
      const path = authRole === "TL" ? "/tl-phonenumber" : "/admin-phonenumber";
      navigate(`${path}?tab=${encodeURIComponent(matchedTab)}`, { replace: true });
    }

    setActiveTab(matchedTab);
  }, [location.search, authRole, navigate]);

  const handleCreateButtonClick = () => {
    if (activeTab === "Phone Number") return;
    if (activeTab === "Queue") setQueueModalOpen(true);
    else if (activeTab === "Call Flow") setCallFlowModalOpen(true);
    else if (activeTab === "Voice Mail") navigate("/admin-create-voicemail");
    else if (activeTab === "Holidays") setHolidayModalOpen(true);
    else if (activeTab === "Number Blocking") setNumberBlockingModalOpen(true);
  };

  const actionButtonText = useMemo(() => {
    switch (activeTab) {
      case "Call Flow": return "Create Flow";
      case "Queue": return "Create Queue";
      case "Voice Mail": return "Create Voice Mail";
      case "Holidays": return "Add Holidays";
      case "Number Blocking": return "Block Number";
      default: return "Action";
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden">
      <Navbar
        title="Phone Number"
        breadcrumbs={[
          {
            label: "Dashboard",
            route: authRole === "TL" ? "/tl-dashboard" : "/admin-dashboard",
          },
          {
            label: "Phone Number",
            onClick: () => handleTabChange("Phone Number")
          },
          { label: activeTab, active: true },
        ]}
        bottomContent={
          <div className="flex gap-8 mt-1">
            {tabs.map((tab) => (
              <div
                key={tab}
                className={`cursor-pointer pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === tab
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => handleTabChange(tab)}
              >
                {tab}
              </div>
            ))}
          </div>
        }
      >
        {authRole !== "TL" && activeTab !== "Phone Number" && (
          <Button onClick={handleCreateButtonClick} variant="default">
            <Plus className="w-4 h-4 mr-2" />
            {actionButtonText}
          </Button>
        )}
      </Navbar>

      <div className="flex-1 overflow-hidden">
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
