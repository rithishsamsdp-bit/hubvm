import React, { useState, useEffect, useMemo } from "react";
import { useBillingStore } from "../../../store/superadmin/useBillingStore";
import Icon from "../../../constants/Icon.jsx";
import { Input, Select, Loader, Button } from "../../../components/Index.jsx";

const Configuration = () => {
    const {
        customers,
        isCustomersLoading,
        fetchCustomers,
        creditConf,
        isCreditConfLoading,
        fetchCreditConf,
        isUpdating,
        updateCreditConf
    } = useBillingStore();

    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [configFilter, setConfigFilter] = useState("All");
    const [formData, setFormData] = useState({
        b_billing_status: "enable",
        b_billing_type: "prepaid",
        b_billing_pulse: 30,
        b_rate_per_min: 1,
        b_billingDescription: ""
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (creditConf) {
            setFormData({
                b_billing_status: creditConf.b_billing_status || "enable",
                b_billing_type: creditConf.b_billing_type || "prepaid",
                b_billing_pulse: creditConf.b_billing_pulse || 30,
                b_rate_per_min: creditConf.b_rate_per_min || 1,
                b_billingDescription: creditConf.b_billingDescription || ""
            });
        }
    }, [creditConf]);

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const matchesSearch = (c.name || "").toLowerCase().includes((searchQuery || "").toLowerCase());
            if (configFilter === "Active") return matchesSearch && c.config === "Configured";
            if (configFilter === "Inactive") return matchesSearch && c.config !== "Configured";
            return matchesSearch;
        });
    }, [customers, searchQuery, configFilter]);

    const handleCustomerSelect = (customer) => {
        setSelectedCustomer(customer);
        fetchCreditConf(customer.id);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer) return;

        const payload = {
            ...formData,
            b_billingAccountId: selectedCustomer.id,
            b_credit_balance: creditConf?.b_credit_balance || 0
        };

        const success = await updateCreditConf(payload);
        if (success) {
            fetchCreditConf(selectedCustomer.id);
            fetchCustomers(); // Update the icon status
        }
    };

    return (
        <div className="billing_config_container">
            <div className="billing_customer_list">
                <div className="billing_customer_search">
                    <Input
                        placeholder="Search customer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        suffixIcon="search"
                    />
                </div>
                <div className="billing_customer_filter_tabs">
                    {["All", "Active", "Inactive"].map(tab => (
                        <div
                            key={tab}
                            className={`billing_filter_tab ${configFilter === tab ? 'active' : ''}`}
                            onClick={() => setConfigFilter(tab)}
                        >
                            {tab}
                        </div>
                    ))}
                </div>
                <div className="customer_list_items">
                    {isCustomersLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="customer_item skeleton_item">
                                <div className="skeleton skeleton_circle" />
                                <div className="skeleton skeleton_text" />
                                <div className="skeleton skeleton_status" />
                            </div>
                        ))
                    ) : filteredCustomers.length > 0 ? (
                        filteredCustomers.map(customer => (
                            <div
                                key={customer.id}
                                className={`customer_item ${selectedCustomer?.id === customer.id ? 'active' : ''}`}
                                onClick={() => handleCustomerSelect(customer)}
                            >
                                <div className="customer_item_icon">
                                    <Icon name="user" size={16} />
                                </div>
                                <span className="customer_item_name">{customer.name}</span>
                                <div className="customer_config_status" title={customer.config === "Configured" ? "Configured" : "Not Configured"}>
                                    <Icon
                                        name={customer.config === "Configured" ? "verified" : "not_verified"}
                                        size={18}
                                        color={customer.config === "Configured" ? "#22c55e" : "#ef4444"}
                                    />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                            No customers found
                        </div>
                    )}
                </div>
            </div>

            <div className="billing_config_form_container">
                {!selectedCustomer ? (
                    <div className="billing_config_empty">
                        <Icon name="account_balance" size={48} color="#cbd5e1" />
                        <p>Select a customer to view and edit billing configuration</p>
                    </div>
                ) : isCreditConfLoading ? (
                    <Loader />
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="billing_form_header">
                            <p className="billing_form_title">Configuration for {selectedCustomer.name}</p>
                        </div>

                        <div className="billing_form_grid">
                            <div className="billing_form_group">
                                <label className="billing_form_label">Billing Status</label>
                                <Select
                                    value={formData.b_billing_status}
                                    onChange={(val) => handleSelectChange('b_billing_status', val)}
                                    options={[
                                        { label: 'Enable', value: 'enable' },
                                        { label: 'Disable', value: 'disable' }
                                    ]}
                                />
                            </div>

                            <div className="billing_form_group">
                                <label className="billing_form_label">Billing Type</label>
                                <Select
                                    value={formData.b_billing_type}
                                    onChange={(val) => handleSelectChange('b_billing_type', val)}
                                    options={[
                                        { label: 'Prepaid', value: 'prepaid' },
                                        { label: 'Postpaid', value: 'postpaid' }
                                    ]}
                                />
                            </div>

                            <div className="billing_form_group">
                                <label className="billing_form_label">Billing Pulse (Seconds)</label>
                                <Select
                                    value={formData.b_billing_pulse}
                                    onChange={(val) => handleSelectChange('b_billing_pulse', val)}
                                    options={[
                                        { label: '30 Seconds', value: 30 },
                                        { label: '60 Seconds', value: 60 },
                                        { label: '120 Seconds', value: 120 },
                                        { label: 'Custom', value: 'custom' }
                                    ]}
                                />
                            </div>

                            {formData.b_billing_pulse === 'custom' && (
                                <div className="billing_form_group">
                                    <label className="billing_form_label">Custom Pulse (Seconds)</label>
                                    <Input
                                        type="number"
                                        name="custom_pulse"
                                        placeholder="Enter custom pulse"
                                        onChange={(e) => handleSelectChange('b_billing_pulse', parseInt(e.target.value))}
                                    />
                                </div>
                            )}

                            <div className="billing_form_group">
                                <label className="billing_form_label">Rate Per Minute</label>
                                <Input
                                    type="number"
                                    name="b_rate_per_min"
                                    value={formData.b_rate_per_min}
                                    onChange={handleInputChange}
                                    placeholder="Enter rate per minute"
                                    step="0.01"
                                    prefixIcon="currency_rupee"
                                />
                            </div>

                            <div className="billing_form_group" style={{ gridColumn: 'span 2' }}>
                                <label className="billing_form_label">Description</label>
                                <Input
                                    name="b_billingDescription"
                                    value={formData.b_billingDescription}
                                    onChange={handleInputChange}
                                    placeholder="Enter description"
                                />
                            </div>
                        </div>

                        <div className="billing_form_footer">
                            <Button
                                type="submit"
                                variant="primary"
                            >
                                Save Configuration
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Configuration;
