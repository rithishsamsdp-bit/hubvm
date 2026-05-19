import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./styles/AdminUsersCreation.css";
import { Button, Input, Select, Toast } from "../../../components/Index.jsx";
import Icon from "../../../constants/Icon.jsx";
import { useUsersStore } from "../../../store/admin/useUsersStore";
import { useAuthStore } from "../../../store/useAuthStore.js";

const initialFormState = {
  m_memberName: "",
  m_memberPassword: "",
  m_memberRole: "USER",
  m_memberMobileNo: "",
  m_memberMailId: "",
  m_memberMode: "",
  m_memberPlatformType: "",
  m_memberCallerIdMode: "NO",
  m_memberCallerId: "0"
};

const AdminUsersCreation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialRole = params.get("role") || "USER";
  const [toasts, setToasts] = useState([]);
  const [forms, setForms] = useState([
    { id: Date.now(), data: { ...initialFormState, m_memberRole: initialRole } },
  ]);
  const [errors, setErrors] = useState({});
  const { createUser, isuserCreateLoading } = useUsersStore();
  const { authRole ,authPlan,authUser} = useAuthStore();

  const fieldsConfig = [
    {
      name: "m_memberName",
      label: "Member Name",
      component: "input",
      type: "text",
    },
    {
      name: "m_memberPassword",
      label: "Password",
      component: "input",
      type: "password",
    },
    ...(authPlan?.options?.usercreation?.custom_extension ? [{
      name: "m_memberExtensionNo",
      label: "Extension Number",
      component: "input",
      type: "text",
      prefixIcon: <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>{authUser?.m_accountId}</span>,
      maxLength: 4,
      allow: /^[0-9]*$/
    }] : []),
    {
      name: "m_memberMobileNo",
      label: "Mobile Number",
      component: "input",
      type: "text",
    },
    {
      name: "m_memberMailId",
      label: "Email ID",
      component: "input",
      type: "email",
    },
  ];

  const validateField = (name, value) => {
    const stringValue = value == null ? "" : String(value).trim();
    switch (name) {
      case "m_memberName":
        return stringValue ? "" : "Member Name is required";
      case "m_memberPassword":
        return stringValue ? "" : "Password is required";
      case "m_memberMobileNo":
        return stringValue ? "" : "Mobile Number is required";
      case "m_memberMailId":
        return stringValue
          ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)
            ? ""
            : "Invalid email format"
          : "Email ID is required";
      case "m_memberMode":
        return stringValue ? "" : "Mode is required";
      case "m_memberPlatformType":
        return stringValue ? "" : "Platform Type is required";
      case "m_memberRole":
        return stringValue ? "" : "Role is required";
      case "m_memberExtensionNo":
        return stringValue
          ? /^\d{4}$/.test(stringValue)
            ? ""
            : "Extension Number must be 4 digits"
          : "Extension Number is required";
      default:
        return "";
    }
  };

  const handleChange = (formId, name, value) => {
    setForms((prevForms) =>
      prevForms.map((form) =>
        form.id === formId
          ? { ...form, data: { ...form.data, [name]: value } }
          : form
      )
    );

    // Clear error for the changed field
    setErrors((prevErrors) => ({
      ...prevErrors,
      [`${formId}_${name}`]: "",
    }));
  };

  const handleInputChange = (formId, e) => {
    const { name, value } = e.target;
    handleChange(formId, name, value);
  };

  const closeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    console.log(forms)
    // Validate all forms
    forms.forEach((form) => {
      const data = form.data;
      const allFields = [
        ...fieldsConfig.map((f) => f.name),
        "m_memberMode",
        "m_memberPlatformType",
        "m_memberRole",
        "m_memberCallerIdMode",
      ];
      allFields.forEach((field) => {
        const err = validateField(field, data[field]);
        if (err) newErrors[`${form.id}_${field}`] = err;
      });
    });

    const payload = forms.map(f => ({ ...f.data, }));
    console.log(payload);
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      await createUser(payload);
      navigate(-1);
    }
  };

  const handleCancel = () => {
    navigate("/admin-users?tab=Users&page=1&per_page=10");
  };

  const addNewForm = () => {
    setForms((prev) => [
      ...prev,
      { id: Date.now(), data: { ...initialFormState, m_memberRole: initialRole } },
    ]);
  };

  const removeForm = (formId) => {
    if (forms.length > 1) {
      setForms((prev) => prev.filter((form) => form.id !== formId));
      setErrors((prevErrors) => {
        const updatedErrors = { ...prevErrors };
        Object.keys(updatedErrors).forEach((key) => {
          if (key.startsWith(`${formId}_`)) delete updatedErrors[key];
        });
        return updatedErrors;
      });
    }
  };

  return (
    <div className="admin_users_entry_upload">
      <div className="navbar_1">
        <div>
          <p className="navbar_1_heading">User Creation</p>
          <span className="navbar_1_breadcrumb">
            <span className="navbar_1_breadcrumb_item"
              onClick={() => {
                if (authRole === "TL") {
                  navigate("/tl-dashboard")
                } else if (authRole === "ADMIN") {
                  navigate("/admin-dashboard")
                }
              }}
            >Dashboard</span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span
              className="navbar_1_breadcrumb_item "
              onClick={() => {
                navigate("/admin-users?tab=Users&page=1&per_page=10")
              }}
            >
              Users
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span
              className="navbar_1_breadcrumb_item active"
            >
              Users Creation
            </span>
          </span>
        </div>
      </div>

      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          size={toast.size}
          index={index}
          onClose={() => closeToast(toast.id)}
        />
      ))}

      <form id="entry-form" className="admin_users_entry_form" onSubmit={handleSubmit}>
        {forms.map((form) => (
          <div className="admin_users_entry_row" key={form.id}>
            <div className="admin_users_entry_upload_form_fields">
              {fieldsConfig.map(({ name, label, type, prefixIcon, maxLength, allow }) => (
                <div key={name} className="admin_users_entry_upload_form_group">
                  <label
                    className="form_label"
                    htmlFor={`${form.id}_${name}`}
                    aria-label={label}
                  >
                    {label}
                  </label>
                  <Input
                    id={`${form.id}_${name}`}
                    name={name}
                    type={type}
                    value={form.data[name]}
                    onChange={(e) => handleInputChange(form.id, e)}
                    maxLength={maxLength || (name === "m_memberMobileNo" ? 10 : undefined)}
                    allow={allow}
                    aria-describedby={`${form.id}_${name}_error`}
                    prefixIcon={prefixIcon}
                  />
                  {errors[`${form.id}_${name}`] && (
                    <div
                      id={`${form.id}_${name}_error`}
                      className="admin_users_entry_upload_form_error"
                      style={{ color: "red" }}
                    >
                      {errors[`${form.id}_${name}`]}
                    </div>
                  )}
                </div>
              ))}

              <div className="admin_users_entry_upload_form_group">
                <label
                  className="form_label"
                  htmlFor={`${form.id}_m_memberMode`}
                  aria-label="Mode"
                >
                  Mode
                </label>
                <Select
                  id={`${form.id}_m_memberMode`}
                  name="m_memberMode"
                  value={form.data.m_memberMode}
                  onChange={(value) => handleChange(form.id, "m_memberMode", value)}
                  options={[
                    { label: "Browser", value: "BROWSER" },
                    { label: "SoftPhone", value: "SOFTPHONE" },
                  ]}
                  placeholder="Select Mode"
                  showSearch={false}
                  aria-describedby={`${form.id}_m_memberMode_error`}
                />
                {errors[`${form.id}_m_memberMode`] && (
                  <div
                    id={`${form.id}_m_memberMode_error`}
                    className="admin_users_entry_upload_form_error"
                    style={{ color: "red" }}
                  >
                    {errors[`${form.id}_m_memberMode`]}
                  </div>
                )}
              </div>

              <div className="admin_users_entry_upload_form_group">
                <label
                  className="form_label"
                  htmlFor={`${form.id}_m_memberPlatformType`}
                  aria-label="Platform Type"
                >
                  Platform Type
                </label>
                <Select
                  id={`${form.id}_m_memberPlatformType`}
                  name="m_memberPlatformType"
                  value={form.data.m_memberPlatformType}
                  onChange={(value) =>
                    handleChange(form.id, "m_memberPlatformType", value)
                  }
                  options={[
                    { label: "Call Center", value: "CALLCENTER" },
                    { label: "RCM", value: "RCM" },
                  ]}
                  placeholder="Select Platform Type"
                  showSearch={false}
                  aria-describedby={`${form.id}_m_memberPlatformType_error`}
                />
                {errors[`${form.id}_m_memberPlatformType`] && (
                  <div
                    id={`${form.id}_m_memberPlatformType_error`}
                    className="admin_users_entry_upload_form_error"
                    style={{ color: "red" }}
                  >
                    {errors[`${form.id}_m_memberPlatformType`]}
                  </div>
                )}
              </div>
            </div>


            {initialRole !== "ADMIN" && forms.length > 1 && (
              <div >
                <Button
                  type="button"
                  onClick={() => removeForm(form.id)}
                  aria-label="Remove form"
                >
                  <Icon name="deletee" size={12} />
                </Button>
              </div>

            )}
          </div>
        ))}

        {initialRole !== "ADMIN" && (
          <button
            type="button"
            className="admin_users_entry_upload_add_user_btn"
            onClick={addNewForm}
            aria-label="Add new user form"
          >
            + Add Users
          </button>
        )}
      </form>

      <div className="admin_users_entry_upload_form_actions">
        <Button variant="secondary" type="button" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          form="entry-form"
          disabled={isuserCreateLoading}
        >
          {isuserCreateLoading ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default AdminUsersCreation;