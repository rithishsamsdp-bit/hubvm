import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEmailAutomationStore } from "../../store/admin/reports/useEmailAutomationStore";
import { useUsersStore } from "../../store/admin/useUsersStore";
import { useToastStore } from "../../store/useToastStore";

// shadcn/ui Components
import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Edit, Trash2, Loader2, Play, Pause, X } from "lucide-react";
import { Navbar } from "../../components/Index.jsx";
import { cn } from "@/lib/utils";

// react-hook-form + zod
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const emailAutomationSchema = z.object({
  name: z.string().min(1, "Automation Name is required"),
  reportName: z.string().min(1, "Report Name is required"),
  repeat: z.string().min(1, "Repeat schedule is required"),
  time: z.string().optional(),
  day: z.string().optional(),
  dataRange: z.string().optional(),
  toEmail: z
    .string()
    .min(1, "To Email is required")
    .email("Valid email is required"),
  ccEmail: z.array(z.string().email("Invalid CC email")).optional().default([]),
  timezoneFilter: z.string().optional().default("Asia/Kolkata"),
  extensionFilter: z.array(z.string()).optional().default([]),
  fieldsFilter: z.array(z.string()).optional().default([]),
});

const EmailAutomation = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [offset, setOffset] = useState(0);

  const {
    emailAutomations,
    totalCount,
    isLoading,
    isCreating,
    isDeleting,
    isUpdating,
    fetchEmailAutomations,
    createEmailAutomation,
    deleteEmailAutomation,
    updateEmailAutomation,
    toggleEmailAutomationStatus,
  } = useEmailAutomationStore();

  const { userListData, getUsersList } = useUsersStore();
  const { toast } = useToastStore();

  const form = useForm({
    resolver: zodResolver(emailAutomationSchema),
    defaultValues: {
      name: "",
      reportName: "",
      repeat: "",
      time: "09:00",
      day: "",
      dataRange: "previous_day",
      toEmail: "",
      ccEmail: [],
      timezoneFilter: "Asia/Kolkata",
      extensionFilter: [],
      fieldsFilter: [],
    },
  });

  const reportOptions = [{ value: "CDR Report", label: "CDR Report" }];

  const repeatOptions = [
    { value: "Daily", label: "Daily" },
    { value: "Weekly", label: "Weekly" },
    { value: "Monthly", label: "Monthly" },
  ];

  const dataRangeOptions = [
    { value: "previous_day", label: "Previous Day Only" },
    { value: "month_to_date", label: "Month to Date (1st to Previous Day)" },
  ];

  const dayOptions = [
    { value: "Sunday", label: "Sunday" },
    { value: "Monday", label: "Monday" },
    { value: "Tuesday", label: "Tuesday" },
    { value: "Wednesday", label: "Wednesday" },
    { value: "Thursday", label: "Thursday" },
    { value: "Friday", label: "Friday" },
    { value: "Saturday", label: "Saturday" },
  ];

  const timezoneOptions = [
    { value: "Asia/Kolkata", label: "(GMT+05:30) IST - Kolkata" },
    { value: "UTC", label: "(GMT+00:00) UTC" },
    { value: "America/New_York", label: "(GMT-05:00) EST - New York" },
    { value: "America/Chicago", label: "(GMT-06:00) CST - Chicago" },
    { value: "America/Denver", label: "(GMT-07:00) MST - Denver" },
    { value: "America/Los_Angeles", label: "(GMT-08:00) PST - Los Angeles" },
  ];

  const fieldOptions = [
    { value: "AccountCode", label: "Account Code" },
    { value: "CampaignName", label: "Campaign Name" },
    { value: "MemberName", label: "Member Name" },
    { value: "CustomerPhoneNumber", label: "Customer Phone Number" },
    { value: "CallDateTime", label: "Call Date Time" },
    { value: "CallDirection", label: "Call Direction" },
    { value: "CallDisposition", label: "Call Disposition" },
    { value: "CallDuration", label: "Call Duration" },
    { value: "CallMode", label: "Call Mode" },
    { value: "WrapUpDuration", label: "Wrap Up Duration" },
    { value: "CallLineNumber", label: "Call Line Number" },
    { value: "MemberExtensionNumber", label: "Member Extension Number" },
    { value: "MemberPhoneNumber", label: "Member Phone Number" },
    { value: "MemberExtensionName", label: "Member Extension Name" },
    { value: "MemberRegisteredIP", label: "Member Registered IP" },
    { value: "CallDisconnectionEnd", label: "Call Disconnection End" },
  ];

  const agentOptions = userListData
    .filter(
      (user) => user.m_memberRole === "USER" || user.m_memberRole === "TL",
    )
    .map((user) => ({
      value: String(user.m_memberExtensionNo),
      label: `${user.m_memberName} (${user.m_memberExtensionNo})`,
    }));

  const [emailInput, setEmailInput] = useState("");

  const handleEmailKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const email = emailInput.trim();
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const currentCc = form.getValues("ccEmail");
        if (!currentCc.includes(email)) {
          form.setValue("ccEmail", [...currentCc, email], {
            shouldValidate: true,
          });
        }
        setEmailInput("");
      }
    }
  };

  const handleRemoveEmail = (emailToRemove) => {
    const currentCc = form.getValues("ccEmail");
    form.setValue(
      "ccEmail",
      currentCc.filter((e) => e !== emailToRemove),
      { shouldValidate: true },
    );
  };

  useEffect(() => {
    fetchEmailAutomations(pageSize, offset);
    getUsersList(1000, 0, "m_memberName", "ASC", "", "", "", "");
  }, [pageSize, offset]);

  const onSubmit = async (values) => {
    try {
      let currentCcEmails = [...values.ccEmail];
      const trimmedEmailInput = emailInput.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (trimmedEmailInput && emailRegex.test(trimmedEmailInput)) {
        if (!currentCcEmails.includes(trimmedEmailInput)) {
          currentCcEmails.push(trimmedEmailInput);
        }
      }

      const payload = {
        name: values.name,
        reportName: values.reportName,
        schedule: values.repeat,
        time: values.time || "",
        day: values.day || "",
        dataRange:
          values.repeat === "Daily" ? values.dataRange || "previous_day" : "",
        toEmail: values.toEmail,
        ccEmail: currentCcEmails,
        extensionFilter: values.extensionFilter || [],
        timezoneFilter: values.timezoneFilter || "",
        fieldsFilter: values.fieldsFilter || [],
      };

      let response;
      if (editId) {
        response = await updateEmailAutomation(editId, payload);
        toast?.success(
          response?.data?.message || "Email automation updated successfully",
        );
      } else {
        response = await createEmailAutomation(payload);
        toast?.success(
          response?.data?.message || "Email automation created successfully",
        );
      }

      setEditId(null);
      setEmailInput("");
      setIsModalOpen(false);
      fetchEmailAutomations(pageSize, offset, false);
    } catch (error) {
      console.error("Save automation error:", error);
      const action = editId ? "update" : "create";
      toast?.error(
        error?.response?.data?.message ||
          `Failed to ${action} email automation`,
      );
    }
  };

  const handlePageChange = (pagevalues) => {
    const newOffset =
      pagevalues.pageSize * pagevalues.currentPage - pagevalues.pageSize;
    if (
      pagevalues.currentPage === page &&
      pagevalues.pageSize === pageSize &&
      newOffset === offset
    ) {
      return;
    }

    setTimeout(() => {
      setPage(pagevalues.currentPage);
      setPageSize(pagevalues.pageSize);
      setOffset(newOffset);
    }, 0);
  };

  const handleDeleteClick = (ma_id) => {
    setDeleteId(ma_id);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId || isDeleting) return;

    setIsDeleteConfirmOpen(false);
    const idToDelete = deleteId;
    setDeleteId(null);

    try {
      const response = await deleteEmailAutomation(idToDelete);
      toast.success(
        response?.data?.message || "Email automation deleted successfully",
      );
      fetchEmailAutomations(pageSize, offset, false);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete email automation";
      toast.error(errorMessage);
    }
  };

  const handleEditClick = (record) => {
    setEditId(record.ma_id);
    form.reset({
      name: record.ma_name,
      reportName: record.ma_reportName,
      repeat: record.ma_schedule,
      time: record.ma_time || "09:00",
      day: record.ma_day || "",
      dataRange: record.ma_dataRange || "previous_day",
      toEmail: record.ma_toEmail,
      ccEmail: Array.isArray(record.ma_ccEmail) ? record.ma_ccEmail : [],
      extensionFilter: Array.isArray(record.ma_extensionFilter)
        ? record.ma_extensionFilter
        : [],
      timezoneFilter: record.ma_timezoneFilter || "Asia/Kolkata",
      fieldsFilter: Array.isArray(record.ma_fieldsFilter)
        ? record.ma_fieldsFilter
        : [],
    });
    setEmailInput("");
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    form.reset({
      name: "",
      reportName: "",
      repeat: "",
      time: "09:00",
      day: "",
      dataRange: "previous_day",
      toEmail: "",
      ccEmail: [],
      timezoneFilter: "Asia/Kolkata",
      extensionFilter: [],
      fieldsFilter: [],
    });
    setEmailInput("");
    setEditId(null);
    setIsModalOpen(true);
  };

  const columns = [
    {
      title: "S.no",
      key: "s_no",
      width: 60,
      Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
    },
    { title: "Automation Name", key: "ma_name" },
    { title: "Report Name", key: "ma_reportName" },
    { title: "Schedule", key: "ma_schedule" },
    {
      title: "Data Range",
      key: "ma_dataRange",
      Cell: (record) => {
        if (record.ma_schedule === "Daily") {
          return record.ma_dataRange === "month_to_date"
            ? "Month to Date"
            : "Previous Day";
        }
        if (record.ma_schedule === "Weekly") return "Last 7 Days";
        if (record.ma_schedule === "Monthly") return "Previous Month";
        return "-";
      },
    },
    {
      title: "Time",
      key: "ma_time",
      Cell: (record) => record.ma_time || "-",
    },
    {
      title: "Day",
      key: "ma_day",
      Cell: (record) => record.ma_day || "-",
    },
    { title: "To Email", key: "ma_toEmail" },
    {
      title: "CC Email",
      key: "ma_ccEmail",
      Cell: (record) => {
        const emails = Array.isArray(record.ma_ccEmail)
          ? record.ma_ccEmail
          : [];
        const validEmails = emails.filter(Boolean);

        return (
          <Popover>
            <PopoverTrigger asChild>
              <div className="flex flex-wrap gap-1 cursor-pointer">
                {validEmails.length > 0 ? (
                  <>
                    <Badge variant="outline" className="bg-slate-50">
                      {validEmails[0]}
                    </Badge>
                    {validEmails.length > 1 && (
                      <Badge variant="secondary">
                        +{validEmails.length - 1}
                      </Badge>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400 text-xs">-</span>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                CC Emails
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {validEmails.length === 0 ? (
                  <p className="text-xs text-slate-500">No CC emails</p>
                ) : (
                  validEmails.map((email, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-slate-600 px-2 py-1 bg-slate-50 rounded-md border border-slate-100 break-all"
                    >
                      {email}
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        );
      },
    },
    {
      title: "Status",
      key: "ma_status",
      Cell: (record) => {
        const status = record.ma_status || "ACTIVE";
        const config = {
          ACTIVE: { bg: "bg-green-100", text: "text-green-700" },
          INACTIVE: { bg: "bg-rose-100", text: "text-rose-700" },
        };
        const { bg, text } = config[status] || config.ACTIVE;
        return (
          <span
            className={cn(
              "px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap",
              bg,
              text,
            )}
          >
            {status}
          </span>
        );
      },
    },
    {
      title: "Created On",
      key: "ma_createdOn",
      Cell: (record) => {
        if (record.ma_createdOn) {
          const date = new Date(record.ma_createdOn);
          return (
            date.toLocaleDateString() +
            " " +
            date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          );
        }
        return "-";
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "right",
      Cell: (record) => (
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={async () => {
                    try {
                      await toggleEmailAutomationStatus(record.ma_id);
                      toast.success(
                        `Automation ${record.ma_status === "ACTIVE" ? "Paused" : "Resumed"} Successfully`,
                      );
                    } catch (error) {
                      toast.error("Failed to update status");
                    }
                  }}
                  disabled={isCreating || isDeleting || isUpdating}
                  className={
                    record.ma_status === "ACTIVE"
                      ? "hover:bg-rose-50 hover:text-rose-500"
                      : "hover:bg-green-50 hover:text-green-500"
                  }
                >
                  {record.ma_status === "ACTIVE" ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {record.ma_status === "ACTIVE" ? "Pause" : "Resume"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hover:bg-primary/10 hover:text-primary"
                  onClick={() => handleEditClick(record)}
                  disabled={isCreating || isDeleting || isUpdating}
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hover:bg-rose-50 hover:text-rose-500"
                  onClick={() => handleDeleteClick(record.ma_id)}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden">
      <Navbar
        title="Email Automation"
        breadcrumbs={[
          { label: "Dashboard", route: "/admin-dashboard" },
          { label: "Email Automation", active: true },
        ]}
      >
        <Button onClick={handleCreateNew}>Create Automation</Button>
      </Navbar>

      <div className="flex-1 min-h-0 w-full p-6 overflow-y-auto overflow-x-hidden bg-slate-50">
        <div className="flex flex-col gap-4 w-full h-full">
          {/* Data Table */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <DataTable
              columns={columns}
              data={emailAutomations}
              loading={isLoading}
              totaldata={totalCount}
              page={page}
              pageSize={pageSize}
              serverSide={true}
              onPageChange={(pagevalues) => {
                setTimeout(() => {
                  setPage(pagevalues.currentPage);
                  setPageSize(pagevalues.pageSize);
                  setOffset(
                    pagevalues.pageSize * pagevalues.currentPage -
                      pagevalues.pageSize,
                  );
                }, 0);
              }}
            />
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(v) => {
          if (!v) {
            setIsModalOpen(false);
            setEditId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[720px] p-0 gap-0">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Automation" : "Create Automation"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col bg-[#F1F5F9] max-h-[80vh] overflow-hidden"
            >
              <div className="px-6 py-5 space-y-5 bg-slate-50/50 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  {/* Automation Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 col-span-2">
                        <FormLabel className="text-xs font-bold text-slate-700">
                          Automation Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter automation name"
                            className="bg-white"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  {/* Report Name */}
                  <FormField
                    control={form.control}
                    name="reportName"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-bold text-slate-700">
                          Report Name
                        </FormLabel>
                        <Select
                          options={reportOptions}
                          onValueChange={field.onChange}
                          value={field.value}
                          placeholder="Select report"
                        />
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  {/* Repeat */}
                  <FormField
                    control={form.control}
                    name="repeat"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-bold text-slate-700">
                          Repeat
                        </FormLabel>
                        <Select
                          options={repeatOptions}
                          onValueChange={field.onChange}
                          value={field.value}
                          placeholder="Select repeat"
                        />
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  {/* Select Day (Weekly) */}
                  {form.watch("repeat") === "Weekly" && (
                    <FormField
                      control={form.control}
                      name="day"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs font-bold text-slate-700">
                            Select Day
                          </FormLabel>
                          <Select
                            options={dayOptions}
                            onValueChange={field.onChange}
                            value={field.value}
                            placeholder="Select day"
                            showSearch={false}
                          />
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Data Range (Daily) */}
                  {form.watch("repeat") === "Daily" && (
                    <FormField
                      control={form.control}
                      name="dataRange"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs font-bold text-slate-700">
                            Data Range
                          </FormLabel>
                          <Select
                            options={dataRangeOptions}
                            onValueChange={field.onChange}
                            value={field.value}
                            placeholder="Select data range"
                            showSearch={false}
                          />
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Select Time */}
                  {(form.watch("repeat") === "Daily" ||
                    form.watch("repeat") === "Weekly") && (
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs font-bold text-slate-700">
                            Select Time
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              className="bg-white cursor-pointer w-full"
                              onClick={(e) => {
                                try {
                                  if (
                                    typeof e.target.showPicker === "function"
                                  ) {
                                    e.target.showPicker();
                                  }
                                } catch (error) {
                                  // Ignore error if picker is already showing
                                }
                              }}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* To Email */}
                  <FormField
                    control={form.control}
                    name="toEmail"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 col-span-2">
                        <FormLabel className="text-xs font-bold text-slate-700">
                          To Email Address
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter email address"
                            className="bg-white"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  {/* CC Emails */}
                  <FormField
                    control={form.control}
                    name="ccEmail"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 col-span-2">
                        <FormLabel className="text-xs font-bold text-slate-700">
                          CC Email IDs
                        </FormLabel>
                        <div
                          className="flex flex-wrap items-center gap-1.5 min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm transition-all focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary cursor-text shadow-sm"
                          onClick={() =>
                            document.getElementById("cc-email-input").focus()
                          }
                        >
                          {(field.value || []).map((email, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] xl:text-xs font-medium text-slate-800"
                            >
                              {email}
                              <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-sm text-slate-400 hover:text-slate-800 focus:outline-none"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveEmail(email);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          <input
                            id="cc-email-input"
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            onKeyDown={handleEmailKeyDown}
                            placeholder={
                              (field.value?.length || 0) > 0
                                ? ""
                                : "Enter email and press Enter or comma"
                            }
                            className="flex-1 min-w-[200px] bg-transparent outline-none text-[11px] xl:text-xs placeholder:text-slate-400"
                          />
                        </div>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  {/* Timezone Filter */}
                  <FormField
                    control={form.control}
                    name="timezoneFilter"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 col-span-2">
                        <FormLabel className="text-xs font-bold text-slate-700">
                          Timezone Filter (Optional)
                        </FormLabel>
                        <Select
                          options={timezoneOptions}
                          onValueChange={field.onChange}
                          value={field.value}
                          placeholder="Select timezone"
                        />
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  {/* Extension Filter */}
                  <FormField
                    control={form.control}
                    name="extensionFilter"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 col-span-2">
                        <FormLabel className="text-xs font-bold text-slate-700">
                          Extension Filter (Agent wise) (Optional)
                        </FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={agentOptions}
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            placeholder="Select agents"
                            variant="inverted"
                            maxCount={3}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  {/* Fields Filter */}
                  <FormField
                    control={form.control}
                    name="fieldsFilter"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 col-span-2">
                        <FormLabel className="text-xs font-bold text-slate-700">
                          Fields Filter (Optional)
                        </FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={fieldOptions}
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            placeholder="Select fields"
                            variant="inverted"
                            maxCount={3}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="bg-[#F1F5F9] border-t border-slate-300">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {editId
                    ? isUpdating
                      ? "Updating..."
                      : "Update"
                    : isCreating
                      ? "Creating..."
                      : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={isDeleteConfirmOpen}
        onOpenChange={(v) => !v && setIsDeleteConfirmOpen(false)}
      >
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
          <div className="p-6 pt-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mb-4 ring-4 ring-rose-50">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-800 mb-2">
              Delete Automation?
            </DialogTitle>
            <div className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete this email automation? This action
              cannot be undone.
            </div>
            <div className="flex w-full gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailAutomation;
