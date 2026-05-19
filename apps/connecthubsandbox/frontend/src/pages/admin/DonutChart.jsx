import React from "react";
import "./styles/DonutChart.css";

function DonutChart({
  value,
  label,
  segments,
  showLegend = true,
  legendPosition = "bottom",
  title
}) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);

  // SVG Config
  const size = 160;
  const strokeWidth = 25;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let currentOffset = 0; // Start at top (we rotate SVG -90deg via CSS)

  const chartContent = (
    <div className="donut-wrapper" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-svg">
        {segments.map((seg, i) => {
          const percentVal = total > 0 ? seg.value / total : 0;
          const strokeLength = percentVal * circumference;
          const spaceLength = circumference - strokeLength;
          const offset = currentOffset;

          // Next segment starts where this one ends (subtract because dashoffset moves C-clockwise)
          currentOffset -= strokeLength;

          const percentDisplay = (percentVal * 100).toFixed(1);

          // If total is 0, render a gray circle
          if (total === 0) return null;

          return (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeLength} ${spaceLength}`}
              strokeDashoffset={offset}
              className="donut-segment"
            >
              <title>{`${seg.name}: ${seg.value} (${percentDisplay}%)`}</title>
            </circle>
          );
        })}
        {/* Empty State Ring if total is 0 */}
        {total === 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
        )}

        {/* Center Text */}
        <text
          x="50%"
          y="45%"
          dy=".3em"
          textAnchor="middle"
          className="donut-value-text"
        >
          {value}
        </text>
        <text
          x="50%"
          y="60%"
          dy=".3em"
          textAnchor="middle"
          className="donut-label-text"
        >
          {label}
        </text>
      </svg>
    </div>
  );

  const legendContent = (
    <div className={`donut-legend legend-${legendPosition}`}>
      {segments.map((seg, i) => {
        const percent = total > 0 ? ((seg.value / total) * 100).toFixed(1) : "0.0";
        return (
          <div className="legend-item" key={i}>
            <span className="dot" style={{ backgroundColor: seg.color }}></span>{" "}
            <span style={{ fontWeight: 600 }}>
              {seg.name} – {seg.value} ({percent}%)
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={`donut-layout-${legendPosition} donut-chart-root`}>
      {title && <h3 className="donut-chart-title">{title}</h3>}
      <div className="donut-chart-container">
        {(legendPosition === "top" || legendPosition === "left") &&
          showLegend &&
          legendContent}

        {chartContent}

        {(legendPosition === "bottom" || legendPosition === "right") &&
          showLegend &&
          legendContent}
      </div>
    </div>
  );
}

export default DonutChart;
