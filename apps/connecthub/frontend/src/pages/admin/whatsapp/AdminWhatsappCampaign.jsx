import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useWhatsappStore } from "../../../store/admin/whatsapp/useWhatsappStore.js";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const StatusBadge = ({ status }) => {
    const normalizedStatus = status?.toLowerCase();
    let bgClass = "bg-slate-100 text-slate-700";
    if (normalizedStatus === "approved" || normalizedStatus === "completed" || normalizedStatus === "active")
        bgClass = "bg-emerald-100 text-emerald-700";
    else if (normalizedStatus === "pending" || normalizedStatus === "running")
        bgClass = "bg-amber-100 text-amber-700";
    else if (normalizedStatus === "rejected" || normalizedStatus === "failed")
        bgClass = "bg-rose-100 text-rose-700";

    return (
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${bgClass}`}>
            {status || "-"}
        </span>
    );
};

const AdminWhatsappCampaign = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);

    const { authRole } = useAuthStore();

    const [page, setPage] = useState(parseInt(params.get("page")) || 1);
    const [pageSize, setPageSize] = useState(parseInt(params.get("per_page")) || 10);
    const [offset, setOffset] = useState((parseInt(params.get("page")) - 1) * pageSize || 0);
    const [sortField, setSortField] = useState("");
    const [sortOrder, setSortOrder] = useState("");
    const [searchString, setSearchString] = useState("");
    const debouncedSearch = useDebounce(searchString, 500);

    const { getCampaigns, campaigns, totalCampaigns, getCampaignsLoading } = useWhatsappStore();

    useEffect(() => {
        if (authRole === "TL") {
            navigate(`/tl-whatsapp?tab=Campaign&page=${page}&per_page=${pageSize}`, { replace: true });
        } else if (authRole === "ADMIN") {
            navigate(`/admin-whatsapp?tab=Campaign&page=${page}&per_page=${pageSize}`, { replace: true });
        }
    }, [page, pageSize, navigate, authRole]);

    useEffect(() => {
        getCampaigns(pageSize, offset, debouncedSearch, sortField, sortOrder);
    }, [pageSize, offset, debouncedSearch, sortField, sortOrder, getCampaigns]);

    const handleEdit = useCallback(
        async (id) => {
            // navigate(`/admin-edit-phonenumber?editId=${id}`);
        },
        []
    );

    const handleDelete = useCallback(
        async (id) => {
            try {
                // await deleteCliNumber(id);
                // await getCliNumber(pageSize, offset, debouncedSearch, sortField, sortOrder);
            } catch (err) {
                console.error("Delete failed:", err);
            }
        },
        [pageSize, offset, debouncedSearch, sortField, sortOrder]
    );

    const columns = useMemo(() => [
        {
            title: "S.no",
            key: "s_no",
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        },
        { title: "Campaign Name", key: "campaignName", sort: true },
        { title: "Category", key: "campaignCategory", sort: true },
        {
            title: "Status",
            key: "status",
            sort: true,
            Cell: (record) => <StatusBadge status={record.status} />
        },
        {
            title: "Template Name",
            key: "templateName",
            Cell: (record) => <StatusBadge status={record.templateName} />
        },
        { title: "Schedule Date", key: "scheduleTime", sort: true },
        {
            title: "Created On",
            key: "createdOn",
            Cell: (record) => {
                if (!record.createdOn) return "-";
                const date = new Date(record.createdOn);
                return date.toLocaleString();
            },
        },
    ], [page, pageSize, handleEdit, handleDelete]);

    const tlcolumns = columns.filter((col => col.key !== 'actions'));

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
                    columns={authRole === "TL" ? tlcolumns : columns}
                    data={campaigns || []}
                    loading={getCampaignsLoading}
                    totaldata={totalCampaigns}
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
        </div>
    );
};

export default AdminWhatsappCampaign;
