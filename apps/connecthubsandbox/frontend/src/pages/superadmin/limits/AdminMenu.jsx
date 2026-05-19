import { Select } from "../../../components/Index.jsx";

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

const AdminMenu = ({
  getSelectedData,
  updateMenu,
  updateUserCreation,
  adminReportAgents,
  setAdminReportAgents,
  adminCDRColumns,
  setAdminCDRColumns,
}) => {
  return (
    <div className="sa-menus">
      <div className="sa-menu-row">
        <span className="sa-menu-name">Dashboard</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.ADMIN?.menu?.dashboard ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.dashboard
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="admin-dashboard"
            checked={
              getSelectedData?.planDetails?.roles?.ADMIN?.menu?.dashboard
            }
            onChange={(v) => updateMenu("dashboard", v, "ADMIN")}
          />
        </div>
      </div>
      <div className="sa-menu-row">
        <span className="sa-menu-name">User Creation</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.ADMIN?.menu?.usercreation ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.usercreation
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="admin-users"
            checked={
              getSelectedData?.planDetails?.roles?.ADMIN?.menu?.usercreation
            }
            onChange={(v) => updateMenu("usercreation", v, "ADMIN")}
          />
        </div>
      </div>
      {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.usercreation && (
        <div className="sa-menu-panel">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 4px",
            }}
          >
            <span className="sa-menu-name">Custom Extension</span>
            <ToggleSwitch
              id="admin-custom-extension"
              checked={
                getSelectedData?.planDetails?.roles?.ADMIN?.options
                  ?.usercreation?.custom_extension
              }
              onChange={(val) =>
                updateUserCreation("ADMIN", "custom_extension", val)
              }
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 4px",
            }}
          >
            <span className="sa-menu-name">2FA (Two-Factor Auth)</span>
            <ToggleSwitch
              id="admin-2fa"
              checked={
                getSelectedData?.planDetails?.roles?.ADMIN?.options
                  ?.usercreation?.twofa
              }
              onChange={(val) =>
                updateUserCreation("ADMIN", "twofa", val)
              }
            />
          </div>
        </div>
      )}

      {/* Reports */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">Reports</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.ADMIN?.menu?.reports ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.reports
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="admin-reports"
            checked={getSelectedData?.planDetails?.roles?.ADMIN?.menu?.reports}
            onChange={(v) => updateMenu("reports", v, "ADMIN")}
          />
        </div>
      </div>

      {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.reports && (
        <div className="sa-menu-panel">
          <div className="superadmin_onboard_edit_form_grid">
            <div className="superadmin_onboard_edit_form_group">
              <label className="form_label" htmlFor="admin-report-agents">
                Select Reports
              </label>

              <Select
                id="superadmin-reports"
                name="superadminReport"
                placeholder="Select reports"
                mode="multiple"
                allowClear
                showSearch
                value={adminReportAgents}
                onChange={(vals) => setAdminReportAgents(vals)}
                // expects [{label, value}] options:
                options={[
                  { label: "CDR Report", value: "cdr" },
                  { label: "Production Report", value: "production" },
                ]}
              />
            </div>

            {adminReportAgents.includes("cdr") && (
              <div className="superadmin_onboard_edit_form_group">
                <label className="form_label" htmlFor="admin-cdr-columns">
                  CDR Report Columns
                </label>
                <Select
                  id="admin-cdr-columns"
                  name="adminCDRColumns"
                  placeholder="Select columns"
                  mode="multiple"
                  allowClear
                  showSearch
                  value={adminCDRColumns}
                  onChange={(vals) => {
                    const allColumns = [
                      "AccountCode",
                      "CampaignName",
                      "MemberName",
                      "CustomerPhoneNumber",
                      "CallDateTime",
                      "CallDirection",
                      "CallDisposition",
                      "CallDuration",
                      "CallMode",
                      "WrapUpDuration",
                      "FollowUpData",
                      "CallLineNumber",
                      "MemberExtensionNumber",
                      "MemberPhoneNumber",
                      "MemberExtensionName",
                      "MemberRegisteredIP",
                      "CallDisconnectionEnd",
                      "Transcript",
                      "CallRecording",
                    ];
                    if (vals.includes("all")) {
                      if (adminCDRColumns.length === allColumns.length) {
                        setAdminCDRColumns([]); // Deselect All
                      } else {
                        setAdminCDRColumns(allColumns); // Select All
                      }
                    } else {
                      setAdminCDRColumns(vals);
                    }
                  }}
                  options={[
                    { label: "Select All", value: "all" },
                    { label: "AccountCode", value: "AccountCode" },
                    { label: "CampaignName", value: "CampaignName" },
                    { label: "MemberName", value: "MemberName" },
                    {
                      label: "CustomerPhoneNumber",
                      value: "CustomerPhoneNumber",
                    },
                    { label: "CallDateTime", value: "CallDateTime" },
                    { label: "CallDirection", value: "CallDirection" },
                    { label: "CallDisposition", value: "CallDisposition" },
                    { label: "CallDuration", value: "CallDuration" },
                    { label: "CallMode", value: "CallMode" },
                    { label: "WrapUpDuration", value: "WrapUpDuration" },
                    { label: "FollowUpData", value: "FollowUpData" },
                    { label: "CallLineNumber", value: "CallLineNumber" },
                    {
                      label: "MemberExtensionNumber",
                      value: "MemberExtensionNumber",
                    },
                    { label: "MemberPhoneNumber", value: "MemberPhoneNumber" },
                    {
                      label: "MemberExtensionName",
                      value: "MemberExtensionName",
                    },
                    {
                      label: "MemberRegisteredIP",
                      value: "MemberRegisteredIP",
                    },
                    {
                      label: "CallDisconnectionEnd",
                      value: "CallDisconnectionEnd",
                    },
                    { label: "Transcript", value: "Transcript" },
                    { label: "CallRecording", value: "CallRecording" },
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="sa-menu-row">
        <span className="sa-menu-name">Phone Numbers</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.ADMIN?.menu?.phonenumber ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.phonenumber
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="admin-phonenumbers"
            checked={
              getSelectedData?.planDetails?.roles?.ADMIN?.menu?.phonenumber
            }
            onChange={(v) => updateMenu("phonenumber", v, "ADMIN")}
          />
        </div>
      </div>

      {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.phonenumber && (
        <div className="sa-menu-panel">
          <div className="superadmin_onboard_edit_form_grid">
            <div className="superadmin_onboard_edit_form_group">
              <label className="form_label" htmlFor="admin-phonenumber-tabs">
                Tabs
              </label>
              <Select
                id="admin-phonenumber-tabs"
                name="adminphonenumbertabs"
                placeholder="Select tabs"
                mode="multiple"
                allowClear
                showSearch
                // expects [{label, value}] options:
                options={[
                  { label: "Phone number", value: "phonenumber" },
                  { label: "Queue", value: "queue" },
                  { label: "Call flow", value: "callflow" },
                  { label: "Holiday", value: "holiday" },
                ]}
              />
            </div>
          </div>

          <div className="superadmin_onboard_edit_form_grid">
            <div className="superadmin_onboard_edit_form_group">
              <label className="form_label" htmlFor="admin-phonenumber-tabs">
                Phone number actions
              </label>
              <Select
                id="admin-phonenumber-tabs"
                name="adminphonenumbertabs"
                placeholder="Select actions"
                mode="multiple"
                allowClear
                showSearch
                // expects [{label, value}] options:
                options={[
                  { label: "Edit", value: "edit" },
                  { label: "Delete", value: "delete" },
                ]}
              />
            </div>
            <div className="superadmin_onboard_edit_form_group">
              <label className="form_label" htmlFor="admin-phonenumber-tabs">
                Queue actions
              </label>
              <Select
                id="admin-phonenumber-tabs"
                name="adminphonenumbertabs"
                placeholder="Select actions"
                mode="multiple"
                allowClear
                showSearch
                // expects [{label, value}] options:
                options={[
                  { label: "Create", value: "create" },
                  { label: "Edit", value: "edit" },
                  { label: "Delete", value: "delete" },
                ]}
              />
            </div>
            <div className="superadmin_onboard_edit_form_group">
              <label className="form_label" htmlFor="admin-phonenumber-tabs">
                Call flow actions
              </label>
              <Select
                id="admin-phonenumber-tabs"
                name="adminphonenumbertabs"
                placeholder="Select actions"
                mode="multiple"
                allowClear
                showSearch
                // expects [{label, value}] options:
                options={[
                  { label: "Create", value: "create" },
                  { label: "View", value: "view" },
                  { label: "Edit", value: "edit" },
                  { label: "Delete", value: "delete" },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      <div className="sa-menu-row">
        <span className="sa-menu-name">Campaign</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.ADMIN?.menu?.campaign ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.campaign
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="admin-campign"
            checked={getSelectedData?.planDetails?.roles?.ADMIN?.menu?.campaign}
            onChange={(v) => updateMenu("campaign", v, "ADMIN")}
          />
        </div>
      </div>
      {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.campaign && (
        <div className="sa-menu-panel">
          <div className="superadmin_onboard_edit_form_grid">
            <div className="superadmin_onboard_edit_form_group">
              <label className="form_label" htmlFor="admin-phonenumber-tabs">
                Tabs
              </label>
              <Select
                id="admin-phonenumber-tabs"
                name="adminphonenumbertabs"
                placeholder="Select tabs"
                mode="multiple"
                allowClear
                showSearch
                // expects [{label, value}] options:
                options={[
                  { label: "Campaign", value: "campaign" },
                  { label: "Form Builder", value: "formbuilder" },
                  { label: "Phone Number Group", value: "phonenumbergroup" },
                  { label: "Member Group", value: "membergroup" },
                ]}
              />
            </div>
          </div>

          <div className="superadmin_onboard_edit_form_grid">
            <div className="superadmin_onboard_edit_form_group">
              <label className="form_label" htmlFor="admin-phonenumber-tabs">
                Campaign actions
              </label>
              <Select
                id="admin-phonenumber-tabs"
                name="adminphonenumbertabs"
                placeholder="Select actions"
                mode="multiple"
                allowClear
                showSearch
                // expects [{label, value}] options:
                options={[
                  { label: "Create", value: "create" },
                  { label: "Edit", value: "edit" },
                  { label: "Delete", value: "delete" },
                ]}
              />
            </div>
            <div className="superadmin_onboard_edit_form_group">
              <label className="form_label" htmlFor="admin-phonenumber-tabs">
                Form Builder actions
              </label>
              <Select
                id="admin-phonenumber-tabs"
                name="adminphonenumbertabs"
                placeholder="Select actions"
                mode="multiple"
                allowClear
                showSearch
                // expects [{label, value}] options:
                options={[
                  { label: "Create", value: "create" },
                  { label: "Edit", value: "edit" },
                  { label: "Delete", value: "delete" },
                ]}
              />
            </div>
            <div className="superadmin_onboard_edit_form_group">
              <label className="form_label" htmlFor="admin-phonenumber-tabs">
                Phone Number Group actions
              </label>
              <Select
                id="admin-phonenumber-tabs"
                name="adminphonenumbertabs"
                placeholder="Select actions"
                mode="multiple"
                allowClear
                showSearch
                // expects [{label, value}] options:
                options={[
                  { label: "Create", value: "create" },
                  { label: "Edit", value: "edit" },
                  { label: "Delete", value: "delete" },
                ]}
              />
            </div>
          </div>
          <div className="superadmin_onboard_edit_form_grid">
            <div className="superadmin_onboard_edit_form_group">
              <label className="form_label" htmlFor="admin-phonenumber-tabs">
                Member Group actions
              </label>
              <Select
                id="admin-phonenumber-tabs"
                name="adminphonenumbertabs"
                placeholder="Select actions"
                mode="multiple"
                allowClear
                showSearch
                // expects [{label, value}] options:
                options={[
                  { label: "Create", value: "create" },
                  { label: "Edit", value: "edit" },
                  { label: "Delete", value: "delete" },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Predictive */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">Predictive</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.ADMIN?.menu?.predictive ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.predictive
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="admin-predictive"
            checked={getSelectedData?.planDetails?.roles?.ADMIN?.menu?.predictive}
            onChange={(v) => updateMenu("predictive", v, "ADMIN")}
          />
        </div>
      </div>

      {/* WhatsApp */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">WhatsApp</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.ADMIN?.menu?.whatsapp ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.whatsapp
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="admin-whatsapp"
            checked={getSelectedData?.planDetails?.roles?.ADMIN?.menu?.whatsapp}
            onChange={(v) => updateMenu("whatsapp", v, "ADMIN")}
          />
        </div>
      </div>

      {/* SMS */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">SMS</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.ADMIN?.menu?.sms ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.sms
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="admin-sms"
            checked={getSelectedData?.planDetails?.roles?.ADMIN?.menu?.sms}
            onChange={(v) => updateMenu("sms", v, "ADMIN")}
          />
        </div>
      </div>

      {/* Email Automation */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">Email Automation</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.ADMIN?.menu?.emailautomation ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.emailautomation
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="admin-emailautomation"
            checked={getSelectedData?.planDetails?.roles?.ADMIN?.menu?.emailautomation}
            onChange={(v) => updateMenu("emailautomation", v, "ADMIN")}
          />
        </div>
      </div>

      {/* Emergency */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">Emergency</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.ADMIN?.menu?.emergency ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.emergency
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="admin-emergency"
            checked={getSelectedData?.planDetails?.roles?.ADMIN?.menu?.emergency}
            onChange={(v) => updateMenu("emergency", v, "ADMIN")}
          />
        </div>
      </div>

      {/* Integration */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">Integration</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.ADMIN?.menu?.integration ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.integration
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="admin-integration"
            checked={getSelectedData?.planDetails?.roles?.ADMIN?.menu?.integration}
            onChange={(v) => updateMenu("integration", v, "ADMIN")}
          />
        </div>
      </div>

      {/* AI Bot */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">AI Bot</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${getSelectedData?.planDetails?.roles?.ADMIN?.menu?.ai ? "on" : "off"}`}
          >
            {getSelectedData?.planDetails?.roles?.ADMIN?.menu?.ai
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="admin-ai"
            checked={getSelectedData?.planDetails?.roles?.ADMIN?.menu?.ai}
            onChange={(v) => updateMenu("ai", v, "ADMIN")}
          />
        </div>
      </div>

    </div>
  );
};

export default AdminMenu;
