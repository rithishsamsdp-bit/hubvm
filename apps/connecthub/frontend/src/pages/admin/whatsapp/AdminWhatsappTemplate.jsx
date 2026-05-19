import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useWaTemplateStore } from "../../../store/admin/whatsapp/useWaTemplateStore.js";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Eye, Trash2, Link as LinkIcon, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const StatusBadge = ({ status }) => {
  const normalizedStatus = status?.toLowerCase();
  let bgClass = "bg-slate-100 text-slate-700";
  if (normalizedStatus === "approved")
    bgClass = "bg-emerald-100 text-emerald-700";
  else if (normalizedStatus === "pending")
    bgClass = "bg-amber-100 text-amber-700";
  else if (normalizedStatus === "rejected")
    bgClass = "bg-rose-100 text-rose-700";

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${bgClass}`}
    >
      {status || "-"}
    </span>
  );
};

const AdminWhatsappTemplate = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const { authRole } = useAuthStore();
  const {
    templates,
    getTemplates,
    getTemplatesLoading,
    deleteTemplate,
    deleteTemplateLoading,
  } = useWaTemplateStore();

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(
    parseInt(params.get("per_page")) || 10,
  );
  const [offset, setOffset] = useState(
    (parseInt(params.get("page")) - 1) * pageSize || 0,
  );
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [searchString, setSearchString] = useState("");
  const debouncedSearch = useDebounce(searchString, 500);

  // Preview Modal State
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const handlePreview = useCallback((template) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  }, []);

  const closePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewTemplate(null);
  }, []);

  useEffect(() => {
    const basePath = authRole === "TL" ? "/tl-whatsapp" : "/admin-whatsapp";
    navigate(`${basePath}?tab=Template&page=${page}&per_page=${pageSize}`, {
      replace: true,
    });
  }, [page, pageSize, navigate, authRole]);

  useEffect(() => {
    getTemplates(pageSize, offset, debouncedSearch, sortField, sortOrder);
  }, [pageSize, offset, debouncedSearch, sortField, sortOrder]);

  const openDeleteConfirm = useCallback((templateName) => {
    if (!templateName) return;
    setTemplateToDelete(templateName);
    setShowDeleteConfirm(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm(false);
    setTemplateToDelete(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!templateToDelete) return;

    try {
      const success = await deleteTemplate(templateToDelete);
      if (success) {
        await getTemplates(
          pageSize,
          offset,
          debouncedSearch,
          sortField,
          sortOrder,
        );
      }
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      closeDeleteConfirm();
    }
  }, [
    templateToDelete,
    pageSize,
    offset,
    debouncedSearch,
    sortField,
    sortOrder,
    deleteTemplate,
    getTemplates,
    closeDeleteConfirm,
  ]);

  const columns = useMemo(() => {
    const cols = [
      {
        title: "S.no",
        key: "s_no",
        Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        width: 80,
      },
      { title: "Template ID", key: "templateId" },
      { title: "Template Name", key: "templateName" },
      { title: "Category", key: "templateCategory" },
      {
        title: "Status",
        key: "templateStatus",
        Cell: (record) => <StatusBadge status={record.templateStatus} />,
      },
      { title: "Language", key: "templateLanguage" },
      {
        title: "Created On",
        key: "createdOn",
        Cell: (record) => {
          if (!record.createdOn) return "-";
          const date = new Date(record.createdOn);
          return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        },
      },
      {
        title: "Preview",
        key: "preview",
        fixed: "right",
        width: 80,
        Cell: (record) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-primary"
            onClick={() => handlePreview(record)}
            title="Preview Template"
          >
            <Eye className="w-4 h-4" />
          </Button>
        ),
      },
    ];

    if (authRole !== "TL") {
      cols.push({
        title: "Action",
        key: "actions",
        fixed: "right",
        width: 80,
        Cell: (record) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-rose-500"
            onClick={() => openDeleteConfirm(record.templateName)}
            title="Delete Template"
            disabled={deleteTemplateLoading}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        ),
      });
    }
    return cols;
  }, [
    page,
    pageSize,
    handlePreview,
    deleteTemplateLoading,
    openDeleteConfirm,
    authRole,
  ]);

  return (
    <div className="flex flex-col w-full h-full gap-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="relative w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by name"
            value={searchString}
            onChange={(e) => setSearchString(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-lg">
        <DataTable
          columns={columns}
          data={templates || []}
          loading={getTemplatesLoading}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={(pagevalues) => {
            setPage(pagevalues.currentPage);
            setPageSize(pagevalues.pageSize);
            setOffset(pagevalues.pageSize * (pagevalues.currentPage - 1));
            setSortField(pagevalues.sortConfig.key);
            setSortOrder(pagevalues.sortConfig.direction);
          }}
        />
      </div>

      <Dialog
        open={showPreview}
        onOpenChange={(open) => !open && closePreview()}
      >
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-slate-50">
          <DialogHeader className="p-4 border-b border-slate-200 bg-white">
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>

          {previewTemplate && (
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              <div className="bg-[#E2F7CB] p-4 rounded-lg shadow-sm font-sans text-[13px] leading-relaxed text-[#111B21] relative mb-2 break-words">
                {/* Small tail for WhatsApp bubble effect */}
                <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-[#E2F7CB] border-l-[10px] border-l-transparent" />

                {previewTemplate.templateStructure?.components?.map(
                  (comp, idx) => (
                    <React.Fragment key={idx}>
                      {comp.type === "BODY" && (
                        <p className="whitespace-pre-wrap mb-2">{comp.text}</p>
                      )}
                      {comp.type === "FOOTER" && (
                        <p className="text-[#667781] text-[11px] mt-1 uppercase tracking-wide">
                          {comp.text}
                        </p>
                      )}
                    </React.Fragment>
                  ),
                )}

                <span className="float-right text-[10px] text-[#667781] ml-2 mt-1">
                  {new Date().toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>

              {/* Buttons outside the bubble */}
              {previewTemplate.templateStructure?.components?.map(
                (comp, idx) =>
                  comp.type === "BUTTONS" && (
                    <div key={idx} className="flex flex-col gap-2 mt-3">
                      {comp.buttons?.map((btn, btnIdx) => (
                        <div
                          key={btnIdx}
                          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white rounded-lg text-[#00A884] font-medium text-[13px] shadow-sm border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          {btn.type === "url" ? (
                            <>
                              <LinkIcon className="w-4 h-4" /> {btn.text}
                            </>
                          ) : btn.type === "phone_number" ? (
                            <>
                              <Phone className="w-4 h-4" /> {btn.text}
                            </>
                          ) : (
                            <span>{btn.text}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ),
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={showDeleteConfirm}
        onOpenChange={(v) => !v && closeDeleteConfirm()}
      >
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
          <div className="p-6 pt-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mb-4 ring-4 ring-rose-50">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-800 mb-2">
              Delete Template?
            </DialogTitle>
            <div className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete template "{templateToDelete}"?
              This action cannot be undone.
            </div>
            <div className="flex w-full gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={closeDeleteConfirm}
                disabled={deleteTemplateLoading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                onClick={handleDelete}
                disabled={deleteTemplateLoading}
              >
                {deleteTemplateLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWhatsappTemplate;
