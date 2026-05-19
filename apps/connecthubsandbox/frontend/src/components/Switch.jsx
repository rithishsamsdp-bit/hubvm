import React, { useId } from "react";
import "./styles/Switch.css";

export default function Switch({
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  id,
  name,
  label,
  hint,
  size = "md", // sm | md | lg
  className = "",
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const descId = hint ? `${inputId}-desc` : undefined;

  return (
    <div className={`switch-field ${className}`}>
      {label && (
        <label className="switch-label" htmlFor={inputId}>
          {label}
        </label>
      )}

      <label
        className={`switch ${size} ${disabled ? "disabled" : ""}`}
        aria-disabled={disabled}
      >
        {/* Native checkbox for a11y & form integration */}
        <input
          id={inputId}
          name={name}
          type="checkbox"
          className="switch-input"
          role="switch"
          aria-checked={!!checked}
          aria-describedby={descId}
          disabled={disabled}
          checked={checked}
          defaultChecked={checked === undefined ? defaultChecked : undefined}
          onChange={(e) => onChange?.(e.target.checked, e)}
        />
        <span className="switch-track">
          <span className="switch-thumb" />
        </span>
      </label>

      {hint && (
        <div id={descId} className="switch-hint">
          {hint}
        </div>
      )}
    </div>
  );
}
