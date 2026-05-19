import { useEffect, useState, useCallback, useRef } from "react";
import "./styles/AdminUsersList.css";
import { useUsersStore } from "../../../store/admin/useUsersStore";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../../../constants/Icon.jsx";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import sampleCsv from '../../../constants/sample-members.csv?url';
import sampleCustomCsv from '../../../constants/sample-custom-members.csv?url';
import {
  Tooltip,
  Button,
  Input,
  Table,
  Select,
  Modal,
  Loader,
  FormInputError,
  Toast,
  Radio,
  Switch
} from "../../../components/Index.jsx";

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

  // File selection (single file) + ref
  const fileRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (authRole === "TL") {
      navigate(`/tl-users?tab=Users&page=${page}&per_page=${pageSize}`);
    } else if (authRole === "ADMIN") {
      navigate(`/admin-users?tab=Users&page=${page}&per_page=${pageSize}`);
    }
  }, [page, pageSize, navigate]);

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
    // Robust string conversion
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
        if (!stringValue.trim()) {
          return "Email is required";
        }
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

  const handleEdit = (id) => {
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
  };

  const handleDelete = useCallback(
    async (id) => {
      try {
        const res = await deleteUser(id);
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
    [
      deleteUser,
      getUsersList,
      pageSize,
      offset,
      sortField,
      sortOrder,
      debouncedSearch,
      roleFilter,
      memberMode,
      memberPlatform,
    ]
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

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        // Create payload with safe string conversions
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

        // Handle Caller ID based on mode
        if (payload.m_memberCallerIdMode === "NO") {
          delete payload.m_memberCallerId;
        } else if (payload.m_memberCallerIdMode === "YES") {
          const callerIdValue = formData.m_memberCallerId ? String(formData.m_memberCallerId) : "";
          payload.m_memberCallerId = callerIdValue.trim() || "0";
        }

        const response = await editUser(payload);

        const offset = (page - 1) * pageSize;
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
        setEditModalOpen(false);
        setFormData({});
        setErrors({});
      } catch (err) {
        console.error("Failed to update user:", err);
        const toastId = Date.now();
        setErrors({ general: "Failed to update user. Please try again." });
      }
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "m_memberCallerIdMode") {
        if (value === "NO") {
          next.m_memberCallerId = "";
        }
      }

      return next;
    });

    setErrors((prev) => {
      const next = { ...prev, [name]: validateField(name, value) };

      if (name === "m_memberCallerIdMode") {
        if (value === "NO") {
          delete next.m_memberCallerId;
        } else if (value === "YES") {
          next.m_memberCallerId = validateField(
            "m_memberCallerId",
            formData?.m_memberCallerId ?? ""
          );
        }
      }

      return next;
    });
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

  // Single-file picker helpers
  const openFilePicker = () => {
    if (fileRef.current) fileRef.current.value = ""; // allow re-select same file
    fileRef.current?.click();
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setSelectedFile(f || null);
  };

  // Upload CSV using zustand action; requires selectedFile
  const handleBatchUpload = async () => {
    if (!selectedFile) {
      return;
    }
    try {
      const formdata = new FormData();
      formdata.append("file", selectedFile, selectedFile.name);
      await uploadFile(formdata);

      // close modal and refresh list
      setbatchModalOpen(false);
      clearSelectedFile();

      const currentOffset = (page - 1) * pageSize;
      await getUsersList(
        pageSize,
        currentOffset,
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

  const columns = [
    {
      title: "S.no",
      key: "s_no",
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
        const type = record?.m_clicktocallType;

        const isSystemOn = type === "SYSTEM";

        const handleSystemToggle = async () => {
          const newValue = isSystemOn ? null : "SYSTEM";

          await editcallType(record.m_memberId, newValue);

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
        };

        return <Switch checked={isSystemOn} onChange={handleSystemToggle} />;
      },
    },


    {
      title: "Mobile",
      key: "mobile",
      Cell: (record) => {
        const type = record?.m_clicktocallType;

        const isMobileOn = type === "MOBILE";

        const handleMobileToggle = async () => {
          const newValue = isMobileOn ? null : "MOBILE";

          await editcallType(record.m_memberId, newValue);

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
        };

        return <Switch checked={isMobileOn} onChange={handleMobileToggle} />;
      },
    },
    {
      title: "2FA",
      key: "2fa",
      Cell: (record) => {
        const is2FAActive = record?.m_member2FAStatus === "Active";

        const handle2FAToggle = async () => {
          const newValue = is2FAActive ? "Inactive" : "Active";
          await update2FAStatus(record.m_memberId, newValue);
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
        };

        return <Switch checked={is2FAActive} onChange={handle2FAToggle} />;
      },
    },

    {
      title: "Actions",

      key: "actions",
      Cell: (record) => (
        <div className="admin_users_tabel_action_container">
          <Tooltip content="Edit">
            <Button
              variant="empty"
              onClick={() => handleEdit(record.m_memberId)}
            >
              <Icon name="edit" size={15} color="#5F6368" />
            </Button>
          </Tooltip>
          <Tooltip content="Delete">
            <Button
              variant="empty"
              onClick={() => handleDelete(record.m_memberId)}
            >
              <Icon name="deletee" size={15} color="#5F6368" />
            </Button>
          </Tooltip>
        </div>
      ),
    },
  ];

  const baseColumns = columns.filter(col => {
    if (col.key === '2fa' && !authPlan?.options?.usercreation?.twofa) return false;
    return true;
  });

  const tlcloumn = baseColumns.filter((col => col.key !== 'actions'));

  const handleExport = () => {
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
  };

  useEffect(() => {
    if (exportRef) {
      exportRef.current = handleExport;
    }
  }, [
    exportRef,
    pageSize,
    offset,
    sortField,
    sortOrder,
    debouncedSearch,
    roleFilter,
    memberMode,
    memberPlatform,
  ]);
  return (
    <>
      <div className="admin_users_list_container">
        <div className="admin_users_list_container_table_search">
          <Input
            type="text"
            placeholder="Search by User Name, Extension, Email ID"
            width="300px"
            suffixIcon="search"
            suffixIconColor="#334155"
            onChange={(e) => setSearchString(e.target.value)}
            value={searchString}
          />
          <Select
            mode="single"
            width="130px"
            placeholder="Role"
            value={roleFilter}
            onChange={(value) => setRoleFilter(value)}
            options={[
              { label: "Admin", value: "ADMIN" },
              { label: "Team Leader", value: "TL" },
              { label: "User", value: "USER" },
            ]}
            showSearch={false}
          />
          <Select
            mode="single"
            width="130px"
            placeholder="Mode"
            value={memberMode}
            onChange={(value) => setMemberMode(value)}
            options={[
              { label: "Browser", value: "BROWSER" },
              { label: "SoftPhone", value: "SOFTPHONE" },
            ]}
            showSearch={false}
          />
          <Select
            mode="single"
            width="110px"
            placeholder="Type"
            value={memberPlatform}
            onChange={(value) => setMemberPlatform(value)}
            options={[
              { label: "Call Center", value: "CALLCENTER" },
              { label: "RCM", value: "RCM" },
            ]}
            showSearch={false}
          />
          <button
            type="button"
            className="admin_users_list_filter_clear_button"
            onClick={handleClearFilters}
          >
            Clear all
          </button>
        </div>
        <Table
          columns={authRole === "TL" ? tlcloumn : baseColumns}
          data={userListData}
          loading={isuserListDataLoading}
          totaldata={userListDataCount}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={(pagevalues) => {
            const allowedSortFields = [
              "m_accountCode",
              "m_memberName",
              "m_memberPassword",
              "m_memberRole",
              "m_memberExtensionNo",
            ];
            const allowedSortOrders = ["ASC", "DESC"];

            setPage(pagevalues.currentPage);
            setPageSize(pagevalues.pageSize);
            setOffset(pagevalues.pageSize * (pagevalues.currentPage - 1));
            setSortField(
              allowedSortFields.includes(pagevalues.sortConfig.key)
                ? pagevalues.sortConfig.key
                : "m_memberName"
            );
            setSortOrder(
              allowedSortOrders.includes(pagevalues.sortConfig.direction)
                ? pagevalues.sortConfig.direction
                : "ASC"
            );
          }}
        />

        <Modal
          open={editModalOpen}
          width="720px"
          onClose={handleEditModalCancel}
        >
          <div className="admin_users_useredit_modal_header_container">
            <p className="admin_users_useredit_modal_header">Edit User Details</p>
            <Button variant="empty" onClick={handleEditModalCancel}>
              <Icon name="close" color="#0F172A" size="14" />
            </Button>
          </div>
          {isuserUpdateLoading ? (
            <div style={{ height: "200px" }}>
              <Loader />
            </div>
          ) : (
            <form className="admin_users_useredit_modal_form" onSubmit={handleSubmitEdit}>
              <div className="admin_users_useredit_modal_form_grid">
                <div className="admin_users_usereditform_group">
                  <label className="form_label">Member Name</label>
                  <Input
                    name="m_memberName"
                    value={formData.m_memberName || ""}
                    onChange={handleFormChange}
                  />
                  {errors.m_memberName && (
                    <FormInputError message={errors.m_memberName} />
                  )}
                </div>

                <div className="admin_users_usereditform_group">
                  <label className="form_label">Password</label>
                  <Input
                    name="m_memberPassword"
                    value={formData.m_memberPassword || ""}
                    onChange={handleFormChange}
                  />
                  {errors.m_memberPassword && (
                    <FormInputError message={errors.m_memberPassword} />
                  )}
                </div>

                <div className="admin_users_usereditform_group">
                  <label className="form_label">Email</label>
                  <Input
                    name="m_memberMailId"
                    value={formData.m_memberMailId || ""}
                    onChange={handleFormChange}
                  />
                  {errors.m_memberMailId && (
                    <FormInputError message={errors.m_memberMailId} />
                  )}
                </div>
                <div className="admin_users_usereditform_group">
                  <label className="form_label">Mobile Number</label>
                  <Input
                    name="m_memberMobileNo"
                    value={formData.m_memberMobileNo || ""}
                    onChange={handleFormChange}
                  />
                  {errors.m_memberMobileNo && (
                    <FormInputError message={errors.m_memberMobileNo} />
                  )}
                </div>

                <div className="admin_users_usereditform_group">
                  <label className="form_label">Mode</label>
                  <Select
                    name="m_memberMode"
                    value={formData.m_memberMode}
                    options={[
                      { value: "BROWSER", label: "Browser" },
                      { value: "SOFTPHONE", label: "SoftPhone" },
                    ]}
                    showSearch={false}
                    onChange={(value) =>
                      handleSelectChange("m_memberMode", value)
                    }
                  />
                  {errors.m_memberMode && (
                    <FormInputError message={errors.m_memberMode} />
                  )}
                </div>

                <div className="admin_users_usereditform_group">
                  <label className="form_label">Role</label>
                  <Select
                    name="m_memberRole"
                    value={formData.m_memberRole}
                    options={[
                      { value: "ADMIN", label: "Admin" },
                      { value: "TL", label: "Team Leader" },
                      { value: "USER", label: "User" },
                    ]}
                    showSearch={false}
                    onChange={(value) =>
                      handleSelectChange("m_memberRole", value)
                    }
                  />
                  {errors.m_memberRole && (
                    <FormInputError message={errors.m_memberRole} />
                  )}
                </div>

                <div className="admin_users_usereditform_group">
                  <label className="form_label">Type</label>
                  <Select
                    name="m_memberPlatformType"
                    value={formData.m_memberPlatformType}
                    options={[
                      { value: "CALLCENTER", label: "Call center" },
                      { value: "RCM", label: "RCM" },
                    ]}
                    showSearch={false}
                    onChange={(value) =>
                      handleSelectChange("m_memberPlatformType", value)
                    }
                  />
                </div>
                <div className="admin_users_usereditform_group">
                  <label className="form_label">Use Manual Caller ID?</label>
                  <Radio
                    name="callerIdMode"
                    value={formData?.m_memberCallerIdMode || "YES"}
                    onChange={(val) => handleSelectChange("m_memberCallerIdMode", val)}
                    options={[
                      { label: "Yes", value: "YES" },
                      { label: "No", value: "NO" },
                    ]}
                    direction="horizontal"
                  />
                  {errors.m_memberCallerIdMode && (
                    <FormInputError message={errors.m_memberCallerIdMode} />
                  )}
                </div>

                {formData?.m_memberCallerIdMode === "YES" && (
                  <div className="admin_users_usereditform_group">
                    <label className="form_label">Caller ID</label>
                    <Input
                      name="m_memberCallerId"
                      value={formData.m_memberCallerId || ""}
                      onChange={handleFormChange}
                      placeholder="Enter Caller ID"
                    />
                    {errors.m_memberCallerId && (
                      <FormInputError message={errors.m_memberCallerId} />
                    )}
                  </div>
                )}
              </div>
              {errors.m_memberCallerIdMode && (
                <FormInputError message={errors.m_memberCallerIdMode} />
              )}
              <div className="admin_users_modal_footer">
                <Button
                  variant="secondary"
                  onClick={handleEditModalCancel}
                  className="batch_modal_close"
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* BATCH UPLOAD MODAL */}
        <Modal
          open={batchModalOpen}
          width="720px"
          onClose={handleBatchModalCancel}
        >
          <div className="admin_users_useredit_modal_header_container">
            <p className="admin_users_useredit_modal_header">Batch Upload</p>
            <Button variant="empty" onClick={handleBatchModalCancel}>
              <Icon name="close" color="#0F172A" size="14" />
            </Button>
          </div>

          {uploadLoading ? (
            <Loader />
          ) : (
            <>
              <div className="admin_users_file_upload_container">
                <div
                  className="admin_users_batch_file_upload"
                  role="button"
                  tabIndex={0}
                  onClick={openFilePicker}
                >
                  <div>
                    <Icon name="Upload_primary" size={64} />
                  </div>
                  <p>
                    {selectedFile ? (
                      <>
                        Selected:&nbsp;<strong>{selectedFile.name}</strong>{" "}
                        ({Math.ceil(selectedFile.size / 1024)} KB)
                      </>
                    ) : (
                      <>
                        <span className="upload_click_text">Click to upload</span> or
                        drag and drop here
                      </>
                    )}
                  </p>
                  <input
                    id="user_bulk"
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    multiple={false}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </div>

                {selectedFile && (
                  <div className="mt-2">
                    <Button variant="empty" onClick={clearSelectedFile}>
                      <Icon name="deletee" size={14} /> Remove
                    </Button>
                  </div>
                )}

                <p>
                  <strong>If you do not have a file you can use the template below.</strong>{" "}
                  Please limit data in each data less than 100
                </p>

                <Button
                  variant="secondary"
                  className="admin_users_creation_template_btn"
                  onClick={handleDownload}
                >
                  <Icon name="Export" />
                  Download Sample Template
                </Button>
              </div>

              <div className="admin_users_batchupload_modal_footer">
                <Button
                  variant="secondary"
                  onClick={handleBatchModalCancel}
                  disabled={uploadLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleBatchUpload}
                  disabled={!selectedFile || uploadLoading}
                >
                  {uploadLoading ? "Uploading..." : "Save"}
                </Button>
              </div>
            </>
          )}
        </Modal>
      </div>

    </>
  );
};

export default AdminUsersList;
