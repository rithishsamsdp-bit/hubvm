import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import "./styles/DateTimeRangePicker.css";

const DateTimeRangePicker = ({
  type = "range",
  showTime = false,
  showDate = true,
  initialStart = new Date(),
  initialEnd = new Date(),
  timeIntervals = 30,
  onChange,
  align = "left",
}) => {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(type === "single" ? initialStart : initialEnd);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState((initialStart || new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState((initialStart || new Date()).getMonth());
  const pickerRef = useRef();
  const inputRef = useRef();

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target) &&
        !inputRef.current.contains(e.target)
      ) {
        setOpen(false);
        setSelectingEnd(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const monthDays = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y, m) => new Date(y, m, 1).getDay();

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, "0")
  );
  const seconds = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, "0")
  );

  // Date click handler
  const handleDateClick = (day) => {
    const clicked = new Date(viewYear, viewMonth, day);

    if (type === "single" || type === "date") {
      setStart(clicked);
      setEnd(clicked);
      setOpen(false);
      onChange?.({ value: clicked });
      return;
    }

    if (!selectingEnd) {
      setStart(clicked);
      setEnd(clicked);
      setSelectingEnd(true);
    } else {
      if (clicked < start) setStart(clicked);
      else setEnd(clicked);
      setSelectingEnd(false);
      if (!showTime) setOpen(false);
    }
    onChange?.({ start, end: clicked });
  };

  // Time click handler
  const handleTimeClick = (val, typeKey, panel) => {
    const dt =
      type === "single"
        ? new Date(start)
        : new Date(panel === "start" ? start : end);

    if (typeKey === "hour") dt.setHours(+val);
    if (typeKey === "minute") dt.setMinutes(+val);
    if (typeKey === "second") dt.setSeconds(+val);

    if (type === "single") {
      setStart(dt);
      onChange?.({ value: dt });
    } else if (panel === "start") {
      setStart(dt);
      onChange?.({ start: dt, end });
    } else {
      setEnd(dt);
      onChange?.({ start: end, end: dt });
    }
  };

  // Safely check if date is within range
  const inRange = (date) => {
    if (type !== "range" || !start || !end) return false;
    return (date > start && date < end) || (date < start && date > end);
  };

  // Safely check if date is selected
  const isSelected = (date, panel) => {
    if (type === "single") {
      return start && date.toDateString() === start.toDateString();
    }
    const target = panel === "start" ? start : end;
    if (!target) return false;
    return date.toDateString() === target.toDateString();
  };

  // Input display formatting
  const formatInput = () => {
    if (type === "single" || type === "date") {
      if (!start) return "";
      if (showTime && !showDate) {
        return start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      }
      return showTime ? start.toLocaleString() : start.toLocaleDateString();
    }
    if (!start || !end) return "";
    return showTime
      ? `${start.toLocaleString()} ~ ${end.toLocaleString()}`
      : `${start.toLocaleDateString()} ~ ${end.toLocaleDateString()}`;
  };

  // Popover position
  const getPopoverStyle = () => {
    if (!inputRef.current) return {};
    const rect = inputRef.current.getBoundingClientRect();

    if (align === "right") {
      return {
        position: "absolute",
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX,
        transform: "translateX(-100%)",
        zIndex: 2000,
      };
    }

    return {
      position: "absolute",
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      zIndex: 2000,
    };
  };

  const popover = (
    <div className="dtp-popover" ref={pickerRef} style={getPopoverStyle()}>
      <div className="dtp-body">
        {showDate && (
          <div>
            <div className="dtp-nav">
              <button
                className="dtp-nav-button"
                onClick={() => setViewMonth((m) => m - 1)}
              >
                ◀
              </button>
              <span className="dtp-month-label">
                {new Date(viewYear, viewMonth).toLocaleString("default", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <button
                className="dtp-nav-button"
                onClick={() => setViewMonth((m) => m + 1)}
              >
                ▶
              </button>
            </div>

            <div className="dtp-calendar">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d} className="weekday">
                  {d}
                </div>
              ))}
              {Array(firstDay(viewYear, viewMonth))
                .fill(null)
                .map((_, i) => (
                  <div key={i} />
                ))}
              {Array(monthDays(viewYear, viewMonth))
                .fill(null)
                .map((_, i) => {
                  const day = i + 1;
                  const date = new Date(viewYear, viewMonth, day);
                  const cls = [
                    "dtp-cell",
                    isSelected(date, "start") ? "start" : "",
                    type === "range" && isSelected(date, "end") ? "end" : "",
                    inRange(date) ? "in-range" : "",
                  ].join(" ");
                  return (
                    <div
                      key={day}
                      className={cls}
                      onClick={() => handleDateClick(day)}
                    >
                      {day}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {showTime && (
          <div className="dtp-time-panel">
            <div className="dtp-time-header">
              <div>HH</div>
              <div>MM</div>
              <div>SS</div>
            </div>
            <div className="dtp-time-columns">
              {[
                { list: hours, key: "hour" },
                { list: minutes, key: "minute" },
                { list: seconds, key: "second" },
              ].map(({ list, key }) => (
                <div key={key} className="dtp-time-column">
                  <ul>
                    {list.map((val) => (
                      <li
                        key={val}
                        className={
                          ((panel) =>
                            key === "hour"
                              ? String(panel.getHours()).padStart(2, "0")
                              : key === "minute"
                                ? String(panel.getMinutes()).padStart(2, "0")
                                : String(panel.getSeconds()).padStart(2, "0"))(
                                  selectingEnd ? end ?? start : start
                                ) === val
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          handleTimeClick(val, key, selectingEnd ? "end" : "start")
                        }
                      >
                        {val}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {(type === "range" || showTime) && (
        <div className="dtp-time-footer">
          <button
            onClick={() => {
              setOpen(false);
              setSelectingEnd(false);
            }}
          >
            OK
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="datetime-picker">
      <div
        className="dtp-input"
        tabIndex={0}
        ref={inputRef}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{formatInput()}</span>
      </div>

      {open && ReactDOM.createPortal(popover, document.body)}
    </div>
  );
};

export default DateTimeRangePicker;
