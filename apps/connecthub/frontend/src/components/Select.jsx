// src/components/Select.jsx
import { useState, useRef, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import "./styles/Select.css";
import Icon from "../constants/Icon.jsx";
import Button from "./Button";

const Select = ({
  mode = "single",          // "single" | "multiple"
  wrapTags = true,          // only applies when mode="multiple"
  options = [],
  placeholder = "Please select",
  allowClear = true,
  showSearch = true,
  defaultValue,
  value,
  disabled = false,
  onChange = () => { },
  width,
  optionRender,
}) => {
  const isControlled = value !== undefined;
  const [selected, setSelected] = useState(
    defaultValue !== undefined
      ? defaultValue
      : mode === "multiple"
        ? []
        : ""
  );
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, placement: "bottom" });

  // ────────────────────────────────
  useEffect(() => {
    if (isControlled) setSelected(value);
  }, [value]);

  const filtered = useMemo(
    () =>
      options.filter((opt) =>
        (opt.label || "").toLowerCase().includes(search.toLowerCase())
      ),
    [options, search]
  );

  // ────────────────────────────────
  // Dropdown position update
  const updateDropdownPosition = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();

    const dropdownHeight = 180; // estimated dropdown height
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const placement = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight ? "top" : "bottom";

    setDropdownPos({
      top:
        placement === "bottom"
          ? rect.bottom + window.scrollY
          : rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      placement,
    });
  };

  useEffect(() => {
    if (open) updateDropdownPosition();
  }, [open]);

  // ────────────────────────────────
  useEffect(() => {
    if (!open) return;
    let timeout;
    const handleScrollOrResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(updateDropdownPosition, 50);
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      clearTimeout(timeout);
    };
  }, [open]);

  // ────────────────────────────────
  useEffect(() => {
    const onOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // ────────────────────────────────
  const displayValue = () => {
    if (mode === "multiple") {
      if (!selected || selected.length === 0) return "";
      return selected
        .map((val) => options.find((o) => o.value === val))
        .filter(Boolean)
        .map((opt) => opt.label)
        .join(", ");
    } else {
      const opt = options.find((o) => o.value === selected);
      return opt ? opt.label : (selected || "");
    }
  };

  const isSelected = (val) =>
    mode === "multiple" ? selected.includes(val) : selected === val;

  const handleSelect = (val) => {
    if (disabled) return;
    let next;
    if (mode === "multiple") {
      next = selected.includes(val)
        ? selected.filter((v) => v !== val)
        : [...selected, val];
    } else {
      next = val;
      setOpen(false);
    }
    if (!isControlled) setSelected(next);
    onChange(next);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    const cleared = mode === "multiple" ? [] : "";
    if (!isControlled) setSelected(cleared);
    onChange(cleared);
    setSearch("");
  };

  const hasValue =
    mode === "multiple"
      ? Array.isArray(selected) && selected.length > 0
      : !!selected;

  // ────────────────────────────────
  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", width: width || "auto" }}
    >
      <div
        onClick={() => !disabled && setOpen((p) => !p)}
        className={`select_container${mode === "multiple" && wrapTags ? " wrap" : ""
          }${disabled ? " disabled" : ""}`}
      >
        {mode === "multiple" && wrapTags ? (
          hasValue ? (
            selected
              .map((val) => options.find((o) => o.value === val))
              .filter(Boolean)
              .map((o) => (
                <span key={o.value} className="select_tag">
                  {o.label}
                  <Button
                    type="button"
                    variant="empty"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(o.value);
                    }}
                    className="select_multi_close_btn"
                    aria-label="Remove"
                  >
                    <Icon name="close" size={6} color="#1D4ED8" />
                  </Button>
                </span>
              ))
          ) : (
            <span className="select_placeholder">{placeholder}</span>
          )
        ) : (
          <span className="select_input" title={displayValue()}>
            {displayValue() || placeholder}
          </span>
        )}

        {allowClear && hasValue && !disabled ? (
          <button
            type="button"
            onClick={handleClear}
            className="select_clear_btn"
            title="Clear"
          >
            <Icon name="close" size={12} color="#535353" />
          </button>
        ) : (
          <span className="select_dropdown_icon">
            <Icon name="downarrow" size={12} color="#535353" />
          </span>
        )}
      </div>

      {/* ───── Dropdown ───── */}
      {open && !disabled &&
        ReactDOM.createPortal(
          <div
            className={`select_dropdown ${dropdownPos.placement === "top" ? "drop_top" : "drop_bottom"}`}
            style={{
              position: "absolute",
              top:
                dropdownPos.placement === "bottom"
                  ? dropdownPos.top
                  : dropdownPos.top - 4, // small gap when above
              left: dropdownPos.left,
              width: dropdownPos.width,
              transform:
                dropdownPos.placement === "top"
                  ? "translateY(-100%)"
                  : "translateY(0)",
              zIndex: 9999,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {showSearch && (
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="select_search_input"
                autoFocus
              />
            )}
            {filtered.length === 0 ? (
              <div style={{ padding: 8, color: "#888" }}>No data</div>
            ) : (
              filtered.map((o) => (
                <div
                  key={o.value}
                  onClick={() => handleSelect(o.value)}
                  className={`select_option ${isSelected(o.value) ? "selected" : ""}`}
                >
                  {optionRender ? optionRender(o) : o.label}
                </div>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default Select;
