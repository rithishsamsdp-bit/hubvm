import React from "react";
import "./styles/Doggle.css";
import Icon from "../constants/Icon.jsx";

export default function Doggle({ checked = false, onChange }) {
  const toggle = () => {
    onChange?.(!checked);
  };

  return (
    <div
      className={`doggle ${checked ? "doggle--active" : "doggle--inactive"}`}
      onClick={toggle}
    >
      <div className="doggle__track" />
      <div className="doggle__thumb">
        {checked ? (
          <Icon name="call" size="10" color="#1F8736" />
        ) : (
          <Icon name="notready" size="10" color="#5F6368" />
        )}
      </div>
    </div>
  );
}
