import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueueStore } from "../../../store/admin/useQueueStore.js";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const queueSchema = z.object({
  name: z.string().min(1, "Queue name is required"),
  strategy: z.string().min(1, "Strategy is required"),
  timeout: z
    .string()
    .min(1, "Queue wait time is required")
    .refine(
      (val) => !isNaN(val) && parseInt(val) > 0,
      "Must be a positive number",
    ),
  agentwaittime: z
    .string()
    .min(1, "Agent wait time is required")
    .refine(
      (val) => !isNaN(val) && parseInt(val) > 0,
      "Must be a positive number",
    ),
  memberids: z.array(z.string()).min(1, "At least one member is required"),
  extension: z.array(z.string()).optional(),
});

function AdminQueue({ externalModalOpen, onExternalModalClose }) {
  const {
    queueGroupData,
    queuegroupTotalCount,
    queueGroupLoading,
    allMemberList,
    allMemberListLoading,
    getQueuegroup,
    getAllMember,
    createQueuegroup,
    editQueuegroup,
    deleteQueuegroup,
    createQueueModalLoading,
  } = useQueueStore();

  const { authRole } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(
    parseInt(params.get("per_page")) || 10,
  );
  const [offset, setOffset] = useState(
    (parseInt(params.get("page")) - 1) * pageSize || 0,
  );
  const [searchString, setSearchString] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const debouncedSearchString = useDebounce(searchString, 500);

  const form = useForm({
    resolver: zodResolver(queueSchema),
    defaultValues: {
      name: "",
      strategy: "",
      timeout: "",
      agentwaittime: "",
      memberids: [],
      extension: [],
    },
  });

  useEffect(() => {
    const path = authRole === "TL" ? "/tl-phonenumber" : "/admin-phonenumber";
    navigate(`${path}?tab=Queue&page=${page}&per_page=${pageSize}`);
  }, [page, pageSize, navigate, authRole]);

  useEffect(() => {
    if (externalModalOpen) {
      setEditId(null);
      form.reset({
        name: "",
        strategy: "",
        timeout: "",
        agentwaittime: "",
        memberids: [],
        extension: [],
      });
      setQueueModalOpen(true);
      getAllMember();
    }
  }, [externalModalOpen, getAllMember, form]);

  useEffect(() => {
    getQueuegroup(
      pageSize,
      offset,
      debouncedSearchString,
      sortField,
      sortOrder,
    );
  }, [
    pageSize,
    offset,
    debouncedSearchString,
    sortField,
    sortOrder,
    getQueuegroup,
  ]);

  const handleClose = () => {
    setQueueModalOpen(false);
    setEditId(null);
    form.reset();
    onExternalModalClose?.();
  };

  const onSubmit = async (values) => {
    const payload = { ...values };
    if (editId) payload.id = editId;

    try {
      if (editId) {
        await editQueuegroup(payload);
      } else {
        await createQueuegroup(payload);
      }
      handleClose();
      getQueuegroup(pageSize, offset, searchString, sortField, sortOrder);
    } catch (err) {
      console.error("Submit failed:", err);
    }
  };

  const handleEdit = useCallback(
    (id) => {
      const queue = queueGroupData.find((q) => q.q_queuegroupId === id);
      if (queue) {
        setEditId(id);
        form.reset({
          name: queue.q_queuegroupName || "",
          strategy: queue.q_queuegroupStrategy || "",
          timeout: queue.q_queuegroupTimeout?.toString() || "",
          agentwaittime: queue.q_agentwaittime?.toString() || "",
          memberids: queue.members.map((m) => String(m.m_memberId)),
          extension: queue.members.map((m) =>
            m.m_memberExtensionNo ? String(m.m_memberExtensionNo) : "",
          ),
        });
        setQueueModalOpen(true);
        getAllMember();
      }
    },
    [queueGroupData, form, getAllMember],
  );

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteQueuegroup(id);
        getQueuegroup(pageSize, offset, searchString, sortField, sortOrder);
      } catch (err) {
        console.error("Delete failed:", err);
      }
    },
    [
      deleteQueuegroup,
      getQueuegroup,
      pageSize,
      offset,
      searchString,
      sortField,
      sortOrder,
    ],
  );

  const handlePageChange = useCallback((pagevalues) => {
    setPage(pagevalues.currentPage);
    setPageSize(pagevalues.pageSize);
    setOffset(pagevalues.pageSize * (pagevalues.currentPage - 1));
    setSortField(pagevalues.sortConfig?.key || "");
    setSortOrder(pagevalues.sortConfig?.direction || "");
  }, []);

  const strategyOptions = [
    { label: "Ring all", value: "ring-all" },
    { label: "Longest idle agent", value: "longest-idle-agent" },
    { label: "Round robin", value: "round-robin" },
    { label: "Top down", value: "top-down" },
    {
      label: "Agent with least talk time",
      value: "agent-with-least-talk-time",
    },
    { label: "Agent with fewest calls", value: "agent-with-fewest-calls" },
    {
      label: "Sequentially by agent order",
      value: "sequentially-by-agent-order",
    },
    { label: "Ring progressively", value: "ring-progressively" },
  ];

  const memberOptions = useMemo(
    () =>
      allMemberList.map((m) => ({
        label: m.m_memberName,
        value: String(m.m_memberId),
      })),
    [allMemberList],
  );

  const columns = useMemo(
    () => [
      {
        title: "S.no",
        key: "s_no",
        width: 50,
        Cell: (_row, index) => (page - 1) * pageSize + index + 1,
      },
      { title: "Queue Name", key: "q_queuegroupName", sort: true },
      { title: "Strategy", key: "q_queuegroupStrategy", sort: true },
      { title: "Queue wait time", key: "q_queuegroupTimeout", sort: true },
      {
        title: "Agent Wait Time",
        key: "q_agentwaittime",
        sort: true,
      },
      {
        title: "Members",
        key: "members",
        Cell: (row) => {
          const names = row.members.map((m) => m.m_memberName);
          return (
            <Popover>
              <PopoverTrigger asChild>
                <div className="flex flex-wrap gap-1 cursor-pointer max-w-[200px]">
                  {names.slice(0, 2).map((name, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-[10px] py-0"
                    >
                      {name}
                    </Badge>
                  ))}
                  {names.length > 2 && (
                    <Badge variant="secondary" className="text-[10px] py-0">
                      +{names.length - 2}
                    </Badge>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3">
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-slate-800 border-b pb-1">
                    Queue Members
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {names.length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        No members assigned
                      </p>
                    ) : (
                      names.map((name, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] py-1 px-2 rounded bg-slate-50 border border-slate-100"
                        >
                          {name}
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
        sort: true,
        Cell: (row) => {
          const status = row.q_queuegroupStatus;
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
        width: 100,
        Cell: (record) => (
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-primary/10 hover:text-primary"
                    onClick={() => handleEdit(record.q_queuegroupId)}
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
                    onClick={() => handleDelete(record.q_queuegroupId)}
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

  const displayColumns = useMemo(
    () =>
      authRole === "TL"
        ? columns.filter((col) => col.key !== "actions")
        : columns,
    [columns, authRole],
  );

  return (
    <div className="p-6 h-full flex flex-col gap-4 overflow-hidden">
      <div className="w-full flex items-center justify-end">
        <div className="relative w-[350px] group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            type="text"
            placeholder="Search by Name"
            className="pl-10 placeholder:text-xs"
            onChange={(e) => setSearchString(e.target.value)}
            value={searchString}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          columns={displayColumns}
          data={queueGroupData}
          loading={queueGroupLoading}
          totaldata={queuegroupTotalCount}
          pagination={true}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>

      <Dialog open={queueModalOpen} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-[720px] p-0 gap-0">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Queue Group" : "Create New Queue Group"}
            </DialogTitle>
          </DialogHeader>

          {allMemberListLoading || createQueueModalLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col bg-[#F1F5F9]"
              >
                <div className="px-6 py-5 space-y-5 bg-slate-50/50 min-h-[300px]">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Queue Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter Queue name"
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
                      name="strategy"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Strategy</FormLabel>
                          <Select
                            options={strategyOptions}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select Strategy"
                            showSearch={false}
                            triggerClassName="bg-white border-slate-200"
                          />
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="timeout"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Queue Wait Time</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="Enter Queue wait time"
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
                      name="agentwaittime"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Agent Wait Time</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="Enter agent wait time"
                              className="bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="memberids"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>Members</FormLabel>
                        <MultiSelect
                          {...field}
                          options={memberOptions}
                          onValueChange={(val) => {
                            field.onChange(val);
                            const selectedMembers = val
                              .map((id) =>
                                allMemberList.find(
                                  (m) => String(m.m_memberId) === id,
                                ),
                              )
                              .filter(Boolean);
                            form.setValue(
                              "extension",
                              selectedMembers.map((m) =>
                                m.m_memberExtensionNo
                                  ? String(m.m_memberExtensionNo)
                                  : "",
                              ),
                            );
                          }}
                          placeholder="Select Members"
                          showSearch={true}
                          disabled={allMemberListLoading}
                          className="bg-white"
                        />
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="bg-[#F1F5F9] border-t border-slate-300">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    disabled={createQueueModalLoading}
                  >
                    {createQueueModalLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
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

export default AdminQueue;
