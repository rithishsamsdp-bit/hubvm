import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import "./styles/SuperAdminOnboardList.css";
import { useOnboard } from "../../store/superadmin/useOnboard";
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
  Tooltip,
} from "../../components/Index.jsx";
import { useDebounce } from "../../hooks/useDebounce.js";
import { TIMEZONES } from "../../constants/timezone.js";

const SuperAdminOnboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const {
    getOnboard,
    isOnboardLoading,
    onboardData,
    onboardTotalCount,
    modalLoading,
    createOnboard,
    validateAccountCode,
  } = useOnboard();

  const initialFormData = {
    custName: "",
    acccode: "",
    contact: "",
    mailid: "",
    businessvertical: "",
    plan: "",
    salepersonname: "",
    serviceRegion: "",
    timezone: "",
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(initialFormData);
  const [editId, setEditId] = useState("");
  const [open, setOpen] = useState(false);
  const [searchString, setSearchString] = useState("");
  const debouncedSearchString = useDebounce(searchString, 500);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const codeCheckTimeout = useRef(null);

  useEffect(() => {
    navigate(`/superadmin-onboard?page=${page}&per_page=${pageSize}`, {
      replace: true,
    });
  }, [page, pageSize, navigate]);

  useEffect(() => {
    getOnboard(pageSize, offset, sortField, sortOrder, debouncedSearchString);
  }, [
    pageSize,
    offset,
    sortField,
    sortOrder,
    debouncedSearchString,
    getOnboard,
  ]);

  const columns = useMemo(
    () => [
      {
        title: "S.no",
        key: "s_no",
        Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
      },
      { title: "Company Name", key: "a_accountName" },
      { title: "Code", key: "a_accountCode" },
      { title: "Prefix", key: "a_accountPrefix" },
      { title: "Service Region", key: "a_accountServiceRegion" },
      { title: "Mailid", key: "a_accountMailId" },
      { title: "Plan Name", key: "a_planName" },
      { title: "Sales Person", key: "a_salesRepName" },
      {
        title: "Action",
        key: "action",
        Cell: (record) => (
          <div
            className="superadmin_onboard_action_container"
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip content="Edit">
              <Button
                variant="empty"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/superadmin-onboard/edit?id=${record.a_accountId}`);
                }}
              >
                <Icon name="settings" size={15} color="#5F6368" />
              </Button>
            </Tooltip>
            <Tooltip content="Ip">
              <Button
                variant="empty"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/superadmin-onboard/ip?id=${record.a_accountId}`);
                }}
              >
                <Icon name="edit" size={15} color="#5F6368" />
              </Button>
            </Tooltip>
          </div>
        ),
      },
    ],
    [page, pageSize, navigate],
  );

  const validateField = (name, value) => {
    const v = value == null ? "" : String(value).trim();

    switch (name) {
      // required text fields
      case "custName":
      case "businessvertical":
      case "salepersonname":
      case "timezone":
        return v ? "" : `${name} is required`;

      case "acccode":
        if (!v) return "Account Code is required";
        if (/\s/.test(v)) return "Account Code must not contain spaces";
        return "";
      // email
      case "mailid":
        if (!v) return "Email is required";
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
          ? ""
          : "Invalid email format";

      // phone: exactly 10 digits
      case "contact":
        return /^\d{10}$/.test(v) ? "" : "Contact must be exactly 10 digits";

      // plan whitelist
      case "plan":
        return ["Basic", "Professional", "Enterprise"].includes(v)
          ? ""
          : "Invalid plan";

      // service region required + whitelist
      case "serviceRegion":
        if (!v) return "serviceRegion is required";
        return ["Domestic", "International", "International-mid", "Domestic-mid"].includes(v)
          ? ""
          : "Invalid service region";

      default:
        return "";
    }
  };

  const handleChange = (eOrName, val) => {
    if (eOrName?.target) {
      const { name, value } = eOrName.target;

      const nextValue =
        name === "contact" ? value.replace(/\D/g, "").slice(0, 10) : value;

      setFormData((prev) => ({ ...prev, [name]: nextValue }));
      setErrors((prev) => ({
        ...prev,
        [name]: validateField(name, nextValue),
      }));

      if (name === "acccode") {
        if (codeCheckTimeout.current) clearTimeout(codeCheckTimeout.current);

        codeCheckTimeout.current = setTimeout(async () => {
          if (!nextValue.trim()) return;

          setIsCheckingCode(true);
          const exists = await validateAccountCode(nextValue.trim());
          setIsCheckingCode(false);

          setErrors((prev) => ({
            ...prev,
            acccode: exists ? "Account Code already exists" : "",
          }));
        }, 500);
      }

      return;
    }

    const name = eOrName;
    const nextValue =
      name === "contact"
        ? String(val ?? "")
          .replace(/\D/g, "")
          .slice(0, 10)
        : val;

    setFormData((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, nextValue) }));

    if (name === "acccode") {
      if (codeCheckTimeout.current) clearTimeout(codeCheckTimeout.current);

      codeCheckTimeout.current = setTimeout(async () => {
        if (!nextValue.trim()) return;

        setIsCheckingCode(true);
        const exists = await validateAccountCode(nextValue.trim());
        setIsCheckingCode(false);

        setErrors((prev) => ({
          ...prev,
          acccode: exists ? "Account Code already exists" : "",
        }));
      }, 500);
    }
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (errors.acccode || isCheckingCode) return; // <-- ADD THIS

      const newErrors = {};
      Object.entries(formData).forEach(([k, v]) => {
        const err = validateField(k, v);
        if (err) newErrors[k] = err;
      });

      setErrors(newErrors);
      if (Object.keys(newErrors).length) return;

      try {
        await createOnboard(formData);
        setOpen(false);
        setFormData(initialFormData);
        setErrors({});
        setEditId("");
        await getOnboard(
          pageSize,
          offset,
          sortField,
          sortOrder,
          debouncedSearchString,
        );
      } catch (err) {
        console.error("Save failed:", err);
        setErrors((prev) => ({
          ...prev,
          form: err.response?.data?.message || "Save failed.",
        }));
      }
    },
    [
      formData,
      errors,
      isCheckingCode,
      getOnboard,
      pageSize,
      offset,
      sortField,
      sortOrder,
      debouncedSearchString,
    ],
  );

  const handleRowClick = (row) => {
    navigate(
      `/superadmin-onboard/members?id=${row.a_accountId}&name=${encodeURIComponent(row.a_accountName)}&code=${row.a_accountCode}`,
    );
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    setErrors({});
    setEditId("");
    setOpen(false);
  };

  const fieldsConfig = [
    {
      name: "custName",
      label: "Customer Name",
      type: "text",
      placeholder: "Enter name",
    },
    {
      name: "acccode",
      label: "Account Code",
      type: "text",
      placeholder: "Enter code",
    },
    {
      name: "contact",
      label: "Contact",
      type: "tel",
      placeholder: "Enter Mobile Number",
      maxLength: 10,
      inputMode: "numeric",
      pattern: "[0-9]*",
    },
    {
      name: "mailid",
      label: "MailId",
      type: "email",
      placeholder: "Enter mail id",
    },
    {
      name: "businessvertical",
      label: "Business Vertical",
      type: "text",
      placeholder: "Enter Business Vertical",
    },
    {
      name: "plan",
      label: "Plan",
      component: "select",
      placeholder: "Select plan",
      options: [
        { value: "Basic", label: "Basic" },
        { value: "Professional", label: "Professional" },
        { value: "Enterprise", label: "Enterprise" },
      ],
    },
    {
      name: "serviceRegion",
      label: "Service Region",
      component: "select",
      placeholder: "Select Region",
      options: [
        { value: "Domestic", label: "Domestic" },
        { value: "International", label: "International" },
        { value: "Domestic-mid", label: "Domestic-mid" },
        { value: "International-mid", label: "International-mid" },
      ],
    },
    {
      name: "timezone",
      label: "Time Zone",
      component: "select",
      placeholder: "Select Time Zone",
      showSearch: true,
      options: TIMEZONES,
    },
    {
      name: "salepersonname",
      label: "Sales Person Name",
      type: "text",
      placeholder: "Enter Sales Person Name",
    },
  ];

  return (
    <div className="superadmin_onboard_creation">
      <div className="navbar_1">
        <div>
          <p className="navbar_1_heading">Onboard</p>
          <span className="navbar_1_breadcrumb">
            <span className="navbar_1_breadcrumb_item active">Onboard</span>
          </span>
        </div>
        <div className="navbar_button_container">
          <Button type="primary" onClick={() => setOpen(true)}>
            Create Customer
          </Button>
        </div>
      </div>

      <div className="superadmin_onboard_content">
        <div className="superadmin_onboard_container">
          <div className="superadmin_onboard_table_search">
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
            columns={columns}
            data={onboardData}
            loading={isOnboardLoading}
            totaldata={onboardTotalCount}
            page={page}
            serverSide
            pageSize={pageSize}
            clickableRows={true}
            onRowClick={handleRowClick}
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
        <Modal open={open} width="720px" onClose={handleCancel}>
          <div className="superadmin_onboard_modal_header_container">
            <p className="superadmin_onboard_modal_header">
              {editId ? "Edit Onboard" : "Create New Onboard"}
            </p>
            <Button variant="empty" onClick={handleCancel}>
              <Icon name="close" color="#0F172A" size="14" />
            </Button>
          </div>

          {modalLoading ? (
            <div style={{ height: "200px" }}>
              <Loader />
            </div>
          ) : (
            <form
              className="superadmin_onboard_modal_form"
              onSubmit={handleSubmit}
            >
              <div className="superadmin_onboard_modal_form_grid">
                {fieldsConfig.map(
                  ({
                    name,
                    label,
                    type,
                    placeholder,
                    options,
                    component,
                    maxLength,
                    showSearch,
                  }) => (
                    <div
                      key={name}
                      className="superadmin_onboard_modal_form_group"
                    >
                      <label className="form_label" htmlFor={name}>
                        {label}
                      </label>
                      {component === "select" ? (
                        <Select
                          id={name}
                          showSearch={showSearch || false}
                          name={name}
                          value={formData[name]}
                          onChange={(val) => handleChange(name, val)}
                          placeholder={placeholder}
                          options={options}
                        />
                      ) : (
                        <Input
                          id={name}
                          name={name}
                          type={type}
                          value={formData[name]}
                          onChange={handleChange}
                          placeholder={placeholder}
                          {...(maxLength ? { maxLength } : {})}
                        />
                      )}
                      {name === "acccode" && isCheckingCode && (
                        <p style={{ fontSize: "12px", color: "#64748b" }}>
                          Checking...
                        </p>
                      )}
                      {errors[name] && (
                        <FormInputError message={errors[name]} />
                      )}
                    </div>
                  ),
                )}
              </div>

              <div className="superadmin_onboard_modal_form_footer">
                <Button variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default SuperAdminOnboard;
