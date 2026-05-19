import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { useCampaignStore } from "../../../store/admin/useCampaignStore.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

function AdminCampaignList() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const { authRole } = useAuthStore();

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(
    parseInt(params.get("per_page")) || 10,
  );
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [searchString, setSearchString] = useState("");
  const debouncedSearchString = useDebounce(searchString, 500);

  const offset = (page - 1) * pageSize;

  const {
    getCampaignData,
    CampaignTabelLoading,
    CampaignData,
    CampaignDataTotal,
    deleteCampaign,
  } = useCampaignStore();

  // Update URL on pagination change
  useEffect(() => {
    if (authRole === "TL") {
      navigate(`/tl-campaign?tab=Campaign&page=${page}&per_page=${pageSize}`);
    } else if (authRole === "ADMIN") {
      navigate(
        `/admin-campaign?tab=Campaign&page=${page}&per_page=${pageSize}`,
      );
    }
  }, [page, pageSize, authRole, navigate]);

  // Fetch data whenever params change
  useEffect(() => {
    getCampaignData(
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
    getCampaignData,
  ]);

  const handleEdit = useCallback(
    (id) => {
      navigate(`/admin-edit-campaign?editId=${id}`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteCampaign(id);
        await getCampaignData(
          pageSize,
          offset,
          debouncedSearchString,
          sortField,
          sortOrder,
        );
      } catch (err) {
        console.error("❌ Failed to delete Campaign:", err);
      }
    },
    [
      deleteCampaign,
      getCampaignData,
      pageSize,
      offset,
      debouncedSearchString,
      sortField,
      sortOrder,
    ],
  );

  const onPageChange = useCallback((pagevalues) => {
    setPage(pagevalues.currentPage);
    setPageSize(pagevalues.pageSize);
    setSortField(pagevalues.sortConfig.key);
    setSortOrder(pagevalues.sortConfig.direction);
  }, []);

  const columns = [
    {
      title: "S.no",
      key: "s_no",
      Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
    },
    { title: "Name", key: "campaignName" },
    { title: "DID", key: "didGroupName" },
    { title: "Form Name", key: "f_formName" },
    {
      title: "Member Group Name",
      key: "memberGroupName",
      Cell: (row) => {
        const list = Array.isArray(row?.memberGroupName)
          ? row.memberGroupName
          : [];
        const names = list.filter(Boolean);

        return (
          <Popover>
            <PopoverTrigger asChild>
              <div className="flex flex-wrap gap-1 cursor-pointer">
                {names.length > 0 ? (
                  <>
                    <Badge variant="outline" className="bg-slate-50">
                      {names[0]}
                    </Badge>
                    {names.length > 1 && (
                      <Badge variant="secondary">+{names.length - 1}</Badge>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400 text-xs">-</span>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                Members
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {names.length === 0 ? (
                  <p className="text-xs text-slate-500">No members</p>
                ) : (
                  names.map((m, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-slate-600 px-2 py-1 bg-slate-50 rounded-md border border-slate-100"
                    >
                      {m}
                    </div>
                  ))
                )}
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
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hover:bg-primary/10 hover:text-primary"
                  onClick={() => handleEdit(record.campaignId)}
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
                  onClick={() => handleDelete(record.campaignId)}
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
            placeholder="Search by Name, Member Group Name"
            className="pl-10 placeholder:text-[11px] xl:placeholder:text-xs 2xl:placeholder:text-sm bg-white"
            onChange={(e) => setSearchString(e.target.value)}
            value={searchString}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          columns={authRole === "TL" ? tlcolumns : columns}
          data={CampaignData}
          loading={CampaignTabelLoading}
          totaldata={CampaignDataTotal}
          pagination={true}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}

export default AdminCampaignList;
