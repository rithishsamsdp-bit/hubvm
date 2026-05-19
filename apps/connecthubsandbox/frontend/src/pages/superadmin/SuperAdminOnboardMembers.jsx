import { useEffect, useState, useCallback, useMemo } from "react";
import "./styles/SuperAdminOnboardMembers.css";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../../constants/Icon.jsx";
import { useOnboard } from "../../store/superadmin/useOnboard.js";
import { Table, Input } from "../../components/Index.jsx";
import { useDebounce } from "../../hooks/useDebounce.js";

const SuperAdminOnboardMembers = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);

    const {
        companyUsers,
        companyUsersLoading,
        companyUsersTotalCount,
        selectedCompanyName,
        getCompanyUsers,
    } = useOnboard();

    const accountId = params.get("id");
    const accountName = params.get("name");
    const accountCode = params.get("code");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [offset, setOffset] = useState(0);
    const [sortField, setSortField] = useState("");
    const [sortOrder, setSortOrder] = useState("");
    const [searchString, setSearchString] = useState("");
    const debouncedSearchString = useDebounce(searchString, 500);

    useEffect(() => {
        if (accountId && accountName) {
            getCompanyUsers(
                parseInt(accountId),
                accountName,
                pageSize,
                offset,
                sortField,
                sortOrder,
                debouncedSearchString
            );
        }
    }, [accountId, accountName, pageSize, offset, sortField, sortOrder, debouncedSearchString, getCompanyUsers]);

    const usersColumns = useMemo(() => [
        {
            title: "S.no",
            key: "s_no",
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        },
        { title: "Company Code", key: "m_accountCode" },
        { title: "Member Name", key: "m_memberName" },
        { title: "Password", key: "m_memberPassword" },
        { title: "Role", key: "m_memberRole" },
        { title: "Extension No", key: "m_memberExtensionNo" },
        { title: "Mobile No", key: "m_memberMobileNo" },
        { title: "Email", key: "m_memberMailId" },
        { title: "Mode", key: "m_memberMode" },
    ], [page, pageSize]);

    return (
        <div className="superadmin_onboard_members_creation">
            {/* Header */}
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">Onboard</p>
                    <span className="navbar_1_breadcrumb">
                        <span
                            onClick={() => navigate("/superadmin-onboard")}
                            className="navbar_1_breadcrumb_item"
                        >
                            Onboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item active">
                            Members
                        </span>
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="superadmin_onboard_members_content">
                <div className="superadmin_onboard_members_container">
                    <div className="superadmin_onboard_members_header">
                        <p className="superadmin_onboard_members_title">
                            Members for {selectedCompanyName || accountName} {accountCode ? `(${accountCode})` : ""}
                        </p>
                        <div className="superadmin_onboard_members_search">
                            <Input
                                type="text"
                                placeholder="Search by Name, Email, or Role"
                                width="400px"
                                suffixIcon="search"
                                suffixIconColor="#334155"
                                onChange={(e) => setSearchString(e.target.value)}
                                value={searchString}
                            />
                        </div>
                    </div>

                    <Table
                        columns={usersColumns}
                        data={companyUsers}
                        loading={companyUsersLoading}
                        totaldata={companyUsersTotalCount}
                        page={page}
                        serverSide
                        pageSize={pageSize}
                        pagination={true}
                        showtotal={true}
                        onPageChange={(pagevalues) => {
                            setPage(pagevalues.currentPage);
                            setPageSize(pagevalues.pageSize);
                            setOffset(pagevalues.pageSize * (pagevalues.currentPage - 1));
                            setSortField(pagevalues.sortConfig?.key || "");
                            setSortOrder(pagevalues.sortConfig?.direction || "");
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default SuperAdminOnboardMembers;
