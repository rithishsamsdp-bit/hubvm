import { useState, useEffect } from "react";
import "./styles/AdminQueue.css";
import Button from "../../../components/Button";
import Icon from "../../../constants/Icon.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Modal,
  FormInputError,
  Input,
  Table,
  Select,
  Loader,
  Tabletag,
  Popover,
  Badges
} from "../../../components/Index.jsx";
import { useQueueStore } from "../../../store/admin/useQueueStore.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

function AdminQueue({ externalModalOpen, onExternalModalClose }) {
  const {
    queueGroupData,
    queuegroupTotalCount,
    queueGroupLoading,
    allMemberList,
    allMemberListLoading,
    getQueuegroup,
    getAllMember,
    createQueuegroup,
    editQueuegroup,
    deleteQueuegroup,
    createQueueModalLoading
  } = useQueueStore();

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
  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const debouncedSearchString = useDebounce(searchString, 500);

  const initialFormData = {
    name: "",
    memberids: [],
    extension: [],
    strategy: "",
    timeout: "",
    agentwaittime: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (authRole === "TL") {
      navigate(`/tl-phonenumber?tab=Queue&page=${page}&per_page=${pageSize}`);
    } else if (authRole === "ADMIN") {
      navigate(`/admin-phonenumber?tab=Queue&page=${page}&per_page=${pageSize}`);
    }
  }, [page, pageSize, navigate]);

  useEffect(() => {
    if (externalModalOpen) {
      setQueueModalOpen(true);
      getAllMember();
    }
  }, [externalModalOpen]);

  useEffect(() => {
    getQueuegroup(pageSize, offset, debouncedSearchString, sortField, sortOrder);
  }, [pageSize, offset, debouncedSearchString, sortField, sortOrder]);

  // Fix: Sync extensions with memberids whenever member list is loaded or ids change
  // This ensures that when editing, if extensions are missing in initial data, they are recovered.
  useEffect(() => {
    if (allMemberList.length > 0 && formData.memberids.length > 0) {
      const selectedMembers = formData.memberids.map(id => allMemberList.find(m => m.m_memberId === id)).filter(Boolean);
      const extensions = selectedMembers.map((m) => m.m_memberExtensionNo);

      // Only update if extensions are actually different/missing to avoid loops
      // We compare the stringified versions or lengths. A naive length check + first element check might be enough but JSON.stringify is safer for arrays.
      if (JSON.stringify(formData.extension) !== JSON.stringify(extensions)) {
        setFormData((prev) => ({ ...prev, extension: extensions }));
      }
    }
  }, [allMemberList, formData.memberids, formData.extension]);

  const validateField = (name, value) => {
    switch (name) {
      case "name":
        return value.trim() ? "" : "Queue name is required";
      case "memberids":
        return Array.isArray(value) && value.length > 0 ? "" : "At least one member is required";
      case "strategy":
        return value ? "" : "Strategy is required";
      case "timeout":
        return !value || isNaN(value) || parseInt(value) <= 0 ? "Valid queue wait time is required" : "";
      case "agentwaittime":
        return !value || isNaN(value) || parseInt(value) <= 0 ? "Valid agent wait time is required" : "";
      default:
        return "";
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
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

    const payload = { ...formData };
    if (editId) payload.id = editId;

    editId ? await editQueuegroup(payload) : await createQueuegroup(payload);

    handleClose();
    getQueuegroup(pageSize, offset, searchString, sortField, sortOrder);
  };

  const handleEdit = (id) => {
    const queue = queueGroupData.find((q) => q.q_queuegroupId === id);
    if (queue) {
      setFormData({
        name: queue.q_queuegroupName || "",
        memberids: queue.members.map((m) => m.m_memberId),
        extension: queue.members.map((m) => m.m_memberExtensionNo),
        strategy: queue.q_queuegroupStrategy || "",
        timeout: queue.q_queuegroupTimeout || "",
        agentwaittime: queue.q_queuegroupAgentWaitTime || "",
      });
      setEditId(id);
      setQueueModalOpen(true);
      getAllMember();
    }
  };

  const handleDelete = async (id) => {
    await deleteQueuegroup(id);
    getQueuegroup(pageSize, offset, searchString, sortField, sortOrder);
  };

  const handleClose = () => {
    setQueueModalOpen(false);
    setFormData(initialFormData);
    setEditId(null);
    setFormErrors({});
    onExternalModalClose?.();
  };

  const columns = [
    { title: "S.no", key: "s_no", Cell: (_row, index) => (page - 1) * pageSize + index + 1 },
    { title: "Queue Name", key: "q_queuegroupName", Cell: (row) => row.q_queuegroupName },
    { title: "Strategy", key: "q_queuegroupStrategy", Cell: (row) => row.q_queuegroupStrategy },
    { title: "Queue wait time", key: "q_queuegroupTimeout", Cell: (row) => row.q_queuegroupTimeout },
    { title: "agentwaittime", key: "q_queuegroupAgentWaitTime", Cell: (row) => row.q_queuegroupAgentWaitTime },
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
      title: "Status",
      key: "status",
      Cell: (row) => {
        const status = row.q_queuegroupStatus;
        const tagProps = status === "Active"
          ? { bgColor: "#F0FDF4", textColor: "#16A34A", borderColor: "#16A34A" }
          : status === "Inactive"
            ? { bgColor: "#FFF1F2", textColor: "#E11D48", borderColor: "#E11D48" }
            : { bgColor: "#F4F4F4", textColor: "#555555", borderColor: "#555555" };
        return <Tabletag text={status} {...tagProps} />;
      },
    },
    {
      title: "Actions",
      key: "actions",
      Cell: (record) => (
        <div className="admin_queue_action_container">
          <Button variant="empty" onClick={() => handleEdit(record.q_queuegroupId)}>
            <Icon name="edit" size={15} color="#5F6368" />
          </Button>
          <Button variant="empty" onClick={() => handleDelete(record.q_queuegroupId)}>
            <Icon name="deletee" size={15} color="#5F6368" />
          </Button>
        </div>
      ),
    },
  ];

  const tlcolumns = columns.filter((col => col.key !== 'actions'));

  return (
    <>
      <div className="admin_queue_creation_container">
        <div className="admin_queue_container_table_search">
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
          data={queueGroupData}
          loading={queueGroupLoading}
          totalRecords={queuegroupTotalCount}
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

      <Modal open={queueModalOpen} width="720px" onClose={handleClose}>
        <div className="admin_queue_modal_header_container">
          <p className="admin_queue_modal_header">{editId ? "Edit Queue Group" : "Create New Queue Group"}</p>
          <Button variant="empty" onClick={handleClose}><Icon name="close" color="#0F172A" size="14" /></Button>
        </div>

        {(allMemberListLoading || createQueueModalLoading) ? (
          <div style={{ height: "200px" }}><Loader /></div>
        ) : (
          <form className="admin_queue_modal_form" onSubmit={handleSubmit}>
            <div className="admin_queue_modal_form_grid">
              <div className="admin_queue_modal_form_group">
                <label className="form_label" htmlFor="name">Queue Name</label>
                <Input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} placeholder="Enter Queue name" />
                {formErrors.name && <FormInputError message={formErrors.name} />}
              </div>
              <div className="admin_queue_modal_form_group">
                <label className="form_label" htmlFor="strategy">Strategy</label>
                <Select
                  id="strategy"
                  name="strategy"
                  value={formData.strategy}
                  onChange={(value) => handleInputChange({ target: { name: "strategy", value } })}
                  placeholder="Select Strategy"
                  options={[
                    { label: "Ring all", value: "ring-all" },
                    { label: "Longest idle agent", value: "longest-idle-agent" },
                    { label: "Round robin", value: "round-robin" },
                    { label: "Top down", value: "top-down" },
                    { label: "Agent with least talk time", value: "agent-with-least-talk-time" },
                    { label: "Agent with fewest calls", value: "agent-with-fewest-calls" },
                    { label: "Sequentially by agent order", value: "sequentially-by-agent-order" },
                    { label: "Ring progressively", value: "ring-progressively" },
                  ]}
                />
                {formErrors.strategy && <FormInputError message={formErrors.strategy} />}
              </div>
              <div className="admin_queue_modal_form_group">
                <label className="form_label" htmlFor="timeout">Queue wait time</label>
                <Input id="timeout" name="timeout" type="number" value={formData.timeout} onChange={handleInputChange} placeholder="Enter Queue wait time" />
                {formErrors.timeout && <FormInputError message={formErrors.timeout} />}
              </div>
              <div className="admin_queue_modal_form_group">
                <label className="form_label" htmlFor="agentwaittime">Agent Wait Time</label>
                <Input id="agentwaittime" name="agentwaittime" type="number" value={formData.agentwaittime} onChange={handleInputChange} placeholder="Enter agent wait time" />
                {formErrors.agentwaittime && <FormInputError message={formErrors.agentwaittime} />}
              </div>
              <div className="admin_queue_modal_form_group">
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
            <div className="admin_queue_modal_footer">
              <Button variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button variant="primary" type="submit">Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export default AdminQueue;
