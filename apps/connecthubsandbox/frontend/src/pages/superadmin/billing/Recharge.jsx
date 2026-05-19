import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useBillingStore } from "../../../store/superadmin/useBillingStore";
import Icon from "../../../constants/Icon.jsx";
import { Input, Select, Loader, Button, Modal } from "../../../components/Index.jsx";
import "./styles/Statement.css";

const Recharge = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const urlCustomerId = queryParams.get("customer");

    const {
        customers,
        fetchCustomers,
        rechargedCustomers,
        isRechargedCustomersLoading,
        fetchRechargedCustomers,
        calculateRecharge,
        isUpdating,
        rechargeHistory,
        fetchRechargeHistory,
        isRechargeHistoryLoading
    } = useBillingStore();

    const [selectedRechargeCustomer, setSelectedRechargeCustomer] = useState("");
    const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
    const [customerToRecharge, setCustomerToRecharge] = useState(null);
    const [rechargeAmount, setRechargeAmount] = useState("");
    const [tdsPercentage, setTdsPercentage] = useState(0);
    const [paymentDoneBy, setPaymentDoneBy] = useState("");
    const [calculation, setCalculation] = useState(null);

    const [transactionsDrawerOpen, setTransactionsDrawerOpen] = useState(false);
    const [customerForTxns, setCustomerForTxns] = useState(null);
    const [expandedTxn, setExpandedTxn] = useState(null);

    const rechargeSelectOptions = useMemo(() =>
        customers
            .filter(c => c.config === "Configured")
            .map(c => ({
                label: c.name || `Account ${c.id}`,
                value: c.id
            }))
        , [customers]);

    useEffect(() => {
        fetchCustomers();
        fetchRechargedCustomers({ limit: 10000 });
    }, []);

    useEffect(() => {
        if (urlCustomerId && rechargeSelectOptions.length > 0) {
            // Try to find if it exists as a number or string
            const found = rechargeSelectOptions.find(opt => 
                String(opt.value) === String(urlCustomerId)
            );
            if (found) {
                setSelectedRechargeCustomer(found.value);
            }
        }
    }, [urlCustomerId, rechargeSelectOptions]);

    const fetchCalculation = () => {
        const amount = parseFloat(rechargeAmount) || 0;
        if (!customerToRecharge || amount <= 0) {
            setCalculation(null);
            return;
        }

        const tds_amount = (amount * tdsPercentage) / 100;
        const gst_amount = (amount * 18) / 100;
        const total_amount = amount + gst_amount - tds_amount;
        const new_balance = parseFloat(customerToRecharge.b_credit_balance || 0) + amount;

        setCalculation({
            data: {
                recharge: rechargeAmount,
                "TDS": tds_amount,
                "GST Amount": gst_amount,
                total: total_amount,
                new_balance: new_balance
            }
        });
    };

    useEffect(() => {
        if (rechargeAmount > 0 && customerToRecharge) {
            fetchCalculation();
        } else {
            setCalculation(null);
        }
    }, [rechargeAmount, tdsPercentage]);

    const handleRechargeClick = (customer) => {
        setCustomerToRecharge(customer);
        setRechargeAmount("");
        setPaymentDoneBy("");
        setRechargeModalOpen(true);
    };

    const handleTransactionsClick = (customer) => {
        if (transactionsDrawerOpen && customerForTxns?.b_billingAccountId === customer.b_billingAccountId) {
            setTransactionsDrawerOpen(false);
            return;
        }
        setCustomerForTxns(customer);
        fetchRechargeHistory({ limit: 10000 });
        setTransactionsDrawerOpen(true);
    };

    const toggleDetails = (index) => {
        if (expandedTxn === index) setExpandedTxn(null);
        else setExpandedTxn(index);
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    const drawerTransactions = useMemo(() => {
        if (!rechargeHistory || !customerForTxns) return [];
        return rechargeHistory.filter(txn => txn.b_creditAccountId === customerForTxns.b_billingAccountId);
    }, [rechargeHistory, customerForTxns]);

    const handleRechargeSubmit = async () => {
        if (!calculation || rechargeAmount <= 0 || !paymentDoneBy.trim()) return;

        const payload = {
            b_creditAccountId: customerToRecharge.b_billingAccountId,
            b_credit_balance: parseFloat(rechargeAmount) || 0,
            b_tds_percent: tdsPercentage,
            b_gst_percent: 18,
            b_creditDescription: "Recharge done",
            b_paymentDoneBy: paymentDoneBy.trim()
        };

        const success = await calculateRecharge(payload);

        if (success) {
            setRechargeModalOpen(false);
            setCalculation(null);
            setRechargeAmount("");
            setPaymentDoneBy("");
            fetchRechargedCustomers({ limit: 10000 });
        }
    };


    const filteredRechargedCustomers = useMemo(() => {
        if (!selectedRechargeCustomer) return rechargedCustomers;
        return rechargedCustomers.filter(c => c.b_billingAccountId === selectedRechargeCustomer);
    }, [rechargedCustomers, selectedRechargeCustomer]);

    return (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <div className="recharge_content_container" style={{ flex: 1, minWidth: 0, paddingRight: transactionsDrawerOpen ? '0' : undefined }}>
                <div className="recharge_header">
                <Select
                    options={rechargeSelectOptions}
                    placeholder="Search customer..."
                    value={selectedRechargeCustomer}
                    onChange={(val) => setSelectedRechargeCustomer(val)}
                    showSearch
                    allowClear
                    width="350px"
                />
            </div>

            <div className="recharged_customers_grid">
                {isRechargedCustomersLoading ? (
                    <div style={{ gridColumn: '1/-1', height: '200px' }}>
                        <Loader />
                    </div>
                ) : filteredRechargedCustomers.length > 0 ? (
                    filteredRechargedCustomers.map(customer => (
                        <div key={customer.b_billingAccountId} className="customer_recharge_card">
                            <div className="card_header">
                                <div className="card_icon">
                                    <Icon name="user" size={20} />
                                </div>
                                <div className="card_title_container">
                                    <span className="card_company_name">{customer.b_billingAccountName}</span>
                                    <span className="card_account_id">ID: {customer.b_billingAccountId}</span>
                                </div>
                            </div>
                            <div className="card_balance_section">
                                <div className="card_balance_left">
                                    <span className="balance_label">Available Balance</span>
                                    <span className="balance_value">
                                        ₹{parseFloat(customer.b_credit_balance || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="card_balance_right_icon">
                                    <Icon name="account_balance_wallet" size={28} color="#059669" />
                                </div>
                            </div>
                            <div className="card_details_grid">
                                <div className="detail_item">
                                    <span className="detail_label">Rate/Min</span>
                                    <span className="detail_value">₹{customer.b_rate_per_min}</span>
                                </div>
                                <div className="detail_item">
                                    <span className="detail_label">Pulse</span>
                                    <span className="detail_value">{customer.b_billing_pulse}s</span>
                                </div>
                                <div className="detail_item">
                                    <span className="detail_label">Type</span>
                                    <span className="detail_value" style={{ textTransform: 'capitalize' }}>
                                        {customer.b_billing_type}
                                    </span>
                                </div>
                                <div className="detail_item">
                                    <span className="detail_label">Status</span>
                                    <span className={`detail_value ${customer.b_billing_status === 'enable' ? 'text-green-600' : 'text-red-600'}`}>
                                        {customer.b_billing_status}
                                    </span>
                                </div>
                            </div>
                            <div className="card_actions" style={{ display: 'flex', gap: '10px' }}>
                                <Button
                                    variant="secondary"
                                    width="100%"
                                    onClick={() => handleTransactionsClick(customer)}
                                >
                                    <Icon name="receipt_long" size={16} />
                                    Transactions
                                </Button>
                                <Button
                                    type="primary"
                                    width="100%"
                                    onClick={() => handleRechargeClick(customer)}
                                >
                                    <Icon name="currency_rupee" size={16} />
                                    Recharge Now
                                </Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="billing_recharge_placeholder" style={{ gridColumn: '1/-1' }}>
                        <p>No recharged customers found. Configure billing first.</p>
                    </div>
                )}
            </div>

            {/* Recharge Modal */}
            <Modal
                open={rechargeModalOpen}
                onClose={() => setRechargeModalOpen(false)}
                width="520px"
            >
                {/* Premium Header with gradient */}
                <div className="recharge_modal_header">
                    <div className="recharge_modal_header_left">
                        <div className="recharge_modal_icon_wrap">
                            <Icon name="account_balance_wallet" size={22} />
                        </div>
                        <div>
                            <p className="recharge_modal_title">Recharge Account</p>
                            <span className="recharge_modal_subtitle">Add balance to customer wallet</span>
                        </div>
                    </div>
                    <Button variant="empty" onClick={() => setRechargeModalOpen(false)}>
                        <Icon name="close" color="#0F172A" size="14" />
                    </Button>
                </div>

                <div className="recharge_modal_body">
                    {/* Customer Info Card */}
                    <div className="recharge_customer_info">
                        <div className="recharge_customer_avatar">
                            <Icon name="user" size={18} />
                        </div>
                        <div className="recharge_customer_details">
                            <p className="recharge_customer_name">
                                {customerToRecharge?.b_billingAccountName}
                            </p>
                            <span className="recharge_customer_id">
                                Account ID: {customerToRecharge?.b_billingAccountId}
                            </span>
                        </div>
                        <div className="recharge_current_balance_chip">
                            <span className="recharge_balance_label">Balance</span>
                            <span className="recharge_balance_amount">
                                ₹{parseFloat(customerToRecharge?.b_credit_balance || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Input Fields */}
                    <div className="recharge_calc_section">
                        <div className="recharge_input_grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                            <div className="recharge_field">
                                <label className="recharge_field_label">
                                    <Icon name="currency_rupee" size={14} />
                                    Recharge Amount
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Enter amount"
                                    value={rechargeAmount}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "" || /^\d*$/.test(val)) {
                                            setRechargeAmount(val);
                                        }
                                    }}
                                    prefixIcon="currency_rupee"
                                />
                            </div>

                            <div className="recharge_field">
                                <label className="recharge_field_label">
                                    <Icon name="percent" size={14} />
                                    TDS Percentage
                                </label>
                                <Select
                                    value={tdsPercentage}
                                    onChange={(val) => setTdsPercentage(val)}
                                    options={[
                                        { label: "0%", value: 0 },
                                        { label: "1%", value: 1 },
                                        { label: "2%", value: 2 },
                                        { label: "3%", value: 3 },
                                        { label: "5%", value: 5 },
                                        { label: "10%", value: 10 },
                                    ]}
                                />
                            </div>

                            <div className="recharge_field">
                                <label className="recharge_field_label">
                                    <Icon name="person" size={14} />
                                    Payment Done By <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Required"
                                    value={paymentDoneBy}
                                    onChange={(e) => setPaymentDoneBy(e.target.value)}
                                    style={{ borderColor: paymentDoneBy.trim() ? "" : "#fb7185" }}
                                />
                            </div>
                        </div>

                        {/* Receive Box — same as Recharge Amount */}
                        <div className="recharge_receive_box">
                            <div className="recharge_receive_icon">
                                <Icon name="account_balance_wallet" size={24} />
                            </div>
                            <div className="recharge_receive_info">
                                <span className="recharge_receive_label">You will receive</span>
                                <span className="recharge_receive_amount">
                                    ₹{parseFloat(rechargeAmount || 0).toLocaleString()}
                                </span>
                                <span className="recharge_receive_sub">in account balance</span>
                            </div>
                        </div>

                        {/* Breakdown */}
                        {!calculation ? (
                            rechargeAmount > 0 ? (
                                <div className="recharge_calc_loading">
                                    <Loader />
                                    <span>Calculating breakdown...</span>
                                </div>
                            ) : (
                                <div className="recharge_calc_empty">
                                    <Icon name="calculate" size={28} color="#94a3b8" />
                                    <span>Enter an amount to see the breakdown</span>
                                </div>
                            )
                        ) : (
                            <>
                                {(() => {
                                    const calc = calculation.data;

                                    return (
                                        <div className="recharge_breakdown">
                                            <div className="recharge_breakdown_title">
                                                <Icon name="receipt_long" size={16} />
                                                <span>Payment Breakdown</span>
                                            </div>

                                            <div className="recharge_breakdown_row">
                                                <div className="recharge_breakdown_row_left">
                                                    <span className="recharge_row_dot dot_blue"></span>
                                                    <span>Recharge Amount</span>
                                                </div>
                                                <span className="recharge_row_value">₹{parseFloat(calc?.recharge || 0).toLocaleString()}</span>
                                            </div>

                                            <div className="recharge_breakdown_row row_deduction">
                                                <div className="recharge_breakdown_row_left">
                                                    <span className="recharge_row_dot dot_red"></span>
                                                    <span>TDS Deduction ({tdsPercentage}%)</span>
                                                </div>
                                                <span className="recharge_row_value deduction">-₹{parseFloat(calc?.["TDS"] || 0).toLocaleString()}</span>
                                            </div>

                                            <div className="recharge_breakdown_row">
                                                <div className="recharge_breakdown_row_left">
                                                    <span className="recharge_row_dot dot_amber"></span>
                                                    <span>GST (18%)</span>
                                                </div>
                                                <span className="recharge_row_value">+₹{parseFloat(calc?.["GST Amount"] || 0).toLocaleString()}</span>
                                            </div>

                                            <div className="recharge_breakdown_divider"></div>

                                            <div className="recharge_breakdown_row recharge_breakdown_row_row_total">
                                                <div className="recharge_breakdown_row_left">
                                                    <Icon name="payments" size={16} />
                                                    <span>Total Payable</span>
                                                </div>
                                                <span className="recharge_row_value total_value">₹{parseFloat(calc?.total || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </>
                        )}

                        {/* Footer Actions */}
                        <div className="recharge_modal_footer">
                            <Button
                                variant="secondary"
                                onClick={() => setRechargeModalOpen(false)}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="primary"
                                onClick={handleRechargeSubmit}
                                loading={isUpdating}
                                disabled={!calculation || rechargeAmount <= 0 || !paymentDoneBy.trim()}
                            >
                                <Icon name="bolt" size={16} style={{ marginRight: '6px' }} />
                                Recharge Now
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
            </div>

            {/* Inline Transactions Panel */}
            {transactionsDrawerOpen && (
                <div style={{
                    width: "420px",
                    flexShrink: 0,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    height: "calc(100vh - 120px)",
                    overflowY: "auto",
                    position: "sticky",
                    top: "0px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                }}>
                    <div style={{ padding: "20px 24px", background: "#fff", borderBottom: "1px solid #e2e8f0", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
                    <h3 style={{ margin: 0, fontSize: "17px", color: "#1e293b", fontWeight: 700 }}>
                        {customerForTxns?.b_billingAccountName} Txns
                    </h3>
                    <Button variant="empty" onClick={() => setTransactionsDrawerOpen(false)}>
                        <Icon name="close" size={18} color="#64748b" />
                    </Button>
                </div>
                
                <div style={{ padding: "20px" }}>
                    {isRechargeHistoryLoading ? (
                        <div style={{ height: "200px", display: "flex", justifyContent: "center", alignItems: "center" }}><Loader /></div>
                    ) : drawerTransactions.length === 0 ? (
                        <div className="billing_history_placeholder" style={{ borderRadius: "12px", height: "200px", background: "#fff" }}>
                            <div style={{ textAlign: "center" }}>
                                <Icon name="receipt_long" size={40} color="#cbd5e1" style={{ marginBottom: "10px" }} />
                                <p style={{ margin: 0 }}>No history for this account.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="history_feed_container" style={{ paddingTop: 0 }}>
                            {drawerTransactions.map((txn, index) => {
                                const isExpanded = expandedTxn === index;
                                return (
                                    <div key={index} className="txn_card">
                                        <div className="txn_header_row" onClick={() => toggleDetails(index)}>
                                            <div className="txn_left">
                                                <div className="txn_icon">
                                                    <Icon name="account_balance_wallet" size={20} />
                                                </div>
                                                <div className="txn_title_block">
                                                    <h4 style={{ fontSize: "15px" }}>₹{parseFloat(txn.b_credit_balance || 0).toLocaleString()}</h4>
                                                    <span>{formatDate(txn.b_creditCreatedOn)}</span>
                                                </div>
                                            </div>
                                            <div className="txn_right">
                                                <h4 style={{ fontSize: "15px" }}>+₹{parseFloat(txn.b_total_amount || 0).toLocaleString()}</h4>
                                                <span>Success</span>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="txn_details_dropdown">
                                                <div className="txn_detail_grid" style={{ gridTemplateColumns: '1fr' }}>
                                                    <div className="txn_detail_col">
                                                        <div className="txn_detail_row">
                                                            <span className="label">Recharge Amount</span>
                                                            <span className="value">₹{parseFloat(txn.b_credit_balance || 0).toLocaleString()}</span>
                                                        </div>
                                                        <div className="txn_detail_row">
                                                            <span className="label">TDS ({parseFloat(txn.b_tds_percent || 0)}%)</span>
                                                            <span className="value deduct">-₹{parseFloat(txn.b_tds_amount || 0).toLocaleString()}</span>
                                                        </div>
                                                        <div className="txn_detail_row">
                                                            <span className="label">GST ({parseFloat(txn.b_gst_percent || 0)}%)</span>
                                                            <span className="value">+₹{parseFloat(txn.b_gst_amount || 0).toLocaleString()}</span>
                                                        </div>
                                                        <div className="txn_divider" style={{ margin: "8px 0" }}></div>
                                                        <div className="txn_detail_row">
                                                            <span className="label" style={{ fontWeight: 600 }}>Total Payable</span>
                                                            <span className="value" style={{ fontWeight: 700 }}>₹{parseFloat(txn.b_total_amount || 0).toLocaleString()}</span>
                                                        </div>
                                                        <div className="txn_detail_row" style={{ marginTop: '8px' }}>
                                                            <span className="label">Payment By</span>
                                                            <span className="value">{txn.b_paymentDoneBy || "Super Admin"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                </div>
            )}
        </div>
    );
};

export default Recharge;
