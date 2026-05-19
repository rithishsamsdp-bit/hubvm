import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { Navbar } from "../../../components/Index.jsx";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import AdminWhatsappTemplate from "./AdminWhatsappTemplate.jsx";
import AdminWhatsappCampaign from "./AdminWhatsappCampaign.jsx";
import AdminWhatsappDashboard from "./AdminWhatsappDashboard.jsx";
import AdminWhatsappGroups from "./AdminWhatsappGroups.jsx";

const tabs = ["Dashboard", "Template", "Campaign", "Groups"];

const getValidTab = (tabParam) =>
  tabs.find((tab) => tab.toLowerCase() === tabParam?.toLowerCase()) || "Dashboard";

const AdminWhatsapp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const { authRole } = useAuthStore();

  const initialTab = getValidTab(params.get("tab"));
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const basePath = authRole === "TL" ? "/tl-whatsapp" : "/admin-whatsapp";

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`${basePath}?tab=${encodeURIComponent(tab)}`);
  };

  useEffect(() => {
    const currentTab = params.get("tab");
    const matchedTab = getValidTab(currentTab);

    if (!currentTab || !tabs.includes(matchedTab)) {
      navigate(`${basePath}?tab=Dashboard`, { replace: true });
    } else if (currentTab !== matchedTab) {
      navigate(`${basePath}?tab=${encodeURIComponent(matchedTab)}`, { replace: true });
    }

    setActiveTab(matchedTab);
  }, [location.search]);

  const handleCreateButtonClick = () => {
    if (activeTab === "Template") navigate("/admin-whatsapp/create-template");
    else if (activeTab === "Campaign") navigate("/admin-whatsapp/create-campaign");
    else if (activeTab === "Groups") setIsGroupModalOpen(true);
  };

  const createButtonLabel = {
    Template: "Create Template",
    Campaign: "Create Campaign",
    Groups: "Create Group",
  }[activeTab];

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden">
      <Navbar
        title="WhatsApp"
        breadcrumbs={[
          {
            label: "Dashboard",
            route: authRole === "TL" ? "/tl-dashboard" : "/admin-dashboard",
          },
          {
            label: "WhatsApp",
            onClick: () => {
              navigate(`${basePath}?tab=Dashboard`);
              setActiveTab("Dashboard");
            },
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
                    : "text-slate-500 hover:text-slate-700",
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
        {authRole !== "TL" && activeTab !== "Dashboard" && (
          <Button onClick={handleCreateButtonClick}>
            <Plus className="w-4 h-4 mr-2" />
            {createButtonLabel}
          </Button>
        )}
      </Navbar>

      {/* Tab Content */}
      <div
        className={cn(
          "flex-1 min-h-0 w-full p-6 bg-slate-50",
          ["Template", "Campaign", "Groups"].includes(activeTab)
            ? "overflow-hidden flex flex-col"
            : "overflow-y-auto overflow-x-hidden",
        )}
      >
        <div
          className={
            ["Template", "Campaign", "Groups"].includes(activeTab)
              ? "flex flex-col h-full"
              : "flex flex-col gap-4 w-full min-h-full"
          }
        >
          {activeTab === "Dashboard" && <AdminWhatsappDashboard />}
          {activeTab === "Template" && <AdminWhatsappTemplate />}
          {activeTab === "Campaign" && <AdminWhatsappCampaign />}
          {activeTab === "Groups" && (
            <AdminWhatsappGroups
              isModalOpen={isGroupModalOpen}
              onClose={() => setIsGroupModalOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminWhatsapp;
