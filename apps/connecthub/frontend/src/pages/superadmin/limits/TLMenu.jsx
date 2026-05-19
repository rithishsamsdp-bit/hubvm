import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  LayoutDashboard,
  FileBarChart,
  Megaphone,
  Phone,
  PhoneCall,
  Contact2,
  MessageSquare,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

const MenuCard = ({ title, icon, children }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
      <div className="p-2 bg-slate-50 rounded-lg text-primary">{icon}</div>
      <h4 className="font-bold text-slate-700 tracking-tight">{title}</h4>
    </div>
    <div className="space-y-5">{children}</div>
  </div>
);

const ToggleRow = ({ label, icon, checked, onChange, description }) => (
  <div className="flex items-center justify-between group py-1">
    <div className="flex items-center gap-3">
      {icon && (
        <div className="text-slate-400 group-hover:text-primary transition-colors">
          {icon}
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-[13px] font-bold text-slate-700 leading-none">
          {label}
        </span>
        {description && (
          <span className="text-[11px] text-slate-400 mt-1 font-medium">
            {description}
          </span>
        )}
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const TLMenu = ({
  getSelectedData,
  updateMenu,
  tlReportAgents,
  setTlReportAgents,
  tlCDRColumns,
  setTlCDRColumns,
}) => {
  const tlData = getSelectedData?.planDetails?.roles?.TL || {};
  const menu = tlData.menu || {};

  const cdrOptions = [
    { label: "Select All", value: "all" },
    { label: "AccountCode", value: "AccountCode" },
    { label: "CampaignName", value: "CampaignName" },
    { label: "MemberName", value: "MemberName" },
    { label: "CustomerPhoneNumber", value: "CustomerPhoneNumber" },
    { label: "CallDateTime", value: "CallDateTime" },
    { label: "CallDirection", value: "CallDirection" },
    { label: "CallDisposition", value: "CallDisposition" },
    { label: "CallDuration", value: "CallDuration" },
    { label: "CallMode", value: "CallMode" },
    { label: "WrapUpDuration", value: "WrapUpDuration" },
    { label: "FollowUpData", value: "FollowUpData" },
    { label: "CallLineNumber", value: "CallLineNumber" },
    { label: "MemberExtensionNumber", value: "MemberExtensionNumber" },
    { label: "MemberPhoneNumber", value: "MemberPhoneNumber" },
    { label: "MemberExtensionName", value: "MemberExtensionName" },
    { label: "MemberRegisteredIP", value: "MemberRegisteredIP" },
    { label: "CallDisconnectionEnd", value: "CallDisconnectionEnd" },
    { label: "CallRecording", value: "CallRecording" },
  ];

  const handleCDRColumnsSelect = (vals) => {
    const allColValues = cdrOptions
      .filter((opt) => opt.value !== "all")
      .map((opt) => opt.value);

    if (vals.includes("all")) {
      if (tlCDRColumns.length === allColValues.length) {
        setTlCDRColumns([]);
      } else {
        setTlCDRColumns(allColValues);
      }
    } else {
      setTlCDRColumns(vals);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
      {/* Header Section */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">
            Team Leader Menu Configuration
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Define which modules and features are accessible for Team Leader
            users
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Management Card */}
        <MenuCard
          title="Team Management"
          icon={<UserCheck className="w-5 h-5" />}
        >
          <ToggleRow
            label="Dashboard"
            icon={<LayoutDashboard className="w-4 h-4" />}
            checked={menu.dashboard}
            onChange={(v) => updateMenu("dashboard", v, "TL")}
            description="Team performance overview"
          />
          <ToggleRow
            label="Campaign Management"
            icon={<Megaphone className="w-4 h-4" />}
            checked={menu.campaign}
            onChange={(v) => updateMenu("campaign", v, "TL")}
            description="Control active team campaigns"
          />
        </MenuCard>

        {/* Analytics Card */}
        <MenuCard
          title="Analytics & Reports"
          icon={<FileBarChart className="w-5 h-5" />}
        >
          <ToggleRow
            label="Reports"
            icon={<FileBarChart className="w-4 h-4" />}
            checked={menu.reports}
            onChange={(v) => updateMenu("reports", v, "TL")}
            description="Access to team-level call reports"
          />
          {menu.reports && (
            <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-500 ml-1">
                  Visible Reports
                </Label>
                <MultiSelect
                  options={[
                    { label: "CDR Report", value: "cdr" },
                    { label: "Production Report", value: "production" },
                  ]}
                  value={tlReportAgents}
                  onValueChange={setTlReportAgents}
                  placeholder="Select reports..."
                  className="rounded-lg border-slate-200"
                />
              </div>
              {tlReportAgents.includes("cdr") && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <Label className="text-[11px] font-bold text-slate-500 ml-1">
                    CDR Data Columns
                  </Label>
                  <MultiSelect
                    options={cdrOptions}
                    value={tlCDRColumns}
                    onValueChange={handleCDRColumnsSelect}
                    placeholder="Select columns..."
                    className="rounded-lg border-slate-200"
                  />
                </div>
              )}
            </div>
          )}
        </MenuCard>

        {/* Core Ops Card */}
        <MenuCard title="Operations" icon={<ShieldCheck className="w-5 h-5" />}>
          <ToggleRow
            label="Phone Numbers"
            icon={<Phone className="w-4 h-4" />}
            checked={menu.phonenumber}
            onChange={(v) => updateMenu("phonenumber", v, "TL")}
            description="Manage team phone resources"
          />
          <ToggleRow
            label="Call Dialing"
            icon={<PhoneCall className="w-4 h-4" />}
            checked={menu.calldialing}
            onChange={(v) => updateMenu("calldialing", v, "TL")}
            description="Active call management"
          />
          <ToggleRow
            label="Contact Book"
            icon={<Contact2 className="w-4 h-4" />}
            checked={menu.contactbook}
            onChange={(v) => updateMenu("contactbook", v, "TL")}
            description="Team-wide customer contacts"
          />
        </MenuCard>

        {/* Digital Channels Card */}
        <MenuCard
          title="Digital Channels"
          icon={<MessageSquare className="w-5 h-5" />}
        >
          <ToggleRow
            label="WhatsApp"
            icon={<MessageSquare className="w-4 h-4" />}
            checked={menu.whatsapp}
            onChange={(v) => updateMenu("whatsapp", v, "TL")}
            description="In-app business messaging"
          />
          <ToggleRow
            label="SMS"
            icon={<MessageSquare className="w-4 h-4" />}
            checked={menu.sms}
            onChange={(v) => updateMenu("sms", v, "TL")}
            description="Direct customer messaging"
          />
        </MenuCard>
      </div>
    </div>
  );
};

export default TLMenu;
