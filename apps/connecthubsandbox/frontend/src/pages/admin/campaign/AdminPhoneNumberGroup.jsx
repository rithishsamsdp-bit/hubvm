import { useEffect, useState } from "react";
import "./styles/AdminPhoneNumberGroup.css";
import {
  Modal,
  Tooltip,
  Button,
  FormInputError,
  Input,
  Table,
  Select,
  Loader,
  Badges,
  Tabletag,
} from "../../../components/Index.jsx";
import Icon from "../../../constants/Icon.jsx";
import { usePhoneNumberGroup } from "../../../store/admin/usePhoneNumberGroup.js";
import { useNavigate, useLocation } from "react-router-dom";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

function AdminPhoneNumberGroup({ externalModalOpen, onExternalModalClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const initialFormData = {
    processName: "",
    selectedCliIDs: [],
    status: "1",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [editId, setEditId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchString, setSearchString] = useState("");
  const debouncedSearch = useDebounce(searchString, 500);
  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(parseInt(params.get("per_page")) || 10);
  const [offset, setOffset] = useState((page - 1) * pageSize);

  const {
    getCliID,
    createProcess,
    deleteProcess,
    editProcess,
    phoneNumberGroupfetch,
    phoneNumberList = [],
    phoneNumberGroupData = [],
    phoneNumberGroupLoading,
    phoneNumberListLoading,
    phoneNumberGroupCount,
    PhoneNumberModalLoading,
  } = usePhoneNumberGroup();
  const { authRole } = useAuthStore();

  useEffect(() => {

    if (authRole === "TL") {
      navigate(`/tl-campaign?tab=Phone%20Number%20Group&page=${page}&per_page=${pageSize}`);
    } else if (authRole === "ADMIN") {
      navigate(`/admin-campaign?tab=Phone%20Number%20Group&page=${page}&per_page=${pageSize}`);
    }
    phoneNumberGroupfetch({ page, pageSize, debouncedSearch, offset });
  }, [page, pageSize, debouncedSearch, offset]);

  useEffect(() => {
    if (externalModalOpen) {
      setModalOpen(true);
      getCliID();
    }
  }, [externalModalOpen]);

  const validateField = (name, value) => {
    switch (name) {
      case "processName":
        return value.trim() ? "" : "Process Name is required";
      case "selectedCliIDs":
        return value.length ? "" : "Please select at least one Phone Number";
      case "status":
        return value === "1" || value === "0" ? "" : "Status is required";
      default:
        return "";
    }
  };

  const validateAll = () => {
    const newErrors = {};
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key, value);
      if (error) newErrors[key] = error;
    });
    return newErrors;
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setEditId(null);
  };

  const handleCancel = () => {
    setModalOpen(false);
    resetForm();
    onExternalModalClose?.();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateAll();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    const action = editId
      ? editProcess({ id: editId, ...formData })
      : createProcess(formData);

    await action;
    handleCancel();
    await phoneNumberGroupfetch({ page, pageSize, debouncedSearch, });


  };

  const handleEdit = async (record) => {
    const cliIds = (record.cli_numbers || []).map((num) => {
      const match = phoneNumberList.find((x) => x.clinumberName === num);
      return match?.clinumberId;
    }).filter(Boolean);

    setFormData({
      processName: record.group_name || "",
      selectedCliIDs: cliIds,
      status: String(record.status || "1"),
    });
    setEditId(record.group_id);
    setModalOpen(true);
    getCliID();
  };

  const handleDelete = async (id) => {
    await deleteProcess({ didnumberGroupId: id });
    await phoneNumberGroupfetch({ page, pageSize, debouncedSearch, });

  };

  const columns = [
    {
      title: "S.no",
      key: "s_no",
      width: 50,
      Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
    },
    { title: "Group Name", key: "group_name" },
    {
      title: "Phone Numbers",
      key: "cli_numbers",
      Cell: (row) => <Badges badgeData={row.cli_numbers || []} />,
    },
    {
      title: "Status",
      key: "status",
      Cell: (row) => (
        <Tabletag
          text={row.status === 1 ? "Active" : "Inactive"}
          bgColor={row.status === 1 ? "#F0FDF4" : "#FFF1F2"}
          textColor={row.status === 1 ? "#16A34A" : "#E11D48"}
          borderColor={row.status === 1 ? "#16A34A" : "#E11D48"}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      Cell: (record) => (
        <div className="admin_phonenumber_group_creation_action_container">
          <Tooltip content="Edit">
            <Button variant="empty" onClick={() => handleEdit(record)}>
              <Icon name="edit" size={15} color="#5F6368" />
            </Button>
          </Tooltip>
          <Tooltip content="Delete">
            <Button variant="empty" onClick={() => handleDelete(record.group_id)}>
              <Icon name="deletee" size={15} color="#5F6368" />
            </Button>
          </Tooltip>
        </div>
      ),
    },
  ];

  const tlcolumns = columns.filter(col => col.key !== 'actions');

  return (
    <>
      <div className="admin_phonenumber_group_creation_container">
        <div className="admin_phonenumber_group_table_search">
          <Input
            type="text"
            placeholder="Search by Group Name, Phone number"
            width="400px"
            suffixIcon="search"
            suffixIconColor="#334155"
            onChange={(e) => setSearchString(e.target.value)}
            value={searchString}
          />
        </div>

        <Table
          columns={authRole === "TL" ? tlcolumns : columns}
          data={phoneNumberGroupData}
          page={page}
          pageSize={pageSize}
          loading={phoneNumberGroupLoading}
          totaldata={phoneNumberGroupCount}
          serverSide
          onPageChange={({ currentPage, pageSize, sortConfig }) => {
            setPage(currentPage);
            setPageSize(pageSize);
            setOffset((currentPage - 1) * pageSize);
          }}
        />
      </div>

      <Modal open={modalOpen} width="720px" onClose={handleCancel}>
        <div className="admin_phonenumber_group_modal_header_container">
          <p className="admin_phonenumber_group_modal_header">
            {editId ? "Edit Phone Number Group" : "Create Phone Number Group"}
          </p>
          <Button variant="empty" onClick={handleCancel}>
            <Icon name="close" color="#0F172A" size="14" />
          </Button>
        </div>

        {phoneNumberListLoading || PhoneNumberModalLoading ? (
          <div style={{ height: 200 }}><Loader /></div>
        ) : (
          <form className="admin_phonenumber_group_modal_form" onSubmit={handleSubmit}>
            <div className="admin_phonenumber_group_modal_form_grid">
              <div className="admin_phonenumber_group_modal_form_group">
                <label className="form_label" htmlFor="processName">Group Name</label>
                <Input
                  type="text"
                  id="processName"
                  value={formData.processName}
                  onChange={(e) => handleChange("processName", e.target.value)}
                  placeholder="Enter Group Name"
                />
                {errors.processName && <FormInputError message={errors.processName} />}
              </div>

              <div className="admin_phonenumber_group_modal_form_group">
                <label className="form_label" htmlFor="cliIds">Select Phone Number(s)</label>
                <Select
                  id="cliIds"
                  mode="multiple"
                  options={phoneNumberList.map((item) => ({
                    label: item.clinumberName,
                    value: item.clinumberId,
                  }))}
                  value={formData.selectedCliIDs}
                  onChange={(val) => handleChange("selectedCliIDs", val)}
                  placeholder="Select CLI Numbers"
                  showSearch
                  optionFilterProp="label"
                />
                {errors.selectedCliIDs && <FormInputError message={errors.selectedCliIDs} />}
              </div>

              <div className="admin_phonenumber_group_modal_form_group">
                <label className="form_label" htmlFor="status">Status</label>
                <Select
                  id="status"
                  options={[{ label: "Active", value: "1" }, { label: "Inactive", value: "0" }]}
                  value={formData.status}
                  onChange={(val) => handleChange("status", val)}
                  placeholder="Select Status"
                />
                {errors.status && <FormInputError message={errors.status} />}
              </div>
            </div>

            <div className="admin_phonenumber_group_modal_footer">
              <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
              <Button variant="primary" type="submit">Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export default AdminPhoneNumberGroup;
