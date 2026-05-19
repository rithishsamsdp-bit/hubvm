import React from "react";
import "./styles/BarChart.css";

const BarChart = ({ data, title, subtitle, height = 200 }) => {
    // Expect data format: [{ label: "Mon", sent: 10, read: 8 }, ...]
    // We will plot "sent" and "read" bars side by side for each label.

    if (!data || data.length === 0) {
        return <div className="bar-chart-empty">No data available</div>;
    }

    // Find max value to scale the bars
    const allValues = data.flatMap(d => [d.sent, d.read]);
    const maxValue = Math.max(...allValues, 1); // Avoid div by zero

    // Generate Scale Ticks (0, 25%, 50%, 75%, 100%)
    const ticks = [
        Math.ceil(maxValue),
        Math.ceil(maxValue * 0.75),
        Math.ceil(maxValue * 0.5),
        Math.ceil(maxValue * 0.25),
        0
    ];

    return (
        <div className="bar-chart-container">
            <div className="bar-chart-header">
                {title && <h3 className="bar-chart-title">{title}</h3>}
                {subtitle && <p className="bar-chart-subtitle">{subtitle}</p>}
            </div>
            <div className="bar-chart-layout">
                {/* Y Axis */}
                <div className="bar-chart-y-axis" style={{ height: height }}>
                    {ticks.map((tick, i) => (
                        <div key={i} className="y-axis-tick">
                            <span>{tick}</span>
                        </div>
                    ))}
                </div>

                {/* Bars */}
                <div className="bar-chart-wrapper" style={{ height: height }}>
                    {data.map((item, index) => (
                        <div key={index} className="bar-group">
                            <div className="bar-bars">
                                {/* Sent Bar */}
                                <div className="bar-column">
                                    <span className="bar-value">{item.sent}</span>
                                    <div
                                        className="bar-item bar-sent"
                                        style={{ height: `${(item.sent / maxValue) * 100}%` }}
                                        title={`Sent: ${item.sent}`}
                                    ></div>
                                </div>
                                {/* Read Bar */}
                                <div className="bar-column">
                                    <span className="bar-value">{item.read}</span>
                                    <div
                                        className="bar-item bar-read"
                                        style={{ height: `${(item.read / maxValue) * 100}%` }}
                                        title={`Read: ${item.read}`}
                                    ></div>
                                </div>
                            </div>
                            <div className="bar-label">{item.label}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bar-chart-legend">
                <div className="legend-item">
                    <span className="dot sent"></span> Sent
                </div>
                <div className="legend-item">
                    <span className="dot read"></span> Read
                </div>
            </div>
        </div>
    );
};

export default BarChart;
