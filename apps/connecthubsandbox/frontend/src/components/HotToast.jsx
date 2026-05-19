import React, { useEffect } from "react";
import { useToastStore } from "../store/useToastStore";
import "./styles/HotToast.css";

const HotToast = ({ id, type, message }) => {
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), 3000);
    return () => clearTimeout(timer);
  }, [id, removeToast]);

  return (
    <div className={`custom-toast ${type}`} onClick={() => removeToast(id)}>
      <span className="toast-message">{message}</span>
    </div>
  );
};

export default HotToast;
