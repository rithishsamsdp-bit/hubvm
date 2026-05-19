import React, { useState, useMemo, useEffect } from "react";
import "./styles/SuperAdminIp.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../../constants/Icon.jsx";
import {
  Button,
  Table,
  Input,
  Modal,
  FormInputError,
  Tooltip,
} from "../../components/Index.jsx";
import { useDebounce } from "../../hooks/useDebounce.js";
import useIpStore from "../../store/superadmin/useIpStore.js";

const SuperAdminIp = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idParam = searchParams.get("id");
  const accountId = idParam ? parseInt(idParam, 10) : null;

  const { ipList, totalCount, fetchIpList, createIp, deleteIp, isLoading } =
    useIpStore();

  const [searchString, setSearchString] = useState("");
  const debouncedSearchString = useDebounce(searchString, 500);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const initialFormData = { ip: "", label: "", type: "Allow" };
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  // Pagination state
  const [page, setPage] = useState(0);
  const limit = 10;

  useEffect(() => {
    if (accountId) {
      fetchIpList(accountId, limit, page * limit, debouncedSearchString);
    }
  }, [accountId, fetchIpList, page, debouncedSearchString]);

  // Columns Configuration
  const columns = useMemo(
    () => [
      {
        title: "S.no",
        key: "s_no",
        Cell: (_row, rowIndex) => page * limit + rowIndex + 1,
      },
      { title: "IP / CIDR", key: "ip" },
      { title: "Label", key: "label" },
      {
        title: "Type",
        key: "type",
        Cell: (row) => (
          <span
            className={`superadmin_ip_badge ${
              (row.type || "Allow") === "Allow"
                ? "superadmin_ip_badge_allow"
                : "superadmin_ip_badge_block"
            }`}
          >
            {row.type || "Allow"}
          </span>
        ),
      },
      {
        title: "Created At",
        key: "createdAt",
        Cell: (row) => new Date(row.createdAt).toLocaleDateString(),
      },
      {
        title: "Action",
        key: "action",
        Cell: (record) => (
          <div className="superadmin_ip_action_container">
            <Tooltip content="Delete">
              <Button
                variant="empty"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(record.id);
                }}
              >
                <Icon name="deletee" size={12} color="#ef4444" />
              </Button>
            </Tooltip>
          </div>
        ),
      },
    ],
    [page, limit],
  );

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this IP?")) {
      await deleteIp(id, accountId);
    }
  };

  const validateIp = (ip) => {
    // Split by "/" to check for CIDR
    const parts = ip.split("/");
    const ipAddress = parts[0];
    const subnet = parts[1];

    // Basic IPv4 validation regex
    const ipv4Regex =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    if (!ipv4Regex.test(ipAddress)) {
      return false;
    }

    if (subnet !== undefined) {
      const subnetNum = parseInt(subnet, 10);
      if (isNaN(subnetNum) || subnetNum < 0 || subnetNum > 32) {
        return false;
      }
    }

    return true;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.ip) {
      newErrors.ip = "IP Address is required";
    } else if (!validateIp(formData.ip)) {
      newErrors.ip = "Invalid IP Address or CIDR format (e.g., 192.168.1.1/24)";
    }

    if (!formData.label) {
      newErrors.label = "Label is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        await createIp(accountId, formData);
        handleCloseModal();
      } catch (error) {
        console.error(error); // Error handled in store, shown potentially via global toast or local UI
        alert("Failed to save IP");
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div className="superadmin_ip_creation">
      <div className="navbar_1">
        <div>
          <p className="navbar_1_heading">IP Restriction</p>
          <span className="navbar_1_breadcrumb">
            <span
              onClick={() => navigate("/superadmin-dashboard")}
              className="navbar_1_breadcrumb_item"
            >
              Dashboard
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span className="navbar_1_breadcrumb_item active">
              IP Restriction
            </span>
          </span>
        </div>
        <div className="navbar_button_container">
          <Button type="primary" onClick={() => setIsModalOpen(true)}>
            Add IP
          </Button>
        </div>
      </div>

      <div className="superadmin_ip_content">
        <div className="superadmin_ip_container">
          <div className="superadmin_ip_table_search">
            <Input
              type="text"
              placeholder="Search by IP or Label"
              width="400px"
              suffixIcon="search"
              suffixIconColor="#334155"
              onChange={(e) => setSearchString(e.target.value)}
              value={searchString}
            />
          </div>
          <Table
            columns={columns}
            data={ipList}
            totaldata={totalCount}
            pageSize={limit}
            onPageChange={(p) => setPage(p)}
            clickableRows={false}
            loading={isLoading}
          />
        </div>

        {/* Create Modal */}
        <Modal open={isModalOpen} width="500px" onClose={handleCloseModal}>
          <div className="superadmin_ip_modal_header_container">
            <p className="superadmin_ip_modal_header">Add Allowed/Blocked IP</p>
            <Button variant="empty" onClick={handleCloseModal}>
              <Icon name="close" color="#0F172A" size="14" />
            </Button>
          </div>

          <form className="superadmin_ip_modal_form" onSubmit={handleSave}>
            <div className="superadmin_ip_modal_form_group">
              <label className="form_label" htmlFor="type">
                Type
              </label>
              <div className="superadmin_ip_radio_group">
                <label className="superadmin_ip_radio_label">
                  <input
                    type="radio"
                    name="type"
                    value="Allow"
                    checked={formData.type === "Allow"}
                    onChange={handleChange}
                  />
                  Allow
                </label>
                <label className="superadmin_ip_radio_label">
                  <input
                    type="radio"
                    name="type"
                    value="Block"
                    checked={formData.type === "Block"}
                    onChange={handleChange}
                  />
                  Block
                </label>
              </div>
            </div>

            <div className="superadmin_ip_modal_form_group">
              <label className="form_label" htmlFor="ip">
                IP Address / CIDR
              </label>
              <Input
                id="ip"
                name="ip"
                type="text"
                placeholder="Ex: 192.168.1.1 or 10.0.0.0/24"
                value={formData.ip}
                onChange={handleChange}
              />
              {errors.ip && <FormInputError message={errors.ip} />}
              <span
                style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}
              >
                Use CIDR notation for ranges (e.g., /24 for 256 IPs, /32 for
                single IP)
              </span>
            </div>

            <div className="superadmin_ip_modal_form_group">
              <label className="form_label" htmlFor="label">
                Label / Description
              </label>
              <Input
                id="label"
                name="label"
                type="text"
                placeholder="Ex: Office Network"
                value={formData.label}
                onChange={handleChange}
              />
              {errors.label && <FormInputError message={errors.label} />}
            </div>

            <div className="superadmin_ip_modal_form_footer">
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default SuperAdminIp;
