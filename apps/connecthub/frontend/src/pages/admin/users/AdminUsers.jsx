import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { Navbar } from "../../../components/Index.jsx";
import AdminUsersList from "./AdminUsersList.jsx";
import AdminTlMapping from "./AdminTlMapping.jsx";
import AdminLocation from "./AdminLocation.jsx";

// shadcn/ui
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Icons
import {
  ChevronDown,
  Upload,
  FileUp,
  UserPlus,
  Download,
  Plus,
} from "lucide-react";

const tabs = ["Users", "Tl mapping", "Location"];

const getValidTab = (tabParam) => {
  return (
    tabs.find((tab) => tab.toLowerCase() === tabParam?.toLowerCase()) || "Users"
  );
};

const AdminUsers = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const { authRole } = useAuthStore();

  const tabParam = params.get("tab");
  const initialTab = getValidTab(tabParam);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const [batchModalOpen, setbatchModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const exportRef = useRef(null);

  const handleExport = () => {
    if (exportRef.current) {
      exportRef.current();
    } else {
      console.warn("Export function not ready yet");
    }
  };

  const handleTabChange = (tab) => {
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
        navigate(`/tl-users?tab=${encodeURIComponent(matchedTab)}`, {
          replace: true,
        });
      } else if (authRole === "ADMIN") {
        navigate(`/admin-users?tab=${encodeURIComponent(matchedTab)}`, {
          replace: true,
        });
      }
    }

    setActiveTab(matchedTab);
  }, [location.search, navigate, authRole]);

  const handleCreateButtonClick = () => {
    if (activeTab === "Phone Number") setbatchModalOpen(true);
    else console.log("Unknown tab action");
  };

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden">
      <Navbar
        title="Users"
        breadcrumbs={[
          {
            label: "Dashboard",
            route: authRole === "TL" ? "/tl-dashboard" : "/admin-dashboard",
          },
          {
            label: "Users",
            onClick: () => {
              navigate(
                authRole === "TL"
                  ? `/tl-users?tab=Users`
                  : `/admin-users?tab=Users`,
                { replace: true },
              );
              setActiveTab("Users");
            },
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
        {authRole !== "TL" && (
          <div className="flex items-center gap-2">
            {!["Users", "Tl mapping", "Location"].includes(activeTab) && (
              <Button onClick={handleCreateButtonClick}>
                {activeTab === "Tl mapping" ? "Create Mapping" : "Action"}
              </Button>
            )}

            {activeTab === "Users" && (
              <>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="secondary">
                      <UserPlus />
                      Add Agent
                      <ChevronDown />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="center" className="w-48 p-1">
                    <div
                      onClick={() => {
                        setbatchModalOpen(true);
                        setPopoverOpen(false);
                      }}
                      className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-sm cursor-pointer transition-colors"
                    >
                      <FileUp className="w-4 h-4 mr-2 text-slate-500" />
                      File Upload
                    </div>
                    <div
                      onClick={() => {
                        navigate("/admin-users/admin-user-creation?role=USER");
                        setPopoverOpen(false);
                      }}
                      className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-sm cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4 mr-2 text-slate-500" />
                      Entry Upload
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate("/admin-users/admin-user-creation?role=ADMIN")
                  }
                >
                  <UserPlus />
                  Add Admin
                </Button>

                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate("/admin-users/admin-user-creation?role=TL")
                  }
                >
                  <UserPlus />
                  Add TL
                </Button>

                <Button variant="default" onClick={handleExport}>
                  <Download />
                  Export
                </Button>
              </>
            )}

            {activeTab === "Location" && (
              <Button variant="default" onClick={() => setLocationModalOpen(true)}>
                <Plus />
                Add Location
              </Button>
            )}
          </div>
        )}
      </Navbar>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "Users" && (
          <AdminUsersList
            externalModalOpen={batchModalOpen}
            onExternalModalClose={() => setbatchModalOpen(false)}
            exportRef={exportRef}
          />
        )}
        {activeTab === "Tl mapping" && <AdminTlMapping />}
        {activeTab === "Location" && (
          <AdminLocation
            externalModalOpen={locationModalOpen}
            onExternalModalClose={() => setLocationModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
