import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useUsersStore } from "../../../store/admin/useUsersStore";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import sampleCsv from '../../../constants/sample-members.csv?url';
import sampleCustomCsv from '../../../constants/sample-custom-members.csv?url';

import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Edit, Trash2, UploadCloud, Download, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const AdminUsersList = ({ externalModalOpen, onExternalModalClose, exportRef }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const {
    getUsersList,
    userListData,
    userListDataCount,
    isuserListDataLoading,
    deleteUser,
    editUser,
    editcallType,
    isuserUpdateLoading,
    uploadLoading,
    uploadFile,
    exportUsers,
    update2FAStatus
  } = useUsersStore();

  const { authRole, authPlan } = useAuthStore();

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(
    parseInt(params.get("per_page")) || 10
  );
  const [offset, setOffset] = useState((page - 1) * pageSize);
  const [sortField, setSortField] = useState("m_memberName");
  const [sortOrder, setSortOrder] = useState("ASC");
  
  const [roleFilter, setRoleFilter] = useState("");
  const [memberMode, setMemberMode] = useState("");
  const [memberPlatform, setMemberPlatform] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [batchModalOpen, setbatchModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const [searchString, setSearchString] = useState("");
  const debouncedSearch = useDebounce(searchString, 500);

  // File selection
  const fileRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (authRole === "TL") {
      navigate(`/tl-users?tab=Users&page=${page}&per_page=${pageSize}`);
    } else if (authRole === "ADMIN") {
      navigate(`/admin-users?tab=Users&page=${page}&per_page=${pageSize}`);
    }
  }, [page, pageSize, navigate, authRole]);

  useEffect(() => {
    getUsersList(
      pageSize,
      offset,
      sortField,
      sortOrder,
      debouncedSearch,
      roleFilter,
      memberMode,
      memberPlatform
    );
  }, [
    pageSize,
    offset,
    sortField,
    sortOrder,
    debouncedSearch,
    roleFilter,
    memberMode,
    memberPlatform,
    getUsersList,
  ]);

  useEffect(() => {
    if (externalModalOpen) {
      setbatchModalOpen(true);
    }
  }, [externalModalOpen]);

  const validateField = (name, value) => {
    let stringValue = "";
    try {
      if (value === null || value === undefined) {
        stringValue = "";
      } else if (typeof value === 'string') {
        stringValue = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        stringValue = String(value);
      } else {
        stringValue = "";
      }
    } catch (e) {
      stringValue = "";
    }

    switch (name) {
      case "m_memberName":
        return stringValue.trim() ? "" : "Name is required";
      case "m_memberPassword":
        return stringValue.trim() ? "" : "Password is required";
      case "m_memberMailId":
        if (!stringValue.trim()) return "Email is required";
        return /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(stringValue)
          ? ""
          : "Invalid email format";
      case "m_memberMode":
        return stringValue ? "" : "Mode is required";
      case "m_memberRole":
        return stringValue ? "" : "Role is required";
      case "m_memberPlatformType":
        return stringValue ? "" : "Type is required";
      case "m_memberCallerIdMode":
        return stringValue ? "" : "Caller ID Mode is required";
      case "m_memberCallerId":
        if (formData?.m_memberCallerIdMode === "YES") {
          return stringValue.trim() ? "" : "Caller ID is required";
        }
        return "";
      default:
        return "";
    }
  };

  const validateForm = () => {
    const newErrors = {};
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key, value);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = useCallback((id) => {
    const user = userListData.find((u) => u.m_memberId === id);
    if (user) {
      setFormData({
        m_memberId: user.m_memberId,
        m_memberName: user.m_memberName ? String(user.m_memberName) : "",
        m_memberPassword: user.m_memberPassword ? String(user.m_memberPassword) : "",
        m_memberRole: user.m_memberRole ? String(user.m_memberRole) : "",
        m_memberCallerId: user.m_memberCallerId ? String(user.m_memberCallerId) : "",
        m_memberMobileNo: user.m_memberMobileNo ? String(user.m_memberMobileNo) : "",
        m_memberMailId: user.m_memberMailId ? String(user.m_memberMailId) : "",
        m_memberMode: user.m_memberMode ? String(user.m_memberMode) : "",
        m_memberPlatformType: user.m_memberPlatformType ? String(user.m_memberPlatformType) : "",
        m_memberCallerIdMode: user.m_memberCallerIdMode ? String(user.m_memberCallerIdMode) : "YES",
      });
      setErrors({});
      setEditModalOpen(true);
    }
  }, [userListData]);

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteUser(id);
        await getUsersList(
          pageSize,
          offset,
          sortField,
          sortOrder,
          debouncedSearch,
          roleFilter,
          memberMode,
          memberPlatform
        );
      } catch (err) {
        console.error("Failed to delete user:", err);
      }
    },
    [deleteUser, getUsersList, pageSize, offset, sortField, sortOrder, debouncedSearch, roleFilter, memberMode, memberPlatform]
  );

  const handleClearFilters = () => {
    setRoleFilter("");
    setMemberMode("");
    setMemberPlatform("");
    setSearchString("");
    setPage(1);
  };

  const handleEditModalCancel = () => {
    setEditModalOpen(false);
    setFormData({});
    setErrors({});
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleBatchModalCancel = () => {
    setbatchModalOpen(false);
    clearSelectedFile();
    onExternalModalClose?.();
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "m_memberCallerIdMode" && value === "NO") {
        next.m_memberCallerId = "";
      }
      return next;
    });

    setErrors((prev) => {
      const next = { ...prev, [name]: validateField(name, value) };
      if (name === "m_memberCallerIdMode") {
        if (value === "NO") {
          delete next.m_memberCallerId;
        } else if (value === "YES") {
          next.m_memberCallerId = validateField("m_memberCallerId", formData?.m_memberCallerId ?? "");
        }
      }
      return next;
    });
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const payload = {
          m_memberId: formData.m_memberId,
          m_memberName: formData.m_memberName ? String(formData.m_memberName) : "",
          m_memberPassword: formData.m_memberPassword ? String(formData.m_memberPassword) : "",
          m_memberRole: formData.m_memberRole ? String(formData.m_memberRole) : "",
          m_memberMobileNo: formData.m_memberMobileNo ? String(formData.m_memberMobileNo) : "",
          m_memberMailId: formData.m_memberMailId ? String(formData.m_memberMailId) : "",
          m_memberMode: formData.m_memberMode ? String(formData.m_memberMode) : "",
          m_memberPlatformType: formData.m_memberPlatformType ? String(formData.m_memberPlatformType) : "",
          m_memberCallerIdMode: formData.m_memberCallerIdMode ? String(formData.m_memberCallerIdMode) : "YES",
        };

        if (payload.m_memberCallerIdMode === "NO") {
          delete payload.m_memberCallerId;
        } else if (payload.m_memberCallerIdMode === "YES") {
          const callerIdValue = formData.m_memberCallerId ? String(formData.m_memberCallerId) : "";
          payload.m_memberCallerId = callerIdValue.trim() || "0";
        }

        await editUser(payload);
        await getUsersList(
          pageSize,
          (page - 1) * pageSize,
          sortField,
          sortOrder,
          debouncedSearch,
          roleFilter,
          memberMode,
          memberPlatform
        );
        handleEditModalCancel();
      } catch (err) {
        console.error("Failed to update user:", err);
        setErrors({ general: "Failed to update user. Please try again." });
      }
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    if (authPlan?.options?.usercreation?.custom_extension) {
      a.href = sampleCustomCsv;
      a.download = 'sample-custom-members.csv';
    } else {
      a.href = sampleCsv;
      a.download = 'sample-members.csv';
    }
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const openFilePicker = () => {
    if (fileRef.current) fileRef.current.value = "";
    fileRef.current?.click();
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setSelectedFile(f || null);
  };

  const handleBatchUpload = async () => {
    if (!selectedFile) return;
    try {
      const formdata = new FormData();
      formdata.append("file", selectedFile, selectedFile.name);
      await uploadFile(formdata);

      setbatchModalOpen(false);
      clearSelectedFile();

      await getUsersList(
        pageSize,
        (page - 1) * pageSize,
        sortField,
        sortOrder,
        debouncedSearch,
        roleFilter,
        memberMode,
        memberPlatform
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportData = useCallback(() => {
    exportUsers(
      pageSize,
      offset,
      sortField,
      sortOrder,
      debouncedSearch,
      roleFilter,
      memberMode,
      memberPlatform
    );
  }, [exportUsers, pageSize, offset, sortField, sortOrder, debouncedSearch, roleFilter, memberMode, memberPlatform]);

  useEffect(() => {
    if (exportRef) {
      exportRef.current = handleExportData;
    }
  }, [exportRef, handleExportData]);

  const handlePageChange = useCallback((pagevalues) => {
    const allowedSortFields = [
      "m_accountCode", "m_memberName", "m_memberPassword", 
      "m_memberRole", "m_memberExtensionNo"
    ];
    const allowedSortOrders = ["ASC", "DESC"];

    setPage(pagevalues.currentPage);
    setPageSize(pagevalues.pageSize);
    setOffset(pagevalues.pageSize * (pagevalues.currentPage - 1));
    setSortField(
      allowedSortFields.includes(pagevalues.sortConfig?.key)
        ? pagevalues.sortConfig.key
        : "m_memberName"
    );
    setSortOrder(
      allowedSortOrders.includes(pagevalues.sortConfig?.direction)
        ? pagevalues.sortConfig.direction
        : "ASC"
    );
  }, []);

  const columns = useMemo(() => [
    {
      title: "S.no",
      key: "s_no",
      width: 50,
      Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
    },
    { title: "Account Code", key: "m_accountCode", sort: true },
    { title: "Member Name", key: "m_memberName", sort: true },
    { title: "Password", key: "m_memberPassword", sort: true },
    { title: "Role", key: "m_memberRole", sort: true },
    { title: "Extension", key: "m_memberExtensionNo", sort: true },
    { title: "Email Id", key: "m_memberMailId" },
    { title: "Mobile Number", key: "m_memberMobileNo" },
    { title: "Mode", key: "m_memberMode" },
    { title: "Type", key: "m_memberPlatformType" },
    {
      title: "System",
      key: "system",
      Cell: (record) => {
        const isSystemOn = record?.m_clicktocallType === "SYSTEM";
        return (
          <Switch
            checked={isSystemOn}
            onCheckedChange={async () => {
              const newValue = isSystemOn ? null : "SYSTEM";
              await editcallType(record.m_memberId, newValue);
              getUsersList(pageSize, offset, sortField, sortOrder, debouncedSearch, roleFilter, memberMode, memberPlatform);
            }}
          />
        );
      },
    },
    {
      title: "Mobile",
      key: "mobile",
      Cell: (record) => {
        const isMobileOn = record?.m_clicktocallType === "MOBILE";
        return (
          <Switch
            checked={isMobileOn}
            onCheckedChange={async () => {
              const newValue = isMobileOn ? null : "MOBILE";
              await editcallType(record.m_memberId, newValue);
              getUsersList(pageSize, offset, sortField, sortOrder, debouncedSearch, roleFilter, memberMode, memberPlatform);
            }}
          />
        );
      },
    },
    {
      title: "2FA",
      key: "2fa",
      Cell: (record) => {
        const is2FAActive = record?.m_member2FAStatus === "Active";
        return (
          <Switch
            checked={is2FAActive}
            onCheckedChange={async () => {
              const newValue = is2FAActive ? "Inactive" : "Active";
              await update2FAStatus(record.m_memberId, newValue);
              getUsersList(pageSize, offset, sortField, sortOrder, debouncedSearch, roleFilter, memberMode, memberPlatform);
            }}
          />
        );
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
                  onClick={() => handleEdit(record.m_memberId)}
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
                  onClick={() => handleDelete(record.m_memberId)}
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
  ], [page, pageSize, offset, sortField, sortOrder, debouncedSearch, roleFilter, memberMode, memberPlatform, handleEdit, handleDelete, editcallType, update2FAStatus, getUsersList]);

  const displayColumns = useMemo(() => {
    let cols = columns.filter(col => {
      if (col.key === '2fa' && !authPlan?.options?.usercreation?.twofa) return false;
      return true;
    });
    if (authRole === "TL") {
      cols = cols.filter(col => col.key !== "actions");
    }
    return cols;
  }, [columns, authPlan, authRole]);

  return (
    <div className="p-6 h-full flex flex-col gap-4 overflow-hidden">
      {/* Filters & Search */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-[320px] group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              type="text"
              placeholder="Search by User Name, Ext, Email"
              className="pl-10 h-10 placeholder:text-xs bg-white"
              onChange={(e) => setSearchString(e.target.value)}
              value={searchString}
            />
          </div>

          <div className="w-[140px]">
            <Select
              options={[
                { label: "Admin", value: "ADMIN" },
                { label: "Team Leader", value: "TL" },
                { label: "User", value: "USER" },
              ]}
              value={roleFilter}
              onValueChange={setRoleFilter}
              placeholder="Role"
              showSearch={false}
              allowClear={true}
              onClear={() => setRoleFilter("")}
            />
          </div>
          
          <div className="w-[140px]">
            <Select
              options={[
                { label: "Browser", value: "BROWSER" },
                { label: "Softphone", value: "SOFTPHONE" },
              ]}
              value={memberMode}
              onValueChange={setMemberMode}
              placeholder="Mode"
              showSearch={false}
              allowClear={true}
              onClear={() => setMemberMode("")}
            />
          </div>

          <div className="w-[140px]">
            <Select
              options={[
                { label: "Call Center", value: "CALLCENTER" },
                { label: "RCM", value: "RCM" },
              ]}
              value={memberPlatform}
              onValueChange={setMemberPlatform}
              placeholder="Type"
              showSearch={false}
              allowClear={true}
              onClear={() => setMemberPlatform("")}
            />
          </div>
          
          {(roleFilter || memberMode || memberPlatform || searchString) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-medium"
              onClick={handleClearFilters}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          columns={displayColumns}
          data={userListData}
          loading={isuserListDataLoading}
          totaldata={userListDataCount}
          pagination={true}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>

      {/* EDIT MODAL */}
      <Dialog open={editModalOpen} onOpenChange={(v) => !v && handleEditModalCancel()}>
        <DialogContent className="sm:max-w-[720px] p-0 gap-0 overflow-hidden bg-[#F1F5F9]">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-white">
            <DialogTitle>Edit User Details</DialogTitle>
          </DialogHeader>
          
          {isuserUpdateLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmitEdit} className="flex flex-col flex-1 min-h-0">
              <div className="px-6 py-6 overflow-y-auto grid grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Member Name</label>
                  <Input name="m_memberName" value={formData.m_memberName || ""} onChange={handleFormChange} className="bg-white" />
                  {errors.m_memberName && <p className="text-[11px] text-destructive font-medium mt-1">{errors.m_memberName}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <Input name="m_memberPassword" value={formData.m_memberPassword || ""} onChange={handleFormChange} className="bg-white" />
                  {errors.m_memberPassword && <p className="text-[11px] text-destructive font-medium mt-1">{errors.m_memberPassword}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Email</label>
                  <Input name="m_memberMailId" value={formData.m_memberMailId || ""} onChange={handleFormChange} className="bg-white" />
                  {errors.m_memberMailId && <p className="text-[11px] text-destructive font-medium mt-1">{errors.m_memberMailId}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Mobile Number</label>
                  <Input name="m_memberMobileNo" value={formData.m_memberMobileNo || ""} onChange={handleFormChange} className="bg-white" />
                  {errors.m_memberMobileNo && <p className="text-[11px] text-destructive font-medium mt-1">{errors.m_memberMobileNo}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Mode</label>
                  <select 
                    name="m_memberMode" 
                    value={formData.m_memberMode} 
                    onChange={(e) => handleSelectChange("m_memberMode", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="" disabled>Select Mode</option>
                    <option value="BROWSER">Browser</option>
                    <option value="SOFTPHONE">SoftPhone</option>
                  </select>
                  {errors.m_memberMode && <p className="text-[11px] text-destructive font-medium mt-1">{errors.m_memberMode}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Role</label>
                  <select 
                    name="m_memberRole" 
                    value={formData.m_memberRole} 
                    onChange={(e) => handleSelectChange("m_memberRole", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="" disabled>Select Role</option>
                    <option value="ADMIN">Admin</option>
                    <option value="TL">Team Leader</option>
                    <option value="USER">User</option>
                  </select>
                  {errors.m_memberRole && <p className="text-[11px] text-destructive font-medium mt-1">{errors.m_memberRole}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Type</label>
                  <select 
                    name="m_memberPlatformType" 
                    value={formData.m_memberPlatformType} 
                    onChange={(e) => handleSelectChange("m_memberPlatformType", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="" disabled>Select Type</option>
                    <option value="CALLCENTER">Call center</option>
                    <option value="RCM">RCM</option>
                  </select>
                  {errors.m_memberPlatformType && <p className="text-[11px] text-destructive font-medium mt-1">{errors.m_memberPlatformType}</p>}
                </div>

                <div className="space-y-2 flex flex-col justify-center">
                  <label className="text-xs font-bold text-slate-700">Use Manual Caller ID?</label>
                  <div className="flex items-center gap-5 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" className="w-4 h-4 text-primary accent-primary" name="callerIdMode" value="YES" checked={formData?.m_memberCallerIdMode === "YES"} onChange={(e) => handleSelectChange("m_memberCallerIdMode", e.target.value)} />
                      <span className="text-sm font-medium text-slate-700">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" className="w-4 h-4 text-primary accent-primary" name="callerIdMode" value="NO" checked={formData?.m_memberCallerIdMode === "NO"} onChange={(e) => handleSelectChange("m_memberCallerIdMode", e.target.value)} />
                      <span className="text-sm font-medium text-slate-700">No</span>
                    </label>
                  </div>
                  {errors.m_memberCallerIdMode && <p className="text-[11px] text-destructive font-medium mt-1">{errors.m_memberCallerIdMode}</p>}
                </div>

                {formData?.m_memberCallerIdMode === "YES" && (
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold text-slate-700">Caller ID</label>
                    <Input name="m_memberCallerId" value={formData.m_memberCallerId || ""} onChange={handleFormChange} placeholder="Enter Caller ID" className="bg-white max-w-[calc(50%-12px)]" />
                    {errors.m_memberCallerId && <p className="text-[11px] text-destructive font-medium mt-1">{errors.m_memberCallerId}</p>}
                  </div>
                )}
              </div>
              
              {errors.general && (
                <div className="px-6 pb-2">
                  <p className="text-[11px] text-destructive font-medium">{errors.general}</p>
                </div>
              )}

              <DialogFooter className="px-6 py-4 border-t border-slate-300">
                <Button type="button" variant="secondary" onClick={handleEditModalCancel}>Cancel</Button>
                <Button type="submit" variant="default">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* BATCH UPLOAD MODAL */}
      <Dialog open={batchModalOpen} onOpenChange={(v) => !v && handleBatchModalCancel()}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-slate-200">
            <DialogTitle>Batch Upload</DialogTitle>
          </DialogHeader>

          {uploadLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex flex-col bg-[#F1F5F9]">
              <div className="p-8 flex flex-col gap-6">
                <div 
                  className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
                  onClick={openFilePicker}
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-8 h-8 text-primary" />
                  </div>
                  
                  {selectedFile ? (
                    <div className="text-center space-y-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {Math.ceil(selectedFile.size / 1024)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold text-primary">Click to upload</span> or drag and drop here
                      </p>
                      <p className="text-xs text-slate-500">CSV files only</p>
                    </div>
                  )}
                  
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {selectedFile && (
                  <div className="flex justify-center">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); clearSelectedFile(); }} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                      <X className="w-4 h-4 mr-2" />
                      Remove File
                    </Button>
                  </div>
                )}

                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    <span className="font-semibold text-slate-800">Need a template?</span>{" "}
                    Download our sample template below. Please limit data to less than 100 rows per upload.
                  </p>
                  <Button variant="outline" size="sm" className="bg-white" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Sample Template
                  </Button>
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t border-slate-300">
                <Button variant="secondary" onClick={handleBatchModalCancel} disabled={uploadLoading}>
                  Cancel
                </Button>
                <Button variant="default" onClick={handleBatchUpload} disabled={!selectedFile || uploadLoading}>
                  Save File
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersList;
