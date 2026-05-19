import React, { useState, useEffect, useMemo } from "react";
import "./styles/AdminEmergency.css";
import {
  Modal,
  Input,
  Popupconfirm,
  Icon,
  Navbar,
} from "../../../components/Index.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { useEmergencyStore } from "../../../store/admin/useEmergencyStore";
import { toast } from "../../../store/useToastStore";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Separate modular components
import AdminEmergencyDashboard from "./AdminEmergencyDashboard";
import AdminEmergencyAlerts from "./AdminEmergencyAlerts";
import AdminEmergencyGroups from "./AdminEmergencyGroups";
import AdminEmergencyReports from "./AdminEmergencyReports";

import WhatsAppPreview from "./components/WhatsAppPreview.jsx";

const tabs = ["Dashboard", "Alerts", "Groups", "Reports"];

const AdminEmergency = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    groups,
    fetchGroups,
    alerts,
    fetchAlerts,
    isLoadingAlerts,
    createGroup,
    fetchGroupContacts,
    updateGroup,
    deleteGroup,
    launchCampaign,
    stopCampaign,
    fetchCampaignReport,
    fetchAllReports,
    allLogs,
    allLogsCount,
    isAllReportsLoading,
    dashboardStats,
    fetchDashboardData,
  } = useEmergencyStore();

  const [activeTab, setActiveTab] = useState(() => {
    // Recover from localStorage on refresh, fallback to location state then Dashboard
    return (
      localStorage.getItem("emergency_active_tab") ||
      location.state?.activeTab ||
      "Dashboard"
    );
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize] = useState(10);
  const [detailModalData, setDetailModalData] = useState({
    open: false,
    title: "",
    content: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [contacts, setContacts] = useState([]); // Array of { name, phone }
  const [currentPage, setCurrentPage] = useState(1);
  const [manualContact, setManualContact] = useState({ name: "", phone: "" });

  // Preview Flow State
  const [isPreviewFlowModalOpen, setIsPreviewFlowModalOpen] = useState(false);
  const [selectedFlowData, setSelectedFlowData] = useState(null);
  const [isFetchingFlow, setIsFetchingFlow] = useState(false);

  // Reports Tab State
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsPageSize, setReportsPageSize] = useState(10);
  const [reportsOffset, setReportsOffset] = useState(0);
  const [reportsCampaignFilter, setReportsCampaignFilter] = useState("");
  const [reportsChannelFilter, setReportsChannelFilter] = useState("");
  const [reportsDispositionFilter, setReportsDispositionFilter] = useState("");
  const [reportsResponseFilter, setReportsResponseFilter] = useState("");
  const [reportsDateRange, setReportsDateRange] = useState(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return [start, end];
  });

  // Confirmation Popup State
  const [confirmPopup, setConfirmPopup] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Confirm",
    type: "primary", // primary, danger
  });

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      localStorage.setItem("emergency_active_tab", location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    localStorage.setItem("emergency_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    setReportsPage(1);
  }, [
    reportsCampaignFilter,
    reportsChannelFilter,
    reportsDispositionFilter,
    reportsResponseFilter,
    reportsDateRange,
  ]);

  useEffect(() => {
    if (activeTab === "Dashboard") {
      // Changed from 'DASHBOARD'
      fetchDashboardData();
    }
  }, [activeTab]);

  useEffect(() => {
    setReportsOffset((reportsPage - 1) * reportsPageSize);
  }, [reportsPage, reportsPageSize]);

  useEffect(() => {
    if (activeTab === "Alerts" || activeTab === "Reports") fetchAlerts(); // Changed from 'ALERTS', 'REPORTS'
    if (activeTab === "Groups") fetchGroups(); // Changed from 'GROUPS'
    if (activeTab === "Reports") {
      // Changed from 'REPORTS'
      fetchAllReports(
        reportsPageSize,
        reportsOffset,
        reportsCampaignFilter,
        reportsChannelFilter,
        reportsDispositionFilter,
        reportsDateRange[0],
        reportsDateRange[1],
        reportsResponseFilter,
      );
    }
  }, [
    activeTab,
    reportsPage,
    reportsPageSize,
    reportsOffset,
    reportsCampaignFilter,
    reportsChannelFilter,
    reportsDispositionFilter,
    reportsDateRange,
    reportsResponseFilter,
  ]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (contacts.length === 0) {
      toast.error("Please add at least one contact");
      return;
    }
    const success = await createGroup({
      name: newGroupName,
      contacts: contacts,
      contactCount: contacts.length,
    });
    if (success) {
      handleCloseModal();
      fetchGroups();
    }
  };
  const handleUpdateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (contacts.length === 0) {
      toast.error("Please add at least one contact");
      return;
    }
    const success = await updateGroup(editingGroupId, {
      name: newGroupName,
      contacts: contacts,
    });
    if (success) {
      handleCloseModal();
      fetchGroups();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setEditingGroupId(null);
    setNewGroupName("");
    setContacts([]);
    setManualContact({ name: "", phone: "" });
    setCurrentPage(1);
  };

  const handleDeleteGroup = (group) => {
    setConfirmPopup({
      isOpen: true,
      title: "Delete Group",
      message: `Are you sure you want to delete the group "${group.name}" ? This action cannot be undone.`,
      confirmText: "Delete",
      onConfirm: async () => {
        const success = await deleteGroup(group.id);
        if (success) {
          fetchGroups();
        }
        setConfirmPopup((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleViewContacts = async (group) => {
    setIsEditing(true);
    setEditingGroupId(group.id);
    setNewGroupName(group.name);
    const fetchedContacts = await fetchGroupContacts(group.id);
    setContacts(
      fetchedContacts.map((c) => ({ ...c, id: Math.random().toString() })),
    );
    setIsModalOpen(true);
  };

  const handleLaunchCampaign = (campaignId) => {
    setConfirmPopup({
      isOpen: true,
      title: "Launch Campaign",
      message: "Are you sure you want to launch this emergency alert now?",
      confirmText: "Launch",
      onConfirm: async () => {
        const success = await launchCampaign(campaignId);
        if (success) {
          setActiveTab("Alerts"); // Changed from 'ALERTS'
          fetchAlerts();
        }
        setConfirmPopup((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleStopCampaign = (campaignId) => {
    setConfirmPopup({
      isOpen: true,
      title: "Emergency Stop",
      message:
        "Are you sure you want to STOP this active emergency alert? This cannot be undone.",
      confirmText: "Stop Campaign",
      onConfirm: async () => {
        await stopCampaign(campaignId);
        fetchAlerts();
        setConfirmPopup((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split("\n");
      const newContacts = lines
        .slice(1)
        .map((line) => {
          const [name, phone] = line.split(",").map((item) => item?.trim());
          if (name && phone)
            return { name, phone, id: Math.random().toString() };
          return null;
        })
        .filter(Boolean);
      if (newContacts.length > 0) {
        setContacts((prev) => [...prev, ...newContacts]);
        setCurrentPage(1); // Reset to first page on upload
        toast.success(`Imported ${newContacts.length} contacts`);
      }
    };
    reader.readAsText(file);
  };

  const handleViewReport = async (campaignId) => {
    setIsLoadingReport(true);
    setIsReportModalOpen(true);
    const data = await fetchCampaignReport(campaignId);
    if (data) {
      setReportData(data);
    }
    setIsLoadingReport(false);
  };

  const handlePreviewFlow = async (campaignId) => {
    setIsFetchingFlow(true);
    setIsPreviewFlowModalOpen(true);
    const { getCampaignDetails } = useEmergencyStore.getState();
    const data = await getCampaignDetails(campaignId);
    if (data && data.orchestration) {
      setSelectedFlowData(data);
    }
    setIsFetchingFlow(false);
  };

  const handleCloseReportModal = () => {
    setIsReportModalOpen(false);
    setReportData(null);
    setReportPage(1);
  };

  const addManualContact = () => {
    setContacts((prev) => [
      ...prev,
      { name: "", phone: "", id: Math.random().toString() },
    ]);
    // Stay on current page, or move to last page? Let's stay.
  };

  const updateContact = (id, field, value) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };

  const removeContact = (id) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const downloadSampleCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,Name,Phone\nJohn Doe,919876543210\nJane Smith,919876543211";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "emergency_contacts_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateButtonClick = () => {
    navigate("/admin-emergency-create");
  };

  const actionButtonConfig = useMemo(() => {
    switch (activeTab) {
      case "Alerts":
        return {
          text: "New Emergency Alert",
          onClick: handleCreateButtonClick,
        };
      case "Groups":
        return {
          text: "Create New Group",
          onClick: () => setIsModalOpen(true),
        };
      case "Reports":
        return {
          text: "Export",
          icon: Download,
          variant: "default",
          onClick: () => {
            const { exportAllReports } = useEmergencyStore.getState();
            exportAllReports(
              reportsCampaignFilter,
              reportsChannelFilter,
              reportsDispositionFilter,
              reportsDateRange[0],
              reportsDateRange[1],
              reportsResponseFilter,
            );
          },
        };
      default:
        return null;
    }
  }, [
    activeTab,
    reportsCampaignFilter,
    reportsChannelFilter,
    reportsDispositionFilter,
    reportsDateRange,
    reportsResponseFilter,
  ]);

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden">
      <Navbar
        title="Emergency"
        breadcrumbs={[
          { label: "Dashboard", route: "/admin-dashboard" },
          { label: "Emergency", onClick: () => setActiveTab("Dashboard") },
          { label: activeTab, active: true },
        ]}
        bottomContent={
          <div className="flex gap-8 mt-1">
            {tabs.map((tab) => (
              <div
                key={tab}
                className={`cursor-pointer pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === tab
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </div>
            ))}
          </div>
        }
      >
        {actionButtonConfig && (
          <Button
            variant={actionButtonConfig.variant || "default"}
            onClick={actionButtonConfig.onClick}
          >
            {actionButtonConfig.icon ? (
              <actionButtonConfig.icon className="w-4 h-4 mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {actionButtonConfig.text}
          </Button>
        )}
      </Navbar>

      {/* Modular Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "Dashboard" && (
          <AdminEmergencyDashboard dashboardStats={dashboardStats} />
        )}
        {activeTab === "Alerts" && (
          <AdminEmergencyAlerts
            alerts={alerts}
            isLoadingAlerts={isLoadingAlerts}
            handleLaunchCampaign={handleLaunchCampaign}
            handleStopCampaign={handleStopCampaign}
            handleViewReport={handleViewReport}
            handlePreviewFlow={handlePreviewFlow}
            handleCreateButtonClick={handleCreateButtonClick}
          />
        )}
        {activeTab === "Groups" && (
          <AdminEmergencyGroups
            groups={groups}
            handleViewContacts={handleViewContacts}
            handleDeleteGroup={handleDeleteGroup}
          />
        )}
        {activeTab === "Reports" && (
          <AdminEmergencyReports
            alerts={alerts}
            fetchCdrData={allLogs}
            fetchCdrCount={allLogsCount}
            isfetchLoading={isAllReportsLoading}
            page={reportsPage}
            pageSize={reportsPageSize}
            offset={reportsOffset}
            reportsCampaignFilter={reportsCampaignFilter}
            reportsChannelFilter={reportsChannelFilter}
            reportsDispositionFilter={reportsDispositionFilter}
            reportsResponseFilter={reportsResponseFilter}
            reportsDateRange={reportsDateRange}
            setPage={setReportsPage}
            setPageSize={setReportsPageSize}
            setOffset={setReportsOffset}
            setReportsCampaignFilter={setReportsCampaignFilter}
            setReportsChannelFilter={setReportsChannelFilter}
            setReportsDispositionFilter={setReportsDispositionFilter}
            setReportsResponseFilter={setReportsResponseFilter}
            setReportsDateRange={setReportsDateRange}
          />
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-[800px] p-0 overflow-hidden bg-white">
          <DialogHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-xl font-black text-slate-800">
              {isEditing ? "View/Edit Group" : "Create Contact Group"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[70vh]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                {isEditing ? (
                  <h1 className="text-2xl font-black text-slate-800">
                    {newGroupName}
                  </h1>
                ) : (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-700">
                      Group Name
                    </label>
                    <Input
                      placeholder="e.g. Finance Team"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {!isEditing && (
                <div className="flex flex-col gap-2 flex-1 md:max-w-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700">
                      Import CSV
                    </label>
                    <button
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                      onClick={downloadSampleCSV}
                    >
                      <Download className="w-3 h-3" /> Sample Format
                    </button>
                  </div>
                  <div
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer group"
                    onClick={() =>
                      document.getElementById("modalCsvInput").click()
                    }
                  >
                    <input
                      type="file"
                      id="modalCsvInput"
                      hidden
                      accept=".csv"
                      onChange={handleFileUpload}
                    />
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Icon name="upload" size={14} color="#ff5200" />
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      Click to upload contact list (CSV)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[11px] text-slate-500 uppercase font-bold bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-[60px]">#</th>
                      <th className="px-4 py-3">Contact Name</th>
                      <th className="px-4 py-3 w-[250px]">Phone Number</th>
                      <th className="px-4 py-3 w-[80px] text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contacts.length > 0 ? (
                      contacts
                        .slice((currentPage - 1) * 10, currentPage * 10)
                        .map((contact, index) => (
                          <tr
                            key={contact.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-4 py-2 font-medium text-slate-500">
                              {(currentPage - 1) * 10 + index + 1}
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                className="h-8 text-sm border-transparent hover:border-slate-200 focus:border-slate-300 shadow-none px-2"
                                placeholder="Enter name"
                                value={contact.name}
                                onChange={(e) =>
                                  updateContact(
                                    contact.id,
                                    "name",
                                    e.target.value,
                                  )
                                }
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                className="h-8 text-sm border-transparent hover:border-slate-200 focus:border-slate-300 shadow-none px-2"
                                placeholder="e.g. 919876543210"
                                value={contact.phone}
                                onChange={(e) =>
                                  updateContact(
                                    contact.id,
                                    "phone",
                                    e.target.value,
                                  )
                                }
                              />
                            </td>
                            <td className="px-4 py-2 text-center flex items-center justify-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => removeContact(contact.id)}
                              >
                                <Icon
                                  name="deletee"
                                  size={14}
                                  color="currentColor"
                                />
                              </Button>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td
                          colSpan="4"
                          className="px-4 py-8 text-center text-sm font-medium text-slate-400 bg-slate-50"
                        >
                          No contacts yet. Import a CSV or add manually.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {contacts.length > 10 && (
                <div className="flex items-center justify-between p-3 border-t border-slate-200 bg-slate-50">
                  <div className="text-xs font-semibold text-slate-500">
                    Showing {(currentPage - 1) * 10 + 1} -{" "}
                    {Math.min(currentPage * 10, contacts.length)} of{" "}
                    {contacts.length}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-7 h-7 rounded-lg"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                    >
                      <Icon name="leftarrow" size={12} />
                    </Button>
                    {Array.from(
                      { length: Math.ceil(contacts.length / 10) },
                      (_, i) => i + 1,
                    ).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        className={`w-7 h-7 rounded-lg text-[11px] font-bold ${currentPage === page ? "bg-[#ff5200] hover:bg-[#e64a00]" : ""}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-7 h-7 rounded-lg"
                      disabled={currentPage === Math.ceil(contacts.length / 10)}
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                    >
                      <Icon name="rightarrow" size={12} />
                    </Button>
                  </div>
                </div>
              )}

              <div className="p-3 border-t border-slate-200 bg-white">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-[#ff5200] hover:text-[#e64a00] hover:bg-orange-50 text-xs font-bold"
                  onClick={addManualContact}
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Add New Contact Row
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                className="font-bold"
                onClick={handleCloseModal}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#ff5200] hover:bg-[#e64a00] text-white font-bold"
                onClick={isEditing ? handleUpdateGroup : handleCreateGroup}
              >
                {isEditing ? "Save Changes" : "Create Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        width="800px"
        open={isReportModalOpen}
        onOpenChange={handleCloseReportModal}
      >
        <DialogContent className="max-w-[1100px] p-0 overflow-hidden bg-white">
          <DialogHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-black text-slate-800">
                Campaign Status Report{" "}
                {reportData && (
                  <span className="text-[#ff5200]">
                    #{reportData.logs?.[0]?.c_campaignId}
                  </span>
                )}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="p-0 overflow-y-auto max-h-[80vh]">
            {isLoadingReport ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                <div className="w-8 h-8 border-4 border-slate-100 border-t-[#ff5200] rounded-full animate-spin" />
                <span className="text-sm font-medium">
                  Loading report data...
                </span>
              </div>
            ) : reportData ? (
              <div className="flex flex-col gap-6 p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(reportData.summary).map(([label, value]) => {
                    const l = label.toUpperCase();
                    let bg = "bg-slate-50/80";
                    let border = "border-slate-200";
                    let text = "text-slate-500";
                    let valColor = "text-slate-700";

                    if (l.includes("TOTAL")) {
                      bg = "bg-blue-50/50";
                      border = "border-blue-100";
                      text = "text-blue-500";
                      valColor = "text-blue-700";
                    } else if (l.includes("ANSWERED") || l.includes("READ")) {
                      bg = "bg-emerald-50/50";
                      border = "border-emerald-100";
                      text = "text-emerald-500";
                      valColor = "text-emerald-700";
                    } else if (l.includes("FAILED")) {
                      bg = "bg-rose-50/50";
                      border = "border-rose-100";
                      text = "text-rose-500";
                      valColor = "text-rose-700";
                    } else if (
                      l.includes("NO ANSWER") ||
                      l.includes("DELIVERED") ||
                      l.includes("BUSY")
                    ) {
                      bg = "bg-amber-50/50";
                      border = "border-amber-100";
                      text = "text-amber-500";
                      valColor = "text-amber-700";
                    }

                    return (
                      <div
                        key={label}
                        className={`rounded-xl border shadow-sm p-5 flex flex-col justify-between transition-all hover:shadow-md ${bg} ${border}`}
                      >
                        <span
                          className={`text-xs font-bold uppercase tracking-wider mb-2 ${text}`}
                        >
                          {label}
                        </span>
                        <h2 className={`text-4xl font-black ${valColor}`}>
                          {value}
                        </h2>
                      </div>
                    );
                  })}
                </div>

                <div className="overflow-auto border border-slate-200 rounded-xl shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[11px] text-slate-500 uppercase font-bold bg-slate-50 sticky top-0 border-b border-slate-100 z-10">
                      <tr>
                        <th className="px-5 py-3">#</th>
                        <th className="px-5 py-3">Lead Number</th>
                        <th className="px-5 py-3">Channel</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Time</th>
                        <th className="px-5 py-3">Duration</th>
                        <th className="px-5 py-3" style={{ width: "300px" }}>
                          Message
                        </th>
                        <th className="px-5 py-3" style={{ width: "200px" }}>
                          Response
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.logs
                        .slice(
                          (reportPage - 1) * reportPageSize,
                          reportPage * reportPageSize,
                        )
                        .map((log, idx) => (
                          <tr
                            key={log.c_logId}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-5 py-3 font-medium text-slate-500">
                              {(reportPage - 1) * reportPageSize + idx + 1}
                            </td>
                            <td className="px-5 py-3 font-bold text-slate-800">
                              {log.c_customerPhoneno}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                                    log.c_channel === "WA"
                                      ? "bg-emerald-50 border-emerald-100"
                                      : log.c_channel === "SMS"
                                        ? "bg-blue-50 border-blue-100"
                                        : "bg-orange-50 border-orange-100"
                                  }`}
                                >
                                  <Icon
                                    name={
                                      log.c_channel === "WA"
                                        ? "whatsapp"
                                        : log.c_channel === "SMS"
                                          ? "sms"
                                          : "alert"
                                    }
                                    size={12}
                                    color={
                                      log.c_channel === "WA"
                                        ? "#25D366"
                                        : log.c_channel === "SMS"
                                          ? "#007AFF"
                                          : "#ff5200"
                                    }
                                  />
                                </div>
                                <span className="font-semibold text-slate-700 text-xs">
                                  {log.c_channel === "WA"
                                    ? "WhatsApp"
                                    : log.c_channel === "SMS"
                                      ? "SMS"
                                      : "IVR"}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                  log.c_disposition.toLowerCase() ===
                                    "answered" ||
                                  log.c_disposition.toLowerCase() ===
                                    "delivered" ||
                                  log.c_disposition.toLowerCase() === "read"
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                    : "bg-orange-50 text-orange-600 border-orange-100"
                                }`}
                              >
                                {log.c_disposition}
                              </span>
                            </td>
                            <td className="px-5 py-3 font-medium text-slate-500">
                              {new Date(log.c_createdOn).toLocaleTimeString()}
                            </td>
                            <td className="px-5 py-3 font-medium text-slate-500">
                              {log.c_duration}s
                            </td>
                            <td className="px-5 py-3">
                              {(() => {
                                const content = log.c_messageContent;
                                if (!content)
                                  return (
                                    <span className="text-slate-400">-</span>
                                  );

                                const isWhatsApp = log.c_channel === "WA";
                                let data = content;
                                if (
                                  typeof content === "string" &&
                                  (content.startsWith("{") ||
                                    content.startsWith("["))
                                ) {
                                  try {
                                    data = JSON.parse(content);
                                  } catch (e) {}
                                }

                                let displayText = content;
                                if (isWhatsApp) {
                                  const body = data.components?.find(
                                    (c) => c.type?.toUpperCase() === "BODY",
                                  );
                                  displayText =
                                    body?.text || JSON.stringify(data);
                                } else if (typeof data === "object") {
                                  displayText = JSON.stringify(data);
                                }

                                return (
                                  <span
                                    className="cursor-pointer font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                    onClick={() =>
                                      setDetailModalData({
                                        open: true,
                                        title: isWhatsApp
                                          ? "WhatsApp Message Preview"
                                          : "Message Content",
                                        content: isWhatsApp ? (
                                          <WhatsAppPreview data={content} />
                                        ) : (
                                          displayText
                                        ),
                                      })
                                    }
                                  >
                                    {displayText.length > 30
                                      ? `${displayText.substring(0, 30)}...`
                                      : displayText}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-5 py-3">
                              {(() => {
                                const resp = log.c_ivrResponse;
                                if (!resp)
                                  return (
                                    <span className="text-slate-400">-</span>
                                  );
                                let displayText = resp;
                                if (typeof resp === "object") {
                                  try {
                                    const body = resp.components?.find(
                                      (c) => c.type?.toUpperCase() === "BODY",
                                    );
                                    displayText =
                                      body?.text || JSON.stringify(resp);
                                  } catch (e) {
                                    displayText = JSON.stringify(resp);
                                  }
                                }
                                return (
                                  <span className="font-medium text-slate-600">
                                    {displayText.length > 30
                                      ? `${displayText.substring(0, 30)}...`
                                      : displayText}
                                  </span>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {reportData.logs.length > reportPageSize && (
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs font-semibold text-slate-500">
                      Showing {(reportPage - 1) * reportPageSize + 1} -{" "}
                      {Math.min(
                        reportPage * reportPageSize,
                        reportData.logs.length,
                      )}{" "}
                      of {reportData.logs.length}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 rounded-lg"
                        disabled={reportPage === 1}
                        onClick={() => setReportPage((prev) => prev - 1)}
                      >
                        <Icon name="leftarrow" size={12} />
                      </Button>
                      {Array.from(
                        {
                          length: Math.ceil(
                            reportData.logs.length / reportPageSize,
                          ),
                        },
                        (_, i) => i + 1,
                      )
                        .filter(
                          (p) =>
                            p === 1 ||
                            p ===
                              Math.ceil(
                                reportData.logs.length / reportPageSize,
                              ) ||
                            Math.abs(p - reportPage) <= 1,
                        )
                        .map((p, i, arr) => (
                          <React.Fragment key={p}>
                            {i > 0 && arr[i - 1] !== p - 1 && (
                              <span className="text-slate-400 px-1">...</span>
                            )}
                            <Button
                              variant={reportPage === p ? "default" : "outline"}
                              className={`w-8 h-8 rounded-lg text-xs font-bold ${reportPage === p ? "bg-[#ff5200] hover:bg-[#e64a00]" : ""}`}
                              onClick={() => setReportPage(p)}
                            >
                              {p}
                            </Button>
                          </React.Fragment>
                        ))}
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 rounded-lg"
                        disabled={
                          reportPage ===
                          Math.ceil(reportData.logs.length / reportPageSize)
                        }
                        onClick={() => setReportPage((prev) => prev + 1)}
                      >
                        <Icon name="rightarrow" size={12} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <span className="text-sm font-medium">
                  No report data available.
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Popupconfirm
        isOpen={confirmPopup.isOpen}
        title={confirmPopup.title}
        message={confirmPopup.message}
        confirmText={confirmPopup.confirmText}
        onConfirm={confirmPopup.onConfirm}
        onCancel={() => setConfirmPopup((prev) => ({ ...prev, isOpen: false }))}
      />

      <Modal
        open={detailModalData.open}
        onClose={() => setDetailModalData({ ...detailModalData, open: false })}
        width="600px"
        closeOnOverlayClick={true}
      >
        <div className="admin_emergency_report_modal_header">
          <p className="admin_emergency_report_modal_title">
            {detailModalData.title}
          </p>
          <Button
            variant="ghost"
            onClick={() =>
              setDetailModalData({ ...detailModalData, open: false })
            }
          >
            <Icon name="close" color="#0F172A" size="14" />
          </Button>
        </div>
        <div className="admin_emergency_report_modal_body">
          {detailModalData.content}
        </div>
      </Modal>

      {/* Campaign Flow Preview Modal */}
      <Modal
        open={isPreviewFlowModalOpen}
        onClose={() => setIsPreviewFlowModalOpen(false)}
        width="900px"
      >
        <div className="admin_emergency_modal_content flow_preview_modal">
          <div className="admin_emergency_modal_header">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div className="modal_icon_circle">
                <Icon name="timer" size={20} color="#ff5200" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
                  Campaign Flow
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                  Campaign:{" "}
                  <b>
                    {selectedFlowData?.metadata?.e_campaignName || "Unnamed"}
                  </b>
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => setIsPreviewFlowModalOpen(false)}
            >
              <Icon name="close" size={20} />
            </Button>
          </div>

          <div
            className="admin_emergency_modal_body"
            style={{ background: "#f8fafc", padding: "32px" }}
          >
            {isFetchingFlow ? (
              <div className="fetching_flow_loader">
                <div className="pulse_visual">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p>Retrieving Campaign sequence...</p>
              </div>
            ) : selectedFlowData?.orchestration ? (
              <div className="orchestration_visualizer_box">
                <div
                  className="visualizer_stage_row"
                  style={{ justifyContent: "center" }}
                >
                  {selectedFlowData.orchestration.stages.map((stage, idx) => (
                    <React.Fragment key={stage.id}>
                      <div className="visual_stage_node">
                        <div className="node_header">
                          <div className="node_idx">Stage {idx + 1}</div>
                        </div>
                        <div className="node_channels">
                          {stage.channels.map((ch) => (
                            <div key={ch} className="channel_detail_group">
                              <div className="mini_channel_badge">
                                <Icon
                                  name={
                                    ch === "IVR"
                                      ? "campaign"
                                      : ch === "WA"
                                        ? "whatsapp"
                                        : "sms"
                                  }
                                  size={14}
                                />
                                <span>{ch}</span>
                              </div>
                              <div className="trigger_details">
                                {stage.triggers?.[ch] &&
                                  Object.entries(stage.triggers[ch])
                                    .filter(
                                      ([key, val]) =>
                                        (val === true ||
                                          (ch === "WA" &&
                                            key === "read" &&
                                            val === false)) &&
                                        key !== "timeout",
                                    )
                                    .map(([key, val]) => (
                                      <span key={key} className="trigger_tag">
                                        {key === "read" && val === false
                                          ? "Not Read"
                                          : ch === "IVR" && key === "failed"
                                            ? "Invalid Input"
                                            : (
                                                key.charAt(0).toUpperCase() +
                                                key.slice(1)
                                              ).replace(/([A-Z])/g, " $1")}
                                      </span>
                                    ))}
                                {ch === "WA" && stage.triggers?.WA?.timeout && (
                                  <span className="trigger_tag timeout">
                                    Timeout: {stage.triggers.WA.timeout}m
                                  </span>
                                )}
                              </div>
                              {ch === "WA" &&
                                stage.waConfig?.buttonReplies &&
                                Object.keys(stage.waConfig.buttonReplies)
                                  .length > 0 && (
                                  <div className="wa_replies_preview">
                                    <div className="replies_title">
                                      <Icon name="reply" size={10} /> Button
                                      Replies:
                                    </div>
                                    {Object.entries(
                                      stage.waConfig.buttonReplies,
                                    ).map(([btn, reply]) => (
                                      <div key={btn} className="reply_item">
                                        <b>{btn}:</b> {reply}
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>

                        <div className="node_meta_details">
                          {stage.executionMode === "STAGGERED" && (
                            <div className="meta_info_stagger">
                              <Icon name="timer" size={12} /> Staggered:{" "}
                              {stage.interChannelDelay}m interval
                            </div>
                          )}
                          <div className="node_action_ribbon">
                            {stage.action === "NEXT" ? (
                              <span className="action_next">Next Stage</span>
                            ) : stage.action === "RETRY" ? (
                              <div className="action_retry_info">
                                <span className="action_retry">
                                  Retry Sequence
                                </span>
                                <div className="retry_params">
                                  <span>Max: {stage.retryCount}</span>
                                  <span>Delay: {stage.retryDelay}m</span>
                                </div>
                              </div>
                            ) : (
                              <span className="action_stop">End Flow</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {idx <
                        selectedFlowData.orchestration.stages.length - 1 && (
                        <div className="visual_connector_line">
                          {selectedFlowData.orchestration.stages[idx + 1]
                            .waitDuration > 0 && (
                            <div className="connector_label">
                              <div className="label_val">
                                <Icon name="timer" size={10} />{" "}
                                {
                                  selectedFlowData.orchestration.stages[idx + 1]
                                    .waitDuration
                                }
                                m
                              </div>
                              <div className="label_text">Delay</div>
                            </div>
                          )}
                          <div className="connector_arrow">
                            <Icon name="rightarrow" size={12} />
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flow_error">
                No Campaign Flow data found for this campaign.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminEmergency;
