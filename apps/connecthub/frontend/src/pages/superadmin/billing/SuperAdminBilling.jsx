import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Configuration from "./Configuration.jsx";
import Recharge from "./Recharge.jsx";
import Statement from "./Statement.jsx";
import History from "./History.jsx";
import BillingDashboard from "./BillingDashboard.jsx";
import { Navbar } from "../../../components/Index.jsx";
import { Button } from "@/components/ui/button";
import { useBillingStore } from "../../../store/superadmin/useBillingStore";
import { Download } from "lucide-react";

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
    <div className="flex flex-col w-full h-full overflow-hidden bg-slate-50/30">
      <Navbar
        title="Billing Management"
        breadcrumbs={[
          { label: "Onboard", route: "/superadmin-onboard" },
          {
            label: "Billing",
            onClick: () =>
              navigate(
                `/superadmin-billing?tab=${encodeURIComponent("Dashboard")}`,
                { replace: true },
              ),
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
        {(activeTab === "Statement" || activeTab === "History") && (
          <Button
            variant="default"
            size="sm"
            className="h-9 px-4 rounded-xl text-xs font-bold"
            onClick={() => useBillingStore.getState().exportRechargeHistory()}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        )}
      </Navbar>

      <div className={`flex-1 p-6 ${activeTab === "Recharge" ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}>
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
