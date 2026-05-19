import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./styles/FormBuilder.css";
import Icon from "../constants/Icon.jsx";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Input,
  DateTimeRangePicker,
  Modal,
  Select,
} from "../components/Index.jsx";

const ResponsiveGridLayout = WidthProvider(Responsive);

function FormBuilder() {
  const formElements = [
    "Single Line Text field",
    "Number",
    "Dropdown",
    "Date",
    "Time",
    "Radio",
    "Checkbox",
    "File Upload",
  ];

  const { state } = useLocation();
  const { formData } = state || {};

  const [droppedItems, setDroppedItems] = useState(
    formData?.elements.map((el) => el.type) || []
  );
  const [radioOptionsMap, setRadioOptionsMap] = useState(
    formData?.elements.reduce((acc, el, index) => {
      if (el.type === "Radio") acc[index] = el.optionsCount || 2;
      return acc;
    }, {}) || {}
  );
  const [checkboxOptionsMap, setCheckboxOptionsMap] = useState(
    formData?.elements.reduce((acc, el, index) => {
      if (el.type === "Checkbox") acc[index] = el.optionsCount || 2;
      return acc;
    }, {}) || {}
  );
  const [requiredMap, setRequiredMap] = useState(
    formData?.elements.reduce((acc, el, index) => {
      acc[index] = el.required || false;
      return acc;
    }, {}) || {}
  );
  const [minCharMap, setMinCharMap] = useState(
    formData?.elements.reduce((acc, el, index) => {
      acc[index] = el.minChar || false;
      return acc;
    }, {}) || {}
  );
  const [maxCharMap, setMaxCharMap] = useState(
    formData?.elements.reduce((acc, el, index) => {
      acc[index] = el.maxChar || false;
      return acc;
    }, {}) || {}
  );
  const [labelsMap, setLabelsMap] = useState(
    formData?.elements.reduce((acc, el, index) => {
      acc[index] = el.label || el.type;
      return acc;
    }, {}) || {}
  );
  const [optionsMap, setOptionsMap] = useState(
    formData?.elements.reduce((acc, el, index) => {
      if (["Radio", "Checkbox", "Dropdown"].includes(el.type)) {
        acc[index] = el.options || [`Option 1`, `Option 2`]; // Default options if not provided
      }
      return acc;
    }, {}) || {}
  );
  const [conditionsMap, setConditionsMap] = useState(
    formData?.elements.reduce((acc, el, index) => {
      acc[index] = el.conditions || [];
      return acc;
    }, {}) || {}
  );
  const [editingLabelIndex, setEditingLabelIndex] = useState(null);
  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  const [currentConditionIndex, setCurrentConditionIndex] = useState(null);
  const [tempCondition, setTempCondition] = useState({
    fieldId: null,
    operator: "equals",
    value: "",
  });
  const [dropdownOpenMap, setDropdownOpenMap] = useState({});
  const [layouts, setLayouts] = useState({
    lg:
      formData?.elements.map((el, index) => ({
        i: el.id,
        x: el.layout.x,
        y: el.layout.y,
        w: el.layout.w,
        h: el.layout.h,
        minW: el.layout.minW,
        maxW: el.layout.maxW,
        minH: el.layout.minH,
        maxH: el.layout.maxH,
      })) || [],
  });
  const [formTitle, setFormTitle] = useState(formData?.formTitle || "");

  const dropdownRefs = useRef({});
  const dropdownPositions = useRef({});
  const formPreviewRef = useRef(null);
  const navigate = useNavigate();

  const generateLayout = (
    index,
    prevItems = droppedItems,
    itemType = "Single Line Text field"
  ) => {
    const colWidth = 4;
    const cols = 12;
    const itemsPerRow = Math.floor(cols / colWidth);
    const x = (index * colWidth) % cols;
    const y = Math.floor(index / itemsPerRow) * 3;

    let h = 3;
    if (["Radio", "Checkbox", "Dropdown"].includes(itemType)) {
      h = 5; // Start with more height for option fields
    }

    return {
      i: index.toString(),
      x,
      y,
      w: colWidth,
      h,
      minW: 2,
      maxW: 12,
      minH: 2,
      maxH: 20,
    };
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(dropdownRefs.current).forEach((index) => {
        const ref = dropdownRefs.current[index];
        if (ref && !ref.contains(event.target)) {
          setDropdownOpenMap((prev) => ({ ...prev, [index]: false }));
          delete dropdownPositions.current[index];
        }
      });
    };

    const handleScroll = () => {
      setDropdownOpenMap({});
      dropdownPositions.current = {};
    };

    document.addEventListener("mousedown", handleClickOutside);
    const previewElem = formPreviewRef.current;
    if (previewElem) {
      previewElem.addEventListener("scroll", handleScroll);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (previewElem) {
        previewElem.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const handleDragStart = (e, item, index = null) => {
    e.dataTransfer.setData("text/plain", item);
    e.dataTransfer.setData("dragIndex", index !== null ? index.toString() : "");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const useDropdownPosition = () => {
    const [position, setPosition] = useState({ top: 0, left: 0, index: null });
    const dropdownRef = useRef(null);

    const calculatePosition = (index, triggerElement) => {
      if (!triggerElement) return;

      const triggerRect = triggerElement.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      const dropdownWidth = dropdownRef.current
        ? dropdownRef.current.offsetWidth
        : 200;
      let top = triggerRect.bottom + scrollY + 5;
      let left = triggerRect.left + scrollX;

      const viewportHeight = window.innerHeight;
      if (dropdownRef.current) {
        const dropdownHeight = dropdownRef.current.offsetHeight;
        if (top + dropdownHeight > viewportHeight + scrollY) {
          top = triggerRect.top + scrollY - dropdownHeight - 5;
        }
      }

      const viewportWidth = window.innerWidth;
      if (left + dropdownWidth > viewportWidth + scrollX) {
        left = viewportWidth + scrollX - dropdownWidth;
      }
      if (left < scrollX) {
        left = scrollX;
      }

      setPosition({ top, left, index });
    };

    return { position, calculatePosition, dropdownRef };
  };

  const {
    position: dropdownPosition,
    calculatePosition,
    dropdownRef,
  } = useDropdownPosition();

  const toggleDropdown = (index, e) => {
    if (e) {
      calculatePosition(index, e.currentTarget);
    }

    setDropdownOpenMap((prev) => {
      const newMap = { ...prev };
      Object.keys(newMap).forEach((key) => (newMap[key] = false));
      newMap[index] = !prev[index];
      return newMap;
    });
  };

  const renderLabeledBox = (labelText, inputField, index) => {
    return (
      <>
        <div
          className="input_field_box"
          ref={(el) => (dropdownRefs.current[index] = el)}
        >
          <div className="drag_handle"></div>
          <div className="input_field_box_top">
            {editingLabelIndex === index ? (
              <input
                type="text"
                className="input_field_box_label_input"
                value={
                  labelsMap[index] !== undefined ? labelsMap[index] : labelText
                }
                onChange={(e) =>
                  setLabelsMap((prev) => ({ ...prev, [index]: e.target.value }))
                }
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  setLabelsMap((prev) => {
                    const updated = { ...prev };
                    if (value === "") {
                      delete updated[index];
                    } else {
                      updated[index] = value;
                    }
                    return updated;
                  });
                  setEditingLabelIndex(null);
                }}
                autoFocus
              />
            ) : (
              <label
                className="input_field_box_label"
                onClick={() => setEditingLabelIndex(index)}
              >
                {labelsMap[index] !== undefined &&
                labelsMap[index].trim() !== "" ? (
                  labelsMap[index]
                ) : (
                  <span className="label-placeholder">{labelText}</span>
                )}
              </label>
            )}
            <span
              className="input_field_box_icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown(index, e);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            ></span>
          </div>
          {inputField}
        </div>

        {dropdownOpenMap[index] &&
          dropdownPosition.index === index &&
          createPortal(
            <div
              className="dropdown_menu"
              ref={dropdownRef}
              style={{
                position: "absolute",
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                className="dropdown_item"
                onClick={() =>
                  setRequiredMap((prev) => ({
                    ...prev,
                    [index]: !prev[index],
                  }))
                }
              >
                <span>Required</span>
                <Icon name="Toggle" size={15} />
              </div>
              <div
                className="dropdown_item"
                onClick={() =>
                  setMinCharMap((prev) => ({
                    ...prev,
                    [index]: !prev[index],
                  }))
                }
              >
                <span>Minimum Character</span>
                <Icon name="Toggle" size={15} />
              </div>
              <div
                className="dropdown_item"
                onClick={() =>
                  setMaxCharMap((prev) => ({
                    ...prev,
                    [index]: !prev[index],
                  }))
                }
              >
                <span>Maximum Character</span>
                <Icon name="Toggle" size={15} />
              </div>
              <div
                className="dropdown_item"
                onClick={() => {
                  setCurrentConditionIndex(index);
                  const existingCondition = conditionsMap[index]?.[0];
                  setTempCondition(
                    existingCondition || {
                      fieldId: null,
                      operator: "equals",
                      value: "",
                    }
                  );
                  setConditionModalOpen(true);
                  setDropdownOpenMap({});
                }}
              >
                <span>Conditions</span>
                <Icon name="setting" size={15} />
              </div>
              <hr />
              <div
                className="dropdown_item danger"
                onClick={() => handleDelete(index)}
              >
                <Icon name="dropdown_delete" size={15} />
                <span>Delete</span>
              </div>
              <div
                className="dropdown_item"
                onClick={() => handleDuplicate(index)}
              >
                <Icon name="dropdown_duplicate" size={15} />
                <span>Duplicate</span>
              </div>
            </div>,
            document.body
          )}
      </>
    );
  };

  const handleDelete = (index) => {
    setDroppedItems((prev) => prev.filter((_, i) => i !== index));

    const shiftIndices = (map) => {
      const newMap = {};
      Object.keys(map).forEach((key) => {
        const keyNum = parseInt(key);
        if (keyNum > index) {
          newMap[keyNum - 1] = map[key];
        } else if (keyNum < index) {
          newMap[keyNum] = map[key];
        }
      });
      return newMap;
    };

    setRadioOptionsMap((prev) => shiftIndices(prev));
    setCheckboxOptionsMap((prev) => shiftIndices(prev));
    setRequiredMap((prev) => shiftIndices(prev));
    setMinCharMap((prev) => shiftIndices(prev));
    setMaxCharMap((prev) => shiftIndices(prev));
    setLabelsMap((prev) => shiftIndices(prev));
    setOptionsMap((prev) => shiftIndices(prev));
    setConditionsMap((prev) => shiftIndices(prev));
    setDropdownOpenMap((prev) => shiftIndices(prev));

    const newRefs = {};
    Object.keys(dropdownRefs.current).forEach((key) => {
      const keyNum = parseInt(key);
      if (keyNum > index) {
        newRefs[keyNum - 1] = dropdownRefs.current[key];
      } else if (keyNum < index) {
        newRefs[keyNum] = dropdownRefs.current[key];
      }
    });
    dropdownRefs.current = newRefs;

    setLayouts((prev) => {
      const newLayouts = prev.lg
        .filter((layout) => parseInt(layout.i) !== index)
        .map((layout) => {
          const layoutIndex = parseInt(layout.i);
          if (layoutIndex > index) {
            return { ...layout, i: (layoutIndex - 1).toString() };
          }
          return layout;
        });
      return { lg: newLayouts };
    });

    if (editingLabelIndex === index) {
      setEditingLabelIndex(null);
    } else if (editingLabelIndex > index) {
      setEditingLabelIndex(editingLabelIndex - 1);
    }

    delete dropdownPositions.current[index];
    Object.keys(dropdownPositions.current).forEach((key) => {
      const keyNum = parseInt(key);
      if (keyNum > index) {
        dropdownPositions.current[keyNum - 1] = dropdownPositions.current[key];
        delete dropdownPositions.current[key];
      }
    });
  };

  const handleDuplicate = (index) => {
    const duplicatedItem = droppedItems[index];
    const newIndex = droppedItems.length;
    setDroppedItems((prev) => [...prev, duplicatedItem]);
    setLayouts((prev) => ({
      lg: [
        ...prev.lg,
        generateLayout(
          newIndex,
          [...droppedItems, duplicatedItem],
          duplicatedItem
        ),
      ],
    }));
    if (duplicatedItem === "Radio") {
      setRadioOptionsMap((prev) => ({ ...prev, [newIndex]: prev[index] || 2 }));
    } else if (duplicatedItem === "Checkbox") {
      setCheckboxOptionsMap((prev) => ({
        ...prev,
        [newIndex]: prev[index] || 2,
      }));
    }
    setRequiredMap((prev) => ({ ...prev, [newIndex]: prev[index] || false }));
    setMinCharMap((prev) => ({ ...prev, [newIndex]: prev[index] || false }));
    setMaxCharMap((prev) => ({ ...prev, [newIndex]: prev[index] || false }));
    setLabelsMap((prev) => ({ ...prev, [newIndex]: prev[index] || "" }));
    setOptionsMap((prev) => ({
      ...prev,
      [newIndex]: prev[index] || ["Option 1", "Option 2"],
    })); // Duplicate options
    setConditionsMap((prev) => ({ ...prev, [newIndex]: prev[index] || [] }));
  };

  const updateOption = (index, optionIndex, value) => {
    setOptionsMap((prev) => {
      const newOptions = [...prev[index]];
      newOptions[optionIndex] = value;
      return { ...prev, [index]: newOptions };
    });
  };

  const addOption = (index) => {
    setOptionsMap((prev) => {
      const newOptions = [...prev[index], `Option ${prev[index].length + 1}`];
      return { ...prev, [index]: newOptions };
    });

    // Auto-grow height
    setLayouts((prev) => {
      const newLayouts = prev.lg.map((l) => {
        if (l.i === index.toString()) {
          return { ...l, h: l.h + 1 };
        }
        return l;
      });
      return { lg: newLayouts };
    });

    if (["Radio", "Checkbox"].includes(droppedItems[index])) {
      if (droppedItems[index] === "Radio") {
        setRadioOptionsMap((prev) => ({
          ...prev,
          [index]: (prev[index] || 2) + 1,
        }));
      } else if (droppedItems[index] === "Checkbox") {
        setCheckboxOptionsMap((prev) => ({
          ...prev,
          [index]: (prev[index] || 2) + 1,
        }));
      }
    }
  };

  const renderFormElement = (label, index) => {
    switch (label) {
      case "Single Line Text field":
        return renderLabeledBox(
          "Single Line Text",
          <Input variant="primary" disabled />,
          index
        );
      case "Number":
        return renderLabeledBox(
          "Number",
          <Input variant="primary" disabled />,
          index
        );
      case "Dropdown":
        return renderLabeledBox(
          "Dropdown",
          <div>
            {optionsMap[index]?.map((option, optionIndex) => (
              <div key={optionIndex} className="custom_option_item">
                <Input
                  type="text"
                  value={option}
                  onChange={(e) =>
                    updateOption(index, optionIndex, e.target.value)
                  }
                  className="option_input"
                />
              </div>
            ))}
            <Button variant="empty" onClick={() => addOption(index)}>
              + Add Option
            </Button>
          </div>,
          index
        );
      case "Date":
        return renderLabeledBox(
          "Date",
          <DateTimeRangePicker
            type="single"
            showTime={false}
            format="YYYY-MM-DD"
            onChange={() => {}}
          />,
          index
        );
      case "Time":
        return renderLabeledBox(
          "Time",
          <DateTimeRangePicker
            type="single"
            showTime={true}
            showDate={false}
            format="HH:mm"
            onChange={() => {}}
          />,
          index
        );
      case "Radio":
        const count = radioOptionsMap[index] || 2;
        return renderLabeledBox(
          "Radio Label",
          <div className="custom_option_group">
            {optionsMap[index]?.map((option, optionIndex) => (
              <div key={optionIndex} className="custom_option_item">
                <input
                  type="radio"
                  name={`radio_${index}`}
                  className="custom_icon"
                  disabled
                />
                <Input
                  type="text"
                  value={option}
                  onChange={(e) =>
                    updateOption(index, optionIndex, e.target.value)
                  }
                  className="option_input"
                />
              </div>
            ))}
            <Button variant="empty" onClick={() => addOption(index)}>
              + Add Option
            </Button>
          </div>,
          index
        );
      case "Checkbox":
        const checkCount = checkboxOptionsMap[index] || 2;
        return renderLabeledBox(
          "Checkbox",
          <div className="custom_option_group">
            {optionsMap[index]?.map((option, optionIndex) => (
              <div key={optionIndex} className="custom_option_item">
                <input type="checkbox" className="custom_icon" disabled />
                <Input
                  type="text"
                  value={option}
                  onChange={(e) =>
                    updateOption(index, optionIndex, e.target.value)
                  }
                  className="option_input"
                />
              </div>
            ))}
            <Button variant="empty" onClick={() => addOption(index)}>
              + Add Option
            </Button>
          </div>,
          index
        );
      case "File Upload":
        return renderLabeledBox(
          "Upload File",
          <div className="custom_file_upload">
            <div className="upload_icon_wrapper">
              <Icon name="upload" />
            </div>
            <p>
              <span className="upload_click_text">Click to upload</span> or drag
              and drop here
            </p>
            <input
              id={`file_upload_${index}`}
              type="file"
              style={{ display: "none" }}
              disabled
            />
          </div>,
          index
        );
      default:
        return <div>{label}</div>;
    }
  };

  const handleDropToArea = (e) => {
    e.preventDefault();
    const sidebarItem = e.dataTransfer.getData("text/plain");
    const dragIndex = e.dataTransfer.getData("dragIndex");
    if (dragIndex === "") {
      const newIndex = droppedItems.length;
      setDroppedItems((prev) => [...prev, sidebarItem]);
      setLayouts((prev) => ({
        lg: [
          ...prev.lg,
          generateLayout(newIndex, [...droppedItems, sidebarItem], sidebarItem),
        ],
      }));
      if (sidebarItem === "Radio") {
        setRadioOptionsMap((prev) => ({ ...prev, [newIndex]: 2 }));
        setOptionsMap((prev) => ({
          ...prev,
          [newIndex]: ["Option 1", "Option 2"],
        }));
      } else if (sidebarItem === "Checkbox") {
        setCheckboxOptionsMap((prev) => ({ ...prev, [newIndex]: 2 }));
        setOptionsMap((prev) => ({
          ...prev,
          [newIndex]: ["Option 1", "Option 2"],
        }));
      } else if (sidebarItem === "Dropdown") {
        setOptionsMap((prev) => ({
          ...prev,
          [newIndex]: ["Option 1", "Option 2"],
        }));
      }
      setConditionsMap((prev) => ({ ...prev, [newIndex]: [] }));
    }
  };

  const handleLayoutChange = (newLayout) => {
    setLayouts({ lg: newLayout });
  };

  const generateFormJSON = () => {
    const formJSON = {
      formTitle: formTitle || "Untitled Form",
      elements: droppedItems.map((item, index) => {
        const layout = layouts.lg.find((l) => l.i === index.toString()) || {};
        const normalizedHeight = 3;
        return {
          id: index.toString(),
          type: item,
          label: labelsMap[index] || item,
          required: !!requiredMap[index],
          minChar: !!minCharMap[index],
          maxChar: !!maxCharMap[index],
          ...(item === "Radio" && {
            optionsCount: radioOptionsMap[index] || 2,
          }),
          ...(item === "Checkbox" && {
            optionsCount: checkboxOptionsMap[index] || 2,
          }),
          ...(optionsMap[index] && { options: optionsMap[index] }),
          layout: {
            x: layout.x || 0,
            y: layout.y || 0,
            w: layout.w || 4,
            h: normalizedHeight,
            minW: layout.minW || 2,
            maxW: layout.maxW || 12,
            minH: layout.minH || 1,
            maxH: layout.maxH || 6,
          },
          conditions: conditionsMap[index] || [],
        };
      }),
    };
    return formJSON;
  };

  const handleDiscard = () => {
    setFormTitle("");
    setDroppedItems([]);
    setLayouts({ lg: [] });
    setLabelsMap({});
    setRequiredMap({});
    setMinCharMap({});
    setMaxCharMap({});
    setRadioOptionsMap({});
    setCheckboxOptionsMap({});
    setConditionsMap({});
    setOptionsMap({});
    setDropdownOpenMap({});
    setEditingLabelIndex(null);
    dropdownPositions.current = {};
    navigate("/admin-campaign?tab=Form%20Builder");
  };

  const handlePreview = () => {
    const formJSON = generateFormJSON();
    console.log("Gener Form JSON:", formJSON);
    console.log("Current Conditions Map:", conditionsMap);
    navigate("/admin-campaign/admin-preview-formbuilder", {
      state: { formData: formJSON },
    });
  };

  return (
    <div className="form_builder">
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
              onClick={() => navigate(-1)}
            >
              Form Builder
            </span>
            <Icon name="rightarrow" size={8} color="#334155" />
            <span className="navbar_1_breadcrumb_item active">
              Create Form Builder
            </span>
          </span>
        </div>
      </div>
      <div className="form_builder_container">
        <div className="form_builder_sidebar">
          {formElements.map((el, index) => (
            <div
              key={index}
              className="form_element_item"
              draggable
              onDragStart={(e) => handleDragStart(e, el)}
            >
              {el}
            </div>
          ))}
        </div>
        <div className="form_builder_right_section">
          <div className="form_builder_content">
            <div className="form_builder_content_header">
              <Input
                variant="primary"
                placeholder="Form Title"
                width="400px"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div
              className="form_preview_area"
              ref={formPreviewRef}
              onDragOver={handleDragOver}
              onDrop={handleDropToArea}
            >
              <ResponsiveGridLayout
                className="layout"
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
                cols={{ lg: 12, md: 12, sm: 12, xs: 12 }}
                rowHeight={30}
                isDraggable
                isResizable
                onLayoutChange={handleLayoutChange}
                compactType={null}
                preventCollision={true}
                draggableHandle=".drag_handle"
                resizeHandles={["se"]}
              >
                {droppedItems.map((item, index) => (
                  <div key={index.toString()} className="grid-item">
                    {renderFormElement(item, index)}
                  </div>
                ))}
              </ResponsiveGridLayout>
            </div>
          </div>
          <div className="form_builder_footer">
            <Button variant="secondary" onClick={handleDiscard}>
              Discard
            </Button>
            <Button variant="primary" onClick={handlePreview}>
              Preview
            </Button>
          </div>
        </div>
      </div>

      <Modal
        title="Configure Conditions"
        open={conditionModalOpen}
        onClose={() => setConditionModalOpen(false)}
        width="500px"
      >
        <div
          className="condition-modal-content"
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Show this field when:
            </label>
            <Select
              placeholder="Select Parent Field"
              options={droppedItems
                .map((item, idx) => ({
                  label: labelsMap[idx] || item,
                  value: idx.toString(),
                }))
                .filter(
                  (opt) => opt.value !== currentConditionIndex?.toString()
                )}
              value={tempCondition.fieldId}
              onChange={(val) =>
                setTempCondition((prev) => ({ ...prev, fieldId: val }))
              }
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Operator:
            </label>
            <Select
              options={[{ label: "Equals", value: "equals" }]}
              value={tempCondition.operator}
              onChange={(val) =>
                setTempCondition((prev) => ({ ...prev, operator: val }))
              }
              disabled
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Value:
            </label>
            {tempCondition.fieldId !== null &&
            ["Radio", "Checkbox", "Dropdown"].includes(
              droppedItems[parseInt(tempCondition.fieldId)]
            ) ? (
              <Select
                placeholder="Select Value"
                options={
                  optionsMap[parseInt(tempCondition.fieldId)]?.map((opt) => ({
                    label: opt,
                    value: opt,
                  })) || []
                }
                value={tempCondition.value}
                onChange={(val) =>
                  setTempCondition((prev) => ({ ...prev, value: val }))
                }
              />
            ) : (
              <Input
                placeholder="Enter value to match"
                value={tempCondition.value}
                onChange={(e) =>
                  setTempCondition((prev) => ({
                    ...prev,
                    value: e.target.value,
                  }))
                }
              />
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <Button
              variant="secondary"
              onClick={() => {
                setConditionsMap((prev) => ({
                  ...prev,
                  [currentConditionIndex]: [],
                }));
                setConditionModalOpen(false);
              }}
            >
              Clear Condition
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (tempCondition.fieldId && tempCondition.value) {
                  setConditionsMap((prev) => ({
                    ...prev,
                    [currentConditionIndex]: [tempCondition],
                  }));
                  setConditionModalOpen(false);
                } else {
                  alert("Please select both field and value");
                }
              }}
            >
              Save Condition
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default FormBuilder;
