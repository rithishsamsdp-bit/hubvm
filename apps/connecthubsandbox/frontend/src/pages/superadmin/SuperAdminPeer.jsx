import { useState, useEffect } from "react";
import "./styles/SuperAdminPeer.css";
import { Button } from "../../components/Index.jsx";
import Icon from "../../constants/Icon.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import SuperAdminCallingPeer from "./SuperAdminCallingPeer.jsx";
import SuperAdminWhatsappPeer from "./SuperAdminWhatsappPeer.jsx";
// import { useAuthStore } from "../../store/useAuthStore.js"; // only if you need authRole

const tabs = ["Peer", "Whatsapp Peer"];

// ✅ Fallback MUST be a valid tab from the list
const getValidTab = (tabParam) =>
  tabs.find((tab) => tab.toLowerCase() === tabParam?.toLowerCase()) || "Peer";

const SuperAdminPeer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // const { authRole } = useAuthStore(); // only if you need role routing

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
      navigate(`/superadmin-peer?tab=${encodeURIComponent(matchedTab)}`, { replace: true });
    }

    setActiveTab(matchedTab);
  }, [location.search, navigate]);

  const handleCreateButtonClick = () => {
    if (activeTab === "Peer") setPeerModalOpen(true);
    else if (activeTab === "Whatsapp Peer") setWhatsappPeerModalOpen(true);
  };

  return (
    <div className="superadmin_peer">
      <div className="navbar_2">
        <div>
          <p className="navbar_2_heading">Peer</p>
          <span className="navbar_2_breadcrumb">
            <span
              className="navbar_2_breadcrumb_item"
              onClick={() => navigate("/superadmin-dashboard")}
            >
              Dashboard
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span
              className="navbar_2_breadcrumb_item"
              onClick={() => handleTabChange("Peer")}
            >
              Peer
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

        <div>
          <Button variant="primary" onClick={handleCreateButtonClick}>
            {activeTab === "Peer"
              ? "Create Peer"
              : activeTab === "Whatsapp Peer"
                ? "Create Whatsapp Peer"
                : "Action"}
          </Button>
        </div>
      </div>

      <div className="superadmin_peer_tab_content">
        {activeTab === "Peer" && (
          <SuperAdminCallingPeer
            externalModalOpen={peerModalOpen}
            onExternalModalClose={() => setPeerModalOpen(false)}
          />
        )}
        {activeTab === "Whatsapp Peer" && (
          // Re-enable your component when ready:
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
