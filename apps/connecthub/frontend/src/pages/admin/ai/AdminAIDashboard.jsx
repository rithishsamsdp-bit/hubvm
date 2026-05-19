import React from "react";
import "./AdminAI.css"; // Reuse styling for now or split if necessary

const AdminAIDashboard = () => {
  return (
    <div className="admin_ai_content" style={{ marginTop: "24px" }}>
      <div className="ai_card">
        <div className="ai_card_icon">🤖</div>
        <h3>AI Bot Settings</h3>
        <p>Configure bot intent, routing, and responses.</p>
        <button className="primary-btn">Configure</button>
      </div>

      <div className="ai_card">
        <div className="ai_card_icon">📊</div>
        <h3>Analytics</h3>
        <p>View bot performance and interaction history.</p>
        <button className="primary-btn">View Reports</button>
      </div>
    </div>
  );
};

export default AdminAIDashboard;
