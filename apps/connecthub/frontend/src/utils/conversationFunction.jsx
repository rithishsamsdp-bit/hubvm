import {
  Input,
  Select,
  Checkbox,
  DateTimeRangePicker,
  Radio
} from "../components/Index.jsx";
import Icon from "../constants/Icon.jsx";
import React, { useState } from "react";

const formatDate = (date) => {
  if (!date) return null;
  return date.toISOString().split("T")[0];
};

const formatTime = (date) => {
  if (!date) return null;
  return date.toTimeString().split(" ")[0];
};

const DateTimeWrapper = ({ type, label, onChange, value, ...props }) => {
  const [startDate, setStartDate] = useState(
    value?.start ? new Date(value.start) : new Date()
  );
  const [endDate, setEndDate] = useState(
    value?.end ? new Date(value.end) : new Date()
  );

  React.useEffect(() => {
    if (value?.start) setStartDate(new Date(value.start));
    if (value?.end) setEndDate(new Date(value.end));
  }, [value]);

  const handleDateChange = ({ start, end }) => {
    setStartDate(start);
    setEndDate(end);

    if (type === "Date") {
      onChange?.({
        start: formatDate(start),
        end: formatDate(end),
      });
    } else if (type === "Time") {
      onChange?.(formatTime(start));
    }
  };

  if (type === "Date") {
    return (
      <DateTimeRangePicker
        type="range"
        showTime={false}
        initialStart={startDate}
        initialEnd={endDate}
        onChange={handleDateChange}
        {...props}
      />
    );
  }

  if (type === "Time") {
    return (
      <DateTimeRangePicker
        type="single"
        showTime={true}
        showDate={false}
        initialStart={startDate}
        onChange={handleDateChange}
        placeholder={`Select ${label}`}
        {...props}
      />
    );
  }

  return null;
};


export const renderFormElement = (element, index) => {
  const { type, label, required, options, onChange, value, ...props } = element;

  const inputField = () => {
    switch (type) {
      case "Single Line Text field":
        return (
          <Input
            type="text"
            placeholder={`Enter ${label}`}
            onChange={(e) => {
              onChange(e.target.value);
            }}
            {...props}
          />
        );
      case "Number":
        return (
          <Input
            type="number"
            placeholder={`Enter ${label}`}
            onChange={(e) => {
              onChange(e.target.value);
            }}
            {...props}
          />
        );
      case "Mobile Number":
        return (
          <Input
            type="tel"
            placeholder={`Enter ${label}`}
            value={value}
            maxLength={15}
            onChange={(e) => {
              const val = e.target.value;
              const cleaned = val.replace(/\D/g, "");
              onChange(cleaned);

              const mobileRegex = /^[0-9]{10,15}$/;
              if (cleaned && !mobileRegex.test(cleaned)) {
                console.warn("Invalid mobile number");
              }
            }}
            {...props}
          />
        );

      case "Email ID":
        return (
          <Input
            type="email"
            placeholder={`Enter ${label}`}
            value={value}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val);
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (val && !emailRegex.test(val)) {
                console.warn("Invalid email format");
              }
            }}
            {...props}
          />
        );

      case "Dropdown": {
        const selectOptions = options?.map((opt) => ({
          label: opt,
          value: opt,
        })) || [];

        return (
          <Select
            mode="single"
            width="100%"
            placeholder={`Select ${label}`}
            showSearch={false}
            options={selectOptions}
            value={value || undefined}
            onChange={(val) => {
              onChange(val);
            }}
            {...props}
          />
        );
      }
      case "Date":
      case "Time":
        return (
          <DateTimeWrapper
            type={type}
            label={label}
            onChange={onChange}
            value={value}
            {...props}
          />
        );
      case "Checkbox":
        return (
          <Checkbox
            options={options?.map((opt) => ({
              label: opt,
              value: opt,
            }))}
            value={value || []}
            onChange={(checkedValues) => {
              onChange(checkedValues);
            }}
            direction={props.direction || "vertical"}
            {...props}
          />
        );
      case "Radio":
        return (
          <Radio
            options={options?.map((opt) => ({
              label: opt,
              value: opt,
            }))}
            value={value || ""} // controlled (string)
            onChange={(selected) => {
              onChange(selected);
            }}
            direction={props.direction || "vertical"}
            {...props}
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
              const fileInput = document.getElementById(`file_upload_${index}`);
              fileInput.files = e.dataTransfer.files;
              onChange(e.dataTransfer.files[0] || null);
            }}
          >
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
              onChange={(e) => {
                onChange(e.target.files[0] || null);
              }}
            />
          </div>
        );
      default:
        console.warn("Unsupported element type:", type);
        return <div>{type}</div>;
    }
  };

  return (
    <div className="preview_field" key={element.id || index}>
      <label className="form_label">
        {label}
        {required && <span className="required_asterisk">*</span>}
      </label>
      {inputField()}
    </div>
  );
};

export const formatHoldTime = (seconds) => {
  if (!seconds || seconds < 0) return "00:00";

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
};
export const formatDateforcard = (dateString) => {
  if (!dateString) return "";

  // Handle "YYYY-MM-DD HH:MM:SS" format by replacing space with T
  const formattedString = typeof dateString === 'string' && dateString.includes(' ') && !dateString.includes('T')
    ? dateString.replace(" ", "T")
    : dateString;

  const d = new Date(formattedString);

  if (isNaN(d.getTime())) return "Invalid Date";

  const year = d.getFullYear();
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate().toString().padStart(2, "0");

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;

  return `${year} ${month} ${day} ${hours}:${minutes}${ampm}`;
};

export const formatDuration = (start, end) => {

  if (!start || !end) return "00:00";
  const diffMs = new Date(end) - new Date(start); // difference in ms
  const diffSec = Math.floor(diffMs / 1000);      // total seconds
  const minutes = Math.floor(diffSec / 60);
  const seconds = diffSec % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

export const getStoredHoldDuration = (callId) => {
  try {
    if (!callId) {
      console.warn("📦 No callId provided to getStoredHoldDuration");
      return { startTime: null, duration: 0, totalDuration: 0 }; // Return default object instead of null
    }

    const key = `holdDuration_${callId}`;
    const stored = localStorage.getItem(key);

    if (stored) {
      return JSON.parse(stored);
    } else {
      // Return default structure when no data found
      return { startTime: null, duration: 0, totalDuration: 0 };
    }
  } catch (error) {
    console.error("📦 Error getting stored hold duration:", error);
    return { startTime: null, duration: 0, totalDuration: 0 }; // Return default object on error
  }
};


export const setStoredHoldDuration = (callId, data) => {
  try {
    if (!callId) {
      console.warn("📦 No callId provided to setStoredHoldDuration");
      return;
    }

    const key = `holdDuration_${callId}`;
    const value = JSON.stringify(data);
    localStorage.setItem(key, value);

    const verification = localStorage.getItem(key);
  } catch (error) {
    console.error("📦 Error setting stored hold duration:", error);
  }
};


export const clearStoredHoldDuration = (callId) => {
  try {
    if (!callId) {
      console.warn("📦 No callId provided to clearStoredHoldDuration");
      return;
    }

    const key = `holdDuration_${callId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error("📦 Error clearing stored hold duration:", error);
  }
};

export const cleanupOldHoldDurations = (maxAgeMs = 24 * 60 * 60 * 1000) => {
  try {
    const now = Date.now();
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('holdDuration_')) {
        try {
          const stored = localStorage.getItem(key);
          const parsed = JSON.parse(stored);

          if (parsed.lastUpdated && (now - parsed.lastUpdated) > maxAgeMs) {
            keysToRemove.push(key);
          }
        } catch (e) {
          // If we can't parse it, it's probably old format - remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

  } catch (error) {
    console.warn('Error during hold duration cleanup:', error);
  }
};

export const getCurrentHoldDuration = (callId) => {
  const stored = getStoredHoldDuration(callId);

  // Check if stored data exists
  if (!stored) {
    return 0;
  }

  if (stored.startTime) {
    // Currently on hold, calculate total including current hold time
    const currentHoldSeconds = Math.floor((Date.now() - stored.startTime) / 1000);
    return (stored.totalDuration || 0) + currentHoldSeconds;
  }

  return stored.totalDuration || 0;
};