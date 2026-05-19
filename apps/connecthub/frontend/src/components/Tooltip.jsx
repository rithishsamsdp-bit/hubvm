import React, { useRef, useState, useLayoutEffect } from "react";
import "./styles/Tooltip.css";

// Placement helpers (same as before)
function getRect(element) {
  if (!element) return {};
  return element.getBoundingClientRect();
}
function getBestPlacement(triggerEl, tooltipEl) {
  if (!triggerEl || !tooltipEl) return "bottom";
  const trigger = getRect(triggerEl);
  const tooltip = getRect(tooltipEl);
  const { innerWidth, innerHeight } = window;
  const checks = {
    top: trigger.top >= tooltip.height + 8,
    bottom: innerHeight - trigger.bottom >= tooltip.height + 8,
    left: trigger.left >= tooltip.width + 8,
    right: innerWidth - trigger.right >= tooltip.width + 8,
  };
  if (checks.top) return "top";
  if (checks.bottom) return "bottom";
  if (checks.right) return "right";
  if (checks.left) return "left";
  return "bottom";
}
function getTooltipStyle(triggerEl, tooltipEl, placement = "top") {
  if (!triggerEl || !tooltipEl) return { left: 0, top: 0 };
  const t = getRect(triggerEl);
  const tt = getRect(tooltipEl);
  const offset = 8;
  const midX = t.left + t.width / 2;
  const midY = t.top + t.height / 2;
  const placementsMap = {
    "top":    { left: midX - tt.width / 2, top: t.top - tt.height - offset },
    "top-start": { left: t.left, top: t.top - tt.height - offset },
    "top-end":   { left: t.right - tt.width, top: t.top - tt.height - offset },
    "bottom": { left: midX - tt.width / 2, top: t.bottom + offset },
    "bottom-start": { left: t.left, top: t.bottom + offset },
    "bottom-end":   { left: t.right - tt.width, top: t.bottom + offset },
    "left":   { left: t.left - tt.width - offset, top: midY - tt.height / 2 },
    "left-start":  { left: t.left - tt.width - offset, top: t.top },
    "left-end":    { left: t.left - tt.width - offset, top: t.bottom - tt.height },
    "right":  { left: t.right + offset, top: midY - tt.height / 2 },
    "right-start": { left: t.right + offset, top: t.top },
    "right-end":   { left: t.right + offset, top: t.bottom - tt.height },
  };
  return placementsMap[placement] || placementsMap["bottom"];
}

export default function Tooltip({
  children,
  content,
  placement,
  className = "",
  trigger = "hover",
  bgColor, // optional background color
  textColor, // optional text color
  ...props
}) {
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [finalPlacement, setFinalPlacement] = useState(placement || "bottom");
  const [coords, setCoords] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (visible) {
      setTimeout(() => {
        let chosen = placement;
        if (!placement) chosen = getBestPlacement(triggerRef.current, tooltipRef.current);
        setFinalPlacement(chosen);
        setCoords(getTooltipStyle(triggerRef.current, tooltipRef.current, chosen));
      }, 10);
    }
  }, [visible, placement, content]);

  const triggerProps = trigger === "click"
    ? {
        onClick: () => setVisible(v => !v),
        onBlur: () => setVisible(false),
        tabIndex: 0,
        "aria-describedby": visible ? "tooltip" : undefined,
      }
    : {
        onMouseEnter: () => setVisible(true),
        onMouseLeave: () => setVisible(false),
        onFocus: () => setVisible(true),
        onBlur: () => setVisible(false),
        tabIndex: 0,
        "aria-describedby": visible ? "tooltip" : undefined,
      };

  return (
    <>
      {React.cloneElement(children, { ref: triggerRef, ...triggerProps })}
      {visible && (
        <div
          ref={tooltipRef}
          id="tooltip"
          className={`my-tooltip ${className}`}
          style={{
            left: `${coords.left}px`,
            top: `${coords.top}px`,
            background: bgColor || undefined,
            color: textColor || undefined,
            ...props.style
          }}
        >
          {content}
          <div
            className={`my-tooltip-arrow my-tooltip-arrow-${finalPlacement}`}
            style={{
              background: bgColor || "",
            }}
          />
        </div>
      )}
    </>
  );
}
