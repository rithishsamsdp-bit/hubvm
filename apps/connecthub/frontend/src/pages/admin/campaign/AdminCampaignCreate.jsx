import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useCampaignStore } from "../../../store/admin/useCampaignStore.js";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Navbar } from "../../../components/Index.jsx";
import { Label } from "@/components/ui/label";
import { Loader2, Info, Calendar, Settings, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const campaignSchema = z
  .object({
    Name: z.string().min(1, "Campaign name is required"),
    memberids: z.array(z.any()).min(1, "At least one member group is required"),
    groupId: z.union([
      z.string().min(1, "Phone number group is required"),
      z.number(),
    ]),
    formId: z.any().optional(),
    dialerType: z.enum(["MANUAL", "PREDICTIVE"]),
    campaignRules: z.object({
      limits: z.object({
        maxtotalattempts: z.coerce.number().min(0),
        maxattemptsper_day: z.coerce.number().min(0),
        maxChannels: z.coerce.number().min(1, "Max channels must be ≥ 1"),
        startDate: z.string().min(1, "Start date is required"),
        endDate: z.string().min(1, "End date is required"),
      }),
      callinghours: z.object({
        start: z.string().min(1, "Start time is required"),
        end: z.string().min(1, "End time is required"),
      }),
      ratio: z.coerce.number().min(1).max(20),
      minRatio: z.coerce.number().min(1).max(20),
      maxRatio: z.coerce.number().min(1).max(20),
      Strategy: z.enum(["STATIC", "ADAPTIVE"]),
      wrapupInterval: z.coerce.number().min(0),
      retryrules: z.object({
        NO_ANSWER: z.object({
          enabled: z.boolean(),
          intervalsminutes: z.string(),
        }),
      }),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.dialerType === "PREDICTIVE") {
      const limits = data.campaignRules.limits;
      if (limits.maxtotalattempts <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Total attempts must be ≥ 1",
          path: ["campaignRules", "limits", "maxtotalattempts"],
        });
      }
      if (limits.maxattemptsper_day <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Per-day attempts must be ≥ 1",
          path: ["campaignRules", "limits", "maxattemptsper_day"],
        });
      }
      if (limits.maxattemptsper_day > limits.maxtotalattempts) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Value must be less than Total Attempts",
          path: ["campaignRules", "limits", "maxattemptsper_day"],
        });
      }
      if (new Date(limits.endDate) < new Date(limits.startDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End Date must be after Start Date",
          path: ["campaignRules", "limits", "endDate"],
        });
      }
      const { start, end } = data.campaignRules.callinghours;
      if (new Date(`1970-01-01T${end}`) <= new Date(`1970-01-01T${start}`)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End Time must be after Start Time",
          path: ["campaignRules", "callinghours", "end"],
        });
      }

      if (data.campaignRules.retryrules?.NO_ANSWER?.enabled) {
        const val = data.campaignRules.retryrules.NO_ANSWER.intervalsminutes;
        const required = limits.maxattemptsper_day - 1;
        let arr = [];
        if (typeof val === "string") {
          arr = val
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v !== "" && !isNaN(Number(v)));
        }
        if (required > 0) {
          if (arr.length !== 1 && arr.length !== required) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Provide 1 common or ${required} specific intervals`,
              path: [
                "campaignRules",
                "retryrules",
                "NO_ANSWER",
                "intervalsminutes",
              ],
            });
          }
        } else if (arr.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Max Attempts is 1, no retry intervals needed",
            path: [
              "campaignRules",
              "retryrules",
              "NO_ANSWER",
              "intervalsminutes",
            ],
          });
        }
      }
    }
  });

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const today = new Date();
const tomorrow = new Date();
tomorrow.setDate(today.getDate() + 1);

const timeStringToDate = (timeStr) => {
  if (!timeStr) return new Date();
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const dateToTimeString = (date) => {
  if (!date) return "00:00";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const getIntervalArray = (val, requiredCount) => {
  let arr = [];
  if (Array.isArray(val)) arr = val;
  else if (typeof val === "string") {
    arr = val
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v !== "" && !isNaN(Number(v)))
      .map(Number);
  }
  if (arr.length === 1 && requiredCount > 1)
    return Array(requiredCount).fill(arr[0]);
  return arr.slice(0, requiredCount);
};

// ─── SectionCard ───────────────────────────────────────────────────────────────
const SectionCard = ({ icon: Icon, title, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="text-[13px] font-bold text-slate-700 tracking-tight">
        {title}
      </h3>
    </div>
    <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {children}
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const AdminCampaignCreate = () => {
  const navigate = useNavigate();

  const {
    getMemberGroups,
    getPhoneNumberGroup,
    getFrom,
    getMemberGroupsLoading,
    getPhoneNumberGroupLoading,
    memberGroupData,
    phoneNumberGroupData,
    formDatas,
    createCampaign,
    createLoading,
  } = useCampaignStore();

  useEffect(() => {
    getMemberGroups();
    getPhoneNumberGroup();
    getFrom();
  }, []);

  const form = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      Name: "",
      memberids: [],
      groupId: "",
      formId: "",
      dialerType: "MANUAL",
      campaignRules: {
        limits: {
          maxtotalattempts: 0,
          maxattemptsper_day: 0,
          maxChannels: 10,
          startDate: formatDate(today),
          endDate: formatDate(tomorrow),
        },
        callinghours: { start: "09:00", end: "18:00" },
        minRatio: 1,
        maxRatio: 1,
        ratio: 1,
        Strategy: "STATIC",
        wrapupInterval: 30,
        retryrules: {
          NO_ANSWER: { enabled: true, intervalsminutes: "" },
        },
      },
    },
  });

  const { watch, setValue, control, handleSubmit: hookHandleSubmit } = form;
  const formData = watch();

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setValue(field, value, { shouldValidate: true });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setValue(name, value, { shouldValidate: true });
  };

  const handleRulesChange = (section, field, value) => {
    setValue(`campaignRules.${section}.${field}`, value, {
      shouldValidate: true,
    });
  };

  const handleRetryChange = (type, field, value) => {
    setValue(`campaignRules.retryrules.${type}.${field}`, value, {
      shouldValidate: true,
    });
  };

  const handleSingleTimeChange = (field, { value }) => {
    setValue(`campaignRules.callinghours.${field}`, dateToTimeString(value), {
      shouldValidate: true,
    });
  };

  const handleDateChange = (field, { value }) => {
    setValue(`campaignRules.limits.${field}`, value ? formatDate(value) : "", {
      shouldValidate: true,
    });
  };

  const getIntervalPlaceholder = () => {
    const count = Number(formData.campaignRules.limits.maxattemptsper_day) - 1;
    if (count <= 0) return 'e.g. "20, 30"';
    return `e.g. "${Array.from({ length: count }, (_, i) => (i + 1) * 10).join(", ")}"`;
  };

  const handleSave = (data) => {
    const payload = JSON.parse(JSON.stringify(data));
    if (payload.dialerType === "PREDICTIVE") {
      if (!payload.campaignRules.ratio) {
        payload.campaignRules.ratio =
          payload.campaignRules.maxRatio || payload.campaignRules.minRatio || 1;
      }
      if (payload.campaignRules.retryrules?.NO_ANSWER) {
        const required =
          Number(payload.campaignRules.limits.maxattemptsper_day) - 1;
        payload.campaignRules.retryrules.NO_ANSWER.intervalsminutes =
          getIntervalArray(
            payload.campaignRules.retryrules.NO_ANSWER.intervalsminutes,
            required > 0 ? required : 0,
          );
      }
    } else {
      if (payload.campaignRules.retryrules?.NO_ANSWER)
        payload.campaignRules.retryrules.NO_ANSWER.intervalsminutes = [];
    }

    createCampaign(payload);
    navigate(-1);
  };

  const isPredictive = formData.dialerType === "PREDICTIVE";

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-slate-50/30">
      <Navbar
        title="Create Campaign"
        breadcrumbs={[
          { label: "Dashboard", route: "/admin-dashboard" },
          {
            label: "Campaign",
            route: "/admin-campaign?tab=campaign&page=1&per_page=10",
          },
          { label: "Create Campaign", active: true },
        ]}
      >
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button onClick={hookHandleSubmit(handleSave)} disabled={createLoading}>
          {createLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {createLoading ? "Saving..." : "Create Campaign"}
        </Button>
      </Navbar>

      <div className="flex-1 overflow-y-auto p-6">
        <Form {...form}>
          <div className="mx-auto flex flex-col gap-5">
            {/* ── Basic Info ── */}
            <SectionCard icon={Settings} title="Basic Information">
              <FormField
                control={control}
                name="Name"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input
                        id="Name"
                        placeholder="Enter Campaign Name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="memberids"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Member Group </FormLabel>
                    <FormControl>
                      <MultiSelect
                        id="memberids"
                        options={memberGroupData.map((m) => ({
                          label: m.m_membergroupName,
                          value: m.m_membergroupId,
                        }))}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select Member Groups"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="groupId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      Phone Number Group
                      <span className="text-rose-500 ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select
                        id="groupId"
                        options={phoneNumberGroupData.map((d) => ({
                          label: d.g_groupName || d.group_name,
                          value: String(d.g_groupId || d.group_id),
                        }))}
                        value={field.value ? String(field.value) : ""}
                        onValueChange={field.onChange}
                        placeholder="Select Phone Number Group"
                        showSearch
                        allowClear
                        onClear={() => field.onChange("")}
                        isLoading={getPhoneNumberGroupLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="formId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Form</FormLabel>

                    <FormControl>
                      <Select
                        id="formId"
                        options={formDatas.map((f) => ({
                          label: f.f_formName,
                          value: String(f.f_formId),
                        }))}
                        value={field.value ? String(field.value) : ""}
                        onValueChange={field.onChange}
                        placeholder="Select Form (Optional)"
                        showSearch
                        allowClear
                        onClear={() => field.onChange("")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="dialerType"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Dialer Type</FormLabel>
                    <FormControl>
                      <Select
                        id="dialerType"
                        options={[
                          { label: "MANUAL", value: "MANUAL" },
                          { label: "PREDICTIVE", value: "PREDICTIVE" },
                        ]}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select Dialer Type"
                        showSearch={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SectionCard>

            {/* ── Campaign Rules (Predictive only) ── */}
            {isPredictive && (
              <>
                {/* Schedule & Timing */}
                <SectionCard icon={Calendar} title="Schedule & Timing">
                  <FormField
                    control={control}
                    name="campaignRules.limits.startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <DateTimeRangePicker
                            type="single"
                            showTime={false}
                            showDate
                            initialStart={
                              field.value ? new Date(field.value) : new Date()
                            }
                            onChange={(val) =>
                              handleDateChange("startDate", val)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="campaignRules.limits.endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <DateTimeRangePicker
                            type="single"
                            showTime={false}
                            showDate
                            initialStart={
                              field.value ? new Date(field.value) : new Date()
                            }
                            onChange={(val) => handleDateChange("endDate", val)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="campaignRules.callinghours.start"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <DateTimeRangePicker
                            type="single"
                            showTime
                            showDate={false}
                            initialStart={timeStringToDate(field.value)}
                            onChange={(val) =>
                              handleSingleTimeChange("start", val)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="campaignRules.callinghours.end"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <DateTimeRangePicker
                            type="single"
                            showTime
                            showDate={false}
                            initialStart={timeStringToDate(field.value)}
                            onChange={(val) =>
                              handleSingleTimeChange("end", val)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SectionCard>

                {/* Capacity & Retries */}
                <SectionCard icon={Settings} title="Capacity & Retries">
                  <FormField
                    control={control}
                    name="campaignRules.limits.maxtotalattempts"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Max Total Retry</FormLabel>

                        <FormControl>
                          <Input
                            id="maxtotalattempts"
                            type="number"
                            placeholder="e.g. 5"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="campaignRules.limits.maxattemptsper_day"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Max Retry Per Day</FormLabel>
                        <FormControl>
                          <Input
                            id="maxattemptsper_day"
                            type="number"
                            placeholder="e.g. 3"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="campaignRules.limits.maxChannels"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Max Channels</FormLabel>
                        <FormControl>
                          <Input
                            id="maxChannels"
                            type="number"
                            placeholder="e.g. 10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="campaignRules.retryrules.NO_ANSWER.intervalsminutes"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Retry Interval (mins)</FormLabel>
                        <FormControl>
                          <Input
                            id="no_answer_retry"
                            placeholder={getIntervalPlaceholder()}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SectionCard>

                {/* Dialer Configuration */}
                <SectionCard icon={Zap} title="Dialer Configuration">
                  <FormField
                    control={control}
                    name="campaignRules.ratio"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Default Dialing Ratio</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            placeholder="Default Ratio"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="campaignRules.minRatio"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Min Dialing Ratio</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            placeholder="Min Ratio"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="campaignRules.maxRatio"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Max Dialing Ratio</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            placeholder="Max Ratio"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="campaignRules.Strategy"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Dialing Strategy</FormLabel>
                        <FormControl>
                          <Select
                            options={[
                              { label: "STATIC", value: "STATIC" },
                              { label: "ADAPTIVE", value: "ADAPTIVE" },
                            ]}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select Strategy"
                            showSearch={false}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="campaignRules.wrapupInterval"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Wrapup Interval (secs)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={3600}
                            placeholder="e.g. 30"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SectionCard>
              </>
            )}
          </div>
        </Form>
      </div>
    </div>
  );
};

export default AdminCampaignCreate;
