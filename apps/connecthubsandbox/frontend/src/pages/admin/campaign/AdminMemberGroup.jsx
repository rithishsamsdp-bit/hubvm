import { useEffect, useState, useCallback } from "react";
import "./styles/AdminMemberGroup.css";
import { useMembergroupStore } from "../../../store/admin/useMembergroupStore.js";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../../../constants/Icon.jsx";
import { useDebounce } from "../../../hooks/useDebounce.js";
import {
  Modal,
  Button,
  FormInputError,
  Input,
  Table,
  Select,
  Loader,
  Tabletag,
  Badges,
  Popover,
} from "../../../components/Index.jsx";
import { useAuthStore } from "../../../store/useAuthStore.js";

const AdminMemberGroup = ({ externalModalOpen, onExternalModalClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const {
    membergroupData,
    isMembergroupLoading,
    getMembergroup,
    membergroupTotalCount,
    createMembergroup,
    editMembergroup,
    deleteMembergroup,
    getAllMember,
    allMemberListLoading,
    allMemberList = [],
    createMemberGroupModalLoading,
  } = useMembergroupStore();
  const { authRole } = useAuthStore();

  const initialFormData = { name: "", memberids: [] };

  // ✅ safer init + consistent naming
  const [page, setPage] = useState(Number(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(Number(params.get("per_page")) || 10);
  const [offset, setOffset] = useState((page - 1) * pageSize);

  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(initialFormData);
  const [editId, setEditId] = useState("");
  const [memberGroupModalOpen, setMemberGroupModalOpen] = useState(false);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [searchString, setSearchString] = useState("");
  const debouncedSearchString = useDebounce(searchString, 500);

  // ✅ Update URL only when pagination changes
  useEffect(() => {
    if (authRole === "TL") {
      navigate(`/tl-campaign?tab=Member%20group&page=${page}&per_page=${pageSize}`, {
        replace: true,
      });
    } else if (authRole === "ADMIN") {
    navigate(`/admin-campaign?tab=Member%20group&page=${page}&per_page=${pageSize}`, {
      replace: true,
    });
  }
  }, [page, pageSize, navigate]);

  // ✅ Load members if modal opened externally
  useEffect(() => {
    if (externalModalOpen) {
      setMemberGroupModalOpen(true);
      loadMembers();
    }
  }, [externalModalOpen]);

  const loadMembers = async () => {
    try {
      await getAllMember();
    } catch (err) {
      console.error("Failed to load members:", err);
      setMemberGroupModalOpen(false);
    }
  };

  // ✅ Fetch table data on filters/sort/search change
  useEffect(() => {
    getMembergroup(pageSize, offset, debouncedSearchString, sortField, sortOrder);
  }, [pageSize, offset, debouncedSearchString, sortField, sortOrder, getMembergroup]);

  const columns = [
    {
      title: "S.no",
      key: "s_no",
      Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
    },
    { title: "Name", key: "m_membergroupName", sort: true },
    {
      title: "Members",
      key: "members",
      Cell: (row) => {
        const list = Array.isArray(row?.members) ? row.members : [];
        const names = list.map((m) => m.m_memberName).filter(Boolean);

        const popContent = (
          <div>
            <strong style={{ display: "block", marginBottom: 8 }}>Members</strong>
            <ul className="pw-list">
              {names.length === 0 && <li>No members</li>}
              {names.map((m, idx) => (
                <li key={idx}>{m}</li>
              ))}
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
    // {
    //   title: "Status",
    //   key: "m_membergroupStatus",
    //   sort: true,
    //   Cell: (record) => {
    //     const status = record.m_membergroupStatus;
    //     const map = {
    //       Active: { bg: "#F0FDF4", text: "#16A34A", border: "#16A34A" },
    //       Inactive: { bg: "#FFF1F2", text: "#E11D48", border: "#E11D48" },
    //       Default: { bg: "#F4F4F4", text: "#555555", border: "#555555" },
    //     };
    //     const { bg, text, border } = map[status] || map.Default;
    //     return <Tabletag text={status} bgColor={bg} textColor={text} borderColor={border} />;
    //   },
    // },
    {
      title: "Actions",
      key: "actions",
      Cell: (record) => (
        <div className="admin_membergroup_action_conatiner">
          <Button variant="empty" onClick={() => handleEdit(record.m_membergroupId)}>
            <Icon name="edit" size={15} color="#5F6368" />
          </Button>
          <Button variant="empty" onClick={() => handleDelete(record.m_membergroupId)}>
            <Icon name="deletee" size={15} color="#5F6368" />
          </Button>
        </div>
      ),
    },
  ];

  const tlcolumns = columns.filter((col) => col.key !== "actions");
  // ---------------- Validation ----------------
  const validateField = (name, value) => {
    switch (name) {
      case "name":
        return value.trim() ? "" : "Name is required";
      case "memberids":
        return Array.isArray(value) && value.length > 0
          ? ""
          : "Please select at least one member";
      default:
        return "";
    }
  };

  // ---------------- Handlers ----------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleMemberChange = (selectedIds) => {
    setFormData((prev) => ({ ...prev, memberids: selectedIds }));
    setErrors((prev) => ({ ...prev, memberids: validateField("memberids", selectedIds) }));
  };

  // ✅ Unified submit for create/edit
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      const newErrors = {};
      Object.entries(formData).forEach(([key, val]) => {
        const err = validateField(key, val);
        if (err) newErrors[key] = err;
      });
      setErrors(newErrors);
      if (Object.keys(newErrors).length) return;

      try {
        if (editId) {
          await editMembergroup({ id: editId, name: formData.name, memberids: formData.memberids });
        } else {
          await createMembergroup(formData);
        }
        handleClose();
        await getMembergroup(pageSize, offset, debouncedSearchString, sortField, sortOrder);
      } catch (err) {
        console.error("Save failed:", err);
      }
    },
    [
      formData,
      editId,
      createMembergroup,
      editMembergroup,
      getMembergroup,
      pageSize,
      offset,
      debouncedSearchString,
      sortField,
      sortOrder,
    ]
  );

  const handleClose = () => {
    setMemberGroupModalOpen(false);
    setFormData(initialFormData);
    setErrors({});
    setEditId("");
    onExternalModalClose?.();
  };

  const handleEdit = useCallback(
    async (id) => {
      setMemberGroupModalOpen(true);
      try {
        await getAllMember();
      } catch (err) {
        console.error("Failed to load members:", err);
        setMemberGroupModalOpen(false);
        return;
      }

      const record = membergroupData.find((m) => m.m_membergroupId === id);
      if (!record) {
        setMemberGroupModalOpen(false);
        return;
      }

      setEditId(id);
      setFormData({
        name: record.m_membergroupName || "",
        memberids: (record.members || []).map((m) => m.m_memberId).filter(Boolean),
      });
      setErrors({});
    },
    [membergroupData, getAllMember]
  );

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteMembergroup(id);
        await getMembergroup(pageSize, offset, debouncedSearchString, sortField, sortOrder);
      } catch (err) {
        console.error("Failed to delete Membergroup:", err);
      }
    },
    [deleteMembergroup, getMembergroup, pageSize, offset, debouncedSearchString, sortField, sortOrder]
  );

  return (
    <>
      <div className="admin_membergroup_container">
        <div className="admin_membergroup_table_search">
          <Input
            type="text"
            placeholder="Search by Name"
            width="400px"
            suffixIcon="search"
            suffixIconColor="#334155"
            onChange={(e) => setSearchString(e.target.value)}
            value={searchString}
          />
        </div>

        <Table
          columns={authRole === "TL" ? tlcolumns : columns}
          data={membergroupData}
          loading={isMembergroupLoading}
          totaldata={membergroupTotalCount}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={(pagevalues) => {
            setPage(pagevalues.currentPage);
            setPageSize(pagevalues.pageSize);
            setOffset(pagevalues.pageSize * (pagevalues.currentPage - 1));
            setSortField(pagevalues.sortConfig?.key || "");
            setSortOrder(pagevalues.sortConfig?.direction || "");
          }}
        />
      </div>

      {/* Modal */}
      <Modal open={memberGroupModalOpen} width="720px" onClose={handleClose}>
        <div className="admin_membergroup_modal_header_container">
          <p className="admin_membergroup_modal_header">
            {editId ? "Edit Member Group" : "Create New Member Group"}
          </p>
          <Button variant="empty" onClick={handleClose}>
            <Icon name="close" color="#0F172A" size="14" />
          </Button>
        </div>

        {allMemberListLoading || createMemberGroupModalLoading ? (
          <div style={{ height: "200px" }}>
            <Loader />
          </div>
        ) : (
          <form className="admin_membergroup_modal_form" onSubmit={handleSubmit}>
            {/* Name */}
            <div className="admin_membergroup_modal_form_grid">
              <div className="admin_membergroup_modal_form_group">
                <label className="form_label" htmlFor="name">Name</label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter group name"
                />
                {errors.name && <FormInputError message={errors.name} />}
              </div>
            </div>

            {/* Members */}
            <div className="admin_membergroup_modal_form_grid">
              <div className="admin_membergroup_modal_form_group">
                <label className="form_label" htmlFor="memberids">Members</label>
                <Select
                  id="memberids"
                  name="memberids"
                  mode="multiple"
                  wrapTags
                  placeholder="Select Members"
                  allowClear
                  showSearch={true}
                  loading={allMemberListLoading}
                  options={allMemberList.map((m) => ({
                    label: m.m_memberName,
                    value: m.m_memberId,
                  }))}
                  value={formData.memberids}
                  onChange={handleMemberChange}
                />
                {errors.memberids && <FormInputError message={errors.memberids} />}
              </div>
            </div>

            <div className="admin_membergroup_modal_footer">
              <Button variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button variant="primary" type="submit">Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
};

export default AdminMemberGroup;
