import { useEffect, useState, useMemo } from "react";
import { useOnboard } from "../../store/superadmin/useOnboard";
import { useNavigate, useLocation } from "react-router-dom";
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
import { Search, Plus, Edit, X } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce.js";
import { cn } from "@/lib/utils";

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

const whatsappSchema = z.object({
  w_accountId: z.string().min(1, { message: "Customer is required" }),
  w_whatsappNumber: z
    .string()
    .min(1, { message: "WhatsApp Number is required" }),
  w_phNumberId: z.string().optional(),
  w_apiKey: z.string().optional(),
  w_wabaID: z.string().optional(),
  service: z.string().optional(),
  utility: z.string().optional(),
  marketing: z.string().optional(),
});

const SuperAdminWhatsAppList = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    getWhatsAppAccounts,
    whatsAppAccounts,
    isWhatsAppLoading,
    isOnboardLoading,
    getOnboard,
    onboardData, // For dropdown
    createWhatsAppAccount,
    updateWhatsAppAccount,
    modalLoading,
  } = useOnboard();

  const queryParams = new URLSearchParams(location.search);
  const initialPage = parseInt(queryParams.get("page")) || 1;
  const initialPageSize = parseInt(queryParams.get("per_page")) || 10;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchString, setSearchString] = useState("");
  const debouncedSearchString = useDebounce(searchString, 500);

  useEffect(() => {
    navigate(`/superadmin-whatsapp?page=${page}&per_page=${pageSize}`, {
      replace: true,
    });
  }, [page, pageSize, navigate]);

  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [custSearch, setCustSearch] = useState("");

  const form = useForm({
    resolver: zodResolver(whatsappSchema),
    defaultValues: {
      w_accountId: "",
      w_whatsappNumber: "",
      w_phNumberId: "",
      w_apiKey: "",
      w_wabaID: "",
      service: "0.00",
      utility: "0.00",
      marketing: "0.00",
    },
  });

  useEffect(() => {
    // Fetch WhatsApp Accounts
    getWhatsAppAccounts();
  }, []);

  const columns = useMemo(
    () => [
      {
        title: "S.no",
        key: "s_no",
        Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
      },
      { title: "Company Name", key: "a_accountName" },
      { title: "WhatsApp Number", key: "w_whatsappNumber" },
      { title: "Phone Number ID", key: "w_phNumberId" },
      { title: "WABA ID", key: "w_wabaID" },
      {
        title: "Status",
        key: "w_status",
        Cell: (row) => (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
            {row.w_status || "Active"}
          </span>
        ),
      },
      {
        title: "Action",
        key: "action",
        Cell: (record) => (
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-primary/10 hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEdit(true);
                      setEditId(record.w_whatsappAccountId);
                      setCustSearch("");
                      form.reset({
                        w_accountId: record.w_accountId
                          ? String(record.w_accountId)
                          : "",
                        w_whatsappNumber: record.w_whatsappNumber,
                        w_phNumberId: record.w_phNumberId,
                        w_apiKey: record.w_apiKey,
                        w_wabaID: record.w_wabaID,
                        service: record.w_amountDeduction?.service || "0.00",
                        utility: record.w_amountDeduction?.utility || "0.00",
                        marketing:
                          record.w_amountDeduction?.marketing || "0.00",
                      });
                      setOpen(true);
                      getOnboard(1000, 0, "a_accountName", "ASC", "");
                    }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit WhatsApp Config</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ),
      },
    ],
    [page, pageSize, getOnboard],
  );

  // Open Modal and fetch customers for dropdown
  const handleOpenModal = () => {
    setIsEdit(false);
    setEditId(null);
    setCustSearch("");
    form.reset({
      w_accountId: "",
      w_whatsappNumber: "",
      w_phNumberId: "",
      w_apiKey: "",
      w_wabaID: "",
      service: "0.00",
      utility: "0.00",
      marketing: "0.00",
    });
    setOpen(true);
    // Fetch all accounts for dropdown
    getOnboard(1000, 0, "a_accountName", "ASC", "");
  };

  const onSubmit = async (data) => {
    if (isEdit) {
      await updateWhatsAppAccount({ ...data, w_whatsappAccountId: editId });
    } else {
      await createWhatsAppAccount(data);
    }
    setOpen(false);
  };

  const accountOptions = useMemo(() => {
    if (!Array.isArray(onboardData)) return [];
    return onboardData
      .filter((acc) =>
        acc.a_accountName
          ?.toLowerCase()
          .includes((custSearch || "").toLowerCase()),
      )
      .map((acc) => ({
        label: acc.a_accountName,
        value: String(acc.a_accountId),
      }));
  }, [onboardData, custSearch]);

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden">
      <Navbar
        title="WhatsApp Onboard"
        breadcrumbs={[
          { label: "Onboard", route: "/superadmin-onboard" },
          { label: "WhatsApp Onboard", active: true },
        ]}
      >
        <Button variant="default" onClick={handleOpenModal}>
          Create Account
        </Button>
      </Navbar>

      <div className="w-full h-[calc(100%-90px)] p-6 flex flex-col gap-4 overflow-hidden bg-muted/20">
        <div className="w-full flex items-center justify-end gap-4">
          <div className="relative w-[350px] group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              type="text"
              placeholder="Search by company name or number..."
              className="pl-10 placeholder:text-[11px] xl:placeholder:text-xs 2xl:placeholder:text-sm"
              onChange={(e) => setSearchString(e.target.value)}
              value={searchString}
            />
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={whatsAppAccounts}
            loading={isWhatsAppLoading}
            totaldata={whatsAppAccounts.length}
            page={page}
            serverSide={false}
            pageSize={pageSize}
            onPageChange={(pagevalues) => {
              setPage(pagevalues.currentPage);
              setPageSize(pagevalues.pageSize);
            }}
          />
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl"
          closeOnOutsideClick={false}
        >
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit WhatsApp Account" : "Create WhatsApp Account"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col bg-[#F1F5F9]"
            >
              <div className="p-6 bg-slate-50/50 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <FormField
                    control={form.control}
                    name="w_accountId"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 md:col-span-2">
                        <FormLabel>Select Customer</FormLabel>
                        <FormControl>
                          <Select
                            options={accountOptions}
                            onValueChange={field.onChange}
                            value={field.value}
                            defaultValue={field.value}
                            placeholder="Select Customer"
                            showSearch={true}
                            searchValue={custSearch}
                            onSearchChange={setCustSearch}
                            allowClear={true}
                            onClear={() => field.onChange("")}
                            isLoading={isOnboardLoading}
                            emptyMessage="No customers found"
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] font-medium ml-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="w_whatsappNumber"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>WhatsApp Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter Number"
                            className="bg-white border-slate-200 rounded-xl h-10 shadow-sm focus-visible:ring-primary/10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] font-medium ml-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="w_phNumberId"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>Phone Number ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter Phone Number ID"
                            className="bg-white border-slate-200 rounded-xl h-10 shadow-sm focus-visible:ring-primary/10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="w_apiKey"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter API Key"
                            className="bg-white border-slate-200 rounded-xl h-10 shadow-sm focus-visible:ring-primary/10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="w_wabaID"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>WABA ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter WABA ID"
                            className="bg-white border-slate-200 rounded-xl h-10 shadow-sm focus-visible:ring-primary/10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-700">
                      Amount Deduction
                    </p>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="service"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Service</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="bg-white border-slate-200 rounded-xl h-10 shadow-sm focus-visible:ring-primary/10"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="utility"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Utility</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="bg-white border-slate-200 rounded-xl h-10 shadow-sm focus-visible:ring-primary/10"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="marketing"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Marketing</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="bg-white border-slate-200 rounded-xl h-10 shadow-sm focus-visible:ring-primary/10"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-[#F1F5F9] border-t border-slate-300">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-4 text-xs font-semibold"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className="px-6 text-xs font-bold"
                  disabled={modalLoading}
                >
                  {modalLoading ? (
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {isEdit ? "Update Account" : "Save Account"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminWhatsAppList;
