import icons from "../constants/icon";
import { useState, useEffect, useRef } from "react";
import { capitalizeFirst } from "../utils/helpers.js";
import { useConversationStore } from "../store/agent/useConversationStore";
import { callStore } from "../store/useCallStore";
import { cn } from "../lib/utils"; // Corrected path
import { ChevronDown, Clock, CheckCircle2 } from "lucide-react";

const Usercard = ({ imgsrc, username, role, extension }) => {
  const { usercard_dropdown_icon } = icons;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { breakStatus, updateBreakStatus, getBreakTimer } =
    useConversationStore();
  const { registrationStatus } = callStore();
  const dropdownRef = useRef(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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

  const statusOptions = [
    { label: "Active", value: "LOGIN" },
    { label: "Lunch", value: "LUNCH" },
    { label: "Meeting", value: "MEETING" },
    { label: "Query", value: "QUERY" },
  ];

  return (
    <div className="flex flex-col bg-card w-full shadow-2xl rounded-2xl overflow-visible border border-border/50">
      {/* User Info Section */}
      <div className="flex items-center gap-2.5 p-3.5 border-b bg-muted/20 rounded-t-2xl">
        <div className="relative shrink-0">
          <img
            src={imgsrc}
            alt="User"
            className="h-10 w-10 rounded-full border-2 border-background object-cover shadow-sm"
          />
          <span
            className={cn(
              "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card shadow-sm",
              registrationStatus === "Registered"
                ? "bg-green-500"
                : "bg-destructive",
            )}
          />
        </div>
        <div className="flex flex-col min-w-0">
          <p className="truncate text-[13px] font-bold text-foreground leading-none mb-0.5">
            {capitalizeFirst(username)}
          </p>
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-semibold uppercase tracking-wider leading-none">
            <span>{role}</span>
            <span className="h-2 w-[1px] bg-border/60" />
            <span>Ext: {extension || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Status Selector Section */}
      <div className="relative">
        <button
          onClick={toggleDropdown}
          className="flex w-full items-center justify-between p-2.5 hover:bg-muted/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full shadow-inner transition-colors",
                breakStatus === "LOGIN"
                  ? "bg-green-100 text-green-600"
                  : "bg-orange-100 text-orange-600",
              )}
            >
              {breakStatus === "LOGIN" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[10px] font-bold text-foreground">
                {breakStatus === "LOGIN" ? "Active" : breakStatus}
              </span>
              {breakStatus !== "LOGIN" && (
                <span className="text-[9px] text-muted-foreground font-mono">
                  {formatTime(getBreakTimer())}
                </span>
              )}
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-3 w-3 text-muted-foreground transition-transform duration-300",
              isDropdownOpen && "rotate-180",
            )}
          />
        </button>

        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute left-0 bottom-full mb-1 w-full z-[1100] bg-card border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <div className="max-h-48 overflow-y-auto py-1 scrollbar-none">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    "flex w-full items-center px-4 py-2.5 text-sm font-medium transition-all hover:bg-primary/5 cursor-pointer",
                    breakStatus === option.value
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => handleStatusChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Usercard;
