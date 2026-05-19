import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTlMappingStore } from "../../../store/admin/useTlMappingStore.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
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
import { Search, Edit, Loader2 } from "lucide-react";

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

const tlMappingSchema = z.object({
  name: z.string().optional(),
  tlmemberid: z.number().optional(),
  memberids: z.array(z.string()).min(1, "At least one member is required"),
  extension: z.array(z.string()).optional(),
});

function AdminTlMapping({ externalModalOpen, onExternalModalClose }) {
  const {
    totalTl,
    totalTlCount,
    tlMappingLoading,
    allMemberList,
    allMemberListLoading,
    getTlMapping,
    getAllMember,
    editTlMapping,
    editTlMappingModalLoading,
  } = useTlMappingStore();

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
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const debouncedSearchString = useDebounce(searchString, 500);

  const form = useForm({
    resolver: zodResolver(tlMappingSchema),
    defaultValues: {
      name: "",
      tlmemberid: null,
      memberids: [],
      extension: [],
    },
  });

  useEffect(() => {
    if (authRole === "TL") {
      navigate(`/tl-users?tab=Tl mapping&page=${page}&per_page=${pageSize}`);
    } else if (authRole === "ADMIN") {
      navigate(`/admin-users?tab=Tl mapping&page=${page}&per_page=${pageSize}`);
    }
  }, [page, pageSize, navigate, authRole]);

  useEffect(() => {
    if (externalModalOpen) {
      setEditId(null);
      form.reset({
        name: "",
        tlmemberid: null,
        memberids: [],
        extension: [],
      });
      setMappingModalOpen(true);
      getAllMember();
    }
  }, [externalModalOpen, getAllMember, form]);

  useEffect(() => {
    getTlMapping(pageSize, offset, debouncedSearchString, sortField, sortOrder);
  }, [
    pageSize,
    offset,
    debouncedSearchString,
    sortField,
    sortOrder,
    getTlMapping,
  ]);

  const handleClose = () => {
    setMappingModalOpen(false);
    setEditId(null);
    form.reset();
    onExternalModalClose?.();
  };

  const onSubmit = async (values) => {
    const payload = {
      tlmemberid: values.tlmemberid,
      memberids: values.memberids.map((id) => parseInt(id)),
    };

    try {
      await editTlMapping(payload);
      handleClose();
      getTlMapping(pageSize, offset, searchString, sortField, sortOrder);
    } catch (err) {
      console.error("Failed to update TL Mapping:", err);
    }
  };

  const handleEdit = useCallback(
    (id) => {
      const tlmapping = totalTl.find((q) => q.m_memberId === id);
      if (tlmapping) {
        setEditId(id);
        form.reset({
          name: tlmapping.m_memberName || "",
          tlmemberid: tlmapping.m_memberId,
          memberids: tlmapping.members.map((m) => String(m.m_memberId)),
          extension: tlmapping.members.map((m) =>
            m.m_memberExtensionNo ? String(m.m_memberExtensionNo) : "",
          ),
        });
        setMappingModalOpen(true);
        getAllMember();
      }
    },
    [totalTl, form, getAllMember],
  );

  const handlePageChange = useCallback((pagevalues) => {
    setPage(pagevalues.currentPage);
    setPageSize(pagevalues.pageSize);
    setOffset(pagevalues.pageSize * (pagevalues.currentPage - 1));
    setSortField(pagevalues.sortConfig?.key || "");
    setSortOrder(pagevalues.sortConfig?.direction || "");
  }, []);

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
      { title: "Name", key: "m_memberName", sort: true },
      { title: "Account Code", key: "m_accountCode", sort: true },
      { title: "Extension", key: "m_memberExtensionNo", sort: true },
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
                  {names.length === 0 && (
                    <span className="text-xs text-slate-400 font-medium">
                      No members
                    </span>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3">
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-slate-800 border-b pb-1">
                    TL Members
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {names.length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        No members mapped
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
        title: "Actions",
        key: "actions",
        width: 80,
        Cell: (record) => (
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-primary/10 hover:text-primary"
                    onClick={() => handleEdit(record.m_memberId)}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit Mapping</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ),
      },
    ],
    [page, pageSize, handleEdit],
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
        <div className="relative w-[320px] group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            type="text"
            placeholder="Search by Name"
            className="pl-10 h-10 placeholder:text-xs bg-white"
            onChange={(e) => setSearchString(e.target.value)}
            value={searchString}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          columns={displayColumns}
          data={totalTl}
          loading={tlMappingLoading}
          totaldata={totalTlCount}
          pagination={true}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>

      <Dialog open={mappingModalOpen} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden bg-[#F1F5F9]">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-white">
            <DialogTitle>Edit TL Mapping</DialogTitle>
          </DialogHeader>

          {allMemberListLoading || editTlMappingModalLoading ? (
            <div className="flex items-center justify-center h-[250px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col bg-[#F1F5F9]"
              >
                <div className="px-6 py-6 space-y-5 bg-slate-50/50 min-h-[200px]">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>TL Name</FormLabel>
                        <FormControl>
                          <Input type="text" {...field} readOnly />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

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
                          className="bg-white"
                        />
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="px-6 py-4 border-t border-slate-300 bg-[#F1F5F9]">
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
                    disabled={editTlMappingModalLoading}
                  >
                    {editTlMappingModalLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Save Changes
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

export default AdminTlMapping;
