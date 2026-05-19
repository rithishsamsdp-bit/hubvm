import React from "react";
import "./styles/Loader.css";

const Loader = ({ size = "medium", style = {}, className = "" }) => {
  const sizeMap = {
    small: "20px",
    medium: "40px",
    large: "60px",
  };

  const loaderSize = sizeMap[size] || size;

  return (
    <div className={`loader-wrapper ${className}`} style={{ ...style, width: loaderSize, height: loaderSize }}>
      <svg className="arc-loader" viewBox="0 0 100 100" style={{ width: loaderSize, height: loaderSize }}>
        <circle
          className="arc-bg"
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#fee6d9"
          strokeWidth="10"
        />
        <circle
          className="arc-fg"
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray="283"
          strokeDashoffset="210"
        />
      </svg>
    </div>
  );
};

export default Loader;