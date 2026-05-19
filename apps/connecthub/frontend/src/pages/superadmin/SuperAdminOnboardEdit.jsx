import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Save,
  X,
  Settings2,
  ShieldCheck,
  UserCog,
  UserCheck,
  Shield,
} from "lucide-react";
import { useOnboard } from "../../store/superadmin/useOnboard.js";
import { Loader, Navbar } from "../../components/Index.jsx";
import { Button } from "../../components/ui/button.jsx";

import GlobalCounts from "./limits/GlobalCounts.jsx";
import AdminMenu from "./limits/AdminMenu.jsx";
import TLMenu from "./limits/TLMenu.jsx";
import AgentMenu from "./limits/AgentMenu.jsx";

const SuperAdminOnboardEdit = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const {
    getSelectLoading,
    getSelectedData,
    getSelectedid,
    updateFeature,
    submitPlanDetails,
    updateMenu,
    updatePermission,
    updateContactBook,
    updateConversation,
  } = useOnboard();

  const [id, setId] = useState(params.get("id") || "");
  const [errors, setErrors] = useState({});

  const tabs = [
    {
      id: "global",
      label: "Global Limits",
      icon: <Settings2 className="w-4 h-4 mr-2" />,
    },
    {
      id: "admin",
      label: "Admin Menu",
      icon: <ShieldCheck className="w-4 h-4 mr-2" />,
    },
    { id: "tl", label: "TL Menu", icon: <UserCog className="w-4 h-4 mr-2" /> },
    {
      id: "agent",
      label: "Agent Menu",
      icon: <UserCheck className="w-4 h-4 mr-2" />,
    },
  ];

  const getValidTab = (tabParam) =>
    tabs.find((t) => t.id === tabParam) ? tabParam : "global";

  const [activeTab, setActiveTab] = useState(() => {
    const p = new URLSearchParams(location.search);
    return getValidTab(p.get("tab"));
  });

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const currentTab = p.get("tab");
    const valid = getValidTab(currentTab);
    if (activeTab !== valid) {
      setActiveTab(valid);
    }
  }, [location.search]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const p = new URLSearchParams(location.search);
    p.set("tab", tabId);
    navigate(`${location.pathname}?${p.toString()}`, { replace: true });
  };

  const [adminReportAgents, setAdminReportAgents] = useState([]);
  const [adminCDRColumns, setAdminCDRColumns] = useState([]);
  const [tlReportAgents, setTlReportAgents] = useState([]);
  const [tlCDRColumns, setTlCDRColumns] = useState([]);

  useEffect(() => {
    if (getSelectedData?.planDetails?.roles?.TL?.permissions?.reports?.tabs) {
      const tabs =
        getSelectedData.planDetails.roles.TL.permissions.reports.tabs || [];
      const mapped = tabs.map((t) => {
        const lower = t.toLowerCase();
        if (lower === "cdrreport") return "cdr";
        if (lower === "performancereport") return "production";
        return lower;
      });
      setTlReportAgents(mapped);
    }

    if (
      getSelectedData?.planDetails?.roles?.TL?.permissions?.reports?.columns
        ?.cdrreport
    ) {
      setTlCDRColumns(
        getSelectedData.planDetails.roles.TL.permissions.reports.columns
          .cdrreport,
      );
    }
  }, [getSelectedData]);

  useEffect(() => {
    getSelectedid(id);
  }, [id]);

  useEffect(() => {
    if (getSelectedData?.planDetails?.reports?.tabs) {
      const tabs = getSelectedData.planDetails.reports.tabs || [];
      const mapped = tabs.map((t) => {
        const lower = t.toLowerCase();
        if (lower === "cdrreport") return "cdr";
        if (lower === "performancereport") return "production";
        return lower;
      });
      setAdminReportAgents(mapped);
    }

    if (getSelectedData?.planDetails?.reports?.cdrreport) {
      setAdminCDRColumns(getSelectedData.planDetails.reports.cdrreport);
    }
  }, [getSelectedData]);

  const counts = getSelectedData?.planDetails?.limits?.features || {};

  const onGlobalCountChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (typeof value !== "boolean" && !Array.isArray(value)) {
      finalValue = value === "" ? "" : Math.max(0, Number(value) || 0);
    }
    updateFeature(name, finalValue);
  };

  const handleCancel = () => {
    navigate("/superadmin-onboard");
  };

  const handlesubmit = async () => {
    await submitPlanDetails();
    navigate("/superadmin-onboard");
  };

  const updateUserCreation = (role, key, value) => {
    useOnboard.setState((state) => {
      const prev = state.getSelectedData;
      return {
        getSelectedData: {
          ...prev,
          planDetails: {
            ...prev.planDetails,
            roles: {
              ...prev.planDetails?.roles,
              [role]: {
                ...prev.planDetails?.roles?.[role],
                options: {
                  ...prev.planDetails?.roles?.[role]?.options,
                  usercreation: {
                    ...prev.planDetails?.roles?.[role]?.options?.usercreation,
                    [key]: value,
                  },
                },
              },
            },
          },
        },
      };
    });
  };

  const updateDialpadOptions = (role, key, value) => {
    useOnboard.setState((state) => {
      const prev = state.getSelectedData;
      return {
        getSelectedData: {
          ...prev,
          planDetails: {
            ...prev.planDetails,
            roles: {
              ...prev.planDetails?.roles,
              [role]: {
                ...prev.planDetails?.roles?.[role],
                options: {
                  ...prev.planDetails?.roles?.[role]?.options,
                  dialpad: {
                    ...prev.planDetails?.roles?.[role]?.options?.dialpad,
                    [key]: value,
                  },
                },
              },
            },
          },
        },
      };
    });
  };

  const updateRoleProp = (role, key, value) => {
    useOnboard.setState((state) => {
      const prev = state.getSelectedData;
      return {
        getSelectedData: {
          ...prev,
          planDetails: {
            ...prev.planDetails,
            roles: {
              ...prev.planDetails?.roles,
              [role]: {
                ...prev.planDetails?.roles?.[role],
                [key]: value,
              },
            },
          },
        },
      };
    });
  };

  const handleReportChange = (vals) => {
    setAdminReportAgents(vals);
    const apiTabs = vals.map((v) => {
      if (v === "cdr") return "cdrreport";
      if (v === "production") return "PERFORMANCEREPORT";
      return v.toUpperCase();
    });

    useOnboard.setState((state) => {
      const prev = state.getSelectedData;
      return {
        getSelectedData: {
          ...prev,
          planDetails: {
            ...prev.planDetails,
            roles: {
              ...prev.planDetails.roles,
              ADMIN: {
                ...prev.planDetails.roles.ADMIN,
                permissions: {
                  ...(prev.planDetails.roles.ADMIN.permissions || {}),
                  reports: {
                    ...(prev.planDetails.roles.ADMIN.permissions?.reports ||
                      {}),
                    tabs: apiTabs,
                  },
                },
              },
            },
          },
        },
      };
    });
  };

  const handleCDRColumnsChange = (vals) => {
    setAdminCDRColumns(vals);
    useOnboard.setState((state) => {
      const prev = state.getSelectedData;
      return {
        getSelectedData: {
          ...prev,
          planDetails: {
            ...prev.planDetails,
            roles: {
              ...prev.planDetails.roles,
              ADMIN: {
                ...prev.planDetails.roles.ADMIN,
                permissions: {
                  ...(prev.planDetails.roles.ADMIN.permissions || {}),
                  reports: {
                    ...(prev.planDetails.roles.ADMIN.permissions?.reports ||
                      {}),
                    columns: {
                      ...(prev.planDetails.roles.ADMIN.permissions?.reports
                        ?.columns || {}),
                      cdrreport: vals,
                    },
                  },
                },
              },
            },
          },
        },
      };
    });
  };

  const handleTlReportChange = (vals) => {
    setTlReportAgents(vals);
    const apiTabs = vals.map((v) => {
      if (v === "cdr") return "cdrreport";
      if (v === "production") return "PERFORMANCEREPORT";
      return v.toUpperCase();
    });

    useOnboard.setState((state) => {
      const prev = state.getSelectedData;
      return {
        getSelectedData: {
          ...prev,
          planDetails: {
            ...prev.planDetails,
            roles: {
              ...prev.planDetails.roles,
              TL: {
                ...(prev.planDetails.roles.TL || {}),
                permissions: {
                  ...(prev.planDetails.roles.TL?.permissions || {}),
                  reports: {
                    ...(prev.planDetails.roles.TL?.permissions?.reports || {}),
                    tabs: apiTabs,
                  },
                },
              },
            },
          },
        },
      };
    });
  };

  const handleTlCDRColumnsChange = (vals) => {
    setTlCDRColumns(vals);
    useOnboard.setState((state) => {
      const prev = state.getSelectedData;
      return {
        getSelectedData: {
          ...prev,
          planDetails: {
            ...prev.planDetails,
            roles: {
              ...prev.planDetails?.roles,
              TL: {
                ...(prev.planDetails?.roles?.TL || {}),
                permissions: {
                  ...(prev.planDetails?.roles?.TL?.permissions || {}),
                  reports: {
                    ...(prev.planDetails?.roles?.TL?.permissions?.reports ||
                      {}),
                    columns: {
                      ...(prev.planDetails?.roles?.TL?.permissions?.reports
                        ?.columns || {}),
                      cdrreport: vals,
                    },
                  },
                },
              },
            },
          },
        },
      };
    });
  };

  const breadcrumbs = [
    { label: "Onboard", route: "/superadmin-onboard" },
    { label: "Edit Plan" },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50/50 overflow-hidden">
      <Navbar
        title={getSelectedData?.accountName || "Edit Onboard Plan"}
        breadcrumbs={breadcrumbs}
        bottomContent={
          <div className="flex items-center -mb-px overflow-x-auto no-scrollbar">
            <div className="flex items-center min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center px-6 py-4 text-[13px] font-bold border-b-2 transition-all duration-200 whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleCancel}
            className="text-xs font-semibold"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
          <Button variant="default" onClick={handlesubmit}>
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </Navbar>

      {getSelectLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              {activeTab === "global" && (
                <GlobalCounts
                  counts={counts}
                  onGlobalCountChange={onGlobalCountChange}
                  errors={errors}
                />
              )}

              {activeTab === "admin" && (
                <AdminMenu
                  getSelectedData={getSelectedData}
                  updateMenu={updateMenu}
                  updateUserCreation={updateUserCreation}
                  adminReportAgents={adminReportAgents}
                  setAdminReportAgents={handleReportChange}
                  adminCDRColumns={adminCDRColumns}
                  setAdminCDRColumns={handleCDRColumnsChange}
                />
              )}

              {activeTab === "tl" && (
                <TLMenu
                  getSelectedData={getSelectedData}
                  updateMenu={updateMenu}
                  tlReportAgents={tlReportAgents}
                  setTlReportAgents={handleTlReportChange}
                  tlCDRColumns={tlCDRColumns}
                  setTlCDRColumns={handleTlCDRColumnsChange}
                />
              )}

              {activeTab === "agent" && (
                <AgentMenu
                  getSelectedData={getSelectedData}
                  updateMenu={updateMenu}
                  updatePermission={updatePermission}
                  updateContactBook={updateContactBook}
                  updateConversation={updateConversation}
                  updateRoleProp={updateRoleProp}
                  updateDialpadOptions={updateDialpadOptions}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminOnboardEdit;
