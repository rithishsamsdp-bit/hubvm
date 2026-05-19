import React, { useState } from "react";
import "./styles/Radio.css";

const Radio = ({
  options,
  value,
  onChange,
  direction = "horizontal",
  name = "custom-radio",
}) => {
  const [localSelected, setLocalSelected] = useState(value || "");

  const handleChange = (newValue) => {
    setLocalSelected(newValue);
    if (onChange) onChange(newValue);
  };

  return (
    <div className="radio-container">
      <div
        className={`radio-group ${
          direction === "vertical" ? "vertical" : ""
        }`}
      >
        {options.map((option) => (
          <label key={option.value} className="radio-label">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={localSelected === option.value}
              onChange={() => handleChange(option.value)}
              className="radio-input"
            />
            <span className="radio-custom"></span>
            <span className="radio-text">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default Radio;
