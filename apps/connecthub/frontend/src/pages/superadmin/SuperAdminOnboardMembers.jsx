import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useOnboard } from "../../store/superadmin/useOnboard.js";
import { Navbar } from "../../components/Index.jsx";
import { useDebounce } from "../../hooks/useDebounce.js";

import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const SuperAdminOnboardMembers = () => {
  const location = useLocation();
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
        debouncedSearchString,
      );
    }
  }, [
    accountId,
    accountName,
    pageSize,
    offset,
    sortField,
    sortOrder,
    debouncedSearchString,
    getCompanyUsers,
  ]);

  const usersColumns = useMemo(
    () => [
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
    ],
    [page, pageSize],
  );

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <Navbar
        title="Onboard"
        breadcrumbs={[
          { label: "Onboard", route: "/superadmin-onboard" },
          { label: "Members", active: true },
        ]}
      />

      <div className="w-full h-[calc(100%-90px)] p-6 flex flex-col gap-4 overflow-hidden">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">
            Members for{" "}
            <span className="text-primary">
              {selectedCompanyName || accountName}
            </span>
            {accountCode && (
              <span className="text-slate-400 font-medium ml-1.5">
                ({accountCode})
              </span>
            )}
          </h2>

          <div className="relative w-[350px] group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              type="text"
              placeholder="Search by Name, Email, or Role"
              className="pl-10 placeholder:text-[11px] xl:placeholder:text-xs 2xl:placeholder:text-sm"
              onChange={(e) => setSearchString(e.target.value)}
              value={searchString}
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0">
          <DataTable
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
