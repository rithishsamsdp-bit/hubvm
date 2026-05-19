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

const TLMenu = ({
  getSelectedData,
  updateMenu,
  tlReportAgents,
  setTlReportAgents,
  tlCDRColumns,
  setTlCDRColumns,
}) => {
  return (
    <div className="sa-menus">
      <div className="sa-menu-row">
        <span className="sa-menu-name">Dashboard</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${
              getSelectedData?.planDetails?.roles?.TL?.menu?.dashboard
                ? "on"
                : "off"
            }`}
          >
            {getSelectedData?.planDetails?.roles?.TL?.menu?.dashboard
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="tl-dashboard"
            checked={getSelectedData?.planDetails?.roles?.TL?.menu?.dashboard}
            onChange={(v) => updateMenu("dashboard", v, "TL")}
          />
        </div>
      </div>

      <div className="sa-menu-row">
        <span className="sa-menu-name">Reports</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${
              getSelectedData?.planDetails?.roles?.TL?.menu?.reports
                ? "on"
                : "off"
            }`}
          >
            {getSelectedData?.planDetails?.roles?.TL?.menu?.reports
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="tl-reports"
            checked={getSelectedData?.planDetails?.roles?.TL?.menu?.reports}
            onChange={(v) => updateMenu("reports", v, "TL")}
          />
        </div>
      </div>

      {getSelectedData?.planDetails?.roles?.TL?.menu?.reports && (
        <div className="sa-menu-panel">
          <div className="superadmin_onboard_edit_form_grid">
            <div className="superadmin_onboard_edit_form_group">
              <label className="form_label" htmlFor="tl-report-agents">
                Select Reports
              </label>

              <Select
                id="tl-reports-select"
                name="tlReport"
                placeholder="Select reports"
                mode="multiple"
                allowClear
                showSearch
                value={tlReportAgents}
                onChange={(vals) => setTlReportAgents(vals)}
                // expects [{label, value}] options:
                options={[
                  { label: "CDR Report", value: "cdr" },
                  { label: "Production Report", value: "production" },
                ]}
              />
            </div>

            {tlReportAgents.includes("cdr") && (
              <div className="superadmin_onboard_edit_form_group">
                <label className="form_label" htmlFor="tl-cdr-columns">
                  CDR Report Columns
                </label>
                <Select
                  id="tl-cdr-columns"
                  name="tlCDRColumns"
                  placeholder="Select columns"
                  mode="multiple"
                  allowClear
                  showSearch
                  value={tlCDRColumns}
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
                      "CallRecording",
                    ];
                    if (vals.includes("all")) {
                      if (tlCDRColumns.length === allColumns.length) {
                        setTlCDRColumns([]); // Deselect All
                      } else {
                        setTlCDRColumns(allColumns); // Select All
                      }
                    } else {
                      setTlCDRColumns(vals);
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
                    { label: "CallRecording", value: "CallRecording" },
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="sa-menu-row">
        <span className="sa-menu-name">Campaign</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${
              getSelectedData?.planDetails?.roles?.TL?.menu?.campaign
                ? "on"
                : "off"
            }`}
          >
            {getSelectedData?.planDetails?.roles?.TL?.menu?.campaign
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="tl-campaign"
            checked={getSelectedData?.planDetails?.roles?.TL?.menu?.campaign}
            onChange={(v) => updateMenu("campaign", v, "TL")}
          />
        </div>
      </div>

      <div className="sa-menu-row">
        <span className="sa-menu-name">Phone Number</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${
              getSelectedData?.planDetails?.roles?.TL?.menu?.phonenumber
                ? "on"
                : "off"
            }`}
          >
            {getSelectedData?.planDetails?.roles?.TL?.menu?.phonenumber
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="tl-phonenumber"
            checked={getSelectedData?.planDetails?.roles?.TL?.menu?.phonenumber}
            onChange={(v) => updateMenu("phonenumber", v, "TL")}
          />
        </div>
      </div>
      <div className="sa-menu-row">
        <span className="sa-menu-name">Call Dialing</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${
              getSelectedData?.planDetails?.roles?.TL?.menu?.calldialing
                ? "on"
                : "off"
            }`}
          >
            {getSelectedData?.planDetails?.roles?.TL?.menu?.calldialing
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="tl-calldialing"
            checked={getSelectedData?.planDetails?.roles?.TL?.menu?.calldialing}
            onChange={(v) => updateMenu("calldialing", v, "TL")}
          />
        </div>
      </div>
      <div className="sa-menu-row">
        <span className="sa-menu-name">Contact Book</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${
              getSelectedData?.planDetails?.roles?.TL?.menu?.contactbook
                ? "on"
                : "off"
            }`}
          >
            {getSelectedData?.planDetails?.roles?.TL?.menu?.contactbook
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="tl-contactbook"
            checked={getSelectedData?.planDetails?.roles?.TL?.menu?.contactbook}
            onChange={(v) => updateMenu("contactbook", v, "TL")}
          />
        </div>
      </div>

      {/* WhatsApp */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">WhatsApp</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${
              getSelectedData?.planDetails?.roles?.TL?.menu?.whatsapp
                ? "on"
                : "off"
            }`}
          >
            {getSelectedData?.planDetails?.roles?.TL?.menu?.whatsapp
              ? "ON"
              : "OFF"}
          </span>
          <ToggleSwitch
            id="tl-whatsapp"
            checked={getSelectedData?.planDetails?.roles?.TL?.menu?.whatsapp}
            onChange={(v) => updateMenu("whatsapp", v, "TL")}
          />
        </div>
      </div>

      {/* SMS */}
      <div className="sa-menu-row">
        <span className="sa-menu-name">SMS</span>
        <div className="sa-menu-right">
          <span
            className={`sa-menu-status ${
              getSelectedData?.planDetails?.roles?.TL?.menu?.sms ? "on" : "off"
            }`}
          >
            {getSelectedData?.planDetails?.roles?.TL?.menu?.sms ? "ON" : "OFF"}
          </span>
          <ToggleSwitch
            id="tl-sms"
            checked={getSelectedData?.planDetails?.roles?.TL?.menu?.sms}
            onChange={(v) => updateMenu("sms", v, "TL")}
          />
        </div>
      </div>
    </div>
  );
};

export default TLMenu;
