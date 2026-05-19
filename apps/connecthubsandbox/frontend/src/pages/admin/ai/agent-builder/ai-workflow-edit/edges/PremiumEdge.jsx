import React from "react";
import { getSmoothStepPath, EdgeLabelRenderer } from "reactflow";
import Icon from "../../../../../../constants/Icon.jsx";

export default function PremiumEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  label, // label can be passed directly or via data
  selected,
}) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Use the label from props (if passed directly) or from data
  const edgeLabel = label || (data && data.label);

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? "#3b82f6" : "#94a3b8",
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />

      {/* Only render the label pill if a label is provided */}
      {edgeLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <div className={`premium_edge_pill ${selected ? "selected" : ""}`}>
              <Icon name="flow" size={12} color="#fff" />
              <span>{edgeLabel}</span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
