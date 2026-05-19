import React from "react";
import { useToastStore } from "../store/useToastStore";
import HotToast from "./HotToast";
import "./styles/HotToast.css";

const Toaster = () => {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <HotToast key={toast.id} {...toast} />
      ))}
    </div>
  );
};

export default Toaster;
