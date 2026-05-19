import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMembergroupStore } from "../../../store/admin/useMembergroupStore.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const memberGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  memberids: z.array(z.string()).min(1, "At least one member is required"),
});

const AdminMemberGroup = ({ externalModalOpen, onExternalModalClose }) => {
  const {
    membergroupData,
    isMembergroupLoading,
    getMembergroup,
    membergroupTotalCount,
    createMembergroup,
    editMembergroup,
    deleteMembergroup,
    getAllMember,
    allMemberListLoading,
    allMemberList = [],
    createMemberGroupModalLoading,
  } = useMembergroupStore();

  const { authRole } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const [page, setPage] = useState(Number(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(
    Number(params.get("per_page")) || 10,
  );
  const [offset, setOffset] = useState((page - 1) * pageSize);
  const [searchString, setSearchString] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const debouncedSearchString = useDebounce(searchString, 500);

  const form = useForm({
    resolver: zodResolver(memberGroupSchema),
    defaultValues: {
      name: "",
      memberids: [],
    },
  });

  useEffect(() => {
    const basePath = authRole === "TL" ? "/tl-campaign" : "/admin-campaign";
    navigate(
      `${basePath}?tab=Member%20group&page=${page}&per_page=${pageSize}`,
      { replace: true },
    );
  }, [page, pageSize, navigate, authRole]);

  useEffect(() => {
    getMembergroup(pageSize, offset, debouncedSearchString, "", "");
  }, [pageSize, offset, debouncedSearchString, getMembergroup]);

  useEffect(() => {
    if (externalModalOpen) {
      setModalOpen(true);
      getAllMember();
    }
  }, [externalModalOpen, getAllMember]);

  const handleClose = useCallback(() => {
    setModalOpen(false);
    setEditId("");
    form.reset();
    onExternalModalClose?.();
  }, [form, onExternalModalClose]);

  const onSubmit = async (values) => {
    console.log("Member Group Form Values:", values);
    try {
      if (editId) {
        await editMembergroup({ id: editId, ...values });
      } else {
        await createMembergroup(values);
      }
      handleClose();
      await getMembergroup(pageSize, offset, debouncedSearchString, "", "");
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  const handleEdit = useCallback(
    async (id) => {
      setModalOpen(true);
      await getAllMember();

      const record = membergroupData.find((m) => m.m_membergroupId === id);
      if (record) {
        setEditId(id);
        form.reset({
          name: record.m_membergroupName || "",
          memberids: (record.members || [])
            .map((m) => String(m.m_memberId))
            .filter(Boolean),
        });
      }
    },
    [membergroupData, getAllMember, form],
  );

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteMembergroup(id);
        await getMembergroup(pageSize, offset, debouncedSearchString, "", "");
      } catch (err) {
        console.error("Delete failed:", err);
      }
    },
    [
      deleteMembergroup,
      getMembergroup,
      pageSize,
      offset,
      debouncedSearchString,
    ],
  );

  const columns = useMemo(() => {
    let cols = [
      {
        title: "S.no",
        key: "s_no",
        width: 50,
        Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
      },
      { title: "Name", key: "m_membergroupName", sort: true },
      {
        title: "Members",
        key: "members",
        Cell: (row) => {
          const list = Array.isArray(row?.members) ? row.members : [];
          const names = list.map((m) => m.m_memberName).filter(Boolean);
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
                    Group Members
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
        Cell: (record) => (
          <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-primary/10 hover:text-primary"
                    onClick={() => handleEdit(record.m_membergroupId)}
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
                    onClick={() => handleDelete(record.m_membergroupId)}
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
            placeholder="Search by Name"
            className="pl-10 h-10 bg-white shadow-sm border-slate-200"
            onChange={(e) => setSearchString(e.target.value)}
            value={searchString}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={membergroupData}
          loading={isMembergroupLoading}
          totaldata={membergroupTotalCount}
          page={page}
          pageSize={pageSize}
          serverSide
          onPageChange={(pagevalues) => {
            setPage(pagevalues.currentPage);
            setPageSize(pagevalues.pageSize);
            setOffset(pagevalues.pageSize * (pagevalues.currentPage - 1));
          }}
        />
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[720px] p-0 gap-0">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Member Group" : "Create New Member Group"}
            </DialogTitle>
          </DialogHeader>

          {allMemberListLoading || createMemberGroupModalLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col bg-[#F1F5F9]"
              >
                <div className="px-6 py-5 space-y-5 bg-slate-50/50 ">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter group name"
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
                    name="memberids"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>Members</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={allMemberList.map((m) => ({
                              label: m.m_memberName,
                              value: String(m.m_memberId),
                            }))}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select Members"
                            className="bg-white"
                            showSearch={true}
                            disabled={allMemberListLoading}
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
                    onClick={handleClose}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMemberGroupModalLoading}
                  >
                    {createMemberGroupModalLoading && (
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
};

export default AdminMemberGroup;
