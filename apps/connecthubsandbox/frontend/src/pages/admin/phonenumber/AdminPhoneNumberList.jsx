import { useEffect, useState, useMemo, useCallback } from "react";
import "./styles/AdminPhoneNumberList.css";
import { usePhoneNumberStore } from "../../../store/admin/usePhoneNumberStore.js";
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
    const [pageSize, setPageSize] = useState(parseInt(params.get("per_page")) || 10);
    const [offset, setOffset] = useState((parseInt(params.get("page")) - 1) * pageSize || 0);
    const [sortField, setSortField] = useState("");
    const [sortOrder, setSortOrder] = useState("");
    const [searchString, setSearchString] = useState("");
    const debouncedSearch = useDebounce(searchString, 500);


    useEffect(() => {
        if (authRole === "TL") {
            navigate(`/tl-phonenumber?tab=Phone%20Number&page=${page}&per_page=${pageSize}`);

        }
        else if (authRole === "ADMIN") {
            navigate(`/admin-phonenumber?tab=Phone%20Number&page=${page}&per_page=${pageSize}`);

        }
    }, [page, pageSize, navigate]);

    useEffect(() => {
        getCliNumber(pageSize, offset, debouncedSearch, sortField, sortOrder);
    }, [pageSize, offset, debouncedSearch, sortField, sortOrder, getCliNumber]);

    const handleEdit = useCallback(
        async (id) => {
            navigate(`/admin-edit-phonenumber?editId=${id}`);
        },
        []
    );

    const handleDelete = useCallback(
        async (id) => {
            try {
                await deleteCliNumber(id);
                await getCliNumber(pageSize, offset, debouncedSearch, sortField, sortOrder);
            } catch (err) {
                console.error("Delete failed:", err);
            }
        },
        [deleteCliNumber, getCliNumber, pageSize, offset, debouncedSearch, sortField, sortOrder]
    );

    const columns = useMemo(() => [
        {
            title: "S.no",
            key: "s_no",
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        },
        { title: "Country Code", key: "c_clinumberCountryCode" },
        { title: "Country Name", key: "c_clinumberCountryName" },
        { title: "Number", key: "c_clinumberName" },
        { title: "Type", key: "c_clinumberType" },
        {
            title: "SMS Mode",
            key: "c_smsMode",
            Cell: (record) => record.c_smsMode || "WEB"
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
                const tagProps = {
                    Active: {
                        bgColor: "#F0FDF4",
                        textColor: "#16A34A",
                        borderColor: "#16A34A",
                    },
                    Inactive: {
                        bgColor: "#FFF1F2",
                        textColor: "#E11D48",
                        borderColor: "#E11D48",
                    },
                    default: {
                        bgColor: "#F4F4F4",
                        textColor: "#555555",
                        borderColor: "#555555",
                    },
                };

                const tag = tagProps[status] || tagProps.default;

                return <Tabletag text={status} {...tag} />;
            },
        },
        {
            title: "Actions",
            key: "actions",
            Cell: (record) => (
                <div className="admin_phonenumber_list_action_conatiner">
                    <Button variant="empty" onClick={() => handleEdit(record.c_clinumberId)}>
                        <Icon name="edit" size={15} color="#5F6368" />
                    </Button>
                    <Button variant="empty" onClick={() => handleDelete(record.c_clinumberId)}>
                        <Icon name="deletee" size={15} color="#5F6368" />
                    </Button>
                </div>
            ),
        },
    ], [page, pageSize, handleEdit, handleDelete]);

    const tlcolumns = columns.filter((col => col.key !== 'actions'));

    return (
        <>
            <div className="admin_phonenumber_list_container">
                <div className="admin_phonenumber_list_container_table_search">
                    <Input
                        type="text"
                        placeholder="Search by Number"
                        width="400px"
                        suffixIcon="search"
                        suffixIconColor="#334155"
                        onChange={(e) => setSearchString(e.target.value)}
                        value={searchString}
                    />
                </div>
                <Table
                    columns={authRole === "TL" ? tlcolumns : columns}
                    data={phoneNumberData}
                    loading={phoneNumberLoading}
                    totaldata={phoneNumberTotalCount}
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

export default AdminPhoneNumberList;
