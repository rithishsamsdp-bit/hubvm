import "./styles/Usercard.css";
import icons from "../constants/icon";
import { useState, useEffect, useRef } from "react";
import { capitalizeFirst } from "../utils/helpers.js";
import { useConversationStore } from "../store/agent/useConversationStore";
import { callStore } from "../store/useCallStore";

const Usercard = ({ imgsrc, username, role, extension }) => {
  const { Usercard_tick_icon, Usercard_time_icon, usercard_dropdown_icon } =
    icons;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { breakStatus, updateBreakStatus, setBreakStatus, getBreakTimer } =
    useConversationStore();
  const { registrationStatus } = callStore();
  const dropdownRef = useRef(null);
  const usercardRef = useRef(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (usercardRef.current && !usercardRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleStatusChange = async (newStatus) => {
    const statusToUpdate = newStatus === "Active" ? "LOGIN" : newStatus;
    const currentStatus = breakStatus;

    updateBreakStatus(statusToUpdate);
    setIsDropdownOpen(false);

    if (statusToUpdate !== "LOGIN") {
      if (currentStatus === "LOGIN") {
        await callStore.getState().unregisterUA();
      }
    } else {
      if (currentStatus !== "LOGIN") {
        await callStore.getState().initUA();
      }
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (isDropdownOpen && dropdownRef.current) {
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      if (dropdownRect.right > window.innerWidth) {
        dropdownRef.current.style.right = "auto";
        dropdownRef.current.style.left = "0";
      } else {
        dropdownRef.current.style.left = "auto";
        dropdownRef.current.style.right = "0";
      }
    }
  }, [isDropdownOpen]);

  return (
    <div className="usercard_container" ref={usercardRef}>
      <div className="usercard_container_1">
        <div className="usercard_profile_wrapper">
          <img src={imgsrc} alt="User" className="usercard_user_profile_icon" />
          <span
            className={`usercard_status_dot ${
              registrationStatus === "Registered"
                ? "usercard_status_dot_green"
                : "usercard_status_dot_red"
            }`}
          ></span>
        </div>
        <div className="usercard_details_container">
          <p className="usercard_username">{capitalizeFirst(username)}</p>
          <div className="usercard_role_extension_container">
            <p className="usercard_agent_role">{capitalizeFirst(role)}</p>
            <span className="usercard_role_extension_divider">|</span>
            <p className="usercard_agent_extension">
              Ext: {extension || "N/A"}
            </p>
          </div>
        </div>
      </div>

      <div
        className="usercard_conatiner_2"
        style={{ position: "relative" }}
        onClick={toggleDropdown}
      >
        <div
          className={`usercard_user_${
            breakStatus === "LOGIN" ? "activestatus" : "idlestatus"
          }_icon_container`}
        >
          <img
            src={
              breakStatus === "LOGIN" ? Usercard_tick_icon : Usercard_time_icon
            }
            alt="Status"
            className="usercard_user_status_icon"
          />
        </div>

        <p className="usercard_user_status_name">
          {breakStatus === "BREAK" ||
          breakStatus === "LUNCH" ||
          breakStatus === "RESTROOM" ||
          breakStatus === "MEETING" ||
          breakStatus === "QUERY"
            ? `${breakStatus} (${formatTime(getBreakTimer())})`
            : breakStatus === "LOGIN"
              ? "Active"
              : breakStatus}
        </p>

        <img
          src={usercard_dropdown_icon}
          alt="Dropdown"
          className="usercard_user_select_icon"
        />

        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="usercard_dropdown right-aligned-dropdown"
          >
            <div className="usercard_dropdown_scroll">
              <p
                className="usercard_dropdown_item"
                onClick={() => handleStatusChange("LOGIN")}
              >
                Active
              </p>
              <p
                className="usercard_dropdown_item"
                onClick={() => handleStatusChange("LUNCH")}
              >
                Lunch
              </p>
              <p
                className="usercard_dropdown_item"
                onClick={() => handleStatusChange("MEETING")}
              >
                Meeting
              </p>
              <p
                className="usercard_dropdown_item"
                onClick={() => handleStatusChange("QUERY")}
              >
                Query
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Usercard;
