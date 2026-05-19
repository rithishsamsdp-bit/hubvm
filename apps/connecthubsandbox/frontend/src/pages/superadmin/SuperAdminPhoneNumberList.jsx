import { useEffect, useState, useCallback } from "react";
import "./styles/SuperAdminPhoneNumberList.css";
import { usePhoneNumberStore } from "../../store/superadmin/usePhoneNumberStore.js";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../../constants/Icon.jsx";
import {
  Modal,
  Button,
  FormInputError,
  Input,
  Table,
  Select,
  Loader,
  Tabletag,
  Radio,
} from "../../components/Index.jsx";
import { useDebounce } from "../../hooks/useDebounce.js";
import CountryCodeDropdown, { DEFAULT_DIAL, DEFAULT_CODE, countries } from "../../components/CountryCodeDropdown.jsx";

const SuperAdminPhoneNumberList = ({ externalModalOpen, onExternalModalClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const {
    phoneNumberData,
    phoneNumberLoading,
    getCliNumber,
    phoneNumberTotalCount,
    createCliNumber,
    editCliNumber,
    deleteCliNumber,
    getAllPeers,
    allPeerList,
    allPeerListLoading,
    getAllAccounts,
    allAccountList,
    allAccountListLoading,
    modalLoading,
  } = usePhoneNumberStore();

  const initialFormData = {
    countryCode: DEFAULT_DIAL,
    countryName: "",
    number: "",
    type: "",
    peerId: "",
    accountId: "",
    status: "Active",
    accountNo: "",
    accountPrefix: ""
  };

  // ✅ safer initialization (avoids NaN when no "page" in params)
  const [page, setPage] = useState(Number(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(Number(params.get("per_page")) || 10);
  const [offset, setOffset] = useState((page - 1) * pageSize);

  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(initialFormData);
  const [editId, setEditId] = useState("");
  const [phoneNumberModalOpen, setPhoneNumberModalOpen] = useState(false);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [searchString, setSearchString] = useState("");
  const debouncedSearchString = useDebounce(searchString, 500);

  // ✅ only update URL when page/pageSize changes (not every data fetch)
  useEffect(() => {
    navigate(
      `/superadmin-phonenumber?tab=Phone%20Number&page=${page}&per_page=${pageSize}`,
      { replace: true }
    );
  }, [page, pageSize, navigate]);

  // ✅ open modal from parent + load dependencies
  useEffect(() => {
    if (externalModalOpen) {
      setPhoneNumberModalOpen(true);
      loadFormDependencies();
    }
  }, [externalModalOpen]);

  const loadFormDependencies = async () => {
    try {
      await Promise.all([getAllPeers(), getAllAccounts()]);
    } catch (err) {
      console.error("Failed to load form dependencies:", err);
      setPhoneNumberModalOpen(false);
    }
  };

  // ✅ Reset modal state on close
  const handleClose = () => {
    setPhoneNumberModalOpen(false);
    setFormData(initialFormData);
    setErrors({});
    setEditId("");
    onExternalModalClose?.();
  };

  // ✅ fetch data whenever filters/search/sort changes
  useEffect(() => {
    getCliNumber(pageSize, offset, debouncedSearchString, sortField, sortOrder);
  }, [pageSize, offset, debouncedSearchString, sortField, sortOrder, getCliNumber]);

  // ---------------- Table Columns ----------------
  const columns = [
    {
      title: "S.no",
      key: "s_no",
      Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
    },
    { title: "Country Code", key: "c_clinumberCountryCode" },
    { title: "Country Name", key: "c_clinumberCountryName" },
    { title: "Customer", key: "a_accountName" },
    { title: "Number", key: "c_clinumberName" },
    { title: "Type", key: "c_clinumberType" },
    { title: "Peer Name", key: "p_peerName" },
    {
      title: "Call Flow Name",
      key: "c_callflowName",
      Cell: (record) => record.c_callflowName || "-",
    },
    {
      title: "Status",
      key: "c_clinumberStatus",
      sort: true,
      Cell: (record) => {
        const status = record.c_clinumberStatus;
        const config = {
          Active: { bg: "#F0FDF4", text: "#16A34A", border: "#16A34A" },
          Inactive: { bg: "#FFF1F2", text: "#E11D48", border: "#E11D48" },
          Default: { bg: "#F4F4F4", text: "#555555", border: "#555555" },
        };
        const { bg, text, border } = config[status] || config.Default;
        return <Tabletag text={status} bgColor={bg} textColor={text} borderColor={border} />;
      },
    },
    {
      title: "Actions",
      key: "actions",
      Cell: (record) => (
        <div className="superadmin_phonenumber_list_action_conatiner">
          <Button variant="empty" onClick={() => handleEdit(record.c_clinumberId)}>
            <Icon name="edit" size={15} color="#5F6368" />
          </Button>
          <Button variant="empty" onClick={() => handleDelete(record.c_clinumberId)}>
            <Icon name="deletee" size={15} color="#5F6368" />
          </Button>
        </div>
      ),
    },
  ];

  useEffect(() => {
    const defaultCountry = countries.find(c => c.dial === DEFAULT_DIAL);
    if (defaultCountry) {
      setFormData(prev => ({
        ...prev,
        countryName: defaultCountry.name || "",
        countryCode: DEFAULT_DIAL,
      }));
    }
  }, []);

  // ---------------- Validation ----------------
  const validateField = (name, value) => {
    switch (name) {
      case "countryCode":
        return value.trim() ? "" : "Country Code is required";
      case "number":
        if (!value.trim()) return "Number is required";
        if (!/^\d+$/.test(value)) return "Number must be numeric";
        return "";
      case "type":
        return value ? "" : "Type is required";
      case "peerId":
        return value ? "" : "Peer is required";
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

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const newErrors = {};
      // Fields to skip validation (auto-populated or optional)
      const skipValidation = ["accountId", "accountNo", "accountPrefix", "status"];

      Object.entries(formData).forEach(([key, val]) => {
        if (skipValidation.includes(key)) return;
        const err = validateField(key, val);
        if (err) newErrors[key] = err;
      });

      setErrors(newErrors);
      if (Object.keys(newErrors).length) return;

      try {
        if (editId) {
          await editCliNumber({ id: editId, ...formData });
        } else {
          await createCliNumber(formData);
        }
        handleClose();
        await getCliNumber(pageSize, offset, debouncedSearchString, sortField, sortOrder);
      } catch (err) {
        console.error("Submit failed:", err);
      }
    },
    [formData, editId, createCliNumber, editCliNumber, getCliNumber, pageSize, offset, debouncedSearchString, sortField, sortOrder]
  );

  const handleEdit = useCallback(
    async (id) => {
      setPhoneNumberModalOpen(true);
      await loadFormDependencies();
      const record = phoneNumberData.find((m) => m.c_clinumberId === id);
      if (!record) return;
      setEditId(id);
      setFormData({
        countryCode: record.c_clinumberCountryCode || "",
        countryName: record.c_clinumberCountryName || "",
        number: record.c_clinumberName || "",
        type: record.c_clinumberType || "",
        status: record.c_clinumberStatus || "Active",
        peerId: record.p_peerId || "",
        accountId: record.a_accountId || "",
        accountNo: record.a_accountNo || "",
        accountPrefix: record.a_accountPrefix || "",
      });
    },
    [phoneNumberData]
  );

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteCliNumber(id);
        await getCliNumber(pageSize, offset, debouncedSearchString, sortField, sortOrder);
      } catch (err) {
        console.error("Delete failed:", err);
      }
    },
    [deleteCliNumber, getCliNumber, pageSize, offset, debouncedSearchString, sortField, sortOrder]
  );

  const handleCountryCodeChange = (code, countryObj) => {
    setFormData((prev) => ({
      ...prev,
      countryCode: countryObj.dial,
      countryName: countryObj.name,
    }));

    setErrors((prev) => ({
      ...prev,
      countryCode: "",
      countryName: "",
    }));
  };


  const handleNumberChange = (e) => {
    const value = e.target.value;
    // Only allow digits
    if (/^[0-9]*$/.test(value)) {
      setFormData((prev) => ({ ...prev, number: value }));
      setErrors((prev) => ({ ...prev, number: validateField("number", value) }));
    }
  };

  // ---------------- Render ----------------
  return (
    <>
      <div className="superadmin_phonenumber_list_container">
        <div className="superadmin_phonenumber_list_container_table_search">
          <Input
            type="text"
            placeholder="Search by Name, Number"
            width="400px"
            suffixIcon="search"
            suffixIconColor="#334155"
            onChange={(e) => setSearchString(e.target.value)}
            value={searchString}
          />
        </div>

        <Table
          columns={columns}
          data={phoneNumberData}
          loading={phoneNumberLoading}
          totaldata={phoneNumberTotalCount}
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
      <Modal open={phoneNumberModalOpen} width="720px" onClose={handleClose}>
        <div className="superadmin_phonenumber_list_container_modal_header_container">
          <p className="superadmin_phonenumber_list_container_modal_header">
            {editId ? "Edit Phone Number" : "Create New Phone Number"}
          </p>
          <Button variant="empty" onClick={handleClose}>
            <Icon name="close" color="#0F172A" size="14" />
          </Button>
        </div>

        {(allPeerListLoading || allAccountListLoading || modalLoading) ? (
          <div style={{ height: "200px" }}>
            <Loader />
          </div>
        ) : (
          <form
            className="superadmin_phonenumber_list_container_modal_form"
            onSubmit={handleSubmit}
          >
            {/** define once for reusability */}
            {(() => {
              const isEdit = !!editId; // ✅ true only in edit mode

              return (
                <>
                  {/* Row 1 */}
                  <div className="superadmin_phonenumber_list_container_modal_form_grid">
                    <div className="superadmin_phonenumber_list_container_modal_form_group">
                      <label className="form_label" htmlFor="phoneInput">
                        Phone Number
                      </label>
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
                            error={errors.countryCode}
                            placeholder="Country"
                            compact={false}
                            disabled={isEdit}
                          />
                        </div>
                        <div className="phone-number-section">
                          <input
                            id="phoneInput"
                            className="phone-number-input"
                            placeholder="Enter phone number"
                            value={formData.number}
                            onChange={handleNumberChange}
                            disabled={isEdit}
                            readOnly={isEdit}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="superadmin_phonenumber_list_container_modal_form_group">
                      <label className="form_label" htmlFor="type">Type</label>
                      <Select
                        id="type"
                        name="type"
                        placeholder="Select Type"
                        allowClear
                        disabled={isEdit}
                        showSearch={false}
                        options={[
                          { label: "Tollfree", value: "Tollfree" },
                          { label: "Prepaid", value: "Prepaid" },
                          { label: "Unlimited", value: "Unlimited" },
                        ]}
                        value={formData.type}
                        onChange={(value) => {
                          setFormData((prev) => ({ ...prev, type: value || "" }));
                          setErrors((prev) => ({
                            ...prev,
                            type: value ? "" : validateField("type", value),
                          }));
                        }}
                      />
                      {errors.type && <FormInputError message={errors.type} />}
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="superadmin_phonenumber_list_container_modal_form_grid">

                    <div className="superadmin_phonenumber_list_container_modal_form_group">
                      <label className="form_label" htmlFor="peerId">Peer</label>
                      <Select
                        id="peerId"
                        name="peerId"
                        placeholder="Select Peer"
                        allowClear
                        loading={allPeerListLoading}
                        options={allPeerList.map((p) => ({
                          value: p.p_peerId,
                          label: `${p.p_peerName} ${p.p_peerHost}`,
                          peerName: p.p_peerName,
                          peerHost: p.p_peerHost,
                        }))}
                        optionRender={(option) => (
                          <div className="peer-option">
                            <span className="peer-name">{option.peerName}</span>
                            <span className="peer-host">{option.peerHost}</span>
                          </div>
                        )}
                        value={formData.peerId}
                        disabled={isEdit}
                        onChange={(value) => {
                          setFormData((prev) => ({ ...prev, peerId: value || "" }));
                          setErrors((prev) => ({ ...prev, peerId: value ? "" : "Peer is required" }));
                        }}
                      />

                      {errors.peerId && <FormInputError message={errors.peerId} />}
                    </div>
                    <div className="superadmin_phonenumber_list_container_modal_form_group">
                      <label className="form_label" htmlFor="accountId">Account</label>
                      <Select
                        id="accountId"
                        name="accountId"
                        placeholder="Select Account"
                        allowClear
                        loading={allAccountListLoading}
                        options={allAccountList.map((a) => ({
                          label: a.a_accountName,
                          value: a.a_accountId,
                        }))}
                        value={formData.accountId}
                        disabled={false}
                        onChange={(value) => {
                          const selectedAccount = allAccountList.find((a) => a.a_accountId === value);
                          setFormData((prev) => ({
                            ...prev,
                            accountId: value || "",
                            accountNo: selectedAccount?.a_accountNo || "",
                            accountPrefix: selectedAccount?.a_accountPrefix || "",
                          }));
                          setErrors((prev) => ({ ...prev, accountId: "" }));
                        }}
                      />
                      {errors.accountId && <FormInputError message={errors.accountId} />}
                    </div>
                  </div>


                  {/* Footer */}
                  <div className="superadmin_phonenumber_list_container_modal_footer">
                    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                    <Button variant="primary" type="submit">Save</Button>
                  </div>
                </>
              );
            })()}
          </form>
        )}
      </Modal>
    </>
  );
};

export default SuperAdminPhoneNumberList;
