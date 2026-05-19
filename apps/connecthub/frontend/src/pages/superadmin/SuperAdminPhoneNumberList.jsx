import { useEffect, useState, useCallback, useMemo } from "react";
import { usePhoneNumberStore } from "../../store/superadmin/usePhoneNumberStore.js";
import { useNavigate, useLocation } from "react-router-dom";
import { useDebounce } from "../../hooks/useDebounce.js";
import CountryCodeDropdown, {
  DEFAULT_DIAL,
  DEFAULT_CODE,
  countries,
} from "../../components/CountryCodeDropdown.jsx";

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
import { Search, Edit, Trash2, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

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

// ---------- Zod Schema ----------
const phoneNumberSchema = z.object({
  countryCode: z.string().min(1, "Country Code is required"),
  countryName: z.string().optional(),
  number: z
    .string()
    .min(1, "Number is required")
    .regex(/^\d+$/, "Number must be numeric"),
  type: z.string().min(1, "Type is required"),
  peerId: z.string().min(1, "Peer is required"),
  accountId: z.string().optional(),
  accountNo: z.string().optional(),
  accountPrefix: z.string().optional(),
  status: z.string().optional(),
});

const SuperAdminPhoneNumberList = ({
  externalModalOpen,
  onExternalModalClose,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const {
    phoneNumberData,
    phoneNumberLoading,
    getCliNumber,
    phoneNumberTotalCount,
    createCliNumber,
    editCliNumber,
    deleteCliNumber,
    getAllPeers,
    allPeerList,
    allPeerListLoading,
    getAllAccounts,
    allAccountList,
    allAccountListLoading,
    modalLoading,
  } = usePhoneNumberStore();

  const [page, setPage] = useState(Number(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(
    Number(params.get("per_page")) || 10,
  );
  const [offset, setOffset] = useState((page - 1) * pageSize);
  const [editId, setEditId] = useState("");
  const [phoneNumberModalOpen, setPhoneNumberModalOpen] = useState(false);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [searchString, setSearchString] = useState("");
  const debouncedSearchString = useDebounce(searchString, 500);

  const defaultCountry = countries.find((c) => c.dial === DEFAULT_DIAL);

  const form = useForm({
    resolver: zodResolver(phoneNumberSchema),
    defaultValues: {
      countryCode: DEFAULT_DIAL,
      countryName: defaultCountry?.name || "",
      number: "",
      type: "",
      peerId: "",
      accountId: "",
      status: "Active",
      accountNo: "",
      accountPrefix: "",
    },
  });

  const isEdit = !!editId;

  // ✅ only update URL when page/pageSize changes
  useEffect(() => {
    navigate(
      `/superadmin-phonenumber?tab=Phone%20Number&page=${page}&per_page=${pageSize}`,
      { replace: true },
    );
  }, [page, pageSize, navigate]);

  // ✅ open modal from parent + load dependencies
  useEffect(() => {
    if (externalModalOpen) {
      setPhoneNumberModalOpen(true);
      loadFormDependencies();
    }
  }, [externalModalOpen]);

  const loadFormDependencies = async () => {
    try {
      await Promise.all([getAllPeers(), getAllAccounts()]);
    } catch (err) {
      console.error("Failed to load form dependencies:", err);
      setPhoneNumberModalOpen(false);
    }
  };

  // ✅ Reset modal state on close
  const handleClose = () => {
    setPhoneNumberModalOpen(false);
    form.reset({
      countryCode: DEFAULT_DIAL,
      countryName: defaultCountry?.name || "",
      number: "",
      type: "",
      peerId: "",
      accountId: "",
      status: "Active",
      accountNo: "",
      accountPrefix: "",
    });
    setEditId("");
    onExternalModalClose?.();
  };

  // ✅ fetch data whenever filters/search/sort changes
  useEffect(() => {
    getCliNumber(pageSize, offset, debouncedSearchString, sortField, sortOrder);
  }, [
    pageSize,
    offset,
    debouncedSearchString,
    sortField,
    sortOrder,
    getCliNumber,
  ]);

  // ---------- Peer & Account options ----------
  const peerOptions = useMemo(
    () =>
      (allPeerList || []).map((p) => ({
        label: `${p.p_peerName} ${p.p_peerHost}`,
        value: String(p.p_peerId),
      })),
    [allPeerList],
  );

  const accountOptions = useMemo(
    () =>
      (allAccountList || []).map((a) => ({
        label: a.a_accountName,
        value: String(a.a_accountId),
      })),
    [allAccountList],
  );

  // Build a lookup map for account metadata
  const accountMetaMap = useMemo(() => {
    const map = {};
    (allAccountList || []).forEach((a) => {
      map[String(a.a_accountId)] = {
        accountNo: a.a_accountNo ? String(a.a_accountNo) : "",
        accountPrefix: a.a_accountPrefix ? String(a.a_accountPrefix) : "",
      };
    });
    return map;
  }, [allAccountList]);

  // ---------- Submit ----------
  const onSubmit = async (values) => {
    try {
      if (editId) {
        await editCliNumber({ id: editId, ...values });
      } else {
        await createCliNumber(values);
        console.log(values);
      }
      handleClose();
      await getCliNumber(
        pageSize,
        offset,
        debouncedSearchString,
        sortField,
        sortOrder,
      );
    } catch (err) {
      console.error("Submit failed:", err);
      form.setError("root", {
        type: "manual",
        message: err?.response?.data?.message || "Failed to save phone number.",
      });
    }
  };

  // ---------- Edit ----------
  const handleEdit = useCallback(
    async (id) => {
      setPhoneNumberModalOpen(true);
      await loadFormDependencies();
      const record = phoneNumberData.find((m) => m.c_clinumberId === id);
      if (!record) return;
      setEditId(id);
      form.reset({
        countryCode: record.c_clinumberCountryCode || "",
        countryName: record.c_clinumberCountryName || "",
        number: record.c_clinumberName || "",
        type: record.c_clinumberType || "",
        status: record.c_clinumberStatus || "Active",
        peerId: record.p_peerId ? String(record.p_peerId) : "",
        accountId: record.a_accountId ? String(record.a_accountId) : "",
        accountNo: record.a_accountNo || "",
        accountPrefix: record.a_accountPrefix || "",
      });
    },
    [phoneNumberData, form],
  );

  // ---------- Delete ----------
  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteCliNumber(id);
        await getCliNumber(
          pageSize,
          offset,
          debouncedSearchString,
          sortField,
          sortOrder,
        );
      } catch (err) {
        console.error("Delete failed:", err);
      }
    },
    [
      deleteCliNumber,
      getCliNumber,
      pageSize,
      offset,
      debouncedSearchString,
      sortField,
      sortOrder,
    ],
  );

  // ---------- Table Columns ----------
  const columns = useMemo(
    () => [
      {
        title: "S.no",
        key: "s_no",
        Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
      },
      { title: "Country Code", key: "c_clinumberCountryCode" },
      { title: "Country Name", key: "c_clinumberCountryName" },
      { title: "Customer", key: "a_accountName" },
      { title: "Number", key: "c_clinumberName" },
      { title: "Type", key: "c_clinumberType" },
      { title: "Peer Name", key: "p_peerName" },
      {
        title: "Call Flow Name",
        key: "c_callflowName",
        Cell: (record) => record.c_callflowName || "-",
      },
      {
        title: "Status",
        key: "c_clinumberStatus",
        sort: true,
        Cell: (record) => {
          const status = record.c_clinumberStatus;
          const variant =
            status === "Active"
              ? "active"
              : status === "Inactive"
                ? "inactive"
                : "default";
          return <StatusBadge text={status} variant={variant} />;
        },
      },
      {
        title: "Actions",
        key: "actions",
        Cell: (record) => (
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-primary/10 hover:text-primary"
                    onClick={() => handleEdit(record.c_clinumberId)}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-rose-50 hover:text-rose-500"
                    onClick={() => handleDelete(record.c_clinumberId)}
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
    ],
    [page, pageSize, handleEdit, handleDelete],
  );

  return (
    <>
      <div className="w-full h-full flex flex-col gap-4">
        <div className="w-full flex items-center justify-end gap-4">
          <div className="relative w-[350px] group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              type="text"
              placeholder="Search by Name, Number"
              className="pl-10 placeholder:text-[11px] xl:placeholder:text-xs 2xl:placeholder:text-sm"
              onChange={(e) => setSearchString(e.target.value)}
              value={searchString}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={phoneNumberData}
            loading={phoneNumberLoading}
            totaldata={phoneNumberTotalCount}
            page={page}
            serverSide
            pageSize={pageSize}
            onPageChange={(pagevalues) => {
              setPage(pagevalues.currentPage);
              setPageSize(pagevalues.pageSize);
              setOffset(pagevalues.pageSize * (pagevalues.currentPage - 1));
              setSortField(pagevalues.sortConfig?.key || "");
              setSortOrder(pagevalues.sortConfig?.direction || "");
            }}
          />
        </div>
      </div>

      {/* Modal */}
      <Dialog
        open={phoneNumberModalOpen}
        onOpenChange={(v) => !v && handleClose()}
      >
        <DialogContent className="sm:max-w-[720px] p-0 gap-0">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Phone Number" : "Create New Phone Number"}
            </DialogTitle>
          </DialogHeader>

          {allPeerListLoading || allAccountListLoading || modalLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <Form {...form}>
              {/* <form
                onSubmit={form.handleSubmit(onSubmit, (errors) => {
                  console.error("Zod Validation Failed:", errors);
                })}
              > */}
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col bg-[#F1F5F9]"
              >
                <div className="px-6 py-5 space-y-5 bg-slate-50/50">
                  {/* Row 1: Phone Number + Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="number"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Phone Number</FormLabel>
                          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary transition-all">
                            <div className="shrink-0 border-r border-slate-200">
                              <CountryCodeDropdown
                                value={
                                  countries.find(
                                    (c) =>
                                      c.dial ===
                                        form.getValues("countryCode") &&
                                      c.name === form.getValues("countryName"),
                                  )?.code ||
                                  countries.find(
                                    (c) =>
                                      c.dial === form.getValues("countryCode"),
                                  )?.code ||
                                  countries.find(
                                    (c) =>
                                      c.code === form.getValues("countryCode"),
                                  )?.code ||
                                  DEFAULT_CODE
                                }
                                onChange={(code, countryObj) => {
                                  form.setValue("countryCode", countryObj.dial);
                                  form.setValue("countryName", countryObj.name);
                                  form.clearErrors("countryCode");
                                }}
                                error={form.formState.errors.countryCode}
                                placeholder="Country"
                                compact={false}
                                disabled={isEdit}
                              />
                            </div>
                            <input
                              className="flex-1 px-3 py-2 text-[11px] xl:text-xs 2xl:text-sm bg-transparent outline-none placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                              placeholder="Enter phone number"
                              value={field.value}
                              onChange={(e) => {
                                if (/^[0-9]*$/.test(e.target.value)) {
                                  field.onChange(e.target.value);
                                }
                              }}
                              disabled={isEdit}
                              readOnly={isEdit}
                            />
                          </div>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Type</FormLabel>
                          <Select
                            options={[
                              { label: "Tollfree", value: "Tollfree" },
                              { label: "Prepaid", value: "Prepaid" },
                              { label: "Unlimited", value: "Unlimited" },
                            ]}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select Type"
                            showSearch={false}
                            allowClear={!isEdit}
                            onClear={() => field.onChange("")}
                            disabled={isEdit}
                            triggerClassName="bg-white border-slate-200"
                          />
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row 2: Peer + Account */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="peerId"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Peer</FormLabel>
                          <Select
                            options={peerOptions}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select Peer"
                            showSearch={true}
                            allowClear={!isEdit}
                            onClear={() => field.onChange("")}
                            isLoading={allPeerListLoading}
                            disabled={isEdit}
                            triggerClassName="bg-white border-slate-200"
                          />
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accountId"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Account</FormLabel>
                          <Select
                            options={accountOptions}
                            value={field.value}
                            onValueChange={(val) => {
                              field.onChange(val);
                              const meta = accountMetaMap[val] || {};
                              form.setValue("accountNo", meta.accountNo);
                              form.setValue(
                                "accountPrefix",
                                meta.accountPrefix,
                              );
                            }}
                            placeholder="Select Account"
                            showSearch={true}
                            allowClear={true}
                            onClear={() => {
                              field.onChange("");
                              form.setValue("accountNo", "");
                              form.setValue("accountPrefix", "");
                            }}
                            isLoading={allAccountListLoading}
                            triggerClassName="bg-white border-slate-200"
                          />
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.formState.errors.root && (
                    <div className="text-[13px] text-destructive font-medium text-center">
                      {form.formState.errors.root.message}
                    </div>
                  )}
                </div>

                <DialogFooter className="bg-[#F1F5F9] border-t border-slate-300">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="default">
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SuperAdminPhoneNumberList;
