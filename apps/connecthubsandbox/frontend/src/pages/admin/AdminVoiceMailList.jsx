import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./styles/AdminVoiceMailList.css";
import Icon from "../../constants/Icon.jsx";
import { Button, Input, Table } from "../../components/Index.jsx";


function AdminVoiceMailList() {

    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const [page, setPage] = useState(parseInt(params.get("page")) || 1);
    const [pageSize, setPageSize] = useState(parseInt(params.get("per_page")) || 10);
    const [offset, setOffset] = useState((parseInt(params.get("page")) - 1) * pageSize || 0);
    const [searchString, setSearchString] = useState("");
    const [sortField, setSortField] = useState("");
    const [sortOrder, setSortOrder] = useState("");


    useEffect(() => {
        navigate(`/admin-phonenumber?tab=Voice%20Mail&page=${page}&per_page=${pageSize}`);
    }, [page, pageSize, navigate]);


    const columns = [
        { title: "S.no", key: "s_no" },
        { title: "Voice Mail Name", key: "temp_name" },
        { title: "Messages", key: "messages" },
        {
            title: "Actions",
            key: "actions",
            Cell: () => (
                <div className="">
                    <Button variant="empty">
                        <Icon name="edit" size={15} color="#5F6368" />
                    </Button>
                    <Button variant="empty">
                        <Icon name="deletee" size={15} color="#5F6368" />
                    </Button>
                </div>
            ),
        },
    ];

    const dataSource = Array.from({ length: 150 }, (_, i) => ({
        s_no: i + 1,
        temp_name: "Random Name",
        messages: "Sample message",
    }));

    return (
        <>
            <div className="admin_voicemail_list_container">
                <div className="admin_voicemail_list_table_search">
                    <Input
                        type="text"
                        placeholder="Search by Voice mail name"
                        width="400px"
                        suffixIcon="search"
                        suffixIconColor="#334155"
                    />
                </div>
                <Table
                    columns={columns}
                    data={dataSource}
                    // loading={phoneNumberLoading}
                    // totaldata={phoneNumberTotalCount}
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

}

export default AdminVoiceMailList;
