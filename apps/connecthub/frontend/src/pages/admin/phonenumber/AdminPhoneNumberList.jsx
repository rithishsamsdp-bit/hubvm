import { useEffect, useState, useMemo, useCallback } from "react";
import { usePhoneNumberStore } from "../../../store/admin/usePhoneNumberStore.js";
import { useNavigate, useLocation } from "react-router-dom";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Edit, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const AdminPhoneNumberList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const {
    phoneNumberData,
    phoneNumberLoading,
    getCliNumber,
    phoneNumberTotalCount,
    deleteCliNumber,
  } = usePhoneNumberStore();
  const { authRole } = useAuthStore();

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

  useEffect(() => {
    const path = authRole === "TL" ? "/tl-phonenumber" : "/admin-phonenumber";
    navigate(`${path}?tab=Phone%20Number&page=${page}&per_page=${pageSize}`);
  }, [page, pageSize, navigate, authRole]);

  useEffect(() => {
    getCliNumber(pageSize, offset, debouncedSearch, sortField, sortOrder);
  }, [pageSize, offset, debouncedSearch, sortField, sortOrder, getCliNumber]);

  const handleEdit = useCallback(
    (id) => {
      navigate(`/admin-edit-phonenumber?editId=${id}`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteCliNumber(id);
        getCliNumber(pageSize, offset, debouncedSearch, sortField, sortOrder);
      } catch (err) {
        console.error("Delete failed:", err);
      }
    },
    [
      deleteCliNumber,
      getCliNumber,
      pageSize,
      offset,
      debouncedSearch,
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

  const columns = useMemo(
    () => [
      {
        title: "S.no",
        key: "s_no",
        width: 50,
        Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
      },
      { title: "Country Code", key: "c_clinumberCountryCode" },
      { title: "Country Name", key: "c_clinumberCountryName" },
      { title: "Number", key: "c_clinumberName" },
      { title: "Type", key: "c_clinumberType" },
      {
        title: "SMS Mode",
        key: "c_smsMode",
        Cell: (record) => record.c_smsMode || "WEB",
      },
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
                    onClick={() => handleEdit(record.c_clinumberId)}
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

  const displayColumns = useMemo(() => {
    return authRole === "TL"
      ? columns.filter((col) => col.key !== "actions")
      : columns;
  }, [columns, authRole]);

  return (
    <div className="p-6 h-full flex flex-col gap-4 overflow-hidden">
      <div className="w-full flex items-center justify-end">
        <div className="relative w-[350px] group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            type="text"
            placeholder="Search by Name, Number"
            className="pl-10 placeholder:text-xs"
            onChange={(e) => setSearchString(e.target.value)}
            value={searchString}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          columns={displayColumns}
          data={phoneNumberData}
          loading={phoneNumberLoading}
          totaldata={phoneNumberTotalCount}
          pagination={true}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
};

export default AdminPhoneNumberList;
