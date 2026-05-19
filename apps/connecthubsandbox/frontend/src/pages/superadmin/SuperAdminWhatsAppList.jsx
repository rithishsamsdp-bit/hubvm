import { useEffect, useState, useMemo } from "react";
import "./styles/SuperAdminOnboardList.css";
import { useOnboard } from "../../store/superadmin/useOnboard";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../../constants/Icon.jsx";
import {
    Button,
    Input,
    Table,
    Tooltip,
    Modal,
    Select,
    FormInputError
} from "../../components/Index.jsx";
import { useDebounce } from "../../hooks/useDebounce.js";

const SuperAdminWhatsAppList = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const {
        getWhatsAppAccounts,
        whatsAppAccounts,
        isOnboardLoading,
        getOnboard,
        onboardData, // For dropdown
        createWhatsAppAccount,
        updateWhatsAppAccount,
        modalLoading
    } = useOnboard();


    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchString, setSearchString] = useState("");
    const debouncedSearchString = useDebounce(searchString, 500);

    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        w_accountId: "",
        w_whatsappNumber: "",
        w_phNumberId: "",
        w_apiKey: "",
        w_wabaID: "",
        service: "",
        utility: "",
        marketing: ""
    });
    const [isEdit, setIsEdit] = useState(false);
    const [errors, setErrors] = useState({});


    useEffect(() => {
        // Fetch WhatsApp Accounts
        getWhatsAppAccounts();
    }, []);

    const columns = useMemo(
        () => [
            {
                title: "S.no",
                key: "s_no",
                Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
            },
            { title: "Company Name", key: "a_accountName" },
            { title: "WhatsApp Number", key: "w_whatsappNumber" },
            { title: "Phone Number ID", key: "w_phNumberId" },
            { title: "WABA ID", key: "w_wabaID" },
            { title: "Status", key: "w_status", Cell: (row) => row.w_status || "Active" }, // Mock status
            {
                title: "Action",
                key: "action",
                Cell: (record) => (
                    <div
                        className="superadmin_onboard_action_container"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Tooltip content="Edit WhatsApp Config">
                            <Button
                                variant="empty"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEdit(true);
                                    setFormData({
                                        w_whatsappAccountId: record.w_whatsappAccountId, // Store ID if needed for update
                                        w_accountId: record.w_accountId,
                                        w_whatsappNumber: record.w_whatsappNumber,
                                        w_phNumberId: record.w_phNumberId,
                                        w_apiKey: record.w_apiKey,
                                        w_wabaID: record.w_wabaID,
                                        service: record.w_amountDeduction?.service || "",
                                        utility: record.w_amountDeduction?.utility || "",
                                        marketing: record.w_amountDeduction?.marketing || ""
                                    });
                                    setOpen(true);
                                    getOnboard(1000, 0, "a_accountName", "ASC", "");
                                }}
                            >
                                <Icon name="edit" size={15} color="#5F6368" />
                            </Button>
                        </Tooltip>

                    </div>
                ),
            },
        ],
        [page, pageSize, navigate],
    );


    // Open Modal and fetch customers for dropdown
    const handleOpenModal = () => {
        setIsEdit(false);
        setOpen(true);
        setFormData({
            w_accountId: "",
            w_whatsappNumber: "",
            w_phNumberId: "",
            w_apiKey: "",
            w_wabaID: "",
            service: "",
            utility: "",
            marketing: ""
        });
        setErrors({});
        // Fetch all accounts for dropdown
        getOnboard(1000, 0, "a_accountName", "ASC", "");
    };


    const handleCreate = async () => {
        // Basic validation
        const newErrors = {};
        if (!formData.w_accountId) newErrors.w_accountId = "Customer is required";
        if (!formData.w_whatsappNumber) newErrors.w_whatsappNumber = "WhatsApp Number is required";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (isEdit) {
            await updateWhatsAppAccount(formData);
        } else {
            await createWhatsAppAccount(formData);
        }
        setOpen(false);
    };


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const accountOptions = onboardData?.map(acc => ({
        label: acc.a_accountName,
        value: acc.a_accountId
    })) || [];

    return (
        <div className="superadmin_onboard_creation">
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">WhatsApp Onboard</p>
                    <span className="navbar_1_breadcrumb">
                        <span
                            onClick={() => navigate("/superadmin-dashboard")}
                            className="navbar_1_breadcrumb_item"
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item active">WhatsApp Onboard</span>
                    </span>
                </div>
                <div className="navbar_button_container">
                    <Button type="primary" onClick={handleOpenModal}>
                        Create Account
                    </Button>
                </div>
            </div>

            <div className="superadmin_onboard_content">
                <div className="superadmin_onboard_container">
                    <Table
                        columns={columns}
                        data={whatsAppAccounts}
                        loading={isOnboardLoading}
                        totaldata={whatsAppAccounts.length}
                        page={page}
                        serverSide={false} // Client-side pagination for mock
                        pageSize={pageSize}
                        onPageChange={(pagevalues) => {
                            setPage(pagevalues.currentPage);
                            setPageSize(pagevalues.pageSize);
                        }}
                    />

                </div>
            </div>

            {/* Create Modal */}
            <Modal open={open} width="600px" onClose={() => setOpen(false)}>
                <div className="superadmin_onboard_modal_header_container">
                    <p className="superadmin_onboard_modal_header">
                        {isEdit ? "Edit WhatsApp Account" : "Create WhatsApp Account"}
                    </p>
                    <Button variant="empty" onClick={() => setOpen(false)}>
                        <Icon name="close" color="#0F172A" size="14" />
                    </Button>
                </div>


                <div className="superadmin_onboard_modal_form">
                    <div className="superadmin_onboard_modal_form_grid">
                        <div className="superadmin_onboard_modal_form_group" style={{ gridColumn: "1 / -1" }}>
                            <label className="form_label">Select Customer</label>
                            <Select
                                name="w_accountId"
                                placeholder="Select Customer"
                                options={accountOptions}
                                value={formData.w_accountId}
                                onChange={(val) => handleSelectChange("w_accountId", val)}
                                showSearch={true}
                            />
                            {errors.w_accountId && <FormInputError message={errors.w_accountId} />}
                        </div>

                        <div className="superadmin_onboard_modal_form_group">
                            <label className="form_label">WhatsApp Number</label>
                            <Input name="w_whatsappNumber" value={formData.w_whatsappNumber} onChange={handleChange} placeholder="Enter Number" />
                            {errors.w_whatsappNumber && <FormInputError message={errors.w_whatsappNumber} />}
                        </div>

                        <div className="superadmin_onboard_modal_form_group">
                            <label className="form_label">Phone Number ID</label>
                            <Input name="w_phNumberId" value={formData.w_phNumberId} onChange={handleChange} placeholder="Enter Phone Number ID" />
                        </div>

                        <div className="superadmin_onboard_modal_form_group">
                            <label className="form_label">API Key</label>
                            <Input name="w_apiKey" value={formData.w_apiKey} onChange={handleChange} placeholder="Enter API Key" />
                        </div>

                        <div className="superadmin_onboard_modal_form_group">
                            <label className="form_label">WABA ID</label>
                            <Input name="w_wabaID" value={formData.w_wabaID} onChange={handleChange} placeholder="Enter WABA ID" />
                        </div>
                    </div>

                    <p style={{ marginTop: "15px", fontWeight: "600", fontSize: "14px" }}>Amount Deduction</p>
                    <hr style={{ margin: "5px 0 15px 0", borderTop: "1px solid #e2e8f0" }} />

                    <div className="superadmin_onboard_modal_form_grid">
                        <div className="superadmin_onboard_modal_form_group">
                            <label className="form_label">Service</label>
                            <Input name="service" type="number" value={formData.service} onChange={handleChange} placeholder="0.00" />
                        </div>
                        <div className="superadmin_onboard_modal_form_group">
                            <label className="form_label">Utility</label>
                            <Input name="utility" type="number" value={formData.utility} onChange={handleChange} placeholder="0.00" />
                        </div>
                        <div className="superadmin_onboard_modal_form_group">
                            <label className="form_label">Marketing</label>
                            <Input name="marketing" type="number" value={formData.marketing} onChange={handleChange} placeholder="0.00" />
                        </div>
                    </div>

                    <div className="superadmin_onboard_modal_form_footer">
                        <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleCreate} disabled={modalLoading}>
                            {modalLoading ? (isEdit ? "Updating..." : "Creating...") : (isEdit ? "Update" : "Create")}
                        </Button>
                    </div>

                </div>
            </Modal>
        </div>
    );
};

export default SuperAdminWhatsAppList;
