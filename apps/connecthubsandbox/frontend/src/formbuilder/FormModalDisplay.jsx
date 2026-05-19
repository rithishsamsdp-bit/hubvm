import React, { useState } from "react";
import "./styles/form_modal_display.css";
import Icon from "../constants/Icon.jsx";
import {
  Input,
  Select,
  Radio,
  Checkbox,
  DateTimeRangePicker,
} from "../components/Index.jsx";

function FormDisplay({ formData } = {}) {
  const initialValues = formData.elements.reduce((acc, element) => {
    const { type, options } = element;
    if (
      [
        "Single Line Text field",
        "Number",
        "Mobile Number",
        "Email ID",
        "Long Line Text field",
      ].includes(type)
    ) {
      acc[element.id] = "";
    } else if (type === "Dropdown" && options) {
      acc[element.id] = options[0] || "";
    }
    return acc;
  }, {});

  const [formValues, setFormValues] = useState(initialValues);
  const formId = `form_${formData.formTitle
    .toLowerCase()
    .replace(/\s+/g, "_")}_${Date.now()}`;

  const getRecursiveDependents = (parentId) => {
    const dependents = [];
    formData.elements.forEach((element) => {
      if (element.conditions && element.conditions.length > 0) {
        const isDependent = element.conditions.some(
          (cond) => cond.fieldId === parentId
        );
        if (isDependent) {
          dependents.push(element.id);
          const subDependents = getRecursiveDependents(element.id);
          dependents.push(...subDependents);
        }
      }
    });
    return [...new Set(dependents)];
  };

  const handleInputChange = (id, value) => {
    setFormValues((prev) => {
      const newValues = { ...prev, [id]: value };
      const dependents = getRecursiveDependents(id);
      dependents.forEach((depId) => {
        newValues[depId] = "";
        const depElement = formData.elements.find((el) => el.id === depId);
        if (depElement && depElement.type === "Checkbox") {
          newValues[depId] = []; // Reset array for checkbox
        }
      });
      return newValues;
    });
  };

  const handleRadioChange = (id, value) => {
    setFormValues((prev) => {
      const newValues = { ...prev, [id]: value };
      const dependents = getRecursiveDependents(id);
      dependents.forEach((depId) => {
        newValues[depId] = "";
        const depElement = formData.elements.find((el) => el.id === depId);
        if (depElement && depElement.type === "Checkbox") newValues[depId] = [];
      });
      return newValues;
    });
  };

  const handleCheckboxChange = (id, value) => {
    setFormValues((prev) => {
      const current = prev[id]?.split(",") || [];
      const newCheckValues = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      const newValues = { ...prev, [id]: newCheckValues.join(",") };

      // Note: Changing a checkbox *might* trigger conditions if we supported "includes" operator.
      // Currently only "equals" is supported, which is rare for checkbox.
      // But for safety, we can run reset logic if needed.
      // For now, assuming standard flow.

      return newValues;
    });
  };

  const checkCondition = (element) => {
    if (!element.conditions || element.conditions.length === 0) return true;

    return element.conditions.every((condition) => {
      const { fieldId, operator, value } = condition;
      const parentElement = formData.elements[parseInt(fieldId)];
      if (!parentElement) return true;

      const parentValue = formValues[parentElement.id];

      if (operator === "equals") {
        // Handle multi-value checks if parent is Checkbox?
        // For now simple equality.
        return parentValue === value;
      }
      return true;
    });
  };

  const renderDisplayElement = (element, index) => {
    if (!checkCondition(element)) return null;
    const { type, label, required, optionsCount, options, id } = element;

    const inputField = () => {
      switch (type) {
        case "Single Line Text field":
        case "Number":
        case "Mobile Number":
        case "Email ID":
          return (
            <Input
              type="text"
              value={formValues[id] || ""}
              onChange={(e) => handleInputChange(id, e.target.value)}
            />
          );
        case "Dropdown":
          return (
            <Select
              allowClear={false}
              showSearch={false}
              options={options?.map((opt) => ({ label: opt, value: opt }))}
              value={formValues[id] || options?.[0] || ""}
              onChange={(val) => handleInputChange(id, val)}
              className="display_input"
            />
          );
        case "Date":
          return (
            <DateTimeRangePicker
              type="single"
              showTime={false}
              format="YYYY-MM-DD"
              onChange={() => {}}
            />
          );
        case "Time":
          return (
            <DateTimeRangePicker
              type="single"
              showTime={true}
              showDate={false}
              format="HH:mm"
              onChange={() => {}}
            />
          );
        case "Radio":
          return (
            <Radio
              options={
                options?.map((opt, i) => ({
                  label: opt || `Option ${i + 1}`,
                  value: opt || `Option ${i + 1}`,
                })) || [
                  { label: "Option 1", value: "Option 1" },
                  { label: "Option 2", value: "Option 2" },
                ]
              }
              selected={formValues[id] || ""}
              onChange={(value) => handleRadioChange(id, value)}
              direction="vertical"
            />
          );
        case "Checkbox":
          return (
            <Checkbox
              options={
                options?.map((opt, i) => ({
                  label: opt || `Option ${i + 1}`,
                  value: opt || `Option ${i + 1}`,
                })) || [
                  { label: "Option 1", value: "Option 1" },
                  { label: "Option 2", value: "Option 2" },
                ]
              }
              selected={[]}
              onChange={() => {}}
              direction="vertical"
            />
          );
        case "File Upload":
          return (
            <div
              className="display_file_upload"
              onClick={() =>
                document.getElementById(`file_upload_${id}`).click()
              }
            >
              <div className="upload_icon_wrapper">
                <Icon name="upload" />
              </div>
              <p>
                <span className="upload_click_text">Click to upload</span> or
                drag and drop
              </p>
              <input
                id={`file_upload_${id}`}
                type="file"
                onChange={(e) =>
                  handleInputChange(id, e.target.files[0]?.name || "")
                }
                style={{ display: "none" }}
              />
            </div>
          );
        case "Long Line Text field":
          return (
            <Input
              type="textarea"
              value={formValues[id] || ""}
              onChange={(e) => handleInputChange(id, e.target.value)}
            />
          );
        default:
          return <div>{type}</div>;
      }
    };

    return (
      <div
        className="display_field"
        key={element.id}
        style={{
          gridColumn: `span ${element.layout.w || 4}`,
        }}
      >
        <label className="display_label">
          {label}
          {required && <span className="required_asterisk">*</span>}
        </label>
        {inputField()}
      </div>
    );
  };

  if (!formData) return <div>No form data available.</div>;

  return (
    <form id={formId} className="form_modal_display">
      <div className="form_modal_display_container">
        <div
          className="form_modal_display_area"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "16px",
            gridAutoFlow: "row dense",
            alignItems: "start",
          }}
        >
          {formData.elements.map((element, index) =>
            renderDisplayElement(element, index)
          )}
        </div>
      </div>
    </form>
  );
}

export default FormDisplay;
