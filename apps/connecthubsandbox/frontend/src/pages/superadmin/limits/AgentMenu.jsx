import { Input, Select, Radio, Icon } from "../../../components/Index.jsx";
import { countries } from "../../../components/CountryCodeDropdown.jsx";

const countryOptionRender = (o) => (
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <Icon name={o.value.toLowerCase()} size={24} className="flag-icon" />
    <span>{o.label}</span>
  </div>
);

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

const AgentMenu = ({
  getSelectedData,
  updateMenu,
  updatePermission,
  updateContactBook,
  updateConversation,
  updateRoleProp,
  updateDialpadOptions,
}) => {
  return (
    <div className="sa-menus">
      {/* Iframe */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">Iframe</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.USER?.iframe ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.USER?.iframe ? "ON" : "OFF"}
          </span>
          <ToggleSwitch
            id="agent-iframe"
            checked={getSelectedData?.planDetails?.roles?.USER?.iframe}
            onChange={(v) => updateRoleProp("USER", "iframe", v)}
          />
        </div>
      </div>
      {/* Dialpad */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">Dialpad</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.USER?.menu?.dialpad ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.USER?.menu?.dialpad
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="agent-dialpad"
            checked={getSelectedData?.planDetails?.roles?.USER?.menu?.dialpad}
            onChange={(v) => updateMenu("dialpad", v, "USER")}
          />
        </div>
      </div>
      {getSelectedData?.planDetails?.roles?.USER?.menu?.dialpad && (
         <>
           <div className="sa-menu-row" style={{ paddingLeft: '20px', borderTop: 'none', paddingTop: '0px' }}>
               <span className="sa-menu-name" style={{ fontSize: '13px', color: '#666' }}>Default Dial Country</span>
               <div className="sa-menu-right" style={{ width: '300px' }}>
                  <Select
                    mode="single"
                    placeholder="Select Default Country"
                    options={countries.map(c => ({ label: `${c.name} (${c.dial})`, value: c.code }))}
                    value={getSelectedData?.planDetails?.roles?.USER?.menu?.defaultDialCountry || "IN"}
                    onChange={(v) => updateMenu("defaultDialCountry", v, "USER")}
                    width="100%"
                    optionRender={countryOptionRender}
                  />
               </div>
           </div>
           <div className="sa-menu-row" style={{ paddingLeft: '20px', borderTop: 'none', paddingTop: '0px' }}>
               <span className="sa-menu-name" style={{ fontSize: '13px', color: '#666' }}>Dialpad Countries</span>
               <div className="sa-menu-right" style={{ width: '300px' }}>
                  <Select
                    mode="multiple"
                    placeholder="Select Allowed Countries"
                    options={countries.map(c => ({ label: `${c.name} (${c.dial})`, value: c.code }))}
                    value={getSelectedData?.planDetails?.roles?.USER?.menu?.dialpadCountries || []}
                    onChange={(v) => updateMenu("dialpadCountries", v, "USER")}
                    width="100%"
                    optionRender={countryOptionRender}
                  />
               </div>
           </div>
            <div className="sa-menu-panel">
               <div style={{ display: "flex", alignItems: "center", padding: "8px 4px" }}>
                  <span className="sa-menu-name">Conference</span>
                  <ToggleSwitch
                    id="dialpad-conference"
                    checked={getSelectedData?.planDetails?.roles?.USER?.options?.dialpad?.conference}
                    onChange={(val) => updateDialpadOptions("USER", "conference", val)}
                  />
               </div>
               <div style={{ display: "flex", alignItems: "center", padding: "8px 4px" }}>
                  <span className="sa-menu-name">Internal Transfer (Agents)</span>
                  <ToggleSwitch
                    id="dialpad-internal-transfer"
                    checked={getSelectedData?.planDetails?.roles?.USER?.options?.dialpad?.internalTransfer}
                    onChange={(val) => updateDialpadOptions("USER", "internalTransfer", val)}
                  />
               </div>
               <div style={{ display: "flex", alignItems: "center", padding: "8px 4px" }}>
                  <span className="sa-menu-name">External Transfer (Manual/Contact)</span>
                  <ToggleSwitch
                    id="dialpad-external-transfer"
                    checked={getSelectedData?.planDetails?.roles?.USER?.options?.dialpad?.externalTransfer}
                    onChange={(val) => updateDialpadOptions("USER", "externalTransfer", val)}
                  />
               </div>
            </div>
         </>
      )}

      {/* Reports */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">Reports</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.USER?.menu?.reports ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.USER?.menu?.reports
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="agent-reports"
            checked={getSelectedData?.planDetails?.roles?.USER?.menu?.reports}
            onChange={(v) => updateMenu("reports", v, "USER")}
          />
        </div>
      </div>
      {getSelectedData?.planDetails?.roles?.USER?.menu?.reports && (
        <div className="sa-menu-panel">
          <div className="superadmin_onboard_edit_form_grid">
            <div className="superadmin_onboard_edit_form_group">
              <label className="form_label" htmlFor="agent-reports-tabs">
                Select Reports
              </label>
              <Select
                id="agent-reports-tabs"
                name="agentReportsTabs"
                placeholder="Select reports"
                mode="multiple"
                allowClear
                showSearch
                value={
                  getSelectedData?.planDetails?.roles?.USER?.permissions
                    ?.reports?.tabs || []
                }
                onChange={(vals) =>
                  updatePermission("USER", "reports", "tabs", vals)
                }
                options={[{ label: "CDR Report", value: "CDRreport" }]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Dashboard */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">Dashboard</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.USER?.menu?.dashboard ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.USER?.menu?.dashboard
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="agent-dashboard"
            checked={getSelectedData?.planDetails?.roles?.USER?.menu?.dashboard}
            onChange={(v) => updateMenu("dashboard", v, "USER")}
          />
        </div>
      </div>

      {/* Missed Call */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">Missed Call</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.USER?.menu?.missedcall ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.USER?.menu?.missedcall
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="agent-missedcall"
            checked={
              getSelectedData?.planDetails?.roles?.USER?.menu?.missedcall
            }
            onChange={(v) => updateMenu("missedcall", v, "USER")}
          />
        </div>
      </div>

      {/* Contact Book */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">Contact Book</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.USER?.menu?.contactbook ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.USER?.menu?.contactbook
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="agent-contactbook"
            checked={
              getSelectedData?.planDetails?.roles?.USER?.menu?.contactbook
            }
            onChange={(v) => updateMenu("contactbook", v, "USER")}
          />
        </div>
      </div>
      {getSelectedData?.planDetails?.roles?.USER?.menu?.contactbook && (
        <div className="sa-menu-panel">
          <div className="superadmin_onboard_edit_form_grid">
            <div className="superadmin_onboard_edit_form_group">
              <label className="form_label" htmlFor="agent-contact-actions">
                Contact Actions
              </label>
              <Select
                id="agent-contact-actions"
                name="agentContactActions"
                placeholder="Select actions"
                mode="multiple"
                allowClear
                showSearch
                value={
                  getSelectedData?.planDetails?.roles?.USER?.contactbook
                    ?.contactactions || []
                }
                onChange={(vals) =>
                  updateContactBook("USER", "contactactions", vals)
                }
                options={[
                  { label: "Create", value: "create" },
                  { label: "View", value: "view" },
                  { label: "Edit", value: "edit" },
                  { label: "Delete", value: "delete" },
                  { label: "Call", value: "call" },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Phone Number */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">Phone Number</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.USER?.menu?.phonenumber ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.USER?.menu?.phonenumber
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="agent-phonenumber"
            checked={
              getSelectedData?.planDetails?.roles?.USER?.menu?.phonenumber
            }
            onChange={(v) => updateMenu("phonenumber", v, "USER")}
          />
        </div>
      </div>

      {/* Notification */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">Notification</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.USER?.menu?.notification ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.USER?.menu?.notification
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="agent-notification"
            checked={
              getSelectedData?.planDetails?.roles?.USER?.menu?.notification
            }
            onChange={(v) => updateMenu("notification", v, "USER")}
          />
        </div>
      </div>

      {/* Conversation */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">Conversation</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.USER?.menu?.conversation ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.USER?.menu?.conversation
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="agent-conversation"
            checked={
              getSelectedData?.planDetails?.roles?.USER?.menu?.conversation
            }
            onChange={(v) => updateMenu("conversation", v, "USER")}
          />
        </div>
      </div>
      {getSelectedData?.planDetails?.roles?.USER?.menu?.conversation && (
        <div className="sa-menu-panel">
          <div className="superadmin_onboard_edit_form_grid">
            <div className="superadmin_onboard_edit_form_group">
              <label
                className="form_label"
                htmlFor="agent-conversation-features"
              >
                Options
              </label>
              <Radio
                name="agentConversationFeatures"
                value={
                  getSelectedData?.planDetails?.roles?.USER?.options
                    ?.conversation?.chat_history || ""
                }
                onChange={(val) =>
                  updateConversation("USER", "chat_history", val)
                }
                options={[
                  { label: "Public", value: "public" },
                  { label: "Private", value: "private" },
                ]}
              />
            </div>
            <div className="superadmin_onboard_edit_form_group">
              <label
                className="form_label"
                htmlFor="agent-conversation-aidata"
                style={{ marginBottom: 0 }}
              >
                AI Data
              </label>
              <ToggleSwitch
                id="agent-conversation-aidata"
                checked={
                  getSelectedData?.planDetails?.roles?.USER?.options
                    ?.conversation?.aidata
                }
                onChange={(val) => updateConversation("USER", "aidata", val)}
              />
            </div>
          </div>
        </div>
      )}
      {/* WhatsApp */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">WhatsApp</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.USER?.menu?.whatsapp ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.USER?.menu?.whatsapp
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="agent-whatsapp"
            checked={getSelectedData?.planDetails?.roles?.USER?.menu?.whatsapp}
            onChange={(v) => updateMenu("whatsapp", v, "USER")}
          />
        </div>
      </div>

      {/* SMS */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">SMS</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.USER?.menu?.sms ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.USER?.menu?.sms ? "ON" : "OFF"}
          </span>
          <ToggleSwitch
            id="agent-sms"
            checked={getSelectedData?.planDetails?.roles?.USER?.menu?.sms}
            onChange={(v) => updateMenu("sms", v, "USER")}
          />
        </div>
      </div>
    </div>
  );
};

export default AgentMenu;
