import { useState, useEffect } from "react";
import { Navbar } from "../../components/Index.jsx";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import SuperAdminCallingPeer from "./SuperAdminCallingPeer.jsx";
import SuperAdminWhatsappPeer from "./SuperAdminWhatsappPeer.jsx";

const tabs = ["Peer", "Whatsapp Peer"];

// ✅ Fallback MUST be a valid tab from the list
const getValidTab = (tabParam) =>
  tabs.find((tab) => tab.toLowerCase() === tabParam?.toLowerCase()) || "Peer";

const SuperAdminPeer = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(() => {
    const p = new URLSearchParams(location.search);
    return getValidTab(p.get("tab"));
  });

  const [peerModalOpen, setPeerModalOpen] = useState(false);
  const [whatsapppeerModalOpen, setWhatsappPeerModalOpen] = useState(false);

  // Sync tab to URL on tab change
  const handleTabChange = (tab) => {
    const valid = getValidTab(tab);
    setActiveTab(valid);
    navigate(`/superadmin-peer?tab=${encodeURIComponent(valid)}`);
  };

  // ✅ Sync state with URL whenever the query string changes
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const currentTabParam = p.get("tab");
    const matchedTab = getValidTab(currentTabParam);

    // If URL had an invalid/mismatched casing, correct it once
    if (!currentTabParam || currentTabParam !== matchedTab) {
      navigate(`/superadmin-peer?tab=${encodeURIComponent(matchedTab)}`, {
        replace: true,
      });
    }

    setActiveTab(matchedTab);
  }, [location.search, navigate]);

  const handleCreateButtonClick = () => {
    if (activeTab === "Peer") setPeerModalOpen(true);
    else if (activeTab === "Whatsapp Peer") setWhatsappPeerModalOpen(true);
  };

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden">
      <Navbar
        title="Peer"
        breadcrumbs={[
          { label: "Onboard", route: "/superadmin-onboard" },
          { label: "Peer", onClick: () => handleTabChange("Peer") },
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
        <Button variant="default" onClick={handleCreateButtonClick}>
          {activeTab === "Peer"
            ? "Create Peer"
            : activeTab === "Whatsapp Peer"
              ? "Create Whatsapp Peer"
              : "Action"}
        </Button>
      </Navbar>

      <div className="w-full h-[calc(100%-131px)] p-6 overflow-y-auto overflow-x-hidden">
        {activeTab === "Peer" && (
          <SuperAdminCallingPeer
            externalModalOpen={peerModalOpen}
            onExternalModalClose={() => setPeerModalOpen(false)}
          />
        )}
        {activeTab === "Whatsapp Peer" && (
          <SuperAdminWhatsappPeer
            externalModalOpen={whatsapppeerModalOpen}
            onExternalModalClose={() => setWhatsappPeerModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default SuperAdminPeer;
