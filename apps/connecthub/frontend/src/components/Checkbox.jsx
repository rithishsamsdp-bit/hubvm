import React, { useState } from "react";
import "./styles/Checkbox.css";

const Checkbox = ({ options, selected = [], onChange, direction = "horizontal", label }) => {
  const [localSelected, setLocalSelected] = useState(selected);

  const handleChange = (value) => {
    const newSelected = localSelected.includes(value)
      ? localSelected.filter((v) => v !== value)
      : [...localSelected, value];
    setLocalSelected(newSelected);
    if (onChange) onChange(newSelected);
  };

  return (
    <div className="checkbox-container">
      {label && <span className="checkbox-label-text">{label}</span>}
      <div className={`checkbox-group ${direction === "vertical" ? "vertical" : ""}`}>
        {options.map((option) => (
          <label key={option.value} className="checkbox-label">
            <input
              type="checkbox"
              value={option.value}
              checked={localSelected.includes(option.value)}
              onChange={() => handleChange(option.value)}
              className="checkbox-input"
            />
            <span className="checkbox-custom"></span>
            <span className="checkbox-text">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default Checkbox;