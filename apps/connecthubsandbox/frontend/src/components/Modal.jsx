import React, { useEffect, useRef, useState } from "react";
import "./styles/Modal.css";

const Modal = ({
  open,
  onClose,
  children,
  width = "520px",
  height = "auto",
  closeOnOverlayClick = false,
  className = "",
  style = {},
}) => {
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);
  const timerRef = useRef();

  useEffect(() => {
    if (open) {
      setVisible(true);
      setTimeout(() => setAnimate(true), 20); // slight delay for smooth animation
    } else if (visible) {
      setAnimate(false);
      timerRef.current = setTimeout(() => setVisible(false), 280); // match CSS transition
    }
    return () => clearTimeout(timerRef.current);
  }, [open]);

  // ESC close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && open && onClose) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!visible) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) onClose && onClose();
  };

  return (
    <div
      className={`modal-overlay ${animate ? "modal-overlay-enter" : "modal-overlay-leave"}`}
      onClick={handleOverlayClick}
    >
      <div
        className="modal-wrap"
        style={{
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <div
          className={`modal-box ${animate
            ? "modal-anim-enter modal-anim-enter-active"
            : "modal-anim-leave modal-anim-leave-active"
            } ${className}`}
          style={{ width, height, ...style, pointerEvents: "auto" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
