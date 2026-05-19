import React from 'react';
import './styles/Popupconfirm.css';
import { Button } from "./Index.jsx";
import Icon from "../constants/CallingBar_Icons.jsx";

const Popupconfirm = ({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel"
}) => {
  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={onCancel}>
      <div className="popup-container" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h2>{title}</h2>
          <Button variant="empty" onClick={onCancel}>
            <Icon name="close" color="#0F172A" size="14" />
          </Button>
        </div>
        
        <div className="popup-body">
          <p>{message}</p>
        </div>
        
        <div className="popup-footer">
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Popupconfirm;