import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  LayoutDashboard,
  UserPlus,
  Phone,
  FileBarChart,
  Megaphone,
  Zap,
  MessageSquare,
  Mail,
  AlertTriangle,
  Blocks,
  Bot,
  ShieldCheck,
  ChevronRight,
  Settings2,
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

const AdminMenu = ({
  getSelectedData,
  updateMenu,
  updateUserCreation,
  adminReportAgents,
  setAdminReportAgents,
  adminCDRColumns,
  setAdminCDRColumns,
}) => {
  const adminData = getSelectedData?.planDetails?.roles?.ADMIN || {};
  const menu = adminData.menu || {};
  const options = adminData.options || {};

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
    { label: "Transcript", value: "Transcript" },
    { label: "CallRecording", value: "CallRecording" },
  ];

  const handleCDRColumnsSelect = (vals) => {
    const allColValues = cdrOptions
      .filter((opt) => opt.value !== "all")
      .map((opt) => opt.value);

    if (vals.includes("all")) {
      if (adminCDRColumns.length === allColValues.length) {
        setAdminCDRColumns([]);
      } else {
        setAdminCDRColumns(allColValues);
      }
    } else {
      setAdminCDRColumns(vals);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
      {/* Header Section */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">
            Admin Menu Configuration
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Define which modules and features are accessible for Admin users
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Core Modules Card */}
        <MenuCard
          title="Core Modules"
          icon={<ShieldCheck className="w-5 h-5" />}
        >
          <ToggleRow
            label="Dashboard"
            icon={<LayoutDashboard className="w-4 h-4" />}
            checked={menu.dashboard}
            onChange={(v) => updateMenu("dashboard", v, "ADMIN")}
            description="Main operational overview"
          />
          <ToggleRow
            label="User Creation"
            icon={<UserPlus className="w-4 h-4" />}
            checked={menu.usercreation}
            onChange={(v) => updateMenu("usercreation", v, "ADMIN")}
            description="Add and manage team members"
          />
          {menu.usercreation && (
            <div className="ml-7 pl-4 border-l-2 border-slate-50 space-y-4 pt-1 animate-in slide-in-from-left-2 duration-300">
              <ToggleRow
                label="Custom Extension"
                checked={options.usercreation?.custom_extension}
                onChange={(v) =>
                  updateUserCreation("ADMIN", "custom_extension", v)
                }
                description="Allow manual extension assignment"
              />
              <ToggleRow
                label="2FA (Two-Factor Auth)"
                checked={options.usercreation?.twofa}
                onChange={(v) => updateUserCreation("ADMIN", "twofa", v)}
                description="Enhanced security for accounts"
              />
            </div>
          )}
          <ToggleRow
            label="Phone Numbers"
            icon={<Phone className="w-4 h-4" />}
            checked={menu.phonenumber}
            onChange={(v) => updateMenu("phonenumber", v, "ADMIN")}
            description="Inbound number management"
          />
        </MenuCard>

        {/* Intelligence & Analytics Card */}
        <MenuCard
          title="Analytics & Reports"
          icon={<FileBarChart className="w-5 h-5" />}
        >
          <ToggleRow
            label="Reports"
            icon={<FileBarChart className="w-4 h-4" />}
            checked={menu.reports}
            onChange={(v) => updateMenu("reports", v, "ADMIN")}
            description="System-wide performance data"
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
                  value={adminReportAgents}
                  onValueChange={setAdminReportAgents}
                  placeholder="Select reports..."
                  className="rounded-lg border-slate-200"
                />
              </div>
              {adminReportAgents.includes("cdr") && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <Label className="text-[11px] font-bold text-slate-500 ml-1">
                    CDR Data Columns
                  </Label>
                  <MultiSelect
                    options={cdrOptions}
                    value={adminCDRColumns}
                    onValueChange={handleCDRColumnsSelect}
                    placeholder="Select columns..."
                    className="rounded-lg border-slate-200"
                  />
                </div>
              )}
            </div>
          )}
        </MenuCard>

        {/* Campaign Card */}
        <MenuCard
          title="Campaign Control"
          icon={<Megaphone className="w-5 h-5" />}
        >
          <ToggleRow
            label="Standard Campaign"
            icon={<Megaphone className="w-4 h-4" />}
            checked={menu.campaign}
            onChange={(v) => updateMenu("campaign", v, "ADMIN")}
            description="Manual and scheduled dialing"
          />
          <ToggleRow
            label="Predictive Dialer"
            icon={<Zap className="w-4 h-4" />}
            checked={menu.predictive}
            onChange={(v) => updateMenu("predictive", v, "ADMIN")}
            description="Auto-dialing with AI optimization"
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
            onChange={(v) => updateMenu("whatsapp", v, "ADMIN")}
            description="Business messaging integration"
          />
          <ToggleRow
            label="SMS Messaging"
            icon={<MessageSquare className="w-4 h-4" />}
            checked={menu.sms}
            onChange={(v) => updateMenu("sms", v, "ADMIN")}
            description="Direct mobile messaging"
          />
          <ToggleRow
            label="Email Automation"
            icon={<Mail className="w-4 h-4" />}
            checked={menu.emailautomation}
            onChange={(v) => updateMenu("emailautomation", v, "ADMIN")}
            description="Automated customer emails"
          />
        </MenuCard>

        {/* Advanced Utilities Card */}
        <MenuCard
          title="Advanced & Support"
          icon={<Settings2 className="w-5 h-5" />}
        >
          <ToggleRow
            label="Emergency Mode"
            icon={<AlertTriangle className="w-4 h-4" />}
            checked={menu.emergency}
            onChange={(v) => updateMenu("emergency", v, "ADMIN")}
            description="Crisis routing protocols"
          />
          <ToggleRow
            label="External Integration"
            icon={<Blocks className="w-4 h-4" />}
            checked={menu.integration}
            onChange={(v) => updateMenu("integration", v, "ADMIN")}
            description="Third-party CRM and API sync"
          />
          <ToggleRow
            label="AI Voice Bot"
            icon={<Bot className="w-4 h-4" />}
            checked={menu.ai}
            onChange={(v) => updateMenu("ai", v, "ADMIN")}
            description="Automated AI conversations"
          />
        </MenuCard>
      </div>
    </div>
  );
};

export default AdminMenu;
