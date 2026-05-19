import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePhoneNumberGroup } from "../../../store/admin/usePhoneNumberGroup.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Edit, Trash2, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";

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
import { Loader } from "../../../components/Index.jsx";

const phoneGroupSchema = z.object({
  processName: z.string().min(1, "Group Name is required"),
  selectedCliIDs: z
    .array(z.string())
    .min(1, "At least one Phone Number is required"),
  status: z.string().min(1, "Status is required"),
});

function AdminPhoneNumberGroup({ externalModalOpen, onExternalModalClose }) {
  const {
    getCliID,
    createProcess,
    deleteProcess,
    editProcess,
    phoneNumberGroupfetch,
    phoneNumberList = [],
    phoneNumberGroupData = [],
    phoneNumberGroupLoading,
    phoneNumberListLoading,
    phoneNumberGroupCount,
    PhoneNumberModalLoading,
  } = usePhoneNumberGroup();

  const { authRole } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(
    parseInt(params.get("per_page")) || 10,
  );
  const [offset, setOffset] = useState((page - 1) * pageSize);
  const [searchString, setSearchString] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const debouncedSearch = useDebounce(searchString, 500);

  const form = useForm({
    resolver: zodResolver(phoneGroupSchema),
    defaultValues: {
      processName: "",
      selectedCliIDs: [],
      status: "1",
    },
  });

  useEffect(() => {
    if (authRole === "TL") {
      navigate(
        `/tl-campaign?tab=Phone%20Number%20Group&page=${page}&per_page=${pageSize}`,
        { replace: true },
      );
    } else if (authRole === "ADMIN") {
      navigate(
        `/admin-campaign?tab=Phone%20Number%20Group&page=${page}&per_page=${pageSize}`,
        { replace: true },
      );
    }
  }, [page, pageSize, navigate, authRole]);

  useEffect(() => {
    phoneNumberGroupfetch({ page, pageSize, debouncedSearch, offset });
  }, [page, pageSize, debouncedSearch, offset, phoneNumberGroupfetch]);

  useEffect(() => {
    if (externalModalOpen) {
      setModalOpen(true);
      getCliID();
    }
  }, [externalModalOpen, getCliID]);

  const handleCancel = useCallback(() => {
    setModalOpen(false);
    setEditId(null);
    form.reset();
    onExternalModalClose?.();
  }, [form, onExternalModalClose]);

  const onSubmit = async (values) => {
    try {
      if (editId) {
        await editProcess({ id: editId, ...values });
      } else {
        await createProcess(values);
      }
      handleCancel();
      await phoneNumberGroupfetch({ page, pageSize, debouncedSearch });
    } catch (error) {
      console.error("Submit failed:", error);
    }
  };

  const handleEdit = useCallback(
    async (record) => {
      setEditId(record.group_id);
      setModalOpen(true);
      await getCliID();

      const cliIds = (record.cli_numbers || [])
        .map((num) => {
          const match = phoneNumberList.find((x) => x.clinumberName === num);
          return match?.clinumberId ? String(match.clinumberId) : null;
        })
        .filter(Boolean);

      form.reset({
        processName: record.group_name || "",
        selectedCliIDs: cliIds,
        status: String(record.status ?? "1"),
      });
    },
    [form, getCliID, phoneNumberList],
  );

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteProcess({ didnumberGroupId: id });
        await phoneNumberGroupfetch({ page, pageSize, debouncedSearch });
      } catch (error) {
        console.error("Delete failed:", error);
      }
    },
    [deleteProcess, phoneNumberGroupfetch, page, pageSize, debouncedSearch],
  );

  const columns = useMemo(() => {
    let cols = [
      {
        title: "S.no",
        key: "s_no",
        width: 50,
        Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
      },
      { title: "Group Name", key: "group_name", sort: true },
      {
        title: "Phone Numbers",
        key: "cli_numbers",
        Cell: (row) => {
          const list = Array.isArray(row?.cli_numbers) ? row.cli_numbers : [];
          return (
            <Popover>
              <PopoverTrigger asChild>
                <div className="flex flex-wrap gap-1 cursor-pointer max-w-[200px]">
                  {list.slice(0, 2).map((num, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-[10px] py-0"
                    >
                      {num}
                    </Badge>
                  ))}
                  {list.length > 2 && (
                    <Badge variant="secondary" className="text-[10px] py-0">
                      +{list.length - 2}
                    </Badge>
                  )}
                  {list.length === 0 && (
                    <span className="text-xs text-slate-400 font-medium">
                      No numbers
                    </span>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3">
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-slate-800 border-b pb-1">
                    Phone Numbers
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {list.length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        No numbers mapped
                      </p>
                    ) : (
                      list.map((num, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] py-1 px-2 rounded bg-slate-50 border border-slate-100"
                        >
                          {num}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          );
        },
      },
      {
        title: "Status",
        key: "status",
        Cell: (row) => (
          <StatusBadge
            text={row.status === 1 ? "Active" : "Inactive"}
            variant={row.status === 1 ? "active" : "inactive"}
          />
        ),
      },
      {
        title: "Actions",
        key: "actions",
        Cell: (record) => (
          <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-primary/10 hover:text-primary"
                    onClick={() => handleEdit(record)}
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
                    onClick={() => handleDelete(record.group_id)}
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
    if (authRole === "TL") {
      cols = cols.filter((col) => col.key !== "actions");
    }
    return cols;
  }, [page, pageSize, handleEdit, handleDelete, authRole]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="w-full flex items-center justify-end gap-4">
        <div className="relative w-[400px] group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            type="text"
            placeholder="Search by Group Name, Phone number"
            className="pl-10 h-10 bg-white shadow-sm border-slate-200"
            onChange={(e) => setSearchString(e.target.value)}
            value={searchString}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={phoneNumberGroupData}
          loading={phoneNumberGroupLoading}
          totaldata={phoneNumberGroupCount}
          page={page}
          pageSize={pageSize}
          serverSide
          onPageChange={({ currentPage, pageSize }) => {
            setPage(currentPage);
            setPageSize(pageSize);
            setOffset((currentPage - 1) * pageSize);
          }}
        />
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-[720px] p-0 gap-0">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Phone Number Group" : "Create Phone Number Group"}
            </DialogTitle>
          </DialogHeader>

          {phoneNumberListLoading || PhoneNumberModalLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col bg-[#F1F5F9]"
              >
                <div className="px-6 py-5 space-y-5 bg-slate-50/50">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="processName"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Phone Number Group Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter Phone Number Group Name"
                              className="bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Status</FormLabel>
                          <Select
                            options={[
                              { label: "Active", value: "1" },
                              { label: "Inactive", value: "0" },
                            ]}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select Status"
                            showSearch={false}
                            triggerClassName="bg-white"
                          />
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="selectedCliIDs"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>Select Phone Number(s)</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={phoneNumberList.map((item) => ({
                              label: item.clinumberName,
                              value: String(item.clinumberId),
                            }))}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select CLI Numbers"
                            className="bg-white"
                            showSearch={true}
                            disabled={phoneNumberListLoading}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="bg-[#F1F5F9] border-t border-slate-300">
                  <Button
                    variant="secondary"
                    onClick={handleCancel}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={PhoneNumberModalLoading}>
                    {PhoneNumberModalLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminPhoneNumberGroup;
