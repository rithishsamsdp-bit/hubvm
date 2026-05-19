import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Search,
  Trash2,
  Upload,
  X,
  Download,
  AlertTriangle,
  FileUp,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "../../../store/useToastStore.js";
import { useWhatsappStore } from "../../../store/admin/whatsapp/useWhatsappStore.js";
import { cn } from "@/lib/utils";

const groupSchema = z.object({
  groupName: z.string().min(1, "Group name is required"),
  file: z.any().refine((file) => file instanceof File, "Please upload a file"),
});

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AdminWhatsappGroups = ({ isModalOpen, onClose }) => {
  const {
    groups,
    totalGroups,
    getGroupsLoading,
    getGroups,
    createGroup,
    createGroupLoading,
    deleteGroup,
  } = useWhatsappStore();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  // Form State
  const form = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      groupName: "",
      file: null,
    },
  });

  const {
    control,
    handleSubmit: hookHandleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors: formErrors },
  } = form;

  const file = watch("file");

  // UI Logic State
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const offset = (page - 1) * pageSize;
    getGroups(pageSize, offset, search);
  }, [page, pageSize, search, getGroups]);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setValue("file", selectedFile, { shouldValidate: true });
    setDuplicates([]);
    setShowDuplicates(false);

    if (selectedFile.name.endsWith(".csv")) {
      const text = await selectedFile.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length > 1) {
        const seen = new Set();
        const dups = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (seen.has(line)) {
            dups.push(line);
          } else {
            seen.add(line);
          }
        }
        if (dups.length > 0) {
          setDuplicates(dups);
          setShowDuplicates(true);
        }
      }
    }
  };

  const handleCreateGroup = async (values) => {
    const { groupName, file } = values;
    let finalFile = file;

    // Auto-remove duplicates for CSV if detected
    if (duplicates.length > 0 && file.name.endsWith(".csv")) {
      try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length > 1) {
          const uniqueLines = [];
          const seen = new Set();

          // Keep header
          uniqueLines.push(lines[0]);

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!seen.has(line)) {
              seen.add(line);
              uniqueLines.push(line);
            }
          }

          const newContent = uniqueLines.join("\n");
          finalFile = new File([newContent], file.name, { type: file.type });
          toast.info(
            `Removed ${duplicates.length} duplicates before creating group`,
          );
        }
      } catch (error) {
        console.error("Error removing duplicates:", error);
        toast.error("Failed to process duplicates");
        return;
      }
    }

    const formData = new FormData();
    formData.append("groupName", groupName);
    formData.append("file", finalFile);

    const success = await createGroup(formData);
    if (success) {
      handleCloseModal();
      const offset = (page - 1) * pageSize;
      getGroups(pageSize, offset, search);
    }
  };

  const handleCloseModal = () => {
    reset();
    setDuplicates([]);
    setShowDuplicates(false);
    onClose();
  };

  const handleDeleteClick = (groupId) => {
    setDeleteGroupId(groupId);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteGroupId) {
      const success = await deleteGroup(deleteGroupId);
      if (success) {
        const offset = (page - 1) * pageSize;
        getGroups(pageSize, offset, search);
      }
      setIsDeleteConfirmOpen(false);
      setDeleteGroupId(null);
    }
  };

  const columns = [
    {
      title: "S.no",
      key: "s_no",
      Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
    },
    {
      title: "Group Name",
      key: "groupName",
      sort: true,
    },
    {
      title: "Contacts Count",
      key: "totalContacts",
      sort: true,
    },
    {
      title: "Created At",
      key: "createdAt",
      sort: true,
      Cell: (row) => (
        <span className="text-slate-500 font-medium">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      title: "Action",
      key: "action",
      Cell: (row) => (
        <Button
          variant="ghost"
          size="icon"
          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
          onClick={() => handleDeleteClick(row._id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const downloadSample = (e) => {
    e.preventDefault();
    const csvContent = "Country Code,Mobile Number\n91,9999999999";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_group.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      {/* Header Actions */}
      <div className="flex justify-end items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search Groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 min-h-0 rounded-xl overflow-hidden flex flex-col">
        <DataTable
          columns={columns}
          data={groups || []}
          totaldata={totalGroups}
          page={page}
          pageSize={pageSize}
          serverSide
          onPageChange={(val) => {
            setPage(val.currentPage);
            setPageSize(val.pageSize);
          }}
          loading={getGroupsLoading}
        />
      </div>

      {/* Create Group Dialog */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => !open && handleCloseModal()}
      >
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Create New Group
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={hookHandleSubmit(handleCreateGroup)}
              className="p-6 space-y-6"
            >
              <FormField
                control={control}
                name="groupName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">
                      Group Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Summer Campaign 2024"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="file"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">
                      Upload Contacts (CSV/Excel)
                    </FormLabel>
                    <FormControl>
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-3",
                          file
                            ? "border-primary/40 bg-primary/5"
                            : "border-slate-200 hover:border-primary/30 hover:bg-slate-50/50",
                          formErrors.file && "border-rose-300 bg-rose-50/30",
                        )}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {file ? (
                          <div className="flex flex-col items-center gap-2">
                            <FileUp className="w-10 h-10 text-primary animate-in zoom-in duration-300" />
                            <div className="text-sm font-bold text-slate-700">
                              {file.name}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] text-slate-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                setValue("file", null);
                                setDuplicates([]);
                                setShowDuplicates(false);
                              }}
                            >
                              Change File
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                              <Upload className="w-6 h-6 text-slate-400" />
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-bold text-slate-700">
                                Click to upload
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                CSV or Excel files only
                              </div>
                            </div>
                          </>
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept=".csv, .xlsx, .xls"
                          onChange={handleFileChange}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duplicate Warning */}
              {showDuplicates && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Potential Duplicates: {duplicates.length}
                  </div>
                  <div className="text-[11px] text-amber-800/80 leading-relaxed max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                    {duplicates.slice(0, 5).map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-amber-400" />
                        {d}
                      </div>
                    ))}
                    {duplicates.length > 5 && (
                      <div className="pl-3 italic opacity-70">
                        ...and {duplicates.length - 5} more
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-amber-600 font-medium pt-1">
                    Note: Duplicates will be automatically merged on creation.
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs text-primary hover:text-primary/80 flex items-center gap-1.5"
                  onClick={downloadSample}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample CSV
                </Button>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 -mx-6 px-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createGroupLoading}
                  className="min-w-[120px]"
                >
                  {createGroupLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Group"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group?</DialogTitle>
            <DialogDescription>
              This will permanently remove the group and all its contacts. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setDeleteGroupId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWhatsappGroups;
