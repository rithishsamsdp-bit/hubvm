import { use, useState, useEffect } from "react";
import "./styles/SuperAdminOnboardEdit.css";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../../constants/Icon.jsx";
import { useOnboard } from "../../store/superadmin/useOnboard.js";
import {
  Button,
  FormInputError,
  Input,
  Select,
  Loader,
  Radio,
} from "../../components/Index.jsx";
import { TIMEZONES } from "../../constants/timezone.js";

import GlobalCounts from "./limits/GlobalCounts.jsx";
import AdminMenu from "./limits/AdminMenu.jsx";
import TLMenu from "./limits/TLMenu.jsx";
import AgentMenu from "./limits/AgentMenu.jsx";

/* Minimal toggle - kept for local components if needed, but mostly moved */
const ToggleSwitch = ({ checked, onChange, id }) => (
  <label className="sa-toggle" htmlFor={id}>
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="sa-toggle-slider" />
  </label>
);

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
    updateAccountField,
  } = useOnboard();

  const [id, setId] = useState(params.get("id") || "");
  const [errors, setErrors] = useState({});

  const tabs = [
    { id: "global", label: "Global Limits" },
    { id: "admin", label: "Admin" },
    { id: "tl", label: "TL" },
    { id: "agent", label: "Agent" },
  ];

  // Get tab from URL or default to "global"
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
    // Persist tab to URL, keeping other params like 'id'
    const p = new URLSearchParams(location.search);
    p.set("tab", tabId);
    navigate(`${location.pathname}?${p.toString()}`, { replace: true });
  };

  /* ========= Global Counts (restored & controlled) ========= */
  const [globalCounts, setGlobalCounts] = useState({
    userCount: "",
    phoneNumberCount: "",
    callLimitCount: "",
    queueCount: "",
    holidayCount: "",
    callflowCount: "",
    campaignCount: "",
    formbuilderCount: "",
    membergroupCount: "",
    phonenumbergroupCount: "",
    calllimitCount: "",
  });

  /* ========= Admin: independent menus & counts ========= */
  const [adminReportAgents, setAdminReportAgents] = useState([]);

  const [adminCDRColumns, setAdminCDRColumns] = useState([]);

  /* ========= TL: independent menus & counts ========= */
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
          .cdrreport
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
    const num = value === "" ? "" : Math.max(0, Number(value) || 0);
    updateFeature(name, num);
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
    // Map to API format
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
    // Map to API format
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
                ...(prev.planDetails.roles.TL || {}), // Ensure TL object exists
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

  return (
    <div className="superadmin_onboard_edit_creation">
      {/* Header */}
      {/* Header */}
      <div className="navbar_2">
        <div>
          <p className="navbar_2_heading">Onboard</p>
          <span className="navbar_2_breadcrumb">
            <span
              onClick={() => navigate("/superadmin-dashboard")}
              className="navbar_2_breadcrumb_item"
            >
              Dashboard
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span
              onClick={() => navigate("/superadmin-dashboard")}
              className="navbar_2_breadcrumb_item"
            >
              Onboard
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span className="navbar_2_breadcrumb_item active">Edit</span>
          </span>

          {/* Tabs */}
          <div className="navbar_2_tabs">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`navbar_2_tab_item ${activeTab === tab.id ? "active" : ""
                  }`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Form */}
      {getSelectLoading ? (
        <Loader />
      ) : (
        <div
          className="superadmin_onboard_edit_form_container"
          style={{ height: "calc(100% - 131px)", overflowY: "scroll" }}
        >
          <div className="superadmin_onboard_edit_form">
            {/* Tab Content */}
            <div className="sa-tab-content">
              {activeTab === "global" && (
                <>
                  <p>Counts</p>
                  <GlobalCounts
                    counts={counts}
                    onGlobalCountChange={onGlobalCountChange}
                    errors={errors}
                  />

                  <p style={{ marginTop: "20px" }}>Global Timezones</p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "16px",
                      marginBottom: "20px",
                    }}
                  >
                    <div className="superadmin_onboard_edit_form_group">
                      <label className="form_label">Timezone</label>
                      <Select
                        showSearch={true}
                        name="accounttimezone"
                        value={
                          getSelectedData?.accounttimezone ||
                          getSelectedData?.accountTimeZone ||
                          ""
                        }
                        onChange={(val) =>
                          updateAccountField("accounttimezone", val)
                        }
                        placeholder="Select Time Zone"
                        options={TIMEZONES}
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === "admin" && (
                <>
                  <p className="superadmin_onboard_edit_controller_heading">
                    Admin Menus Controller
                  </p>
                  <hr />
                  <AdminMenu
                    getSelectedData={getSelectedData}
                    updateMenu={updateMenu}
                    updateUserCreation={updateUserCreation}
                    adminReportAgents={adminReportAgents}
                    setAdminReportAgents={handleReportChange}
                    adminCDRColumns={adminCDRColumns}
                    setAdminCDRColumns={handleCDRColumnsChange}
                  />
                </>
              )}

              {activeTab === "tl" && (
                <>
                  <p className="superadmin_onboard_edit_controller_heading">
                    TL Menus Controller
                  </p>
                  <hr />
                  <TLMenu
                    getSelectedData={getSelectedData}
                    updateMenu={updateMenu}
                    tlReportAgents={tlReportAgents}
                    setTlReportAgents={handleTlReportChange}
                    tlCDRColumns={tlCDRColumns}
                    setTlCDRColumns={handleTlCDRColumnsChange}
                  />
                </>
              )}

              {activeTab === "agent" && (
                <>
                  <p className="superadmin_onboard_edit_controller_heading">
                    Agent Menus Controller
                  </p>
                  <hr />
                  <AgentMenu
                    getSelectedData={getSelectedData}
                    updateMenu={updateMenu}
                    updatePermission={updatePermission}
                    updateContactBook={updateContactBook}
                    updateConversation={updateConversation}
                    updateRoleProp={updateRoleProp}
                    updateDialpadOptions={updateDialpadOptions}
                  />
                </>
              )}
            </div>

            <div className="superadmin_onboard_edit_form_actions">
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handlesubmit}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminOnboardEdit;
