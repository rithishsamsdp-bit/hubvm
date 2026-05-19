import { useState, useEffect } from "react";
import "./styles/AdminEditPhoneNumber.css";
import {
  Button,
  Loader,
  Select,
  Input,
  Switch,
} from "../../../components/Index.jsx";
import Icon from "../../../constants/Icon.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { usePhoneNumberStore } from "../../../store/admin/usePhoneNumberStore.js";
import { toast } from "../../../store/useToastStore.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

const AdminEditPhoneNumber = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const id = params.get("editId");
  const { authPlan } = useAuthStore();

  const {
    getEditIdData,
    editIdData,
    editIdLoading,
    getCallFlows,
    callFlowLoading,
    callFlowData,
    getAgents,
    agentsLoading,
    agentsData,
    getLocations,
    locationsData,
    locationsLoading,
    editCliNumber,
    getApis,
    apisData,
    apisLoading,
    getExecutionEvents,
    executionEventsData,
    executionEventsLoading,
  } = usePhoneNumberStore();

  const [formData, setFormData] = useState({
    skillname: "",
    callflow: "",
    callflowName: "",
    agent: [],
    locationid: null,
    inboundSmsAgent: "",
    smsMode: "WEB",
    api: false,
    allApis: [], // To store all available APIs
    apis: [
      {
        id: crypto.randomUUID(),
        apiType: "custom", // "custom" or "available"
        name: "",
        triggerEvent: "",
        url: "",
        method: "",
        headers: "{}",
        jsonBody: "{}",
        selectedApiId: null,
      },
    ],
  });

  useEffect(() => {
    if (editIdData) {
      setFormData((prev) => ({
        ...prev,
        skillname: editIdData.c_clinumbermapName || "",
        callflow: editIdData.c_callflowId || "",
        callflowName: editIdData.c_callflowName || "",
        agent: editIdData.members?.map((a) => a.m_memberId) || [],
        locationid: editIdData.c_locationId || editIdData.locationid || null,
        inboundSmsAgent: editIdData.smsmembers?.[0]?.memberid || "",
        smsMode: editIdData.c_smsMode || "WEB",
        api:
          editIdData.c_apiIntegration === "Enable" ||
          editIdData.c_apiIntegration === "Available",
        apis:
          (editIdData.c_apiIntegration === "Enable" ||
            editIdData.c_apiIntegration === "Available") &&
            editIdData.apis?.length > 0
            ? editIdData.apis.map((api) => {
              const isAvailable = Boolean(api.apiId);
              return {
                id: crypto.randomUUID(),
                apiType: isAvailable ? "available" : "custom",
                name: api.integrationapiname || api.apiName || "",
                triggerEvent: api.integrationapitriggerevent || "",
                url: api.integrationapiendpoint || api.apiURL || "",
                method: api.integrationapimethod || api.method || "",
                headers:
                  api.integrationapiheader || api.headers
                    ? JSON.stringify(
                      api.integrationapiheader || api.headers,
                      null,
                      2,
                    )
                    : "{}",
                jsonBody:
                  api.integrationapiqueryparams || api.jsonBody
                    ? JSON.stringify(
                      api.integrationapiqueryparams || api.jsonBody,
                      null,
                      2,
                    )
                    : "{}",
                selectedApiId: api.apiId || null,
              };
            })
            : [
              {
                id: crypto.randomUUID(),
                apiType: "custom",
                name: "",
                triggerEvent: "",
                url: "",
                method: "",
                headers: "{}",
                jsonBody: "{}",
                selectedApiId: null,
              },
            ],
      }));
    }
  }, [editIdData]);

  useEffect(() => {
    if (id) {
      getEditIdData(id);
      getCallFlows();
      getAgents();
      getLocations();
      getApis();
      getExecutionEvents();
    }
  }, [id, getEditIdData, getCallFlows, getAgents, getLocations, getApis, getExecutionEvents]);

  useEffect(() => {
    if (apisData) {
      setFormData((prev) => ({ ...prev, allApis: apisData }));
    }
  }, [apisData]);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddApi = () => {
    setFormData((prev) => ({
      ...prev,
      apis: [
        ...prev.apis,
        {
          id: crypto.randomUUID(),
          apiType: "custom",
          name: "",
          triggerEvent: "",
          url: "",
          method: "",
          headers: "{}",
          jsonBody: "{}",
          selectedApiId: null,
        },
      ],
    }));
  };

  const handleRemoveApi = (id) => {
    setFormData((prev) => ({
      ...prev,
      apis: prev.apis.filter((api) => api.id !== id),
    }));
  };

  const handleApiChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      apis: prev.apis.map((api) => {
        if (api.id === id) {
          if (field === "apiType") {
            // Reset dependent fields when switching type
            return {
              ...api,
              apiType: value,
              name: "",
              triggerEvent: "",
              url: "",
              method: "",
              headers: "{}",
              jsonBody: "{}",
              selectedApiId: null,
            };
          }
          if (field === "selectedApiId") {
            const selectedApi = prev.allApis.find((a) => a.apiId === value);
            return {
              ...api,
              selectedApiId: value,
              name: selectedApi ? selectedApi.apiName : "",
              url: selectedApi ? selectedApi.apiURL : "",
              method: selectedApi ? selectedApi.method : "",
              headers: selectedApi
                ? JSON.stringify(selectedApi.headers, null, 2)
                : "{}",
              jsonBody: selectedApi
                ? JSON.stringify(selectedApi.jsonBody, null, 2)
                : "{}",
            };
          }
          return { ...api, [field]: value };
        }
        return api;
      }),
    }));
  };

  const handleSubmit = async () => {
    // Validate variables in custom APIs against allowed variables
    if (formData.api) {
      for (const api of formData.apis) {
        if (api.apiType === "custom" && api.triggerEvent) {
          const eventData = executionEventsData.find(
            (e) => e.eventname === api.triggerEvent,
          );
          if (eventData) {
            const allowedVars = eventData.allowedvariables || [];
            // Extract all {{...}} variables from url, headers, jsonBody
            const allText = `${api.url || ""} ${api.headers || ""} ${api.jsonBody || ""}`;
            const usedVars = allText.match(/\{\{[^}]+\}\}/g) || [];
            const invalidVars = usedVars.filter(
              (v) => !allowedVars.includes(v),
            );
            if (invalidVars.length > 0) {
              toast.error(
                `API "${api.name || "Unnamed"}" has invalid variables: ${invalidVars.join(", ")}. Allowed: ${allowedVars.join(", ")}`,
              );
              return;
            }
          }
        }
      }
    }

    // Transform inboundSmsAgent ID to detailed object for the payload
    const selectedAgent = agentsData.find((a) => a.m_memberId === formData.inboundSmsAgent);
    const formattedSmsAgents = selectedAgent ? [{
      memberextensionno: String(selectedAgent.m_memberExtensionNo || ""),
      membername: selectedAgent.m_memberName,
      memberid: selectedAgent.m_memberId,
      m_smsMode: formData.smsMode,
    }] : [];

    let apisPayload = [];
    if (formData.api) {
      apisPayload = formData.apis.map((api) => {
        if (api.apiType === "available") {
          return {
            apiId: api.selectedApiId,
            integrationapiname: api.name,
            integrationapitriggerevent: "",
            integrationapiendpoint: api.url,
            integrationapimethod: api.method,
            integrationapiheader: api.headers
              ? JSON.parse(api.headers || "{}")
              : {},
            integrationapiqueryparams: api.jsonBody
              ? JSON.parse(api.jsonBody || "{}")
              : {},
          };
        } else {
          return {
            integrationapiname: api.name,
            integrationapitriggerevent: api.triggerEvent || "",
            integrationapiendpoint: api.url,
            integrationapimethod: api.method,
            integrationapiheader: api.headers
              ? JSON.parse(api.headers || "{}")
              : {},
            integrationapiqueryparams: api.jsonBody
              ? JSON.parse(api.jsonBody || "{}")
              : {},
          };
        }
      });
    }

    await editCliNumber({
      ...formData,
      apis: apisPayload,
      id,
      clinumbername: editIdData?.c_clinumberName,
      inboundSmsAgent: formattedSmsAgents,
      apiIntegration: formData.api ? "Enable" : "Disable",
    });
    navigate(-1);
  };

  const renderApiForm = (api, index) => {
    const isAvailable = api.apiType === "available";
    const selectedApi = isAvailable
      ? formData.allApis.find((a) => a.apiId === api.selectedApiId)
      : null;

    return (
      <div
        key={api.id}
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "20px",
          backgroundColor: "#fafafa",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p
            className="admin_edit_phonenumber_content_3_heading"
            style={{ fontSize: "16px", margin: 0 }}
          >
            API {index + 1}
          </p>
          <Button
            variant="secondary"
            onClick={() => handleRemoveApi(api.id)}
            style={{ color: "red", borderColor: "red" }}
          >
            Remove
          </Button>
        </div>

        {/* API Type Selection per API */}
        <div
          className="api_selection_grid"
          style={{ marginTop: "16px", marginBottom: "16px" }}
        >
          <div
            className={`api_selection_card ${api.apiType === "available" ? "active" : ""}`}
            onClick={() => handleApiChange(api.id, "apiType", "available")}
            style={{ backgroundColor: "#fff" }}
          >
            <div className="api_selection_card_header">
              <div className="api_selection_radio">
                <div className="api_selection_radio_inner"></div>
              </div>
              <span className="api_selection_title">Available API</span>
            </div>
            <p className="api_selection_card_desc">
              Choose from list of available API configurations.
            </p>
          </div>

          <div
            className={`api_selection_card ${api.apiType === "custom" ? "active" : ""}`}
            onClick={() => handleApiChange(api.id, "apiType", "custom")}
            style={{ backgroundColor: "#fff" }}
          >
            <div className="api_selection_card_header">
              <div className="api_selection_radio">
                <div className="api_selection_radio_inner"></div>
              </div>
              <span className="api_selection_title">Custom API</span>
            </div>
            <p className="api_selection_card_desc">
              Configure a new custom API endpoint.
            </p>
          </div>
        </div>

        <div className="admin_edit_phonenumber_form">
          {/* Select Dropdown for Available API */}
          {isAvailable && (
            <div className="admin_edit_phonenumber_modal_form_grid">
              <div className="admin_edit_phonenumber_form_group">
                <label className="form_label">Select API</label>
                <Select
                  placeholder="Select an API"
                  value={api.selectedApiId}
                  onChange={(val) =>
                    handleApiChange(api.id, "selectedApiId", val)
                  }
                  options={formData.allApis.map((a) => ({
                    label: a.apiName,
                    value: a.apiId,
                  }))}
                />
              </div>
            </div>
          )}

          <div className="admin_edit_phonenumber_modal_form_grid">
            {(!isAvailable || (isAvailable && selectedApi)) && (
              <div className="admin_edit_phonenumber_form_group">
                <label className="form_label">API Name</label>
                <Input
                  value={api.name}
                  onChange={(e) =>
                    handleApiChange(api.id, "name", e.target.value)
                  }
                  placeholder="Enter API Name"
                  disabled={isAvailable && !!selectedApi}
                />
              </div>
            )}
            {(!isAvailable || (isAvailable && selectedApi)) && (
              <div className="admin_edit_phonenumber_form_group">
                <label className="form_label">API URL</label>
                <Input
                  value={api.url}
                  onChange={(e) =>
                    handleApiChange(api.id, "url", e.target.value)
                  }
                  placeholder="Enter API URL"
                  disabled={isAvailable && !!selectedApi}
                />
              </div>
            )}
          </div>
          <div className="admin_edit_phonenumber_modal_form_grid">
            {(!isAvailable || (isAvailable && selectedApi)) && (
              <div className="admin_edit_phonenumber_form_group">
                <label className="form_label">Method</label>
                <Select
                  placeholder="Select Method"
                  value={api.method}
                  onChange={(val) => handleApiChange(api.id, "method", val)}
                  options={[
                    { label: "GET", value: "GET" },
                    { label: "POST", value: "POST" },
                  ]}
                  disabled={isAvailable && !!selectedApi}
                />
              </div>
            )}
            {!isAvailable && (
              <div className="admin_edit_phonenumber_form_group">
                <label className="form_label">Event</label>
                <Select
                  placeholder="Select Event"
                  value={api.triggerEvent || undefined}
                  onChange={(val) =>
                    handleApiChange(api.id, "triggerEvent", val)
                  }
                  allowClear
                  options={executionEventsData.map((e) => ({
                    label: e.eventname,
                    value: e.eventname,
                  }))}
                  loading={executionEventsLoading}
                />
              </div>
            )}
          </div>

          {/* Allowed Variables for selected event */}
          {!isAvailable &&
            api.triggerEvent &&
            (() => {
              const eventData = executionEventsData.find(
                (e) => e.eventname === api.triggerEvent,
              );
              if (!eventData || !eventData.allowedvariables?.length)
                return null;
              return (
                <div className="admin_edit_phonenumber_allowed_vars">
                  <label className="form_label">Allowed Variables</label>
                  <div className="admin_edit_phonenumber_vars_container">
                    {eventData.allowedvariables.map((v) => (
                      <span
                        key={v}
                        className="admin_edit_phonenumber_var_tag"
                        onClick={() => navigator.clipboard.writeText(v)}
                        title="Click to copy"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

          {(!isAvailable || (isAvailable && selectedApi)) &&
            api.method === "POST" && (
              <>
                <div className="admin_edit_phonenumber_modal_form_grid">
                  <div className="admin_edit_phonenumber_form_group">
                    <label className="form_label">Headers (JSON)</label>
                    <textarea
                      className="ringto-json-textarea"
                      placeholder='{"Content-Type": "application/json"}'
                      value={api.headers}
                      onChange={(e) =>
                        handleApiChange(api.id, "headers", e.target.value)
                      }
                      rows={4}
                      disabled={isAvailable && !!selectedApi}
                    />
                  </div>
                </div>
                <div className="admin_edit_phonenumber_modal_form_grid">
                  <div className="admin_edit_phonenumber_form_group">
                    <label className="form_label">JSON Body</label>
                    <textarea
                      className="ringto-json-textarea"
                      placeholder='{"key": "value"}'
                      value={api.jsonBody}
                      onChange={(e) =>
                        handleApiChange(api.id, "jsonBody", e.target.value)
                      }
                      rows={6}
                      disabled={isAvailable && !!selectedApi}
                    />
                  </div>
                </div>
              </>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="admin_edit_phonenumber">
      <div className="navbar_1">
        <div>
          <p className="navbar_1_heading">Phone Number</p>
          <span className="navbar_1_breadcrumb">
            <span
              className="navbar_1_breadcrumb_item"
              onClick={() => navigate("/admin-dashboard")}
            >
              Dashboard
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span
              className="navbar_1_breadcrumb_item"
              onClick={() => navigate("/admin-phonenumber")}
            >
              Phone Number
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span className="navbar_1_breadcrumb_item active">
              Edit Phone Number
            </span>
          </span>
        </div>
        {!editIdLoading && !callFlowLoading && !agentsLoading && (
          <div className="admin_edit_phonenumber_btn_container">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              Save
            </Button>
          </div>
        )}
      </div>

      {editIdLoading || callFlowLoading || agentsLoading ? (
        <Loader />
      ) : (
        <div className="admin_edit_phonenumber_content">
          <div className="admin_edit_phonenumber_content_1">
            <p className="admin_edit_phonenumber_content_1_heading">
              Phone Number
            </p>
            <hr className="admin_edit_phonenumber_hr" />
            <p className="admin_edit_phonenumber_sub_text">
              Give this phone number a friendly name to more easily find and
              search for it later
            </p>
            <p className="admin_edit_phonenumber_text">
              {editIdData?.c_clinumberName}
            </p>
          </div>

          <div className="admin_edit_phonenumber_content_1">
            <p className="admin_edit_phonenumber_content_1_heading">
              Skill Name
            </p>
            <hr className="admin_edit_phonenumber_hr" />
            <p className="admin_edit_phonenumber_sub_text">
              Enter a skill name to categorize this phone number.
            </p>
            <div className="admin_edit_phonenumber_form">
              <div className="admin_edit_phonenumber_modal_form_grid">
                <div className="admin_edit_phonenumber_form_group">
                  <label className="form_label" htmlFor="skillname">
                    Skill name
                  </label>
                  <Input
                    id="skillname"
                    name="skillname"
                    value={formData.skillname}
                    onChange={(e) => handleChange("skillname", e.target.value)}
                    placeholder="Enter the skill name"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="admin_edit_phonenumber_content_3">
            <p className="admin_edit_phonenumber_content_3_heading">
              Inbound Call Settings
            </p>
            <hr className="admin_edit_phonenumber_hr" />
            <p className="admin_edit_phonenumber_sub_text">
              Configure which call flow should be linked to this number.
            </p>
            <div className="admin_edit_phonenumber_form">
              <div className="admin_edit_phonenumber_modal_form_grid">
                <div className="admin_edit_phonenumber_form_group">
                  <label className="form_label" htmlFor="callflow">
                    Call flow
                  </label>
                  <Select
                    id="callflow"
                    name="callflow"
                    placeholder="Select Call Flow"
                    allowClear
                    showSearch
                    value={formData.callflow}
                    onChange={(val) => {
                      const selected = callFlowData.find(
                        (cf) => cf.c_callflowId === val,
                      );
                      handleChange("callflow", val);
                      handleChange(
                        "callflowName",
                        selected ? selected.c_callflowName : "",
                      );
                    }}
                    options={callFlowData.map((cf) => ({
                      label: cf.c_callflowName,
                      value: cf.c_callflowId,
                    }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="admin_edit_phonenumber_content_3">
            <p className="admin_edit_phonenumber_content_3_heading">
              Outbound Call Settings
            </p>
            <hr className="admin_edit_phonenumber_hr" />
            <p className="admin_edit_phonenumber_sub_text">
              Assign agents who can use this number for outbound calls.
            </p>
            <div className="admin_edit_phonenumber_form">
              <div className="admin_edit_phonenumber_modal_form_grid">
                <div className="admin_edit_phonenumber_form_group">
                  <label className="form_label" htmlFor="agent">
                    Agents
                  </label>
                  <Select
                    id="agent"
                    name="agent"
                    placeholder="Select Agent"
                    mode="multiple"
                    allowClear
                    showSearch
                    value={formData.agent}
                    onChange={(val) => handleChange("agent", val)}
                    options={agentsData.map((a) => ({
                      label: a.m_memberName,
                      value: a.m_memberId,
                    }))}
                  />
                </div>
              </div>

              <div className="admin_edit_phonenumber_modal_form_grid" style={{ marginTop: "16px" }}>
                <div className="admin_edit_phonenumber_form_group">
                  <label className="form_label" htmlFor="locationid">
                    Location
                  </label>
                  <Select
                    id="locationid"
                    name="locationid"
                    placeholder="Select Location"
                    allowClear
                    showSearch
                    loading={locationsLoading}
                    value={formData.locationid ?? undefined}
                    onChange={(val) => handleChange("locationid", val ?? null)}
                    options={locationsData.map((loc) => ({
                      label: loc.l_locationName,
                      value: Number(loc.l_locationId),
                    }))}
                  />
                </div>
              </div>

              {formData.locationid && (() => {
                const selectedLocation = locationsData.find(
                  (loc) => Number(loc.l_locationId) === formData.locationid
                );
                const members = selectedLocation?.members || [];
                if (!members.length) return null;
                return (
                  <div style={{ marginTop: "12px" }}>
                    <label className="form_label">Location Members</label>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        marginTop: "8px",
                        padding: "12px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                      }}
                    >
                      {members.map((m) => (
                        <span
                          key={m.m_memberId}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "4px 12px",
                            background: "#e0e7ff",
                            color: "#3730a3",
                            borderRadius: "999px",
                            fontSize: "13px",
                            fontWeight: 500,
                          }}
                        >
                          {m.m_memberName}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {authPlan?.menu?.sms && (
          <div className="admin_edit_phonenumber_content_3">
            <p className="admin_edit_phonenumber_content_3_heading">
              SMS Settings
            </p>
            <hr className="admin_edit_phonenumber_hr" />
            <p className="admin_edit_phonenumber_sub_text">
              Assign agent who can use this number for SMS.
            </p>
            <div className="admin_edit_phonenumber_form">
              <div className="admin_edit_phonenumber_modal_form_grid">
                <div className="admin_edit_phonenumber_form_group">
                  <label className="form_label" htmlFor="inboundSmsAgent">
                    Agents
                  </label>
                  <Select
                    id="inboundSmsAgent"
                    name="inboundSmsAgent"
                    placeholder="Select Agent"
                    allowClear
                    showSearch
                    value={formData.inboundSmsAgent}
                    onChange={(val) => handleChange("inboundSmsAgent", val)}
                    options={agentsData.map((a) => ({
                      label: a.m_memberName,
                      value: a.m_memberId,
                    }))}
                  />
                </div>
                <div className="admin_edit_phonenumber_form_group">
                  <label className="form_label">SMS Mode</label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginTop: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: formData.smsMode === "WEB" ? "600" : "400",
                        color: formData.smsMode === "WEB" ? "#0f172a" : "#64748b",
                      }}
                    >
                      Web
                    </span>
                    <Switch
                      checked={formData.smsMode === "MAIL"}
                      onChange={(checked) =>
                        handleChange("smsMode", checked ? "MAIL" : "WEB")
                      }
                    />
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: formData.smsMode === "MAIL" ? "600" : "400",
                        color: formData.smsMode === "MAIL" ? "#0f172a" : "#64748b",
                      }}
                    >
                      Email
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          <div className="admin_edit_phonenumber_content_3">
            <div style={{ display: "flex", gap: "10px" }}>
              <p className="admin_edit_phonenumber_content_3_heading">
                Api (optional)
              </p>
              <Switch
                checked={formData.api}
                onChange={(val) => handleChange("api", val)}
              />
            </div>
            {formData.api && (
              <>
                <hr className="admin_edit_phonenumber_hr" />
                <p
                  className="admin_edit_phonenumber_sub_text"
                  style={{ marginBottom: "20px" }}
                >
                  Configure API endpoints.
                </p>

                {formData.apis.map((api, index) => renderApiForm(api, index))}

                <div style={{ marginTop: "20px" }}>
                  <Button variant="secondary" onClick={handleAddApi}>
                    + Add New API
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEditPhoneNumber;
