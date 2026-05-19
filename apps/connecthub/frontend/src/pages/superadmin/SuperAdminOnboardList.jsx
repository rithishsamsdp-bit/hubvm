import { useEffect, useState, useMemo, useRef } from "react";
import { useOnboard } from "../../store/superadmin/useOnboard";
import { useNavigate } from "react-router-dom";
import Icon from "../../constants/Icon.jsx";
import { Loader, Navbar } from "../../components/Index.jsx";
import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDebounce } from "../../hooks/useDebounce.js";
import { TIMEZONES } from "../../constants/timezone.js";

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
import { cn } from "@/lib/utils";

const onboardSchema = z.object({
  custName: z.string().min(1, { message: "Customer Name is required" }),
  acccode: z
    .string()
    .min(1, { message: "Account Code is required" })
    .refine((val) => !/\s/.test(val), {
      message: "Account Code must not contain spaces",
    }),
  contact: z
    .string()
    .regex(/^\d{10}$/, { message: "Contact must be exactly 10 digits" }),
  mailid: z.string().email({ message: "Invalid email format" }),
  businessvertical: z
    .string()
    .min(1, { message: "Business Vertical is required" }),
  plan: z.enum(["Basic", "Professional", "Enterprise"], {
    errorMap: () => ({ message: "Invalid plan" }),
  }),
  salepersonname: z
    .string()
    .min(1, { message: "Sales Person Name is required" }),
  serviceRegion: z.enum(
    ["Domestic", "International", "International-mid", "Domestic-mid"],
    { errorMap: () => ({ message: "Invalid service region" }) },
  ),
  timezone: z.string().min(1, { message: "Time zone is required" }),
});

const SuperAdminOnboard = () => {
  const navigate = useNavigate();

  const {
    getOnboard,
    isOnboardLoading,
    onboardData,
    onboardTotalCount,
    modalLoading,
    createOnboard,
    validateAccountCode,
  } = useOnboard();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [editId, setEditId] = useState("");
  const [open, setOpen] = useState(false);
  const [searchString, setSearchString] = useState("");
  const debouncedSearchString = useDebounce(searchString, 500);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [tzSearch, setTzSearch] = useState("");
  const codeCheckTimeout = useRef(null);

  const form = useForm({
    resolver: zodResolver(onboardSchema),
    defaultValues: {
      custName: "",
      acccode: "",
      contact: "",
      mailid: "",
      businessvertical: "",
      plan: "",
      salepersonname: "",
      serviceRegion: "",
      timezone: "",
    },
  });

  useEffect(() => {
    navigate(`/superadmin-onboard?page=${page}&per_page=${pageSize}`, {
      replace: true,
    });
  }, [page, pageSize, navigate]);

  useEffect(() => {
    getOnboard(pageSize, offset, sortField, sortOrder, debouncedSearchString);
  }, [
    pageSize,
    offset,
    sortField,
    sortOrder,
    debouncedSearchString,
    getOnboard,
  ]);

  const columns = useMemo(
    () => [
      {
        title: "S.no",
        key: "s_no",
        Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
      },
      { title: "Company Name", key: "a_accountName" },
      { title: "Code", key: "a_accountCode" },
      { title: "Prefix", key: "a_accountPrefix" },
      { title: "Service Region", key: "a_accountServiceRegion" },
      { title: "Mailid", key: "a_accountMailId" },
      { title: "Plan Name", key: "a_planName", Cell: (row) => row.a_planName ? <StatusBadge text={row.a_planName} variant="info" /> : "-" },
      { title: "Sales Person", key: "a_salesRepName" },
      {
        title: "Action",
        key: "action",
        Cell: (record) => (
          <div
            className="w-full flex gap-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(
                        `/superadmin-onboard/edit?id=${record.a_accountId}&tab=global`,
                      );
                    }}
                  >
                    <Icon name="settings" size={15} color="#5F6368" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(
                        `/superadmin-onboard/ip?id=${record.a_accountId}`,
                      );
                    }}
                  >
                    <Icon name="edit" size={15} color="#5F6368" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ip</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ),
      },
    ],
    [page, pageSize, navigate],
  );

  const onSubmit = async (values) => {
    if (isCheckingCode || form.formState.errors.acccode) return;

    try {
      await createOnboard(values);
      setOpen(false);
      form.reset();
      setEditId("");
      await getOnboard(
        pageSize,
        offset,
        sortField,
        sortOrder,
        debouncedSearchString,
      );
    } catch (err) {
      console.error("Save failed:", err);
      form.setError("root", {
        type: "manual",
        message: err.response?.data?.message || "Save failed.",
      });
    }
  };

  const handleRowClick = (row) => {
    navigate(
      `/superadmin-onboard/members?id=${row.a_accountId}&name=${encodeURIComponent(row.a_accountName)}&code=${row.a_accountCode}`,
    );
  };

  const handleCancel = () => {
    form.reset();
    setEditId("");
    setOpen(false);
  };

  const fieldsConfig = [
    {
      name: "custName",
      label: "Customer Name",
      type: "text",
      placeholder: "Enter name",
    },
    {
      name: "acccode",
      label: "Account Code",
      type: "text",
      placeholder: "Enter code",
    },
    {
      name: "contact",
      label: "Contact",
      type: "tel",
      placeholder: "Enter Mobile Number",
      maxLength: 10,
      inputMode: "numeric",
      pattern: "[0-9]*",
    },
    {
      name: "mailid",
      label: "MailId",
      type: "email",
      placeholder: "Enter mail id",
    },
    {
      name: "businessvertical",
      label: "Business Vertical",
      type: "text",
      placeholder: "Enter Business Vertical",
    },
    {
      name: "plan",
      label: "Plan",
      component: "select",
      placeholder: "Select plan",
      options: [
        { value: "Basic", label: "Basic" },
        { value: "Professional", label: "Professional" },
        { value: "Enterprise", label: "Enterprise" },
      ],
    },
    {
      name: "serviceRegion",
      label: "Service Region",
      component: "select",
      placeholder: "Select Region",
      options: [
        { value: "Domestic", label: "Domestic" },
        { value: "International", label: "International" },
        { value: "Domestic-mid", label: "Domestic-mid" },
        { value: "International-mid", label: "International-mid" },
      ],
    },
    {
      name: "timezone",
      label: "Time Zone",
      component: "select",
      placeholder: "Select Time Zone",
      showSearch: true,
      options: TIMEZONES,
    },
    {
      name: "salepersonname",
      label: "Sales Person Name",
      type: "text",
      placeholder: "Enter Sales Person Name",
    },
  ];

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden">
      <Navbar
        title="Onboard"
        breadcrumbs={[{ label: "Onboard", active: true }]}
      >
        <Button onClick={() => setOpen(true)}>Create Customer</Button>
      </Navbar>

      <div className="w-full h-[calc(100%-90px)] p-6 flex flex-col gap-4 overflow-hidden bg-muted/20">
        <div className="w-full flex items-center justify-end gap-4">
          <div className="relative w-[350px] group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              type="text"
              placeholder="Search by customer name or email..."
              className="pl-10 placeholder:text-[11px] xl:placeholder:text-xs 2xl:placeholder:text-sm"
              onChange={(e) => setSearchString(e.target.value)}
              value={searchString}
            />
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={onboardData}
            loading={isOnboardLoading}
            totaldata={onboardTotalCount}
            page={page}
            serverSide
            pageSize={pageSize}
            clickableRows={true}
            onRowClick={handleRowClick}
            onPageChange={(pagevalues) => {
              setPage(pagevalues.currentPage);
              setPageSize(pagevalues.pageSize);
              setOffset(pagevalues.pageSize * (pagevalues.currentPage - 1));
              setSortField(pagevalues.sortConfig?.key || "");
              setSortOrder(pagevalues.sortConfig?.direction || "");
            }}
          />
        </div>

        {/* Modal */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="sm:max-w-[720px] p-0"
            closeOnOutsideClick={false}
            aria-describedby={undefined}
          >
            <DialogHeader>
              <DialogTitle>
                {editId ? "Edit Onboard" : "Create New Onboard"}
              </DialogTitle>
            </DialogHeader>

            {modalLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader />
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="flex flex-col bg-[#F1F5F9]"
                >
                  <div className="p-6 max-h-[65vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      {fieldsConfig.map(
                        ({
                          name,
                          label,
                          placeholder,
                          type,
                          options,
                          component,
                          maxLength,
                        }) => (
                          <FormField
                            key={name}
                            control={form.control}
                            name={name}
                            render={({ field }) => (
                              <FormItem className="space-y-1.5">
                                <FormLabel>{label}</FormLabel>
                                {component === "select" ? (
                                  <FormControl>
                                    <Select
                                      options={
                                        name === "timezone"
                                          ? options
                                              .filter(
                                                (v, i, a) =>
                                                  a.findIndex(
                                                    (t) => t.value === v.value,
                                                  ) === i,
                                              )
                                              .filter((opt) =>
                                                opt.label
                                                  .toLowerCase()
                                                  .includes(
                                                    tzSearch.toLowerCase(),
                                                  ),
                                              )
                                          : options
                                      }
                                      onValueChange={field.onChange}
                                      value={field.value}
                                      defaultValue={field.value}
                                      placeholder={placeholder}
                                      showSearch={name === "timezone"}
                                      searchValue={tzSearch}
                                      onSearchChange={setTzSearch}
                                      allowClear={true}
                                      onClear={() => field.onChange("")}
                                      triggerClassName={cn(
                                        "bg-white border-slate-200 rounded-xl h-10",
                                        form.formState.errors[name] &&
                                          "border-destructive ring-3 ring-destructive/20",
                                      )}
                                    />
                                  </FormControl>
                                ) : (
                                  <FormControl>
                                    <Input
                                      type={type}
                                      placeholder={placeholder}
                                      className={cn(
                                        "bg-white border-slate-200 shadow-sm focus-visible:ring-primary/10",
                                        form.formState.errors[name] &&
                                          "border-destructive ring-3 ring-destructive/20 focus-visible:ring-destructive/20",
                                      )}
                                      {...field}
                                      {...(maxLength ? { maxLength } : {})}
                                      onChange={(e) => {
                                        let val = e.target.value;
                                        if (name === "contact") {
                                          val = val
                                            .replace(/\D/g, "")
                                            .slice(0, 10);
                                        }
                                        field.onChange(val);

                                        if (name === "acccode") {
                                          if (codeCheckTimeout.current)
                                            clearTimeout(
                                              codeCheckTimeout.current,
                                            );
                                          codeCheckTimeout.current = setTimeout(
                                            async () => {
                                              if (!val.trim()) return;
                                              setIsCheckingCode(true);
                                              const exists =
                                                await validateAccountCode(
                                                  val.trim(),
                                                );
                                              setIsCheckingCode(false);
                                              if (exists) {
                                                form.setError("acccode", {
                                                  type: "manual",
                                                  message:
                                                    "Account Code already exists",
                                                });
                                              } else {
                                                form.clearErrors("acccode");
                                              }
                                            },
                                            500,
                                          );
                                        }
                                      }}
                                    />
                                  </FormControl>
                                )}
                                {name === "acccode" && isCheckingCode && (
                                  <p className="text-[10px] text-slate-400 font-medium ml-1">
                                    Checking...
                                  </p>
                                )}
                                <FormMessage className="ml-1 text-[13px] font-medium" />
                              </FormItem>
                            )}
                          />
                        ),
                      )}
                    </div>
                    {form.formState.errors.root && (
                      <div className="mt-4 text-[13px] text-destructive font-medium text-center">
                        {form.formState.errors.root.message}
                      </div>
                    )}
                  </div>

                  <DialogFooter className="bg-[#F1F5F9] border-t border-slate-300">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-4 text-xs font-semibold"
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="default"
                      className=" px-6 text-xs font-bold"
                    >
                      {editId ? "Update Customer" : "Save Customer"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SuperAdminOnboard;
