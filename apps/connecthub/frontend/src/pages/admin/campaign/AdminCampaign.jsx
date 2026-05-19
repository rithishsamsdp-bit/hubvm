import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "../../../components/Index.jsx";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AdminCampaignList from "./AdminCampaignList.jsx";
import AdminLeadUpload from "./AdminLeadUpload.jsx";
import AdminFormBuilderList from "../../../formbuilder/AdminFormBuilderList.jsx";
import AdminPhoneNumberGroup from "./AdminPhoneNumberGroup.jsx";
import AdminMemberGroup from "./AdminMemberGroup.jsx";
import { useAuthStore } from "../../../store/useAuthStore.js";

const tabs = ["Campaign", "Form Builder", "Phone Number Group", "Member group", "Upload Leads"];

const getValidTab = (tabParam) => {
  return tabs.find((tab) => tab.toLowerCase() === tabParam?.toLowerCase()) || "Campaign";
};

const AdminCampaign = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const { authRole } = useAuthStore();

  const tabParam = params.get("tab");
  const initialTab = getValidTab(tabParam);
  const [activeTab, setActiveTab] = useState(initialTab);

  const [memberGroupModalOpen, setMemberGroupModalOpen] = useState(false);
  const [phoneNumberGroupModalOpen, setPhoneNumberMemberGroupModalOpen] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const path = authRole === "TL" ? "/tl-campaign" : "/admin-campaign";
    navigate(`${path}?tab=${encodeURIComponent(tab)}`);
  };

  useEffect(() => {
    const currentTab = params.get("tab");
    const matchedTab = getValidTab(currentTab);

    if (!currentTab || !tabs.includes(matchedTab)) {
      const path = authRole === "TL" ? "/tl-campaign" : "/admin-campaign";
      navigate(`${path}?tab=Campaign`, { replace: true });
    } else if (currentTab !== matchedTab) {
      const path = authRole === "TL" ? "/tl-campaign" : "/admin-campaign";
      navigate(`${path}?tab=${encodeURIComponent(matchedTab)}`, { replace: true });
    }

    setActiveTab(matchedTab);
  }, [location.search, authRole, navigate]);

  const handleCreateButtonClick = () => {
    if (activeTab === "Campaign") {
      navigate("/admin-create-campaign");
    } else if (activeTab === "Phone Number Group") {
      setPhoneNumberMemberGroupModalOpen(true);
    } else if (activeTab === "Member group") {
      setMemberGroupModalOpen(true);
    } else if (activeTab === "Form Builder") {
      navigate("/admin-campaign/admin-create-formbuilder");
    } else {
      console.log("Unknown tab action");
    }
  };

  const actionButtonText = useMemo(() => {
    switch (activeTab) {
      case "Campaign": return "Create Campaign";
      case "Phone Number Group": return "Create Phone Number Group";
      case "Member group": return "Create Member Group";
      case "Form Builder": return "Create Form Builder";
      default: return "Action";
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden">
      <Navbar
        title="Campaign"
        breadcrumbs={[
          {
            label: "Dashboard",
            route: authRole === "TL" ? "/tl-dashboard" : "/admin-dashboard",
          },
          {
            label: "Campaign",
            onClick: () => handleTabChange("Campaign")
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
        {authRole !== "TL" && activeTab !== "Upload Leads" && (
          <Button onClick={handleCreateButtonClick}>
            <Plus className="w-4 h-4 mr-2" />
            {actionButtonText}
          </Button>
        )}
      </Navbar>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 w-full p-6 overflow-y-auto overflow-x-hidden bg-slate-50">
        {activeTab === "Campaign" && <AdminCampaignList />}
        {activeTab === "Form Builder" && <AdminFormBuilderList />}
        {activeTab === "Phone Number Group" && (
          <AdminPhoneNumberGroup 
            externalModalOpen={phoneNumberGroupModalOpen}
            onExternalModalClose={() => setPhoneNumberMemberGroupModalOpen(false)} 
          />
        )}
        {activeTab === "Member group" && (
          <AdminMemberGroup 
            externalModalOpen={memberGroupModalOpen}
            onExternalModalClose={() => setMemberGroupModalOpen(false)} 
          />
        )}
        {activeTab === "Upload Leads" && <AdminLeadUpload />}
      </div>
    </div>
  );
};

export default AdminCampaign;
