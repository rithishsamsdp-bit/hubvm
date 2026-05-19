import { useState, useEffect } from "react";
import "./styles/AdminTlMapping.css";
import Icon from "../../../constants/Icon.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Modal,
  FormInputError,
  Input,
  Table,
  Select,
  Loader,
  Popover,
  Badges,
  Button
} from "../../../components/Index.jsx";
import { useTlMappingStore } from "../../../store/admin/useTlMappingStore.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

function AdminTlMapping({ externalModalOpen, onExternalModalClose }) {
  const {
    totalTl,
    totalTlCount,
    tlMappingLoading,
    allMemberList,
    allMemberListLoading,
    getTlMapping,
    getAllMember,
    editTlMapping,
    editTlMappingModalLoading
  } = useTlMappingStore();

  const { authRole } = useAuthStore();

  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(parseInt(params.get("per_page")) || 10);
  const [offset, setOffset] = useState((parseInt(params.get("page")) - 1) * pageSize || 0);
  const [searchString, setSearchString] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const debouncedSearchString = useDebounce(searchString, 500);

  const initialFormData = {
    name: "",
    memberids: [],
  };

  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (authRole === "TL") {
      navigate(`/tl-Users?tab=Tl%20mapping&page=${page}&per_page=${pageSize}`);
    } else if (authRole === "ADMIN") {
      navigate(`/admin-Users?tab=Tl%20mapping&page=${page}&per_page=${pageSize}`);
    }
  }, [page, pageSize, navigate]);

  useEffect(() => {
    if (externalModalOpen) {
      setMappingModalOpen(true);
      getAllMember();
    }
  }, [externalModalOpen]);

  useEffect(() => {
    getTlMapping(pageSize, offset, debouncedSearchString, sortField, sortOrder);
  }, [pageSize, offset, debouncedSearchString, sortField, sortOrder]);
  const validateField = (name, value) => {
    switch (name) {
      case "memberids":
        return Array.isArray(value) && value.length > 0 ? "" : "At least one member is required";
      default:
        return "";
    }
  };

  const handleMemberChange = (selectedIds) => {
    const selectedMembers = selectedIds.map(id => allMemberList.find(m => m.m_memberId === id)).filter(Boolean);
    const ids = selectedMembers.map((m) => m.m_memberId);
    const extensions = selectedMembers.map((m) => m.m_memberExtensionNo);

    setFormData((prev) => ({ ...prev, memberids: ids, extension: extensions }));
    setFormErrors((prev) => ({ ...prev, memberids: validateField("memberids", ids) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    Object.entries(formData).forEach(([key, val]) => {
      const err = validateField(key, val);
      if (err) newErrors[key] = err;
    });
    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;



    await editTlMapping(formData);
    handleClose();
    getTlMapping(pageSize, offset, searchString, sortField, sortOrder);
  };

  const handleEdit = (id) => {
    const tlmapping = totalTl.find((q) => q.m_memberId === id);
    if (tlmapping) {
      setFormData({
        name: tlmapping.m_memberName || "",
        tlmemberid: tlmapping.m_memberId,
        memberids: tlmapping.members.map((m) => m.m_memberId)
      });
      setMappingModalOpen(true);
      getAllMember();
    }
  };


  const handleClose = () => {
    setMappingModalOpen(false);
    setFormData(initialFormData);
    setFormErrors({});
    onExternalModalClose?.();
  };

  const columns = [
    { title: "S.no", key: "s_no", Cell: (_row, index) => (page - 1) * pageSize + index + 1 },
    { title: "Name", key: "m_memberName" },
    { title: "Account Code", key: "m_accountCode" },
    { title: "Extension", key: "m_memberExtensionNo" },
    {
      title: "Members",
      key: "members",
      Cell: (row) => {
        const names = row.members.map((m) => m.m_memberName);
        const popContent = (
          <div>
            <strong style={{ display: "block", marginBottom: 8 }}>Members</strong>
            <ul className="pw-list">
              {names.length === 0 && <li>No numbers</li>}
              {names.map((m, idx) => <li key={idx}>{m}</li>)}
            </ul>
          </div>
        );
        return <Popover content={popContent} mode="click" placement="right"><Badges badgeData={names} /></Popover>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      Cell: (record) => (
        <div className="admin_tl_mapping_action_container">
          <Button variant="empty" onClick={() => handleEdit(record.m_memberId)}>
            <Icon name="edit" size={15} color="#5F6368" />
          </Button>
        </div>
      ),
    }
  ];

  const tlcolumns = columns.filter((col => col.key !== 'actions'));

  return (
    <>
      <div className="admin_tl_mapping_creation_container">
        <div className="admin_tl_mapping_container_table_search">
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
          data={totalTl}
          loading={tlMappingLoading}
          totalRecords={totalTlCount}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={({ currentPage, pageSize, sortConfig }) => {
            setPage(currentPage);
            setPageSize(pageSize);
            setOffset(pageSize * (currentPage - 1));
            setSortField(sortConfig.key);
            setSortOrder(sortConfig.direction);
          }}
        />
      </div>

      <Modal open={mappingModalOpen} width="720px" onClose={handleClose}>
        <div className="admin_tl_mapping_modal_header_container">
          <p className="admin_tl_mapping_modal_header"> Edit Tl Mapping</p>
          <Button variant="empty" onClick={handleClose}><Icon name="close" color="#0F172A" size="14" /></Button>
        </div>

        {(allMemberListLoading || editTlMappingModalLoading) ? (
          <div style={{ height: "200px" }}><Loader /></div>
        ) : (
          <form className="admin_tl_mapping_modal_form" onSubmit={handleSubmit}>
            <div className="admin_tl_mapping_modal_form_grid">
              <div className="admin_tl_mapping_modal_form_group">
                <label className="form_label" htmlFor="name">Tl Name</label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  disabled
                  readOnly
                  placeholder="TL Name (auto-filled)"
                />
              </div>
              <div className="admin_tl_mapping_modal_form_group full-width">
                <label className="form_label" htmlFor="memberids">Members</label>
                <Select
                  id="memberids"
                  name="memberids"
                  mode="multiple"
                  wrapTags
                  placeholder="Select Members"
                  allowClear
                  showSearch
                  loading={allMemberListLoading}
                  options={allMemberList.map((m) => ({ label: m.m_memberName, value: m.m_memberId }))}
                  value={formData.memberids}
                  onChange={handleMemberChange}
                  style={{ width: "100%" }}
                />
                {formErrors.memberids && <FormInputError message={formErrors.memberids} />}
              </div>
            </div>
            <div className="admin_tl_mapping_modal_footer">
              <Button variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button variant="primary" type="submit">Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export default AdminTlMapping;
