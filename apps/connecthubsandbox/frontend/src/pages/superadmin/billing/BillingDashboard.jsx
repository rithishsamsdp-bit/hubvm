import React, { useMemo, useEffect } from "react";
import "./styles/BillingDashboard.css";
import Icon from "../../../constants/Icon.jsx";
import { useBillingStore } from "../../../store/superadmin/useBillingStore";
import { Loader, Button } from "../../../components/Index.jsx";
import { useNavigate } from "react-router-dom";

const BillingDashboard = () => {
    const { rechargedCustomers, fetchRechargedCustomers, isRechargedCustomersLoading } = useBillingStore();
    const navigate = useNavigate();

    useEffect(() => {
        fetchRechargedCustomers({ limit: 10000 });
    }, []);

    // Dummy data for trends
    const trends = [
        { day: "Mon", amount: 12000 },
        { day: "Tue", amount: 19000 },
        { day: "Wed", amount: 15000 },
        { day: "Thu", amount: 25000 },
        { day: "Fri", amount: 22000 },
        { day: "Sat", amount: 8000 },
        { day: "Sun", amount: 10000 },
    ];

    const maxTrend = Math.max(...trends.map(t => t.amount));
    const yAxisMarkers = [
        maxTrend,
        Math.round(maxTrend * 0.75),
        Math.round(maxTrend * 0.5),
        Math.round(maxTrend * 0.25),
        0
    ];

    const stats = useMemo(() => {
        const totalCustomers = rechargedCustomers.length;
        const enabledCustomers = rechargedCustomers.filter(c => c.b_billing_status === 'enable').length;
        const totalBalance = rechargedCustomers.reduce((acc, curr) => acc + parseFloat(curr.b_credit_balance || 0), 0);
        const todayRecharge = 45000; // Dummy value

        return [
            {
                label: "Total Customers",
                value: totalCustomers,
                icon: "user",
                color: "#6366f1",
                bg: "#eef2ff"
            },
            {
                label: "Billing Enabled",
                value: enabledCustomers,
                icon: "settings",
                color: "#8b5cf6",
                bg: "#f5f3ff"
            },
            {
                label: "Available Balance",
                value: `₹${totalBalance.toLocaleString()}`,
                icon: "account_balance_wallet",
                color: "#10b981",
                bg: "#ecfdf5"
            },
            {
                label: "Recharge Today",
                value: `₹${todayRecharge.toLocaleString()}`,
                icon: "payments",
                color: "#f59e0b",
                bg: "#fffbeb"
            }
        ];
    }, [rechargedCustomers]);

    const topCustomers = useMemo(() => {
        return [...rechargedCustomers]
            .sort((a, b) => parseFloat(b.b_credit_balance || 0) - parseFloat(a.b_credit_balance || 0))
            .slice(0, 10);
    }, [rechargedCustomers]);

    const lowBalanceCustomers = useMemo(() => {
        return rechargedCustomers
            .filter(c => parseFloat(c.b_credit_balance || 0) < 5000)
            .sort((a, b) => parseFloat(a.b_credit_balance || 0) - parseFloat(b.b_credit_balance || 0))
            .slice(0, 5);
    }, [rechargedCustomers]);

    const recentTransactions = [
        { customer: "ZUCI SYSTEMS", amount: 15000, type: "Credit", date: "10 mins ago" },
        { customer: "Zosh Digitate", amount: 5000, type: "Credit", date: "45 mins ago" },
        { customer: "Zigma Marketing", amount: 25000, type: "Credit", date: "2 hrs ago" },
        { customer: "Zencorp Health", amount: 10000, type: "Credit", date: "5 hrs ago" },
    ];

    return (
        <div className="billing_dashboard">
            {/* Stat Cards */}
            <div className="billing_stats_grid">
                {stats.map((stat, i) => (
                    <div key={i} className="billing_stat_card">
                        <div className="stat_icon_wrap" style={{ backgroundColor: stat.bg, color: stat.color }}>
                            <Icon name={stat.icon} size={24} />
                        </div>
                        <div className="stat_info">
                            <p className="stat_label">{stat.label}</p>
                            <h3 className="stat_value">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="dashboard_middle_grid">
                {/* Trends Chart */}
                <div className="dashboard_card trends_card">
                    <div className="card_header">
                        <div className="card_title_wrap">
                            <h4 className="card_title">Daily Recharge Trends</h4>
                            <span className="card_subtitle">Revenue activity (Last 7 days)</span>
                        </div>
                        <div className="revenue_breakdown">
                            <div className="revenue_item">
                                <span className="rev_label">Total GST</span>
                                <span className="rev_value">₹8,100</span>
                            </div>
                            <div className="revenue_item">
                                <span className="rev_label">Total TDS</span>
                                <span className="rev_value">₹2,250</span>
                            </div>
                        </div>
                    </div>
                    <div className="trends_chart_container">
                        <div className="chart_y_axis">
                            {yAxisMarkers.map((val, i) => (
                                <span key={i} className="y_axis_label">
                                    {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                </span>
                            ))}
                        </div>
                        <div className="chart_bars">
                            {trends.map((t, i) => (
                                <div key={i} className="chart_bar_group">
                                    <div className="bar_wrap">
                                        <div 
                                            className="bar_fill" 
                                            style={{ height: `${(t.amount / maxTrend) * 100}%` }}
                                        >
                                            <div className="bar_tooltip">₹{t.amount.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <span className="bar_label">{t.day}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Low Balance Alerts */}
                <div className="dashboard_card alert_card">
                    <div className="card_header">
                        <h4 className="card_title">Low Balance Alerts</h4>
                        <span className="card_subtitle">Accounts below ₹5,000 threshold</span>
                    </div>
                    <div className="alert_list">
                        {lowBalanceCustomers.length > 0 ? (
                            lowBalanceCustomers.map((customer, index) => (
                                <div key={index} className="alert_row">
                                    <div className="alert_info">
                                        <div className="alert_indicator"></div>
                                        <div>
                                            <p className="customer_name">{customer.b_billingAccountName}</p>
                                            <span className="customer_id">ID: {customer.b_billingAccountId}</span>
                                        </div>
                                    </div>
                                    <div className="alert_actions">
                                        <div className="alert_balance text-red-500">
                                            ₹{parseFloat(customer.b_credit_balance || 0).toLocaleString()}
                                        </div>
                                        <Button 
                                            variant="secondary" 
                                            size="small"
                                            onClick={() => navigate(`/superadmin-billing?tab=Recharge&customer=${customer.b_billingAccountId}`)}
                                        >
                                            Recharge
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty_state">
                                <Icon name="check_circle" size={32} color="#10b981" />
                                <p>All accounts healthy</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="dashboard_bottom_grid">
                {/* Top Customers */}
                <div className="dashboard_card top_customers_card">
                    <div className="card_header">
                        <h4 className="card_title">Top 10 Customers by Balance</h4>
                        <span className="card_subtitle">Highest credit accounts</span>
                    </div>
                    <div className="customer_list">
                        {isRechargedCustomersLoading ? (
                            <div className="empty_state">
                                <Loader />
                                <p>Loading customers...</p>
                            </div>
                        ) : topCustomers.length > 0 ? (
                            topCustomers.map((customer, index) => (
                                <div key={index} className="customer_row">
                                    <div className="customer_info">
                                        <div className="customer_rank">{index + 1}</div>
                                        <div className="customer_name_wrap">
                                            <p className="customer_name">{customer.b_billingAccountName}</p>
                                            <span className="customer_id">ID: {customer.b_billingAccountId}</span>
                                        </div>
                                    </div>
                                    <div className="customer_balance">
                                        ₹{parseFloat(customer.b_credit_balance || 0).toLocaleString()}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty_state">
                                <Icon name="user" size={32} color="#cbd5e1" />
                                <p>No customer data available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="dashboard_card activity_card">
                    <div className="card_header">
                        <h4 className="card_title">Recent Activity</h4>
                        <span className="card_subtitle">Latest recharges and updates</span>
                    </div>
                    <div className="activity_list">
                        {recentTransactions.map((tx, index) => (
                            <div key={index} className="activity_row">
                                <div className="activity_icon">
                                    <Icon name="currency_rupee" size={14} />
                                </div>
                                <div className="activity_info">
                                    <p className="activity_text">
                                        <strong>{tx.customer}</strong> recharged with <span>₹{tx.amount.toLocaleString()}</span>
                                    </p>
                                    <span className="activity_time">{tx.date}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillingDashboard;
