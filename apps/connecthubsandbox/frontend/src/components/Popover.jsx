import React, { useState, useRef, useEffect } from "react";
import "./styles/popover.css";

/**
 * Props:
 * - content: node (what will appear inside the popover)
 * - mode: "hover" | "click"  (default: "hover")
 * - placement: "right" | "left" | "top" | "bottom"  (default: "right")
 * - children: the trigger element (e.g. <Badges />) - we DO NOT modify Badges
 */
export default function Popover({
  content,
  mode = "hover",
  placement = "right",
  children,
  closeOnContentClick = false,
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (mode !== "click") return;
    function onDocClick(e) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [mode]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const eventProps =
    mode === "hover"
      ? {
          onMouseEnter: () => setOpen(true),
          onMouseLeave: () => setOpen(false),
          onFocus: () => setOpen(true),
          onBlur: () => setOpen(false),
        }
      : {
          onClick: (e) => {
            e.stopPropagation();
            setOpen((s) => !s);
          },
        };

  return (
    <div
      className={`pw-popover-wrapper pw-placement-${placement}`}
      ref={wrapperRef}
      {...eventProps}
      tabIndex={0} 
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      {children}

      <div className={`pw-popover ${open ? "pw-open" : ""}`}>
        <div className="pw-popover-arrow" />
        <div className="pw-popover-body" onClick={() => closeOnContentClick && setOpen(false)}>{content}</div>
      </div>
    </div>
  );
}
