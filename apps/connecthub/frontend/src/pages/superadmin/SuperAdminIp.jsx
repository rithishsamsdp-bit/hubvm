import React, { useState, useMemo, useEffect } from "react";
import "./styles/SuperAdminIp.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../../constants/Icon.jsx";
import { Navbar } from "../../components/Index.jsx";
import { useDebounce } from "../../hooks/useDebounce.js";
import useIpStore from "../../store/superadmin/useIpStore.js";

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

const ipSchema = z.object({
  type: z.enum(["Allow", "Block"]),
  ip: z
    .string()
    .min(1, "IP Address is required")
    .refine(
      (val) => {
        const parts = val.split("/");
        const ipAddress = parts[0];
        const subnet = parts[1];

        const ipv4Regex =
          /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

        if (!ipv4Regex.test(ipAddress)) {
          return false;
        }

        if (subnet !== undefined) {
          const subnetNum = parseInt(subnet, 10);
          if (isNaN(subnetNum) || subnetNum < 0 || subnetNum > 32) {
            return false;
          }
        }

        return true;
      },
      { message: "Invalid IP Address or CIDR format (e.g., 192.168.1.1/24)" },
    ),
  label: z.string().min(1, { message: "Label is required" }),
});

const SuperAdminIp = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const idParam = searchParams.get("id");
  const accountId = idParam ? parseInt(idParam, 10) : null;

  const { ipList, totalCount, fetchIpList, createIp, deleteIp, isLoading } =
    useIpStore();

  const [searchString, setSearchString] = useState("");
  const debouncedSearchString = useDebounce(searchString, 500);
  const [open, setOpen] = useState(false);

  const pageParam = searchParams.get("page");
  const perPageParam = searchParams.get("per_page");

  // Pagination state
  const [page, setPage] = useState(pageParam ? parseInt(pageParam, 10) : 1);
  const [pageSize, setPageSize] = useState(
    perPageParam ? parseInt(perPageParam, 10) : 10,
  );
  const [offset, setOffset] = useState((page - 1) * pageSize);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("");

  const form = useForm({
    resolver: zodResolver(ipSchema),
    defaultValues: {
      type: "Allow",
      ip: "",
      label: "",
    },
  });

  useEffect(() => {
    setSearchParams(
      { id: accountId || "", page, per_page: pageSize },
      { replace: true },
    );
  }, [page, pageSize, accountId, setSearchParams]);

  useEffect(() => {
    if (accountId) {
      fetchIpList(
        accountId,
        pageSize,
        offset,
        sortField,
        sortOrder,
        debouncedSearchString,
      );
    }
  }, [
    accountId,
    fetchIpList,
    pageSize,
    offset,
    sortField,
    sortOrder,
    debouncedSearchString,
  ]);

  // Columns Configuration
  const columns = useMemo(
    () => [
      {
        title: "S.no",
        key: "s_no",
        Cell: (_row, rowIndex) => offset + rowIndex + 1,
      },
      { title: "IP / CIDR", key: "ip" },
      { title: "Label", key: "label" },
      {
        title: "Type",
        key: "type",
        Cell: (row) => (
          <StatusBadge
            text={row.type || "Allow"}
            variant={(row.type || "Allow") === "Allow" ? "active" : "inactive"}
          />
        ),
      },
      {
        title: "Created At",
        key: "createdAt",
        Cell: (row) => new Date(row.createdAt).toLocaleDateString(),
      },
      {
        title: "Action",
        key: "action",
        Cell: (record) => (
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(record.id);
                    }}
                  >
                    <Icon name="deletee" size={14} color="currentColor" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ),
      },
    ],
    [offset],
  );

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this IP?")) {
      await deleteIp(id, accountId);
      await fetchIpList(
        accountId,
        pageSize,
        offset,
        sortField,
        sortOrder,
        debouncedSearchString,
      );
    }
  };

  const onSubmit = async (values) => {
    try {
      await createIp(accountId, values);
      handleCancel();
      await fetchIpList(
        accountId,
        pageSize,
        offset,
        sortField,
        sortOrder,
        debouncedSearchString,
      );
    } catch (error) {
      console.error(error);
      form.setError("root", { type: "manual", message: "Failed to save IP" });
    }
  };

  const handleCancel = () => {
    setOpen(false);
    form.reset();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/50">
      <Navbar
        title="IP Restriction"
        breadcrumbs={[
          { label: "Onboard", route: "/superadmin-onboard" },
          { label: "IP Restriction", active: true },
        ]}
      >
        <Button type="button" variant="default" onClick={() => setOpen(true)}>
          Add IP
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
              placeholder="Search by IP or Label..."
              className="pl-10 placeholder:text-[11px] xl:placeholder:text-xs 2xl:placeholder:text-sm bg-white"
              onChange={(e) => setSearchString(e.target.value)}
              value={searchString}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={ipList}
            totaldata={totalCount}
            page={page}
            serverSide
            pageSize={pageSize}
            clickableRows={false}
            loading={isLoading}
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-[480px] p-0"
          closeOnOutsideClick={false}
          aria-describedby={undefined}
        >
          <DialogHeader className="px-6 py-4 border-b border-slate-100">
            <DialogTitle className="text-lg font-semibold text-slate-800">
              Add Allowed/Blocked IP
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col bg-[#F1F5F9]"
            >
              <div className="p-6 space-y-5">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Type</FormLabel>
                      <Select
                        options={[
                          { label: "Allow", value: "Allow" },
                          { label: "Block", value: "Block" },
                        ]}
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                        placeholder="Select Type"
                        triggerClassName="bg-white border-slate-200"
                        contentClassName="z-[100000]"
                      />
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ip"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>IP Address / CIDR</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 192.168.1.1 or 10.0.0.0/24"
                          className={cn(
                            "bg-white border-slate-200 shadow-sm focus-visible:ring-primary/10",
                            form.formState.errors.ip &&
                              "border-destructive ring-3 ring-destructive/20 focus-visible:ring-destructive/20",
                          )}
                          {...field}
                        />
                      </FormControl>
                      <span className="text-[11px] text-slate-500 block mt-1">
                        Use CIDR notation for ranges (e.g., /24 for 256 IPs, /32
                        for single IP)
                      </span>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Label / Description</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Office Network"
                          className={cn(
                            "bg-white border-slate-200 shadow-sm focus-visible:ring-primary/10",
                            form.formState.errors.label &&
                              "border-destructive ring-3 ring-destructive/20 focus-visible:ring-destructive/20",
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <div className="text-[13px] text-destructive font-medium text-center">
                    {form.formState.errors.root.message}
                  </div>
                )}
              </div>

              <DialogFooter className="px-6 py-4 bg-[#F1F5F9] border-t border-slate-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="default">
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminIp;
