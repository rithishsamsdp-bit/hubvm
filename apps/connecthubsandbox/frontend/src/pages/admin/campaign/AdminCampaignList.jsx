import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./styles/AdminCampaignList.css";
import Icon from "../../../constants/Icon.jsx";
import {
    Button, Input, Table, Badges,
    Popover,
} from "../../../components/Index.jsx";
import { useCampaignStore } from "../../../store/admin/useCampaignStore.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

function AdminCampaignList() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const { authRole } = useAuthStore();

    const [page, setPage] = useState(parseInt(params.get("page")) || 1);
    const [pageSize, setPageSize] = useState(parseInt(params.get("per_page")) || 10);
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
            navigate(`/tl-campaign?tab=campaign&page=${page}&per_page=${pageSize}`);
        } else if (authRole === "ADMIN") {
            navigate(`/admin-campaign?tab=campaign&page=${page}&per_page=${pageSize}`);
        }
    }, [page, pageSize]);

    // Fetch data whenever params change
    useEffect(() => {
        getCampaignData(pageSize, offset, debouncedSearchString, sortField, sortOrder);
    }, [pageSize, offset, debouncedSearchString, sortField, sortOrder]);

    const handleEdit = useCallback((id) => {
        navigate(`/admin-edit-campaign?editId=${id}`);
    }, [navigate]);

    const handleDelete = useCallback(
        async (id) => {
            try {
                await deleteCampaign(id);
                await getCampaignData(pageSize, offset, debouncedSearchString, sortField, sortOrder);
            } catch (err) {
                console.error("❌ Failed to delete Campaign:", err);
            }
        },
        [deleteCampaign, getCampaignData, pageSize, offset, debouncedSearchString, sortField, sortOrder]
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
                const list = Array.isArray(row?.memberGroupName) ? row.memberGroupName : [];
                const names = list.filter(Boolean); // assume list contains strings

                const popContent = (
                    <div>
                        <strong style={{ display: "block", marginBottom: 8 }}>Members</strong>
                        <ul className="pw-list">
                            {names.length === 0 ? (
                                <li>No members</li>
                            ) : (
                                names.map((m, idx) => <li key={idx}>{m}</li>)
                            )}
                        </ul>
                    </div>
                );

                return (
                    <Popover content={popContent} mode="click" placement="right">
                        <Badges badgeData={names} />
                    </Popover>
                );
            },
        },
        {
            title: "Actions",
            key: "actions",
            Cell: (record) => (
                <div className="admin_campaign_list_actions_btn_container">
                    <Button variant="empty" onClick={() => handleEdit(record.campaignId)}>
                        <Icon name="edit" size={15} color="#5F6368" />
                    </Button>
                    <Button variant="empty" onClick={() => handleDelete(record.campaignId)}>
                        <Icon name="deletee" size={15} color="#5F6368" />
                    </Button>
                </div>
            ),
        },
    ];

    const tlcolumns = columns.filter(col => col.key !== 'actions');

    return (
        <div className="admin_campaign_list_container">
            <div className="admin_campaign_list_table_search">
                <Input
                    type="text"
                    placeholder="Search by Name, Member Group Name"
                    width="400px"
                    suffixIcon="search"
                    suffixIconColor="#334155"
                    onChange={(e) => setSearchString(e.target.value)}
                    value={searchString}
                />
            </div>

            <Table
                columns={authRole === "TL" ? tlcolumns : columns}
                data={CampaignData}
                loading={CampaignTabelLoading}
                totaldata={CampaignDataTotal}
                page={page}
                serverSide
                pageSize={pageSize}
                onPageChange={onPageChange}
            />
        </div>
    );
}

export default AdminCampaignList;
