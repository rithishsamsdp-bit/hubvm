import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import Icon from "../../../../../../constants/Icon.jsx";

// Map node types to specific icons and colors
const getNodeConfig = (type) => {
  switch (type) {
    case "start":
      return { icon: "flag", color: "#64748b" };
    case "subagent":
      return { icon: "user", color: "#64748b" };
    case "say":
      return { icon: "chat", color: "#64748b" };
    case "end":
      return { icon: "power", color: "#64748b" };
    case "tool":
      return { icon: "settings", color: "#64748b" };
    case "action":
      return { icon: "tool", color: "#f59e0b" }; // Amber/Gold color to distinguish actions
    default:
      return { icon: "flow", color: "#64748b" };
  }
};

// Custom Icon wrapper since we might not have all exact matching icons in our Icon.jsx yet
const NodeIcon = ({ name, size, color }) => {
  // Try to use standard Icon if it exists, otherwise fallback to basic SVGs
  if (name === "flag") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
        <line x1="4" y1="22" x2="4" y2="15"></line>
      </svg>
    );
  }
  if (name === "user") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    );
  }
  if (name === "chat") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
      </svg>
    );
  }
  if (name === "power") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
        <line x1="12" y1="2" x2="12" y2="12"></line>
      </svg>
    );
  }
  if (name === "tool") {
    // A wrench symbol for APIs / Actions
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
      </svg>
    );
  }
  // Fallback
  return <Icon name={name} size={size} color={color} />;
};

const PremiumNode = ({ id, data, isConnectable, selected }) => {
  const config = getNodeConfig(data.nodeType);

  return (
    <div className={`premium_node_wrapper ${selected ? "selected" : ""}`}>
      {/* Invisible Target Handle (Top) */}
      {data.nodeType !== "start" && (
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className="node_handle_hidden"
        />
      )}

      {/* Main Node Body */}
      <div className="premium_node_body">
        <div className="premium_node_icon">
          <NodeIcon name={config.icon} size={16} color={config.color} />
        </div>
        <div className="premium_node_label">{data.label}</div>
      </div>

      {/* Hover/Selection Actions (e.g., delete) floating to the right */}
      {selected && data.nodeType !== "start" && (
        <div className="premium_node_actions">
          <button
            className="node_action_btn"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete?.(id);
            }}
            title="Delete"
          >
            <Icon name="deletee" size={14} color="#64748b" />
          </button>
        </div>
      )}

      {/* Origin Handle (Bottom) + Add Button */}
      {data.nodeType !== "end" && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            isConnectable={isConnectable}
            className="node_handle_hidden"
          />

          {/* The "+" Add Node Button below the node */}
          <div
            className={`node_add_btn ${selected ? "visible" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              data.onAddNodeClick?.(e, id); // Pass event to position popover
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
        </>
      )}
    </div>
  );
};

export default memo(PremiumNode);
