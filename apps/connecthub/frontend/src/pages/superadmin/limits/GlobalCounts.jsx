import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/multi-select";
import { useOnboard } from "../../../store/superadmin/useOnboard.js";
import { TIMEZONES } from "../../../constants/timezone.js";
import {
  Users,
  Phone,
  PhoneCall,
  ListOrdered,
  Calendar,
  GitBranch,
  Rocket,
  FileText,
  UsersRound,
  Layers,
  Globe,
  ShieldAlert,
  Mic,
} from "lucide-react";

const GlobalCounts = ({ counts, onGlobalCountChange, errors }) => {
  const { getSelectedData, updateAccountField } = useOnboard();
  const [timezoneSearch, setTimezoneSearch] = useState("");

  const uniqueTimezones = useMemo(
    () =>
      TIMEZONES.filter(
        (tz, index, self) =>
          index === self.findIndex((t) => t.value === tz.value),
      ),
    [],
  );

  const filteredTimezones = useMemo(
    () =>
      uniqueTimezones.filter(
        (tz) =>
          tz.label.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
          tz.value.toLowerCase().includes(timezoneSearch.toLowerCase()),
      ),
    [uniqueTimezones, timezoneSearch],
  );

  const currentValue =
    getSelectedData?.accounttimezone || getSelectedData?.accountTimeZone || "";

  const fieldGroups = [
    {
      title: "User Management",
      icon: <UsersRound className="w-5 h-5 text-indigo-500" />,
      fields: [
        {
          id: "userCount",
          name: "MEMBER",
          label: "Total Users",
          icon: <Users className="w-4 h-4" />,
        },
        {
          id: "membergroupCount",
          name: "MEMBERGROUP",
          label: "Member Groups",
          icon: <Layers className="w-4 h-4" />,
        },
      ],
    },
    {
      title: "Communication Channels",
      icon: <PhoneCall className="w-5 h-5 text-emerald-500" />,
      fields: [
        {
          id: "phoneNumberCount",
          name: "PHONENUMBER",
          label: "Phone Numbers",
          icon: <Phone className="w-4 h-4" />,
        },
        {
          id: "phonenumbergroupCount",
          name: "PHONENUMBERGROUP",
          label: "Phone Groups",
          icon: <Layers className="w-4 h-4" />,
        },
        {
          id: "callLimitCount",
          name: "CALLLIMIT",
          label: "Call Limit",
          icon: <PhoneCall className="w-4 h-4" />,
        },
      ],
    },
    {
      title: "Workflow & Routing",
      icon: <GitBranch className="w-5 h-5 text-amber-500" />,
      fields: [
        {
          id: "queueCount",
          name: "QUEUE",
          label: "Queues",
          icon: <ListOrdered className="w-4 h-4" />,
        },
        {
          id: "callflowCount",
          name: "CALLFLOW",
          label: "Callflows",
          icon: <GitBranch className="w-4 h-4" />,
        },
        {
          id: "holidayCount",
          name: "HOLIDAY",
          label: "Holidays",
          icon: <Calendar className="w-4 h-4" />,
        },
      ],
    },
    {
      title: "Campaign & Content",
      icon: <Rocket className="w-5 h-5 text-rose-500" />,
      fields: [
        {
          id: "campaignCount",
          name: "CAMPAIGN",
          label: "Campaigns",
          icon: <Rocket className="w-4 h-4" />,
        },
        {
          id: "formbuilderCount",
          name: "FORMBUILDER",
          label: "Form Builders",
          icon: <FileText className="w-4 h-4" />,
        },
      ],
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
      {/* Resource Quotas Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">
            System Resource Quotas
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fieldGroups.map((group, gIdx) => (
            <div
              key={gIdx}
              className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
                <div className="p-2 bg-slate-50 rounded-lg">{group.icon}</div>
                <h4 className="font-bold text-slate-700">{group.title}</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {group.fields.map((field) => (
                  <div key={field.id} className="space-y-2 group/field">
                    <Label
                      htmlFor={field.id}
                      className="text-[13px] font-bold text-slate-500 ml-1 flex items-center gap-2 group-focus-within/field:text-primary transition-colors"
                    >
                      <span className="text-slate-400 group-focus-within/field:text-primary/70 transition-colors">
                        {field.icon}
                      </span>
                      {field.label}
                    </Label>
                    <div className="relative">
                      <Input
                        id={field.id}
                        name={field.name}
                        type="number"
                        min={0}
                        placeholder="0"
                        value={counts[field.name] ?? 0}
                        onChange={onGlobalCountChange}
                        className="h-10 border-slate-200 focus:ring-2 focus:ring-primary/10 transition-all rounded-lg"
                      />
                    </div>
                    {errors[field.id] && (
                      <p className="text-[11px] text-rose-500 mt-1 ml-1 font-semibold animate-in fade-in slide-in-from-top-1">
                        {errors[field.id]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regional & Localization + Recordings — side by side */}
      <div className="pt-10 border-t border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Regional Configuration */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-8 w-1 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                Regional & Localization
              </h3>
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 h-full">
              <div className="flex flex-col md:flex-row md:items-center gap-8">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-50">
                      <Globe className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-slate-700">
                        Account Timezone
                      </Label>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Applied to all system operations
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Select
                      options={filteredTimezones}
                      value={currentValue}
                      onValueChange={(val) =>
                        updateAccountField("accounttimezone", val)
                      }
                      placeholder="Select Time Zone"
                      showSearch={true}
                      searchValue={timezoneSearch}
                      onSearchChange={setTimezoneSearch}
                      allowClear={true}
                      onClear={() => updateAccountField("accounttimezone", "")}
                      triggerClassName="w-full bg-white border-slate-200 rounded-lg h-10"
                      contentClassName="max-h-[300px]"
                    />
                  </div>
                </div>

                <div className="hidden md:block w-32 h-32 bg-white rounded-xl border border-slate-100 shadow-inner p-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent" />
                  <div className="relative z-10 h-full flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">
                      Local Time
                    </span>
                    <span className="text-xl font-black text-indigo-600 font-mono">
                      {new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recordings Configuration */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-8 w-1 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
              <div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                  Recordings
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Control call recording availability for this company
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-lg border transition-colors duration-300 ${
                      !!counts.RECORDING_ENABLED
                        ? "bg-rose-50 border-rose-100"
                        : "bg-slate-50 border-slate-100"
                    }`}
                  >
                    <Mic
                      className={`w-5 h-5 transition-colors duration-300 ${
                        !!counts.RECORDING_ENABLED
                          ? "text-rose-500"
                          : "text-slate-400"
                      }`}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700 leading-none">
                      Enable Call Recordings
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1 font-medium leading-snug max-w-sm">
                      Allow call recordings to be captured and stored for this
                      company. When disabled, no new recordings will be created.
                    </span>
                  </div>
                </div>
                <Switch
                  id="recordingEnabled"
                  checked={!!counts.RECORDING_ENABLED}
                  onCheckedChange={(v) =>
                    onGlobalCountChange({
                      target: { name: "RECORDING_ENABLED", value: v },
                    })
                  }
                />
              </div>

              {!!counts.RECORDING_ENABLED && (
                <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-rose-50 border border-rose-100 rounded-lg">
                    <Mic className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="text-[11px] text-rose-600 font-semibold">
                      Recordings are active — calls will be recorded and stored.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Security & Access Control */}
      <div className="pt-10 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-8 w-1 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              Security & Access Control
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Login restrictions and session management policies
            </p>
          </div>
        </div>

        <div className="max-w-xl bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-700 leading-none">
                  Duplicate Session Detection
                </span>
                <span className="text-[11px] text-slate-400 mt-1 font-medium leading-snug max-w-sm">
                  Prevent agents and admins from logging in simultaneously on multiple devices. When enabled, users must force-logout their existing session before starting a new one.
                </span>
              </div>
            </div>
            <Switch
              id="duplicateSessionDetection"
              checked={!!counts.DUPLICATE_SESSION_DETECTION}
              onCheckedChange={(v) =>
                onGlobalCountChange({
                  target: { name: "DUPLICATE_SESSION_DETECTION", value: v },
                })
              }
            />
          </div>

          {!!counts.DUPLICATE_SESSION_DETECTION && (
            <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
              <Label className="text-[12px] font-bold text-slate-700 mb-2 block">
                Apply Restriction To:
              </Label>
              <MultiSelect
                options={[
                  { label: "Admin", value: "ADMIN" },
                  { label: "Team Leader", value: "TL" },
                  { label: "Agent", value: "USER" },
                ]}
                value={counts.DUPLICATE_SESSION_ROLES || []}
                onValueChange={(val) =>
                  onGlobalCountChange({
                    target: { name: "DUPLICATE_SESSION_ROLES", value: val },
                  })
                }
                placeholder="Select roles to restrict..."
                className="rounded-lg border-slate-200"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalCounts;
