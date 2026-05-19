import React from "react";
import "./styles/HourlyLineChart.css";

function HourlyLineChart({ data }) {
  const maxY = Math.max(...data.map((d) => d.value));
  const chartHeight = 150;
  const stepX = 60;
  const chartWidth = (data.length - 1) * stepX;

  const idealStep = 50; 
  const ySteps = Math.min(Math.ceil(maxY / idealStep), 10); 
  const yAxisLabels = Array.from({ length: ySteps + 1 }, (_, i) =>
    Math.round(maxY - (maxY / ySteps) * i)
  );

  const points = data
    .map((point, i) => {
      const x = i * stepX;
      const y = chartHeight - (point.value / maxY) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  const gridLines = Array.from({ length: ySteps + 1 }, (_, i) => {
    const y = (chartHeight / ySteps) * i;
    return (
      <line
        key={i}
        x1="0"
        y1={y}
        x2={chartWidth}
        y2={y}
        stroke="#E1E1E1"
        strokeWidth="1"
      />
    );
  });

  return (
    <div className="admindash_HourlyChartcard">
      <div className="chart-title">Hourly View</div>
      <div className="admindash_line_chart">
        <div className="y-axis">
          {yAxisLabels.map((v, i) => (
            <div key={i}>{v}</div>
          ))}
        </div>

        <div className="scroll-container">
          <svg
            className="line-chart"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            style={{ minWidth: `${chartWidth}px` }}
            preserveAspectRatio="none"
          >
            {gridLines}
            <polyline
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="3"
              points={points}
            />
          </svg>

          <div className="x-axis" style={{ minWidth: `${chartWidth}px` }}>
            {data.map((point, i) => (
              <span key={i}>{point.label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HourlyLineChart;
