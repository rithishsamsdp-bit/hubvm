import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useBillingStore } from "../../../store/superadmin/useBillingStore";
import { Loader } from "../../../components/Index.jsx";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  User,
  Search,
  Wallet,
  Receipt,
  IndianRupee,
  Percent,
  UserCircle,
  Calculator,
  Zap,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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
    isRechargeHistoryLoading,
  } = useBillingStore();

  const [selectedRechargeCustomer, setSelectedRechargeCustomer] = useState("");
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [customerToRecharge, setCustomerToRecharge] = useState(null);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [tdsPercentage, setTdsPercentage] = useState("0");
  const [paymentDoneBy, setPaymentDoneBy] = useState("");
  const [calculation, setCalculation] = useState(null);

  const [transactionsDrawerOpen, setTransactionsDrawerOpen] = useState(false);
  const [customerForTxns, setCustomerForTxns] = useState(null);
  const [expandedTxn, setExpandedTxn] = useState(null);

  const rechargeSelectOptions = useMemo(() => {
    const options = customers
      .filter((c) => c.config === "Configured")
      .map((c) => ({
        label: c.name || `Account ${c.id}`,
        value: String(c.id),
      }));
    // Prepend an 'All' option
    return [{ label: "All Customers", value: "all" }, ...options];
  }, [customers]);

  useEffect(() => {
    fetchCustomers();
    fetchRechargedCustomers({ limit: 10000 });
  }, []);

  useEffect(() => {
    if (urlCustomerId && rechargeSelectOptions.length > 1) {
      // > 1 because of 'All'
      const found = rechargeSelectOptions.find(
        (opt) => opt.value === String(urlCustomerId),
      );
      if (found) {
        setSelectedRechargeCustomer(found.value);
      }
    }
  }, [urlCustomerId, rechargeSelectOptions]);

  const fetchCalculation = () => {
    const amount = parseFloat(rechargeAmount) || 0;
    const tdsNum = parseFloat(tdsPercentage) || 0;
    if (!customerToRecharge || amount <= 0) {
      setCalculation(null);
      return;
    }

    const tds_amount = (amount * tdsNum) / 100;
    const gst_amount = (amount * 18) / 100;
    const total_amount = amount + gst_amount - tds_amount;
    const new_balance =
      parseFloat(customerToRecharge.b_credit_balance || 0) + amount;

    setCalculation({
      data: {
        recharge: amount,
        TDS: tds_amount,
        "GST Amount": gst_amount,
        total: total_amount,
        new_balance: new_balance,
      },
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
    if (
      transactionsDrawerOpen &&
      customerForTxns?.b_billingAccountId === customer.b_billingAccountId
    ) {
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
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const drawerTransactions = useMemo(() => {
    if (!rechargeHistory || !customerForTxns) return [];
    return rechargeHistory.filter(
      (txn) => txn.b_creditAccountId === customerForTxns.b_billingAccountId,
    );
  }, [rechargeHistory, customerForTxns]);

  const handleRechargeSubmit = async () => {
    if (!calculation || rechargeAmount <= 0 || !paymentDoneBy.trim()) return;

    const tdsNum = parseFloat(tdsPercentage) || 0;

    const payload = {
      b_creditAccountId: customerToRecharge.b_billingAccountId,
      b_credit_balance: parseFloat(rechargeAmount) || 0,
      b_tds_percent: tdsNum,
      b_gst_percent: 18,
      b_creditDescription: "Recharge done",
      b_paymentDoneBy: paymentDoneBy.trim(),
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
    if (!selectedRechargeCustomer || selectedRechargeCustomer === "all")
      return rechargedCustomers;
    return rechargedCustomers.filter(
      (c) => String(c.b_billingAccountId) === selectedRechargeCustomer,
    );
  }, [rechargedCustomers, selectedRechargeCustomer]);

  return (
    <div className="flex gap-5 items-stretch h-full overflow-hidden flex-1">
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden gap-6">
        <div className="w-full max-w-[350px]">
          <Select
            options={rechargeSelectOptions}
            placeholder="Search customer..."
            value={selectedRechargeCustomer}
            onValueChange={(val) => setSelectedRechargeCustomer(val)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isRechargedCustomersLoading ? (
            <div className="flex justify-center items-center h-[200px]">
              <Loader />
            </div>
          ) : filteredRechargedCustomers.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5 pb-6">
              {filteredRechargedCustomers.map((customer) => (
                <div
                  key={customer.b_billingAccountId}
                  className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md"
                >
                  <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-slate-800 truncate">
                        {customer.b_billingAccountName}
                      </span>
                      <span className="text-xs text-slate-500 truncate">
                        ID: {customer.b_billingAccountId}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-emerald-50/50 flex justify-between items-center border-b border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
                        Available Balance
                      </span>
                      <span className="text-xl font-bold text-emerald-700">
                        ₹
                        {parseFloat(
                          customer.b_credit_balance || 0,
                        ).toLocaleString()}
                      </span>
                    </div>
                    <Wallet className="w-8 h-8 text-emerald-500 opacity-50" />
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-y-3 gap-x-2 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Rate/Min
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        ₹{customer.b_rate_per_min}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Pulse
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {customer.b_billing_pulse}s
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Type
                      </span>
                      <span className="text-sm font-medium text-slate-700 capitalize">
                        {customer.b_billing_type}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Status
                      </span>
                      <span
                        className={`text-sm font-medium ${customer.b_billing_status === "enable" ? "text-emerald-600" : "text-red-600"} capitalize`}
                      >
                        {customer.b_billing_status}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-10 text-xs sm:text-sm font-semibold rounded-lg"
                      onClick={() => handleTransactionsClick(customer)}
                    >
                      <Receipt className="w-4 h-4 mr-1.5" />
                      History
                    </Button>
                    <Button
                      className="flex-1 h-10 text-xs sm:text-sm font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => handleRechargeClick(customer)}
                    >
                      <IndianRupee className="w-4 h-4 mr-1" />
                      Recharge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 gap-3">
              <Wallet className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">
                No recharged customers found. Configure billing first.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recharge Dialog */}
      <Dialog
        open={rechargeModalOpen}
        onOpenChange={(open) => !isUpdating && setRechargeModalOpen(open)}
      >
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden gap-0">
          <DialogHeader>
            <DialogTitle>Recharge Account</DialogTitle>
            <DialogDescription>
              Add balance to customer wallet
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 bg-slate-50/50 max-h-[70vh] overflow-y-auto">
            {/* Customer Info Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-sm mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-bold text-slate-800">
                    {customerToRecharge?.b_billingAccountName}
                  </p>
                  <span className="text-xs text-slate-500 font-medium">
                    Account ID: {customerToRecharge?.b_billingAccountId}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Balance
                </span>
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  ₹
                  {parseFloat(
                    customerToRecharge?.b_credit_balance || 0,
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                  Amount
                </label>
                <Input
                  type="text"
                  placeholder="0"
                  value={rechargeAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d*$/.test(val)) {
                      setRechargeAmount(val);
                    }
                  }}
                  className="font-medium"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <Percent className="w-3.5 h-3.5 text-slate-400" />
                  TDS
                </label>
                <Select
                  value={tdsPercentage}
                  onValueChange={(val) => setTdsPercentage(val)}
                  options={[
                    { label: "0%", value: "0" },
                    { label: "1%", value: "1" },
                    { label: "2%", value: "2" },
                  ]}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <UserCircle className="w-3.5 h-3.5 text-slate-400" />
                  Done By <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Required"
                  value={paymentDoneBy}
                  onChange={(e) => setPaymentDoneBy(e.target.value)}
                  className={`font-medium ${!paymentDoneBy.trim() ? "border-red-200 bg-red-50/30" : ""}`}
                />
              </div>
            </div>

            {/* Receive Box */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg p-5 flex items-center gap-4 mb-6 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-100 rounded-full opacity-50"></div>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm z-10 shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="flex flex-col z-10">
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                  You will receive
                </span>
                <span className="text-2xl font-bold text-slate-800">
                  ₹{parseFloat(rechargeAmount || 0).toLocaleString()}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  in account balance
                </span>
              </div>
            </div>

            {/* Breakdown */}
            {!calculation ? (
              parseFloat(rechargeAmount) > 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-slate-500">
                  <Loader />
                  <span className="text-sm font-medium">
                    Calculating breakdown...
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  <Calculator className="w-8 h-8 opacity-50" />
                  <span className="text-sm font-medium">
                    Enter an amount to see the breakdown
                  </span>
                </div>
              )
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-bold text-slate-700">
                    Payment Breakdown
                  </span>
                </div>

                <div className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span className="font-medium">Recharge Amount</span>
                    </div>
                    <span className="font-bold text-slate-800">
                      ₹
                      {parseFloat(
                        calculation.data?.recharge || 0,
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      <span className="font-medium">
                        TDS Deduction ({tdsPercentage}%)
                      </span>
                    </div>
                    <span className="font-bold text-red-600">
                      -₹
                      {parseFloat(
                        calculation.data?.["TDS"] || 0,
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                      <span className="font-medium">GST (18%)</span>
                    </div>
                    <span className="font-bold text-slate-800">
                      +₹
                      {parseFloat(
                        calculation.data?.["GST Amount"] || 0,
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="h-px bg-slate-100 my-1"></div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-800">
                      <Zap className="w-4 h-4 text-indigo-500" />
                      <span className="font-bold">Total Payable</span>
                    </div>
                    <span className="text-lg font-black text-indigo-600">
                      ₹
                      {parseFloat(
                        calculation.data?.total || 0,
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-5 bg-white border-t border-slate-100 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setRechargeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRechargeSubmit}
              disabled={
                !calculation ||
                parseFloat(rechargeAmount) <= 0 ||
                !paymentDoneBy.trim() ||
                isUpdating
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isUpdating ? (
                "Processing..."
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Recharge Now
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline Transactions Panel */}
      {transactionsDrawerOpen && (
        <div className="w-full max-w-[420px] shrink-0 bg-slate-50 border border-slate-200 rounded-xl h-full overflow-hidden flex flex-col shadow-sm animate-in slide-in-from-right-4 duration-300">
          <div className="p-5 bg-white border-b border-slate-200 flex justify-between items-center z-10 shrink-0">
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-800">
                {customerForTxns?.b_billingAccountName}
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Transaction History
              </span>
            </div>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              onClick={() => setTransactionsDrawerOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {isRechargeHistoryLoading ? (
              <div className="flex justify-center items-center h-[200px]">
                <Loader />
              </div>
            ) : drawerTransactions.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center gap-3">
                <Receipt className="w-10 h-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">
                  No history for this account.
                </p>
              </div>
            ) : (
              drawerTransactions.map((txn, index) => {
                const isExpanded = expandedTxn === index;
                return (
                  <div
                    key={index}
                    className="shrink-0 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md"
                  >
                    <div
                      className="p-4 cursor-pointer flex justify-between items-center hover:bg-slate-50 transition-colors select-none gap-2"
                      onClick={() => toggleDetails(index)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h4 className="text-sm font-bold text-slate-800 truncate">
                            ₹
                            {parseFloat(
                              txn.b_credit_balance || 0,
                            ).toLocaleString()}
                          </h4>
                          <span className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                            {formatDate(txn.b_creditCreatedOn)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <div className="flex flex-col items-end">
                          <h4 className="text-sm font-bold text-emerald-600 whitespace-nowrap">
                            +₹
                            {parseFloat(
                              txn.b_total_amount || 0,
                            ).toLocaleString()}
                          </h4>
                          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded mt-1">
                            Success
                          </span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-slate-50/80 border-t border-slate-100 p-4 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="flex flex-col gap-2.5 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-600">
                              Recharge Amount
                            </span>
                            <span className="font-bold text-slate-800">
                              ₹
                              {parseFloat(
                                txn.b_credit_balance || 0,
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-600">
                              TDS ({parseFloat(txn.b_tds_percent || 0)}%)
                            </span>
                            <span className="font-bold text-red-600">
                              -₹
                              {parseFloat(
                                txn.b_tds_amount || 0,
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-600">
                              GST ({parseFloat(txn.b_gst_percent || 0)}%)
                            </span>
                            <span className="font-bold text-slate-800">
                              +₹
                              {parseFloat(
                                txn.b_gst_amount || 0,
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="h-px bg-slate-200 my-1"></div>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">
                              Total Payable
                            </span>
                            <span className="text-base font-black text-indigo-600">
                              ₹
                              {parseFloat(
                                txn.b_total_amount || 0,
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-2 bg-white border border-slate-200 p-2.5 rounded-md">
                            <span className="font-medium text-slate-500 text-xs uppercase tracking-wider">
                              Payment By
                            </span>
                            <span className="font-bold text-slate-700 text-sm">
                              {txn.b_paymentDoneBy || "Super Admin"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Recharge;
