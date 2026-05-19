import React, { useState, useEffect } from "react";
import { Table, Button, Modal, Input, Select, Tabletag, Popupconfirm } from "../../components/Index";
import Icon from "../../constants/Icon.jsx";
import { useNavigate } from "react-router-dom";
import { useEmailAutomationStore } from "../../store/admin/reports/useEmailAutomationStore";
import { useUsersStore } from "../../store/admin/useUsersStore";
import { useToastStore } from "../../store/useToastStore";
import "./styles/EmailAutomation.css";

const EmailAutomation = () => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [editId, setEditId] = useState(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [offset, setOffset] = useState(0);

    const {
        emailAutomations,
        totalCount,
        isLoading,
        isCreating,
        isDeleting,
        isUpdating,
        fetchEmailAutomations,
        createEmailAutomation,
        deleteEmailAutomation,
        updateEmailAutomation,
        toggleEmailAutomationStatus
    } = useEmailAutomationStore();

    const {
        userListData,
        getUsersList
    } = useUsersStore();

    const { toast } = useToastStore();

    const [formData, setFormData] = useState({
        name: "",
        reportName: "",
        repeat: "",
        time: "09:00",
        day: "",
        dataRange: "previous_day",
        toEmail: "",
        ccEmail: [],
        extensionFilter: [],
        timezoneFilter: "Asia/Kolkata",
        fieldsFilter: []
    });

    const reportOptions = [
        { value: "CDR Report", label: "CDR Report" },
        // { value: "Performance Report", label: "Performance Report" },
        // { value: "Login Logout Report", label: "Login Logout Report" },
        // { value: "Break Report", label: "Break Report" },
        // { value: "Conference Report", label: "Conference Report" },
        // { value: "Queue Missed Call Report", label: "Queue Missed Call Report" },
        // { value: "Missed Call Report", label: "Missed Call Report" },
        // { value: "Callback Reminder Report", label: "Callback Reminder Report" }
    ];

    const repeatOptions = [
        { value: "Daily", label: "Daily" },
        { value: "Weekly", label: "Weekly" },
        { value: "Monthly", label: "Monthly" }
    ];

    const dataRangeOptions = [
        { value: "previous_day", label: "Previous Day Only" },
        { value: "month_to_date", label: "Month to Date (1st to Previous Day)" }
    ];

    const dayOptions = [
        { value: "Sunday", label: "Sunday" },
        { value: "Monday", label: "Monday" },
        { value: "Tuesday", label: "Tuesday" },
        { value: "Wednesday", label: "Wednesday" },
        { value: "Thursday", label: "Thursday" },
        { value: "Friday", label: "Friday" },
        { value: "Saturday", label: "Saturday" }
    ];

    const timezoneOptions = [
        { value: "Asia/Kolkata", label: "(GMT+05:30) IST - Kolkata" },
        { value: "UTC", label: "(GMT+00:00) UTC" },
        { value: "America/New_York", label: "(GMT-05:00) EST - New York" },
        { value: "America/Chicago", label: "(GMT-06:00) CST - Chicago" },
        { value: "America/Denver", label: "(GMT-07:00) MST - Denver" },
        { value: "America/Los_Angeles", label: "(GMT-08:00) PST - Los Angeles" },
    ];

    const fieldOptions = [
        { value: "AccountCode", label: "Account Code" },
        { value: "CampaignName", label: "Campaign Name" },
        { value: "MemberName", label: "Member Name" },
        { value: "CustomerPhoneNumber", label: "Customer Phone Number" },
        { value: "CallDateTime", label: "Call Date Time" },
        { value: "CallDirection", label: "Call Direction" },
        { value: "CallDisposition", label: "Call Disposition" },
        { value: "CallDuration", label: "Call Duration" },
        { value: "CallMode", label: "Call Mode" },
        { value: "WrapUpDuration", label: "Wrap Up Duration" },
        { value: "CallLineNumber", label: "Call Line Number" },
        { value: "MemberExtensionNumber", label: "Member Extension Number" },
        { value: "MemberPhoneNumber", label: "Member Phone Number" },
        { value: "MemberExtensionName", label: "Member Extension Name" },
        { value: "MemberRegisteredIP", label: "Member Registered IP" },
        { value: "CallDisconnectionEnd", label: "Call Disconnection End" }
    ];

    const agentOptions = userListData
        .filter(user => user.m_memberRole === "USER" || user.m_memberRole === "TL")
        .map(user => ({
            value: String(user.m_memberExtensionNo),
            label: `${user.m_memberName} (${user.m_memberExtensionNo})`
        }));

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };


    const [emailInput, setEmailInput] = useState("");

    const handleEmailKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const email = emailInput.trim();
            if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setFormData(prev => ({
                    ...prev,
                    ccEmail: [...(prev.ccEmail || []), email]
                }));
                setEmailInput("");
            }
        }
    };

    const handleRemoveEmail = (emailToRemove) => {
        setFormData(prev => ({
            ...prev,
            ccEmail: (prev.ccEmail || []).filter(email => email !== emailToRemove)
        }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Fetch data on mount and when pagination changes
    useEffect(() => {
        fetchEmailAutomations(pageSize, offset);
        getUsersList(1000, 0, "m_memberName", "ASC", "", "", "", ""); // Fetch users for extension filter
    }, [pageSize, offset]);

    const handleSubmit = async () => {
        // Validate required fields
        if (!formData.name || !formData.reportName || !formData.repeat || !formData.toEmail) {
            toast?.error("Please fill in all required fields");
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.toEmail)) {
            toast?.error("Please enter a valid email address");
            return;
        }

        try {
            // Include current emailInput in ccEmail if it's a valid email
            let currentCcEmails = [...(formData.ccEmail || [])];
            const trimmedEmailInput = emailInput.trim();
            if (trimmedEmailInput && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmailInput)) {
                if (!currentCcEmails.includes(trimmedEmailInput)) {
                    currentCcEmails.push(trimmedEmailInput);
                }
            }

            // Map "repeat" to "schedule" for API
            const payload = {
                name: formData.name,
                reportName: formData.reportName,
                schedule: formData.repeat, // Map repeat to schedule
                time: formData.time,
                day: formData.day || "",
                dataRange: formData.repeat === "Daily" ? (formData.dataRange || "previous_day") : "",
                toEmail: formData.toEmail,
                ccEmail: currentCcEmails,
                extensionFilter: formData.extensionFilter || [],
                timezoneFilter: formData.timezoneFilter || "",
                fieldsFilter: formData.fieldsFilter || []
            };

            let response;
            if (editId) {
                // Update existing
                response = await updateEmailAutomation(editId, payload);
                toast?.success(response?.data?.message || "Email automation updated successfully");
            } else {
                // Create new
                response = await createEmailAutomation(payload);
                toast?.success(response?.data?.message || "Email automation created successfully");
            }

            // Reset form
            setFormData({
                name: "",
                reportName: "",
                repeat: "",
                time: "09:00",
                day: "",
                dataRange: "previous_day",
                toEmail: "",
                ccEmail: [],
                extensionFilter: [],
                timezoneFilter: "Asia/Kolkata",
                fieldsFilter: []
            });
            setEmailInput("");
            setEditId(null);

            // Close modal
            setIsModalOpen(false);

            // Refresh the list immediately
            fetchEmailAutomations(pageSize, offset, false);
        } catch (error) {
            console.error("Save automation error:", error);
            const action = editId ? "update" : "create";
            toast?.error(error?.response?.data?.message || `Failed to ${action} email automation`);
        }
    };

    const handlePageChange = (pagevalues) => {
        const newOffset = pagevalues.pageSize * pagevalues.currentPage - pagevalues.pageSize;
        if (pagevalues.currentPage === page && pagevalues.pageSize === pageSize && newOffset === offset) {
            return;
        }

        setTimeout(() => {
            setPage(pagevalues.currentPage);
            setPageSize(pagevalues.pageSize);
            setOffset(newOffset);
        }, 0);
    };

    const handleDeleteClick = (ma_id) => {
        setDeleteId(ma_id);
        setIsDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteId || isDeleting) return;

        // Close modal immediately when delete starts
        setIsDeleteConfirmOpen(false);
        const idToDelete = deleteId;
        setDeleteId(null);

        try {
            const response = await deleteEmailAutomation(idToDelete);
            // Show success message
            toast.success(response?.data?.message || "Email automation deleted successfully");

            // Refresh the list silently to ensure sync
            fetchEmailAutomations(pageSize, offset, false);
        } catch (error) {
            // Show error message
            const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete email automation";
            toast.error(errorMessage);
        }
    };

    const handleDeleteCancel = () => {
        setIsDeleteConfirmOpen(false);
        setDeleteId(null);
    };

    const handleEditClick = (record) => {
        setEditId(record.ma_id);
        setFormData({
            name: record.ma_name,
            reportName: record.ma_reportName,
            repeat: record.ma_schedule,
            time: record.ma_time,
            day: record.ma_day,
            dataRange: record.ma_dataRange || "previous_day",
            toEmail: record.ma_toEmail,
            ccEmail: Array.isArray(record.ma_ccEmail) ? record.ma_ccEmail : [],
            extensionFilter: Array.isArray(record.ma_extensionFilter) ? record.ma_extensionFilter : [],
            timezoneFilter: record.ma_timezoneFilter || "Asia/Kolkata",
            fieldsFilter: Array.isArray(record.ma_fieldsFilter) ? record.ma_fieldsFilter : []
        });
        setIsModalOpen(true);
    };

    const columns = [
        {
            title: "S.no",
            key: "s_no",
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        },
        { title: "Automation Name", key: "ma_name" },
        { title: "Report Name", key: "ma_reportName" },
        { title: "Schedule", key: "ma_schedule" },
        {
            title: "Data Range",
            key: "ma_dataRange",
            Cell: (record) => {
                if (record.ma_schedule === "Daily") {
                    return record.ma_dataRange === "month_to_date" ? "Month to Date" : "Previous Day";
                }
                if (record.ma_schedule === "Weekly") return "Last 7 Days";
                if (record.ma_schedule === "Monthly") return "Previous Month";
                return "-";
            }
        },
        {
            title: "Time",
            key: "ma_time",
            Cell: (record) => record.ma_time || "-"
        },
        {
            title: "Day",
            key: "ma_day",
            Cell: (record) => record.ma_day || "-"
        },
        { title: "To Email", key: "ma_toEmail" },
        {
            title: "CC Email",
            key: "ma_ccEmail",
            Cell: (record) => {
                if (Array.isArray(record.ma_ccEmail) && record.ma_ccEmail.length > 0) {
                    return record.ma_ccEmail.join(", ");
                }
                return "-";
            }
        },
        {
            title: "Status",
            key: "ma_status",
            Cell: (record) => {
                const status = record.ma_status || "ACTIVE";
                const config = {
                    ACTIVE: { bg: "#F0FDF4", text: "#16A34A", border: "#16A34A" },
                    INACTIVE: { bg: "#FFF1F2", text: "#E11D48", border: "#E11D48" },
                };
                const { bg, text, border } = config[status] || config.ACTIVE;
                return <Tabletag text={status} bgColor={bg} textColor={text} borderColor={border} />;
            }
        },
        {
            title: "Created On",
            key: "ma_createdOn",
            Cell: (record) => {
                if (record.ma_createdOn) {
                    const date = new Date(record.ma_createdOn);
                    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
                return "-";
            }
        },
        {
            title: "Actions",
            key: "actions",
            Cell: (record) => (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button
                        variant="empty"
                        onClick={async () => {
                            try {
                                await toggleEmailAutomationStatus(record.ma_id);
                                toast.success(`Automation ${record.ma_status === "ACTIVE" ? "Paused" : "Resumed"} Successfully`);
                            } catch (error) {
                                toast.error("Failed to update status");
                            }
                        }}
                        disabled={isCreating || isDeleting || isUpdating}
                    >
                        {record.ma_status === "ACTIVE" ? (
                            <Icon name="pause" size={15} color="#E11D48" />
                        ) : (
                            <Icon name="play" size={15} color="#16A34A" />
                        )}
                    </Button>
                    <Button
                        variant="empty"
                        onClick={() => handleEditClick(record)}
                        disabled={isCreating || isDeleting || isUpdating}
                    >
                        <Icon name="edit" size={15} color="#0F172A" />
                    </Button>
                    <Button
                        variant="empty"
                        onClick={() => handleDeleteClick(record.ma_id)}
                        disabled={isDeleting}
                    >
                        <Icon name="deletee" size={15} color="#E11D48" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="email_automation_page">
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">Email Automation</p>
                    <span className="navbar_1_breadcrumb">
                        <span
                            className="navbar_1_breadcrumb_item"
                            onClick={() => navigate("/admin-dashboard")}
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item active">Email Automation</span>
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Button onClick={() => setIsModalOpen(true)}>
                        Create Automation
                    </Button>
                </div>
            </div>

            <div className="email_automation_content">
                <div className="email_automation_table">
                    <Table
                        columns={columns}
                        data={emailAutomations}
                        loading={isLoading}
                        totaldata={totalCount}
                        page={page}
                        pageSize={pageSize}
                        serverSide={true}
                        pagination={true}
                        showtotal={true}
                        onPageChange={handlePageChange}
                        noDataMessage="No automations created yet"
                    />
                </div>
            </div>

            <Modal
                open={isModalOpen}
                width="600px"
                onClose={() => {
                    setIsModalOpen(false);
                    setFormData({
                        name: "",
                        reportName: "",
                        repeat: "",
                        time: "09:00",
                        day: "",
                        dataRange: "previous_day",
                        toEmail: "",
                        ccEmail: [],
                        extensionFilter: [],
                        timezoneFilter: "Asia/Kolkata",
                        fieldsFilter: []
                    });
                    setEmailInput("");
                    setEditId(null);
                }}
            >
                <div>
                    <div className="email_automation_modal_header_container">
                        <p className="email_automation_modal_header">{editId ? "Edit Automation" : "Create Automation"}</p>
                        <Button variant="empty" onClick={() => setIsModalOpen(false)}>
                            <Icon name="close" size={14} color="#0F172A" />
                        </Button>
                    </div>

                    <div className="create_automation_form_container">
                        <div className="create_automation_form">
                            <div className="form_group">
                                <label>Automation Name</label>
                                <Input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter automation name"
                                />
                            </div>

                            <div className="form_group">
                                <label>Report Name</label>
                                <Select
                                    options={reportOptions}
                                    value={formData.reportName}
                                    onChange={(val) => handleSelectChange("reportName", val)}
                                    placeholder="Select report"
                                    showSearch={false}
                                />
                            </div>

                            <div className="form_group">
                                <label>Repeat</label>
                                <Select
                                    options={repeatOptions}
                                    value={formData.repeat}
                                    onChange={(val) => handleSelectChange("repeat", val)}
                                    placeholder="Select repeat"
                                    showSearch={false}
                                />
                            </div>

                            {formData.repeat === "Weekly" && (
                                <div className="form_group">
                                    <label>Select Day</label>
                                    <Select
                                        options={dayOptions}
                                        value={formData.day}
                                        onChange={(val) => handleSelectChange("day", val)}
                                        placeholder="Select day"
                                        showSearch={false}
                                    />
                                </div>
                            )}

                            {formData.repeat === "Daily" && (
                                <div className="form_group">
                                    <label>Data Range</label>
                                    <Select
                                        options={dataRangeOptions}
                                        value={formData.dataRange}
                                        onChange={(val) => handleSelectChange("dataRange", val)}
                                        placeholder="Select data range"
                                        showSearch={false}
                                    />
                                </div>
                            )}

                            {(formData.repeat === "Daily" || formData.repeat === "Weekly") && (
                                <div className="form_group">
                                    <label>Select Time</label>
                                    <Input
                                        type="time"
                                        name="time"
                                        value={formData.time}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            )}

                            <div className="form_group">
                                <label>To Email Address</label>
                                <Input
                                    name="toEmail"
                                    value={formData.toEmail}
                                    onChange={handleInputChange}
                                    placeholder="Enter email address"
                                />
                            </div>

                            <div className="form_group">
                                <label>CC Email IDs</label>
                                <div
                                    className="select_container wrap"
                                    style={{ padding: '4px 12px', minHeight: '40px' }}
                                    onClick={() => document.getElementById('cc-email-input').focus()}
                                >
                                    {(formData.ccEmail || []).map((email, index) => (
                                        <span key={index} className="select_tag">
                                            {email}
                                            <Button
                                                variant="empty"
                                                className="select_multi_close_btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveEmail(email);
                                                }}
                                            >
                                                <Icon name="close" size={6} color="#1D4ED8" />
                                            </Button>
                                        </span>
                                    ))}
                                    <input
                                        id="cc-email-input"
                                        type="email"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        onKeyDown={handleEmailKeyDown}
                                        placeholder={formData.ccEmail?.length > 0 ? "" : "Enter email and press Enter"}
                                        className="select_input"
                                        style={{ border: 'none', outline: 'none', background: 'transparent' }}
                                    />
                                </div>
                            </div>

                            <div className="form_group">
                                <label>Timezone Filter</label>
                                <Select
                                    options={timezoneOptions}
                                    value={formData.timezoneFilter}
                                    onChange={(val) => handleSelectChange("timezoneFilter", val)}
                                    placeholder="Select timezone"
                                    showSearch={true}
                                />
                            </div>

                            <div className="form_group">
                                <label>Extension Filter (Agent wise)</label>
                                <Select
                                    mode="multiple"
                                    options={agentOptions}
                                    value={formData.extensionFilter}
                                    onChange={(val) => handleSelectChange("extensionFilter", val)}
                                    placeholder="Select agents (Optional)"
                                    showSearch={true}
                                />
                            </div>

                            <div className="form_group">
                                <label>Fields Filter</label>
                                <Select
                                    mode="multiple"
                                    options={fieldOptions}
                                    value={formData.fieldsFilter}
                                    onChange={(val) => handleSelectChange("fieldsFilter", val)}
                                    placeholder="Select fields (Optional)"
                                    showSearch={true}
                                />
                            </div>
                        </div>

                        <div className="email_automation_modal_footer">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={isCreating || isUpdating}>
                                {editId ? (isUpdating ? "Updating..." : "Update") : (isCreating ? "Creating..." : "Create")}
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            <Popupconfirm
                isOpen={isDeleteConfirmOpen}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
                title="Delete Email Automation"
                message="Are you sure you want to delete this email automation? This action cannot be undone."
                confirmText={isDeleting ? "Deleting..." : "Delete"}
                cancelText="Cancel"
            />
        </div>
    );
};

export default EmailAutomation;
