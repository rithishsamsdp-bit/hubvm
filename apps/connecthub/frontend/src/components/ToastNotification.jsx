import React, { useEffect, useState } from "react";
import "./styles/ToastNotification.css";
import Icon from "./../constants/Icon.jsx";

const ToastNotification = ({ message, type, size, onClose, index }) => {
  const [progress, setProgress] = useState(100);

  const getStyle = () => {
    switch (type) {
      case "info":
        return { backgroundColor: "#E6F0FA", color: "#1E40AF" };
      case "success":
        return { backgroundColor: "#4ac000", color: "#ffffffff" }; 
      case "warning":
        return { backgroundColor: "#FEF3C7", color: "#92400E" };
      case "error":
        return { backgroundColor: "#FEE2E2", color: "#991B1B" };
      default:
        return { backgroundColor: "#E6F0FA", color: "#1E40AF" };
    }
  };

  const getProgressStyle = () => {
    switch (type) {
      case "info":
        return { backgroundColor: "#3B82F6" };
      case "success":
        return { backgroundColor: "#ffffff" };
      case "warning":
        return { backgroundColor: "#F59E0B" };
      case "error":
        return { backgroundColor: "#EF4444" };
      default:
        return { backgroundColor: "#3B82F6" };
    }
  };

  const getIconName = () => {
    switch (type) {
      case "info":
        return "info_icon";
      case "success":
        return "success_icon";
      case "warning":
        return "warning_icon";
      case "error":
        return "error_icon";
      default:
        return "info_icon";
    }
  };

  const getHeading = () => {
    switch (type) {
      case "info":
        return "Info";
      case "success":
        return "Success";
      case "warning":
        return "Warning";
      case "error":
        return "Error";
      default:
        return "Info";
    }
  };

  const getFontSize = () => {
    switch (size) {
      case "small":
        return { message: "14px", heading: "12px" };
      case "large":
        return { message: "20px", heading: "16px"};
      default:
        return { message: "16px", heading: "14px"};
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          if (onClose) onClose();
          clearInterval(timer);
          return 0;
        }
        return prev - (100 / (3 * 60)); 
      });
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [onClose]);

  return (
    <div
      className="toast"
      style={{
        ...getStyle(),
        padding: "2px 6px",
        borderRadius: "8px",
        position: "fixed",
        overflow: "hidden",
        top: `${20 + index * 80}px`, 
      }}
    >
      <div className="toast-container">
        <div className="toast-icon">
          <Icon name={getIconName()} size={48} />
        </div>
        <div className="toast-content">
          <span
            style={{
              fontSize: getFontSize().heading,
              fontWeight: "600",
              opacity: "0.9",
            }}
          >
            {getHeading()}
          </span>
          <span
            style={{
              fontSize: getFontSize().message,
              fontWeight: "500",
            }}
          >
            {message}
          </span>
        </div>
        <Icon
          name="X_Button"
          onClick={onClose}
          size={36}
          style={{
            cursor: "pointer",
            position: "absolute",
            top: "12px",
            right: "12px",
          }}
        />
      </div>
      <div
        className="progress-bar"
        style={{
          ...getProgressStyle(),
          width: `${progress}%`,
          height: "4px",
          position: "absolute",
          bottom: 0,
          left: 0,
          transition: "width 0.016s linear",
        }}
      />
    </div>
  );
};

export default ToastNotification;