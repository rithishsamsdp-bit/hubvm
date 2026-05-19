import React, { useState } from 'react'
import './style/Dashboard.css';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
const Livedashboard = () => {
  const availableWidgets = [
    { id: '1', name: 'Sales Report' },
    { id: '2', name: 'User Statistics' },
    { id: '3', name: 'Revenue Chart' },
  ];

  const [gridWidgets, setGridWidgets] = useState([]);

  const [activeWidget, setActiveWidget] = useState(null);

  const handleDrop = (widget) => {
    if (!gridWidgets.find((w) => w.id === widget.id)) {
      setGridWidgets((prev) => [
        ...prev,
        { ...widget, x: 0, y: 0, w: 3, h: 2 },
      ]);
    }
  };

  const handleWidgetClick = (widget) => {
    setActiveWidget(widget.id);
  };
  return (
    <div className="dashboard_container">
      {/* Left Panel */}
      <div className="dashboard_container_1">
        <div className="dashboard_heading_container">
          <p className="dashboard_heading">Widgets</p>
        </div>
        {availableWidgets.map((widget) => (
          <div
            key={widget.id}
            className={`dashboard_text_container ${activeWidget === widget.id ? 'textcontaineractive' : ''}`}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('widget', JSON.stringify(widget))}
            onClick={() => handleWidgetClick(widget)}  // Set widget as active on click
          >
            <p className="dashboard_text">{widget.name}</p>
          </div>
        ))}
      </div>

      {/* Right Panel */}
      <div
        className="dashboard_container_2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const widget = JSON.parse(e.dataTransfer.getData('widget'));
          handleDrop(widget);
        }}
      >
        <GridLayout
          className="layout"
          cols={12}
          rowHeight={30}
          width={800}
          draggableHandle=".grid-item"
          onLayoutChange={(layout) => {
            const updatedWidgets = gridWidgets.map((widget, i) => ({
              ...widget,
              ...layout[i],
            }));
            setGridWidgets(updatedWidgets);
          }}
        >
          {gridWidgets.map((widget) => (
            <div
              key={widget.id}
              data-grid={{ x: widget.x, y: widget.y, w: widget.w, h: widget.h }}
              className="grid-item"
            >
              <span className="grid-item-content">{widget.name}</span>
            </div>
          ))}
        </GridLayout>
      </div>
    </div>
  )
}

export default Livedashboard
