import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DateTimeRangePicker = ({
  type = "range",
  showTime = false,
  showDate = true,
  initialStart = new Date(),
  initialEnd = new Date(),
  timeIntervals = 30,
  onChange,
  align = "left",
  className,
}) => {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(type === "single" ? initialStart : initialEnd);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    (initialStart || new Date()).getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    (initialStart || new Date()).getMonth(),
  );
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

  // Sync with external prop changes
  useEffect(() => {
    setStart(initialStart);
  }, [initialStart]);

  useEffect(() => {
    setEnd(type === "single" ? initialStart : initialEnd);
  }, [initialEnd, initialStart, type]);

  const monthDays = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y, m) => new Date(y, m, 1).getDay();

  const hours = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, "0"),
  );
  const minutes = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, "0"),
  );
  const seconds = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, "0"),
  );

  // Navigate months
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

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
      onChange?.({ start, end: dt });
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

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Input display formatting
  const formatInput = () => {
    if (type === "single" || type === "date") {
      if (!start) return "";
      if (showTime && !showDate) {
        return start.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
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
    
    const popoverHeight = 360; // Approximate height
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // Decide whether to open upwards based on available space
    let isUp = false;
    if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
      isUp = true;
    }
    
    let topPos = isUp ? rect.top - 6 : rect.bottom + 6;

    // Safety bounds so it never clips off the screen
    if (isUp && topPos - popoverHeight < 10) {
      topPos = popoverHeight + 10; // Keep it at least 10px from top
    }
    if (!isUp && topPos + popoverHeight > window.innerHeight - 10) {
      topPos = window.innerHeight - popoverHeight - 10; // Keep it at least 10px from bottom
    }

    const transform = isUp 
      ? (align === "right" ? "translate(-100%, -100%)" : "translateY(-100%)") 
      : (align === "right" ? "translateX(-100%)" : "none");

    return {
      position: "fixed", // Use fixed to ignore scroll locks
      top: topPos,
      left: align === "right" ? rect.right : rect.left,
      transform: transform,
      zIndex: 999999,
      pointerEvents: "auto",
    };
  };

  const popover = (
    <div
      ref={pickerRef}
      style={getPopoverStyle()}
      className="bg-white rounded-xl border border-slate-200 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 w-max"
    >
      <div className="flex">
        {showDate && (
          <div className="p-3">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[13px] font-semibold text-slate-800">
                {new Date(viewYear, viewMonth).toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {/* Weekday Headers */}
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div
                  key={d}
                  className="w-8 h-8 flex items-center justify-center text-[11px] font-medium text-slate-400"
                >
                  {d}
                </div>
              ))}

              {/* Empty cells for offset */}
              {Array(firstDay(viewYear, viewMonth))
                .fill(null)
                .map((_, i) => (
                  <div key={`empty-${i}`} className="w-8 h-8" />
                ))}

              {/* Day cells */}
              {Array(monthDays(viewYear, viewMonth))
                .fill(null)
                .map((_, i) => {
                  const day = i + 1;
                  const date = new Date(viewYear, viewMonth, day);
                  const isStart = isSelected(date, "start");
                  const isEnd =
                    type === "range" && isSelected(date, "end");
                  const isInRange = inRange(date);
                  const today = isToday(date);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        "w-8 h-8 flex items-center justify-center text-[12px] rounded-md transition-all duration-100 cursor-pointer",
                        // Default
                        "text-slate-700 hover:bg-slate-100",
                        // Today
                        today &&
                          !isStart &&
                          !isEnd &&
                          "font-bold text-primary ring-1 ring-primary/30",
                        // In range
                        isInRange &&
                          "bg-primary/10 text-primary rounded-none",
                        // Start date
                        isStart &&
                          "bg-primary text-white font-semibold hover:bg-primary/90 rounded-l-md",
                        // End date
                        isEnd &&
                          "bg-primary text-white font-semibold hover:bg-primary/90 rounded-r-md",
                        // Both start & end on same day
                        isStart && isEnd && "rounded-md",
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {showTime && (
          <div className="border-l border-slate-200 p-3 w-[160px] shrink-0">
            {/* Time Header */}
            <div className="flex justify-between mb-2 px-1">
              {["HH", "MM", "SS"].map((label) => (
                <div
                  key={label}
                  className="w-10 text-center text-[10px] font-semibold text-slate-400 uppercase"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Time Columns */}
            <div className="flex justify-between h-[216px]">
              {[
                { list: hours, key: "hour" },
                { list: minutes, key: "minute" },
                { list: seconds, key: "second" },
              ].map(({ list, key }) => (
                <div
                  key={key}
                  className="w-12 overflow-y-auto h-full pr-1 select-none [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300"
                >
                  {list.map((val) => {
                    const panel = selectingEnd ? end ?? start : start;
                    const currentVal =
                      key === "hour"
                        ? String(panel.getHours()).padStart(2, "0")
                        : key === "minute"
                          ? String(panel.getMinutes()).padStart(2, "0")
                          : String(panel.getSeconds()).padStart(2, "0");
                    const isActive = currentVal === val;

                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          handleTimeClick(
                            val,
                            key,
                            selectingEnd ? "end" : "start",
                          )
                        }
                        className={cn(
                          "w-full py-1.5 text-[12px] text-center rounded-md transition-colors",
                          isActive
                            ? "bg-primary text-white font-semibold shadow-sm"
                            : "text-slate-600 hover:bg-slate-100",
                        )}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer OK button for range / time modes */}
      {(type === "range" || showTime) && (
        <div className="flex items-center justify-end px-3 py-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setSelectingEnd(false);
            }}
            className="px-4 py-1.5 text-[12px] font-semibold bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("relative inline-block", className)}>
      <div
        ref={inputRef}
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 items-center gap-2 px-3 rounded-lg border border-slate-200 bg-white cursor-pointer select-none transition-all duration-200 shadow-sm",
          "text-[11px] xl:text-xs 2xl:text-sm text-slate-700",
          "hover:border-slate-300",
          open && "border-primary ring-4 ring-primary/10",
        )}
      >
        <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="whitespace-nowrap">
          {formatInput() || "Select date"}
        </span>
      </div>

      {open && ReactDOM.createPortal(popover, document.body)}
    </div>
  );
};

export { DateTimeRangePicker };
export default DateTimeRangePicker;
