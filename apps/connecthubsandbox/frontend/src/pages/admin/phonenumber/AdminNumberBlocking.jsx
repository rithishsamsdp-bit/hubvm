import { useState, useEffect } from "react";
import "./styles/AdminNumberBlocking.css";
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
} from "../../../components/Index.jsx";
import CountryCodeDropdown, { DEFAULT_DIAL, DEFAULT_CODE, countries } from "../../../components/CountryCodeDropdown.jsx";
import { useNumberBlockingStore } from "../../../store/admin/useNumberBlocking.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

function AdminNumberBlocking({ externalModalOpen, onExternalModalClose }) {
  const {
    blacklistData,
    blacklistTotalCount,
    blacklistLoading,
    getBlacklist,
    createBlacklist,
    editBlacklist,
    deleteBlacklist,
    createBlacklistModalLoading
  } = useNumberBlockingStore();

  const { authRole } = useAuthStore();

  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(parseInt(params.get("per_page")) || 10);
  const [offset, setOffset] = useState((parseInt(params.get("page")) - 1) * pageSize || 0);
  const [searchString, setSearchString] = useState("");
  const [sortField, setSortField] = useState("p_blacklistCreatedOn");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [blockingModalOpen, setBlockingModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const debouncedSearchString = useDebounce(searchString, 500);

  const initialFormData = {
    p_blacklistNo: "",
    countryCode: DEFAULT_DIAL,
    countryName: "",
    number: "",
    p_blacklistDescription: "",
    p_blacklistCalltype: "",
    p_blacklistStatus: "Active",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (authRole === "TL") {
      navigate(`/tl-phonenumber?tab=Number%20Blocking&page=${page}&per_page=${pageSize}`);
    } else if (authRole === "ADMIN") {
      navigate(`/admin-phonenumber?tab=Number%20Blocking&page=${page}&per_page=${pageSize}`);
    }
  }, [page, pageSize, navigate, authRole]);


  useEffect(() => {
    if (externalModalOpen) {
      setBlockingModalOpen(true);
    }
  }, [externalModalOpen]);

  useEffect(() => {
    getBlacklist(pageSize, offset, debouncedSearchString, sortField, sortOrder);
  }, [pageSize, offset, debouncedSearchString, sortField, sortOrder]);

  const validateField = (name, value) => {
    switch (name) {
      case "p_blacklistNo":
        // For combined validation, ensure "number" is present and numeric
        // We'll validate `formData.number` here mainly, 
        // but `name` passed might be "number" from input
        return "";
      case "number":
        if (!value.trim()) return "Number is required";
        if (!/^\d+$/.test(value)) return "Number must be numeric";
        return "";
      case "countryCode":
        return value ? "" : "Country Code is required";
      case "p_blacklistDescription":
        return value.trim() ? "" : "Description is required";
      case "p_blacklistCalltype":
        return value ? "" : "Call type is required";
      case "p_blacklistStatus":
        return value ? "" : "Status is required";
      default:
        return "";
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleCountryCodeChange = (code, countryObj) => {
    setFormData((prev) => ({
      ...prev,
      countryCode: countryObj.dial,
      countryName: countryObj.name,
    }));
    setFormErrors((prev) => ({ ...prev, countryCode: "" }));
  };

  const handleNumberChange = (e) => {
    const value = e.target.value;
    if (/^[0-9]*$/.test(value)) {
      setFormData((prev) => ({ ...prev, number: value }));
      setFormErrors((prev) => ({ ...prev, number: validateField("number", value) }));
    }
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

    if (Object.keys(newErrors).length > 0) return;

    // Combine code and number
    const finalNumber = `${formData.countryCode}${formData.number}`;

    // Create payload without UI-specific fields
    const { countryCode, countryName, number, ...rest } = formData;
    const payload = { ...rest, p_blacklistNo: finalNumber };

    if (editId) payload.p_blacklistId = editId;

    // console.log(payload); // Debugging

    editId ? await editBlacklist(payload) : await createBlacklist(payload);

    handleClose();
    getBlacklist(pageSize, offset, searchString, sortField, sortOrder);
  };

  const handleEdit = (id) => {
    const blacklist = blacklistData.find((b) => b.p_blacklistId === id);
    if (blacklist) {
      setFormData({
        p_blacklistNo: blacklist.p_blacklistNo || "",
        p_blacklistDescription: blacklist.p_blacklistDescription || "",
        p_blacklistCalltype: blacklist.p_blacklistCalltype || "",
        p_blacklistStatus: blacklist.p_blacklistStatus || "Active",
        number: "", // will parse below
        countryCode: "",
        countryName: ""
      });

      // Parse Logic
      const fullNum = String(blacklist.p_blacklistNo || "");
      let foundCountry = null;
      // Sort countries by dial code length desc to match longest prefix first
      const sortedCountries = [...countries].sort((a, b) => b.dial.length - a.dial.length);

      for (const c of sortedCountries) {
        if (fullNum.startsWith(c.dial)) {
          foundCountry = c;
          break;
        }
      }

      setFormData(prev => ({
        ...prev,
        countryCode: foundCountry ? foundCountry.dial : DEFAULT_DIAL,
        countryName: foundCountry ? foundCountry.name : "",
        number: foundCountry ? fullNum.slice(foundCountry.dial.length) : fullNum
      }));

      setEditId(id);
      setBlockingModalOpen(true);
    }
  };

  const handleDelete = async (id) => {
    await deleteBlacklist(id);
    getBlacklist(pageSize, offset, searchString, sortField, sortOrder);
  };

  const handleClose = () => {
    setBlockingModalOpen(false);
    setFormData(initialFormData);
    setEditId(null);
    setFormErrors({});
    onExternalModalClose?.();
  };

  const columns = [
    { title: "S.no", key: "s_no", Cell: (_row, index) => (page - 1) * pageSize + index + 1 },
    { title: "Phone Number", key: "p_blacklistNo", Cell: (row) => row.p_blacklistNo },
    { title: "Description", key: "p_blacklistDescription", Cell: (row) => row.p_blacklistDescription },
    { title: "Call Type", key: "p_blacklistCalltype", Cell: (row) => row.p_blacklistCalltype },
    {
      title: "Actions",
      key: "actions",
      Cell: (record) => (
        <div className="admin_blocking_action_container">
          <Button variant="empty" onClick={() => handleEdit(record.p_blacklistId)}>
            <Icon name="edit" size={15} color="#5F6368" />
          </Button>
          <Button variant="empty" onClick={() => handleDelete(record.p_blacklistId)}>
            <Icon name="deletee" size={15} color="#5F6368" />
          </Button>
        </div>
      ),
    },
  ];

  const tlcolumns = columns.filter((col) => col.key !== 'actions');

  return (
    <>
      <div className="admin_blocking_creation_container">
        <div className="admin_blocking_container_table_search">
          <Input
            type="text"
            placeholder="Search by Phone Number"
            width="400px"
            suffixIcon="search"
            suffixIconColor="#334155"
            onChange={(e) => setSearchString(e.target.value)}
            value={searchString}
          />
        </div>
        <Table
          columns={authRole === "TL" ? tlcolumns : columns}
          data={blacklistData}
          loading={blacklistLoading}
          totalRecords={blacklistTotalCount}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={({ currentPage, pageSize, sortConfig }) => {
            setPage(currentPage);
            setPageSize(pageSize);
            setOffset(pageSize * (currentPage - 1));
            setSortField(sortConfig.key || "p_blacklistCreatedOn");
            setSortOrder(sortConfig.direction || "DESC");
          }}
        />
      </div>

      <Modal open={blockingModalOpen} width="720px" onClose={handleClose}>
        <div className="admin_blocking_modal_header_container">
          <p className="admin_blocking_modal_header">{editId ? "Edit Number Blocking" : "Create Number Blocking"}</p>
          <Button variant="empty" onClick={handleClose}><Icon name="close" color="#0F172A" size="14" /></Button>
        </div>

        {createBlacklistModalLoading ? (
          <div style={{ height: "200px" }}><Loader /></div>
        ) : (
          <form className="admin_blocking_modal_form" onSubmit={handleSubmit}>
            <div className="admin_blocking_modal_form_grid">
              <div className="admin_blocking_modal_form_group full-width">
                <label className="form_label" htmlFor="p_blacklistNo">Phone Number</label>
                <div className="combined-phone-input">
                  <div className="phoneno_country_code_section">
                    <CountryCodeDropdown
                      value={
                        countries.find(
                          (c) =>
                            c.dial === formData.countryCode &&
                            c.name === formData.countryName
                        )?.code ||
                        countries.find((c) => c.dial === formData.countryCode)?.code ||
                        countries.find((c) => c.code === formData.countryCode)?.code ||
                        DEFAULT_CODE
                      }
                      onChange={handleCountryCodeChange}
                      error={formErrors.countryCode}
                      placeholder="Country"
                      compact={false}
                      disabled={!!editId}
                    />
                  </div>
                  <div className="phone-number-section">
                    <input
                      id="number"
                      className="phone-number-input"
                      placeholder="Enter phone number"
                      value={formData.number}
                      onChange={handleNumberChange}
                    />
                  </div>
                </div>
                {formErrors.number && <FormInputError message={formErrors.number} />}
              </div>
              <div className="admin_blocking_modal_form_group">
                <label className="form_label" htmlFor="p_blacklistCalltype">Call Type</label>
                <Select
                  id="p_blacklistCalltype"
                  name="p_blacklistCalltype"
                  value={formData.p_blacklistCalltype}
                  onChange={(value) => handleInputChange({ target: { name: "p_blacklistCalltype", value } })}
                  placeholder="Select Call Type"
                  options={[
                    { label: "Incoming", value: "Incoming" },
                    { label: "Outgoing", value: "Outgoing" },
                    { label: "Both", value: "Both" },
                  ]}
                  showSearch={false}
                />
                {formErrors.p_blacklistCalltype && <FormInputError message={formErrors.p_blacklistCalltype} />}
              </div>
              <div className="admin_blocking_modal_form_group">
                <label className="form_label" htmlFor="p_blacklistStatus">Status</label>
                <Select
                  id="p_blacklistStatus"
                  name="p_blacklistStatus"
                  value={formData.p_blacklistStatus}
                  onChange={(value) => handleInputChange({ target: { name: "p_blacklistStatus", value } })}
                  placeholder="Select Status"
                  options={[
                    { label: "Active", value: "Active" },
                    { label: "Inactive", value: "Inactive" },
                  ]}
                  showSearch={false}
                />
                {formErrors.p_blacklistStatus && <FormInputError message={formErrors.p_blacklistStatus} />}
              </div>
              <div className="admin_blocking_modal_form_group full-width">
                <label className="form_label" htmlFor="p_blacklistDescription">Description</label>
                <Input
                  id="p_blacklistDescription"
                  name="p_blacklistDescription"
                  type="text"
                  value={formData.p_blacklistDescription}
                  onChange={handleInputChange}
                  placeholder="Enter Description"
                />
                {formErrors.p_blacklistDescription && <FormInputError message={formErrors.p_blacklistDescription} />}
              </div>
            </div>
            <div className="admin_blocking_modal_footer">
              <Button variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button variant="primary" type="submit">Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export default AdminNumberBlocking;