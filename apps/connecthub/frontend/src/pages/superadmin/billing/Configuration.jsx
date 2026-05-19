import React, { useState, useEffect, useMemo } from "react";
import { useBillingStore } from "../../../store/superadmin/useBillingStore";
import { Loader } from "../../../components/Index.jsx";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { User, Search, CheckCircle2, XCircle, Building2, IndianRupee } from "lucide-react";

const Configuration = () => {
    const {
        customers,
        isCustomersLoading,
        fetchCustomers,
        isUpdating,
        createBillingConfig,
        updateBillingConfig
    } = useBillingStore();

    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [configFilter, setConfigFilter] = useState("All");
    const [isCustomPulse, setIsCustomPulse] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
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
        // Since fetchCreditConf was removed, we use defaults or data from the customer object if available.
        // For now, we reset the form and set canEdit based on config status.
        if (selectedCustomer) {
            setFormData({
                b_billing_status: "enable",
                b_billing_type: "prepaid",
                b_billing_pulse: 30,
                b_rate_per_min: 1,
                b_billingDescription: ""
            });
            setCanEdit(selectedCustomer.config !== "Configured");
        }
    }, [selectedCustomer]);

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const matchesSearch = (c.name || "").toLowerCase().includes((searchQuery || "").toLowerCase());
            if (configFilter === "Active") return matchesSearch && c.config === "Configured";
            if (configFilter === "Inactive") return matchesSearch && c.config === "NonConfig";
            return matchesSearch;
        });
    }, [customers, searchQuery, configFilter]);

    const handleCustomerSelect = (customer) => {
        setSelectedCustomer(customer);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        if (name === "b_billing_pulse") {
            if (value === "custom") {
                setIsCustomPulse(true);
            } else {
                setIsCustomPulse(false);
                setFormData(prev => ({ ...prev, [name]: parseInt(value) }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCustomPulseChange = (e) => {
        const val = parseInt(e.target.value) || 0;
        setFormData(prev => ({ ...prev, b_billing_pulse: val }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer) return;

        let success;
        if (selectedCustomer.config === "Configured") {
            const updatePayload = {
                b_rate_per_min: parseFloat(formData.b_rate_per_min) || 0,
                b_billing_pulse: parseInt(formData.b_billing_pulse) || 30,
                b_billing_type: formData.b_billing_type,
                b_billing_status: formData.b_billing_status,
                b_billingDescription: formData.b_billingDescription || "Updated config"
            };
            success = await updateBillingConfig(selectedCustomer.id, updatePayload);
        } else {
            const createPayload = {
                b_billingAccountId: selectedCustomer.id,
                b_credit_balance: 0,
                b_billing_status: formData.b_billing_status,
                b_rate_per_min: parseFloat(formData.b_rate_per_min) || 0,
                b_billing_pulse: parseInt(formData.b_billing_pulse) || 30,
                b_billing_type: formData.b_billing_type,
                b_billingDescription: formData.b_billingDescription || "Recharge done"
            };
            success = await createBillingConfig(createPayload);
        }

        if (success) {
            fetchCustomers(); // Update the icon status
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-5 h-[calc(100vh-167px)] min-h-[500px]">
            {/* Customer List */}
            <div className="bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search customer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                
                <div className="flex gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    {["All", "Active", "Inactive"].map(tab => (
                        <div
                            key={tab}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-colors select-none ${
                                configFilter === tab 
                                ? 'bg-primary text-white shadow-sm' 
                                : 'bg-slate-200/50 text-slate-600 hover:bg-slate-200'
                            }`}
                            onClick={() => setConfigFilter(tab)}
                        >
                            {tab}
                        </div>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isCustomersLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 border-b border-slate-50">
                                <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse shrink-0" />
                                <div className="h-4 bg-slate-200 rounded animate-pulse flex-1" />
                                <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse shrink-0" />
                            </div>
                        ))
                    ) : filteredCustomers.length > 0 ? (
                        filteredCustomers.map(customer => (
                            <div
                                key={customer.id}
                                className={`flex items-center gap-3 p-3 cursor-pointer transition-all border-b border-slate-50 ${
                                    selectedCustomer?.id === customer.id 
                                    ? 'bg-primary/5 border-l-4 border-l-primary' 
                                    : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                                }`}
                                onClick={() => handleCustomerSelect(customer)}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                    selectedCustomer?.id === customer.id ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    <User className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 truncate flex-1">{customer.name}</span>
                                <div className="shrink-0" title={customer.config === "Configured" ? "Configured" : "Not Configured"}>
                                    {customer.config === "Configured" ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-400" />
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-sm text-slate-500">
                            No customers found
                        </div>
                    )}
                </div>
            </div>

            {/* Form Configuration */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
                {!selectedCustomer ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 p-8">
                        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                            <Building2 className="w-10 h-10 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium">Select a customer to view and edit billing configuration</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800">
                                {selectedCustomer.config === "Configured" ? "Edit Configuration" : "Configuration"} for {selectedCustomer.name}
                            </h3>
                            {selectedCustomer.config === "Configured" && !canEdit && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setCanEdit(true)}
                                    className="bg-white"
                                >
                                    Edit Configuration
                                </Button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <form id="configForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-slate-700">Billing Status</label>
                                    <Select
                                        value={formData.b_billing_status}
                                        onValueChange={(val) => handleSelectChange('b_billing_status', val)}
                                        disabled={!canEdit}
                                        options={[
                                            { label: 'Enable', value: 'enable' },
                                            { label: 'Disable', value: 'disable' }
                                        ]}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-slate-700">Billing Type</label>
                                    <Select
                                        value={formData.b_billing_type}
                                        onValueChange={(val) => handleSelectChange('b_billing_type', val)}
                                        disabled={!canEdit}
                                        options={[
                                            { label: 'Prepaid', value: 'prepaid' },
                                            { label: 'Postpaid', value: 'postpaid' }
                                        ]}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-slate-700">Billing Pulse (Seconds)</label>
                                    <Select
                                        value={isCustomPulse ? 'custom' : String(formData.b_billing_pulse)}
                                        onValueChange={(val) => handleSelectChange('b_billing_pulse', val)}
                                        disabled={!canEdit}
                                        options={[
                                            { label: '30 Seconds', value: '30' },
                                            { label: '60 Seconds', value: '60' },
                                            { label: '120 Seconds', value: '120' },
                                            { label: 'Custom', value: 'custom' }
                                        ]}
                                    />
                                </div>

                                {isCustomPulse && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-semibold text-slate-700">Custom Pulse (Seconds)</label>
                                        <Input
                                            type="number"
                                            name="custom_pulse"
                                            value={formData.b_billing_pulse}
                                            placeholder="Enter custom pulse"
                                            onChange={handleCustomPulseChange}
                                            disabled={!canEdit}
                                        />
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-slate-700">Rate Per Minute</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none text-slate-500">
                                            <IndianRupee className="w-4 h-4" />
                                        </div>
                                        <Input
                                            type="number"
                                            name="b_rate_per_min"
                                            value={formData.b_rate_per_min}
                                            onChange={handleInputChange}
                                            placeholder="Enter rate per minute"
                                            step="0.01"
                                            className="pl-9"
                                            disabled={!canEdit}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 md:col-span-2">
                                    <label className="text-sm font-semibold text-slate-700">Description</label>
                                    <Input
                                        name="b_billingDescription"
                                        value={formData.b_billingDescription}
                                        onChange={handleInputChange}
                                        placeholder="Enter description"
                                        disabled={!canEdit}
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                            {canEdit && (
                                <Button
                                    type="submit"
                                    form="configForm"
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? "Saving..." : "Save Configuration"}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Configuration;
