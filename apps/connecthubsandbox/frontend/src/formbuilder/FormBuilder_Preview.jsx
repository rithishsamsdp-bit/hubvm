import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./styles/form_builder_preview.css";
import Icon from "../constants/Icon.jsx";
import {
  Button,
  Input,
  Select,
  Loader,
  Radio,
  Checkbox,
  DateTimeRangePicker,
} from "../components/Index.jsx";
import { useformStore } from "../store/admin/useformStore";

const ResponsiveGridLayout = WidthProvider(Responsive);

function FormBuilder_Preview() {
  const { state } = useLocation();
  const { formData } = state || {};
  const navigate = useNavigate();
  const { createnewform } = useformStore();
  const [loading, setLoading] = useState(false);
  const [previewValues, setPreviewValues] = useState({});

  const getRecursiveDependents = (parentId) => {
    const dependents = [];
    formData.elements.forEach((element) => {
      if (element.conditions && element.conditions.length > 0) {
        const isDependent = element.conditions.some(
          (cond) => cond.fieldId === parentId
        );
        if (isDependent) {
          dependents.push(element.id);
          // Recursively find dependents of this dependent
          const subDependents = getRecursiveDependents(element.id);
          dependents.push(...subDependents);
        }
      }
    });
    return [...new Set(dependents)]; // Remove duplicates
  };

  const handlePreviewChange = (id, value) => {
    setPreviewValues((prev) => {
      const newValues = { ...prev, [id]: value };

      // Find and reset all dependents
      const dependents = getRecursiveDependents(id);
      dependents.forEach((depId) => {
        newValues[depId] = ""; // Reset to empty or default
        // If dependent is an array type (checkbox), might need []
        const depElement = formData.elements.find((el) => el.id === depId);
        if (depElement && depElement.type === "Checkbox") {
          newValues[depId] = [];
        }
      });

      return newValues;
    });
  };

  const checkCondition = (element) => {
    if (!element.conditions || element.conditions.length === 0) return true;

    return element.conditions.every((condition) => {
      const { fieldId, operator, value } = condition;
      const parentElement = formData.elements[parseInt(fieldId)];
      if (!parentElement) return true;

      const parentValue = previewValues[parentElement.id];

      if (operator === "equals") {
        return parentValue === value;
      }
      return true;
    });
  };

  const renderPreviewElement = (element, index) => {
    const { type, label, required, optionsCount, options } = element;

    const inputField = () => {
      switch (type) {
        case "Single Line Text field":
        case "Email ID":
          return (
            <Input
              type="text"
              value={previewValues[element.id] || ""}
              onChange={(e) => handlePreviewChange(element.id, e.target.value)}
            />
          );
        case "Number":
        case "Mobile Number":
          return (
            <Input
              type="number"
              value={previewValues[element.id] || ""}
              onChange={(e) => handlePreviewChange(element.id, e.target.value)}
            />
          );
        case "Dropdown":
          return (
            <Select
              allowClear={false}
              showSearch={false}
              options={options?.map((opt) => ({
                label: opt,
                value: opt,
              }))}
              className="preview_input"
              value={previewValues[element.id]}
              onChange={(val) => handlePreviewChange(element.id, val)}
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
              selected={previewValues[element.id]}
              onChange={(val) => handlePreviewChange(element.id, val)}
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
              selected={previewValues[element.id] || []}
              onChange={(val) => handlePreviewChange(element.id, val)}
              direction="vertical"
            />
          );
        case "File Upload":
          return (
            <div
              className="preview_file_upload"
              onClick={() =>
                document.getElementById(`file_upload_${index}`).click()
              }
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const fileInput = document.getElementById(
                  `file_upload_${index}`
                );
                fileInput.files = e.dataTransfer.files;
              }}
            >
              <div className="upload_icon_wrapper">
                <Icon name="upload" />
              </div>
              <p>
                <span className="upload_click_text">Click to upload</span> or
                drag and drop here
              </p>
              <input
                id={`file_upload_${index}`}
                type="file"
                style={{ display: "none" }}
              />
            </div>
          );
        case "Long Line Text field":
          return (
            <textarea
              className="preview_input"
              value={previewValues[element.id] || ""}
              onChange={(e) => handlePreviewChange(element.id, e.target.value)}
            />
          );
        default:
          return <div>{type}</div>;
      }
    };

    // if (!checkCondition(element)) return null; // Logic moved to main loop to handle Grid layout cleanly

    return (
      <div className="preview_field" key={element.id}>
        <label className="preview_label">
          {label}
          {required && <span className="required_asterisk">*</span>}
        </label>
        {inputField()}
      </div>
    );
  };

  const handlePublish = async () => {
    // Debug: Check if conditions exist in the first element
    if (formData?.elements?.[0]) {
      console.log(
        "Check Element 0 Conditions:",
        formData.elements[0].conditions
      );
      console.log("Check Element 0 Type:", typeof formData.elements[0]);
    }
    console.log(
      "Publishing form DATA (Stringified):",
      JSON.stringify(formData)
    );

    setLoading(true);
    try {
      const columnNames = formData.elements
        .sort((a, b) => {
          if (a.layout.y === b.layout.y) {
            return a.layout.x - b.layout.x;
          }
          return a.layout.y - b.layout.y;
        })
        .map((el) => el.label)
        .join(", ");

      const payload = {
        f_formName: formData.formTitle,
        f_formPayload: formData,
        f_formcolumnName: columnNames,
      };
      await createnewform(payload);
      navigate("/admin-campaign?tab=Form%20Builder");
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  if (!formData) {
    return <div>No form data available. Please create a form first.</div>;
  }

  return (
    <div className="form_preview">
      <div className="navbar_1">
        <div>
          <p className="navbar_1_heading">Form Builder Creation</p>
          <span className="navbar_1_breadcrumb">
            <span
              className="navbar_1_breadcrumb_item"
              onClick={() => navigate("/admin-dashboard")}
            >
              Dashboard
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span
              className="navbar_1_breadcrumb_item"
              onClick={() => navigate("/admin-campaign")}
            >
              Campaign
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span
              className="navbar_1_breadcrumb_item"
              onClick={() => navigate("/admin-campaign?tab=Form%20Builder")}
            >
              Form Builder
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span
              className="navbar_1_breadcrumb_item"
              onClick={() =>
                navigate("/admin-campaign/admin-create-formbuilder", {
                  state: { formData },
                })
              }
            >
              Create Form Builder
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span className="navbar_1_breadcrumb_item active">
              Preview Form Builder
            </span>
          </span>
        </div>
      </div>
      <div className="form_preview_container">
        <div className="form_preview_content_header">
          <h2 className="form_title">{formData.formTitle}</h2>
        </div>

        {loading ? (
          <div className="form_preview_loading">
            <Loader />
          </div>
        ) : (
          <>
            <div
              className="form_preview_area"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(12, 1fr)",
                gap: "16px",
                padding: "20px",
                gridAutoFlow: "row dense",
                alignItems: "start",
              }}
            >
              {formData.elements.map((element, index) => {
                if (!checkCondition(element)) return null;
                const { w } = element.layout;
                return (
                  <div
                    key={element.id}
                    style={{ gridColumn: `span ${w || 4}` }}
                  >
                    {renderPreviewElement(element, index)}
                  </div>
                );
              })}
            </div>

            <div className="form_preview_footer">
              <Button
                variant="secondary"
                onClick={() =>
                  navigate("/admin-campaign/admin-create-formbuilder", {
                    state: { formData },
                  })
                }
              >
                Edit
              </Button>
              <Button variant="primary" onClick={handlePublish}>
                Publish
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FormBuilder_Preview;
