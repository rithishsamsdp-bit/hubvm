import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/select";
import { countries } from "../../../components/CountryCodeDropdown.jsx";
import {
  LayoutDashboard,
  Phone,
  PhoneCall,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Contact2,
  Bell,
  FileBarChart,
  Globe,
  Settings2,
  History,
  Bot,
  ExternalLink,
  Layers,
  Flag,
  PhoneForwarded,
  Users,
} from "lucide-react";

const countryOptionRender = (o) => (
  <div className="flex items-center gap-2">
    <div className="w-5 h-4 overflow-hidden rounded-sm border border-slate-100 flex-shrink-0">
      <img
        src={`https://flagcdn.com/w20/${o.value.toLowerCase()}.png`}
        alt={o.label}
        className="w-full h-full object-cover"
      />
    </div>
    <span className="text-sm">{o.label}</span>
  </div>
);

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

const AgentMenu = ({
  getSelectedData,
  updateMenu,
  updatePermission,
  updateContactBook,
  updateConversation,
  updateRoleProp,
  updateDialpadOptions,
}) => {
  const userData = getSelectedData?.planDetails?.roles?.USER || {};
  const menu = userData.menu || {};
  const options = userData.options || {};
  const permissions = userData.permissions || {};

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
      {/* Header Section */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">
            Agent Menu Configuration
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure feature accessibility and interface options for Agent
            users
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Core Experience Card */}
        <MenuCard
          title="Core Experience"
          icon={<LayoutDashboard className="w-5 h-5" />}
        >
          <ToggleRow
            label="Iframe Mode"
            icon={<ExternalLink className="w-4 h-4" />}
            checked={userData.iframe}
            onChange={(v) => updateRoleProp("USER", "iframe", v)}
            description="Embed application in parent window"
          />
          <ToggleRow
            label="Dashboard"
            icon={<LayoutDashboard className="w-4 h-4" />}
            checked={menu.dashboard}
            onChange={(v) => updateMenu("dashboard", v, "USER")}
            description="Personal performance overview"
          />
          <ToggleRow
            label="Notifications"
            icon={<Bell className="w-4 h-4" />}
            checked={menu.notification}
            onChange={(v) => updateMenu("notification", v, "USER")}
            description="Real-time system alerts"
          />
        </MenuCard>

        {/* Communication Card */}
        <MenuCard
          title="Communication"
          icon={<PhoneCall className="w-5 h-5" />}
        >
          <ToggleRow
            label="Dialpad"
            icon={<PhoneCall className="w-4 h-4" />}
            checked={menu.dialpad}
            onChange={(v) => updateMenu("dialpad", v, "USER")}
            description="Manual and click-to-dial access"
          />
          {menu.dialpad && (
            <div className="ml-7 pl-4 border-l-2 border-slate-50 space-y-5 pt-2 animate-in slide-in-from-left-2 duration-300">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-500 ml-1 flex items-center gap-1.5">
                  <Globe className="w-3 h-3" /> Default Dial Country
                </Label>
                <Select
                  options={countries.map((c) => ({
                    label: `${c.name} (${c.dial})`,
                    value: c.code,
                  }))}
                  value={menu.defaultDialCountry || "IN"}
                  onValueChange={(v) =>
                    updateMenu("defaultDialCountry", v, "USER")
                  }
                  placeholder="Select Country"
                  showSearch={true}
                  allowClear={true}
                  onClear={() => updateMenu("defaultDialCountry", "", "USER")}
                  optionRender={countryOptionRender}
                  triggerClassName="w-full bg-white border-slate-200 rounded-lg h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-500 ml-1 flex items-center gap-1.5">
                  <Flag className="w-3 h-3" /> Allowed Countries
                </Label>
                <MultiSelect
                  options={countries.map((c) => ({
                    label: `${c.name} (${c.dial})`,
                    value: c.code,
                  }))}
                  value={menu.dialpadCountries || []}
                  onValueChange={(v) =>
                    updateMenu("dialpadCountries", v, "USER")
                  }
                  placeholder="Select Allowed"
                  optionRender={countryOptionRender}
                  className="rounded-lg border-slate-200"
                />
              </div>
              <div className="space-y-3 pt-2">
                <ToggleRow
                  label="Conference"
                  checked={options.dialpad?.conference}
                  onChange={(v) =>
                    updateDialpadOptions("USER", "conference", v)
                  }
                />
                <ToggleRow
                  label="Internal Transfer"
                  checked={options.dialpad?.internalTransfer}
                  onChange={(v) =>
                    updateDialpadOptions("USER", "internalTransfer", v)
                  }
                />
                <ToggleRow
                  label="External Transfer"
                  checked={options.dialpad?.externalTransfer}
                  onChange={(v) =>
                    updateDialpadOptions("USER", "externalTransfer", v)
                  }
                />
              </div>
            </div>
          )}
          <ToggleRow
            label="WhatsApp"
            icon={<MessageSquare className="w-4 h-4" />}
            checked={menu.whatsapp}
            onChange={(v) => updateMenu("whatsapp", v, "USER")}
            description="Customer chat interface"
          />
          <ToggleRow
            label="SMS"
            icon={<MessageSquare className="w-4 h-4" />}
            checked={menu.sms}
            onChange={(v) => updateMenu("sms", v, "USER")}
            description="Direct mobile messaging"
          />
        </MenuCard>

        {/* Interactions Card */}
        <MenuCard
          title="Interactions"
          icon={<MessageSquare className="w-5 h-5" />}
        >
          <ToggleRow
            label="Conversations"
            icon={<MessageSquare className="w-4 h-4" />}
            checked={menu.conversation}
            onChange={(v) => updateMenu("conversation", v, "USER")}
            description="Omnichannel interaction history"
          />
          {menu.conversation && (
            <div className="ml-7 pl-4 border-l-2 border-slate-50 space-y-4 pt-2 animate-in slide-in-from-left-2 duration-300">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-500 ml-1 flex items-center gap-1.5">
                  <History className="w-3 h-3" /> Chat History Visibility
                </Label>
                <div className="flex gap-2 p-1 bg-slate-50 rounded-lg">
                  {["public", "private"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() =>
                        updateConversation("USER", "chat_history", mode)
                      }
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all capitalize ${
                        options.conversation?.chat_history === mode
                          ? "bg-white text-primary shadow-sm border border-slate-100"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <ToggleRow
                label="Show AI Data"
                icon={<Bot className="w-3.5 h-3.5" />}
                checked={options.conversation?.aidata}
                onChange={(v) => updateConversation("USER", "aidata", v)}
                description="Display AI insights in chat"
              />
            </div>
          )}
          <ToggleRow
            label="Missed Calls"
            icon={<PhoneForwarded className="w-4 h-4" />}
            checked={menu.missedcall}
            onChange={(v) => updateMenu("missedcall", v, "USER")}
            description="Inbound call recovery"
          />
        </MenuCard>

        {/* Data & Resources Card */}
        <MenuCard
          title="Data & Resources"
          icon={<Layers className="w-5 h-5" />}
        >
          <ToggleRow
            label="Contact Book"
            icon={<Contact2 className="w-4 h-4" />}
            checked={menu.contactbook}
            onChange={(v) => updateMenu("contactbook", v, "USER")}
            description="Customer contact management"
          />
          {menu.contactbook && (
            <div className="ml-7 pl-4 border-l-2 border-slate-50 pt-2 animate-in slide-in-from-left-2 duration-300">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-500 ml-1">
                  Allowed Actions
                </Label>
                <MultiSelect
                  options={[
                    { label: "Create", value: "create" },
                    { label: "View", value: "view" },
                    { label: "Edit", value: "edit" },
                    { label: "Delete", value: "delete" },
                    { label: "Call", value: "call" },
                  ]}
                  value={userData.contactbook?.contactactions || []}
                  onValueChange={(vals) =>
                    updateContactBook("USER", "contactactions", vals)
                  }
                  placeholder="Select actions..."
                  className="rounded-lg border-slate-200"
                />
              </div>
            </div>
          )}
          <ToggleRow
            label="Phone Number"
            icon={<Phone className="w-4 h-4" />}
            checked={menu.phonenumber}
            onChange={(v) => updateMenu("phonenumber", v, "USER")}
            description="Agent specific phone details"
          />
          <ToggleRow
            label="Reports"
            icon={<FileBarChart className="w-4 h-4" />}
            checked={menu.reports}
            onChange={(v) => updateMenu("reports", v, "USER")}
            description="Personal activity logs"
          />
          {menu.reports && (
            <div className="ml-7 pl-4 border-l-2 border-slate-50 pt-2 animate-in slide-in-from-left-2 duration-300">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-500 ml-1">
                  Visible Reports
                </Label>
                <MultiSelect
                  options={[{ label: "CDR Report", value: "CDRreport" }]}
                  value={permissions.reports?.tabs || []}
                  onValueChange={(vals) =>
                    updatePermission("USER", "reports", "tabs", vals)
                  }
                  placeholder="Select reports..."
                  className="rounded-lg border-slate-200"
                />
              </div>
            </div>
          )}
        </MenuCard>
      </div>
    </div>
  );
};

export default AgentMenu;
