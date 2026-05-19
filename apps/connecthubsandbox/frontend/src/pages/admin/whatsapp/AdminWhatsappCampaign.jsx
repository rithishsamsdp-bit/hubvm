import { useEffect, useState, useMemo, useCallback } from "react";
import "./styles/AdminWhatsappCampaign.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useDebounce } from "../../../hooks/useDebounce.js";
import Icon from "../../../constants/Icon.jsx";
import {
    Button,
    Input,
    Table,
    Tabletag,
} from "../../../components/Index.jsx";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useWhatsappStore } from "../../../store/admin/whatsapp/useWhatsappStore.js";

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
            navigate(`/tl-whatsapp?tab=Campaign&page=${page}&per_page=${pageSize}`);
        }
        else if (authRole === "ADMIN") {
            navigate(`/admin-whatsapp?tab=Campaign&page=${page}&per_page=${pageSize}`);

        }
    }, [page, pageSize, navigate]);

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
        { title: "Status", key: "status", sort: true },
        {
            title: "Template Status",
            key: "templateName",
            Cell: (record) => {
                const status = record.templateName?.toLowerCase();
                let statusClass = "";
                if (status === "approved") statusClass = "status_approved";
                else if (status === "pending") statusClass = "status_pending";
                else if (status === "rejected") statusClass = "status_rejected";
                return <span className={statusClass}>{record.templateName || "-"}</span>;
            }
        },
        { title: "Schedule Date", key: "scheduleTime", sort: true },
        {
            title: "Created On",
            key: "createdOn",
            Cell: (record) => {
                const date = new Date(record.createdOn);
                return date.toLocaleString();
            },
        },

    ], [page, pageSize, handleEdit, handleDelete]);

    const tlcolumns = columns.filter((col => col.key !== 'actions'));

    return (
        <>
            <div className="admin_whatsapp_campaign_list_container">
                <div className="admin_whatsapp_campaign_list_container_table_search">
                    <Input
                        type="text"
                        placeholder="Search by name"
                        width="400px"
                        suffixIcon="search"
                        suffixIconColor="#334155"
                        onChange={(e) => setSearchString(e.target.value)}
                        value={searchString}
                    />
                </div>
                <Table
                    columns={authRole === "TL" ? tlcolumns : columns}
                    data={campaigns}
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
        </>
    );
};

export default AdminWhatsappCampaign;
