import { useEffect, useState } from "react";
import { useformStore } from "../store/admin/useformStore.js";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Edit, Trash2, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import FormModalDisplay from "./FormModalDisplay.jsx";
import { useDebounce } from "../hooks/useDebounce.js";
import { useAuthStore } from "../store/useAuthStore.js";

const AdminFormBuilderList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const {
    getFormList,
    formListData,
    formListCount,
    isFormLoading,
    deleteForm,
  } = useformStore();

  const { authRole } = useAuthStore();

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(
    parseInt(params.get("per_page")) || 10,
  );
  const [offset, setOffset] = useState((page - 1) * pageSize);
  const [searchString, setSearchString] = useState("");
  const [sortOrder, setSortOrder] = useState("ASC");
  const [sortField, setSortField] = useState("f_formName");
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewFormData, setPreviewFormData] = useState(null);
  const debouncedSearch = useDebounce(searchString, 500);

  useEffect(() => {
    if (authRole === "TL") {
      navigate(
        `/tl-campaign?tab=Form%20Builder&page=${page}&per_page=${pageSize}`,
      );
    } else if (authRole === "ADMIN") {
      navigate(
        `/admin-campaign?tab=Form%20Builder&page=${page}&per_page=${pageSize}`,
      );
    }
  }, [page, pageSize, navigate, authRole]);

  useEffect(() => {
    getFormList({ pageSize, offset, sortField, sortOrder, debouncedSearch });
  }, [pageSize, offset, sortField, sortOrder, debouncedSearch, getFormList]);

  const handleDelete = async (formId) => {
    await deleteForm(formId);
    getFormList({ pageSize, offset, sortField, sortOrder, debouncedSearch });
  };

  const columns = [
    {
      title: "S.no",
      key: "s_no",
      Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
    },
    { title: "Form Name", key: "f_formName", sort: true },
    {
      title: "Fields Count",
      key: "f_formcolumnName",
      Cell: (record) => {
        const count = record?.f_formPayload?.elements?.length || 0;
        return count;
      },
    },
    {
      title: "Created On",
      key: "f_createdOn",
      sort: true,
    },
    {
      title: "Preview",
      key: "preview",
      Cell: (record) => (
        <Button
          variant="secondary"
          size="sm"
          className="h-8"
          onClick={() => {
            if (record?.f_formPayload) {
              setPreviewFormData(record.f_formPayload);
              setIsPreviewModalOpen(true);
            } else {
              alert("Invalid form structure");
            }
          }}
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          Preview
        </Button>
      ),
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
                  onClick={() =>
                    navigate("/admin-campaign/admin-edit-formbuilder", {
                      state: { formData: record.f_formPayload },
                    })
                  }
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
                  onClick={() => handleDelete(record.f_formId)}
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

  const tlcolumns = columns.filter((col) => col.key !== "actions");

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="w-full flex items-center justify-end gap-4">
        <div className="relative w-[400px] group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            type="text"
            placeholder="Search by Form Name"
            className="pl-10 placeholder:text-[11px] xl:placeholder:text-xs 2xl:placeholder:text-sm bg-white"
            onChange={(e) => setSearchString(e.target.value)}
            value={searchString}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          columns={authRole === "TL" ? tlcolumns : columns}
          data={formListData}
          loading={isFormLoading}
          totaldata={formListCount}
          pagination={true}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={({ currentPage, pageSize, sortConfig }) => {
            const allowedSortFields = ["f_formName", "f_createdOn"];
            const allowedSortOrders = ["ASC", "DESC"];
            setPage(currentPage);
            setPageSize(pageSize);
            setOffset((currentPage - 1) * pageSize);
            setSortField(
              allowedSortFields.includes(sortConfig?.key)
                ? sortConfig.key
                : "f_formName",
            );
            setSortOrder(
              allowedSortOrders.includes(sortConfig?.direction)
                ? sortConfig.direction
                : "ASC",
            );
          }}
        />
      </div>

      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="sm:max-w-[720px] p-0 gap-0 overflow-hidden bg-[#F1F5F9]">
          <DialogHeader>
            <DialogTitle>Form Preview</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-6 overflow-y-auto max-h-[50vh]">
            <FormModalDisplay formData={previewFormData} />
          </div>
          <DialogFooter className="bg-[#F1F5F9]">
            <Button
              variant="default"
              onClick={() => setIsPreviewModalOpen(false)}
            >
              Ok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFormBuilderList;
