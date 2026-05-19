import React, { useEffect } from "react";
import "./AdminAI.css";
import { useAIBotStore } from "../../../store/admin/useAIBotStore.js";

const StatCard = ({ label, value, sub }) => (
  <div className="billing_stat_card">
    <div className="billing_stat_value">{value}</div>
    <div className="billing_stat_label">{label}</div>
    {sub && <div className="billing_stat_sub">{sub}</div>}
  </div>
);

const AdminAIBilling = () => {
  const { billingData, billingLoading, getBilling } = useAIBotStore();

  useEffect(() => {
    getBilling();
  }, []);

  if (billingLoading) {
    return (
      <div className="admin_ai_empty_container">
        <p style={{ color: "#64748b" }}>Loading...</p>
      </div>
    );
  }

  const perBot = Object.entries(billingData?.per_bot || {});

  return (
    <div className="admin_ai_agents_container">
      <div className="admin_ai_agents_header">
        <div>
          <h3>Billing</h3>
          <p>Cost breakdown based on OpenAI Realtime API usage (~$0.30/min).</p>
        </div>
      </div>

      <div className="billing_stats_row">
        <StatCard label="Total Calls" value={billingData?.total_calls ?? "—"} />
        <StatCard
          label="Total Minutes"
          value={billingData ? `${billingData.total_minutes} min` : "—"}
        />
        <StatCard
          label="Total Cost"
          value={billingData ? `$${billingData.total_cost_usd}` : "—"}
          sub="USD"
        />
      </div>

      {perBot.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <h4
            style={{ marginBottom: "12px", fontSize: "14px", color: "#1e293b" }}
          >
            Per-Bot Breakdown
          </h4>
          <div style={{ overflowX: "auto" }}>
            <table className="call_log_table">
              <thead>
                <tr>
                  <th>Bot ID</th>
                  <th>Calls</th>
                  <th>Minutes</th>
                  <th>Cost (USD)</th>
                </tr>
              </thead>
              <tbody>
                {perBot.map(([botId, data]) => (
                  <tr key={botId}>
                    <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                      {botId.slice(0, 8)}…
                    </td>
                    <td>{data.calls}</td>
                    <td>{(data.total_sec / 60).toFixed(2)} min</td>
                    <td style={{ color: "#16a34a" }}>
                      ${data.total_cost.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: "20px",
          padding: "12px 16px",
          background: "#f0fdf4",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#15803d",
        }}
      >
        💡 <strong>Estimated rate:</strong> $0.30/min (blended OpenAI Realtime
        API — input $0.06/min + output $0.24/min)
      </div>
    </div>
  );
};

export default AdminAIBilling;
