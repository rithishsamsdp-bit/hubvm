import { useEffect, useState, useCallback } from "react";
import "../../pages/agent/styles/AgentContactbook.css";

import { useAdminContactStore } from "../../store/admin/useAdminContactStore";
import { useNavigate, useLocation } from "react-router-dom";
import { getAvatarText, formatSecsToHMS } from "../../utils/helpers.js";
import Icon from "../../constants/Icon.jsx";
import { Modal, Tooltip, Button, FormInputError, Input, Table, Loader } from "../../components/Index.jsx";
// import { useConversationStore } from "../../store/agent/useConversationStore.js";


// Import the global CountryCodeDropdown
import CountryCodeDropdown, { DEFAULT_DIAL, DEFAULT_CODE, countries } from "../../components/CountryCodeDropdown.jsx";
import { parsePhoneNumber } from "../../components/countryUtils.js";

/* ---------------- Main Component ---------------- */
const AdminContactbook = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);


    const {
        contactData,
        isContactLoading,
        getContact,
        contactTotalCount,
        createContact,
        editContact,
        deleteContact,
        contactCreationLoading,
        getChatHistory,
        chatLoading,
        conversationChat
    } = useAdminContactStore();

    // const { selectedCampaign } = useConversationStore();

    const initialFormData = {
        name: "",
        countryCode: DEFAULT_CODE,
        phone: "",
        email: "",
        organization: "",
        address: "",
    };

    const [page, setPage] = useState(parseInt(params.get("page")) || 1);
    const [pageSize, setpageSize] = useState(parseInt(params.get("per_page")) || 10);
    const [offset, setOffset] = useState((parseInt(params.get("page")) - 1) * pageSize || 0);
    const [searchString, setSearchString] = useState("");
    const [selectedChar, setSelectedChar] = useState("");
    const [sortField, setSortField] = useState("");
    const [sortOrder, setSortOrder] = useState("");
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState(initialFormData);
    const [editId, setEditId] = useState("");
    const [open, setOpen] = useState(false);
    const [openViewModal, setOpenViewModal] = useState(false);
    const [selectedData, setSelectedData] = useState(null);

    useEffect(() => {
        navigate(`/admin-contactbook?page=${page}&per_page=${pageSize}`);
    }, [contactData, page, pageSize]);

    useEffect(() => {
        getContact(pageSize, offset, sortField, sortOrder, searchString, selectedChar);
    }, [pageSize, offset, sortField, sortOrder, searchString, selectedChar]);

    const columns = [
        {
            title: "S.no",
            key: "s_no",
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        },
        { title: "Name", key: "c_Name", sort: true },
        { title: "Country Code", key: "c_countryCode" },
        { title: "Phone Number", key: "c_phoneNumber", sort: true },
        { title: "Email Id", key: "c_mailId", sort: true },
        { title: "Organization Name", key: "c_organizationName" },
        { title: "Address", key: "c_address" },
        { title: "Created By", key: "c_createdByName", sort: true },
        {
            title: "Actions",
            key: "actions",
            Cell: (record) => (
                <div className="agent_contactbook_action_conatiner">
                    <Tooltip content="View">
                        <Button variant="empty" onClick={() => handleView(record)}>
                            <Icon name="eye" size={17} color="#5F6368" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Edit">
                        <Button variant="empty" onClick={() => handleEdit(record.c_id)}>
                            <Icon name="edit" size={15} color="#5F6368" />
                        </Button>
                    </Tooltip>
                    <Tooltip content="Delete">
                        <Button variant="empty" onClick={() => handleDelete(record.c_id)}>
                            <Icon name="deletee" size={15} color="#5F6368" />
                        </Button>
                    </Tooltip>
                </div>
            ),
        },
    ];

    /* ---------------- Validation ---------------- */
    const validateField = (name, value) => {
        switch (name) {
            case "name":
                if (!value.trim()) return "Name is required";
                return "";
            case "countryCode":
                if (!value) return "Country code is required";
            case "phone":
                if (!value) return "Phone number is required";
                // allow variable length, but restrict characters
                // if (!/^[0-9*#]+$/.test(value)) return "Only digits, * and # allowed";
                return "";
            // case "email":
            //   if (!value) return "Email is required";
            //   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email";
            //   return "";
            case "organization":
                if (!value.trim()) return "Organization is required";
                return "";
            default:
                return "";
        }
    };

    /* ---------------- Change handlers ---------------- */
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "phone" && !/^[0-9*#]*$/.test(value)) return;
        if (name === "countryCode" && !/^\d*$/.test(value) && value.length > 3) return; // Allow dial code digits or short ISO code

        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    };

    const handleCountryChange = (_dial, countryObj) => {
        setFormData((prev) => ({ ...prev, countryCode: countryObj.code }));
        setErrors((prev) => ({ ...prev, countryCode: validateField("countryCode", countryObj.code) }));
    };

    /* ---------------- Submit (Create) ---------------- */
    const handleSubmit = useCallback(
        async (e) => {
            e.preventDefault();
            const newErrors = {};
            Object.entries(formData).forEach(([key, val]) => {
                const err = validateField(key, val);
                if (err) newErrors[key] = err;
            });
            setErrors(newErrors);
            if (Object.keys(newErrors).length > 0) return;

            try {
                // Convert ISO code back to dial code for backend
                const selectedCountry = countries.find(c => c.code === formData.countryCode);
                const payload = {
                    ...formData,
                    countryCode: selectedCountry?.dial || formData.countryCode
                };
                await createContact(payload);
                setEditId("");
                setOpen(false);
                setFormData(initialFormData);
                setErrors({});
                await getContact(pageSize, offset, sortField, sortOrder, searchString, selectedChar);
            } catch (err) {
                console.error("Create failed:", err);
            }
        },
        [
            formData,
            createContact,
            getContact,
            initialFormData,
            pageSize,
            offset,
            sortField,
            sortOrder,
            searchString,
            selectedChar,
        ]
    );

    const handleCancel = () => {
        setFormData(initialFormData);
        setErrors({});
        setEditId("");
        setOpen(false);
    };

    /* ---------------- Edit ---------------- */
    const handleEdit = useCallback(
        (id) => {
            const contact = contactData.find((c) => c.c_id === id);
            if (!contact) return;
            setEditId(id);

            const rawPhone = String(contact.c_phoneNumber || "");
            const parsedPhone = parsePhoneNumber(rawPhone, DEFAULT_DIAL);

            const {
                c_Name: name,
                c_mailId: email,
                c_organizationName: organization,
                c_address: address = "",
            } = contact;

            // Map dial code to ISO if possible (default to dial code if not found, but UI prefers ISO)
            const mappedCountry = countries.find(c => c.dial === parsedPhone.countryCode);

            setFormData({
                name,
                countryCode: mappedCountry?.code || parsedPhone.countryCode,
                phone: parsedPhone.localNumber,
                email,
                organization,
                address,
            });
            setOpen(true);
        },
        [contactData]
    );

    const handleEditSubmit = useCallback(
        async (e) => {
            e.preventDefault();

            const newErrors = {};
            Object.entries(formData).forEach(([key, val]) => {
                const err = validateField(key, val);
                if (err) newErrors[key] = err;
            });
            setErrors(newErrors);
            if (Object.keys(newErrors).length > 0) return;

            try {
                const selectedCountry = countries.find(c => c.code === formData.countryCode);
                const payload = {
                    ...formData,
                    countryCode: selectedCountry?.dial || formData.countryCode,
                    id: editId
                };
                await editContact(payload);
                setOpen(false);
                setEditId("");
                setFormData(initialFormData);
                setErrors({});
                await getContact(pageSize, offset, sortField, sortOrder, searchString, selectedChar);
            } catch (updateErr) {
                console.error("Failed to edit contact:", updateErr);
            }
        },
        [
            formData,
            editContact,
            initialFormData,
            editId,
            getContact,
            pageSize,
            offset,
            sortField,
            sortOrder,
            searchString,
            selectedChar,
        ]
    );

    /* ---------------- Delete ---------------- */
    const handleDelete = useCallback(
        async (id) => {
            try {
                await deleteContact(id);
                await getContact(pageSize, offset, sortField, sortOrder, searchString, selectedChar);
            } catch (err) {
                console.error("Failed to delete contact:", err);
            }
        },
        [deleteContact, getContact, pageSize, offset, sortField, sortOrder, searchString, selectedChar]
    );



    /* ---------------- View ---------------- */
    const handleView = (data) => {
        const contact = contactData.find((c) => c.c_id === data.c_id);
        getChatHistory(data);
        if (contact) {
            setSelectedData({
                name: contact.c_Name,
                countrycode: contact.c_countryCode,
                phone: contact.c_phoneNumber,
                email: contact.c_mailId,
                organization: contact.c_organizationName,
                address: contact.c_address,
                color: "green"
            });
            setTimeout(() => setOpenViewModal(true), 0);
        }
    };

    return (
        <div className="agent_contactbook">
            <div className="navbar_1">
                <div>
                    <p className="navbar_1_heading">Contact Book</p>
                    <span className="navbar_1_breadcrumb">
                        <span
                            className="navbar_1_breadcrumb_item"
                            onClick={() => {

                                navigate("/admin-dashboard")

                            }}
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="navbar_1_breadcrumb_item active">
                            Contact Book
                        </span>
                    </span>
                </div>
                <div>
                    <Button type="primary" onClick={() => setOpen(true)}>Create Contact</Button>
                </div>
            </div>

            <div className="agent_contactbook_container">

                <div className="agent_contactbook_table_search">
                    <Input
                        type="text"
                        placeholder="Search by Name, Phone number, Email id"
                        width="600px"
                        suffixIcon="search"
                        suffixIconColor="#334155"
                        onChange={(e) => setSearchString(e.target.value)}
                        value={searchString}
                    />

                    <div className="agent_contactbook_character_filter_container">
                        {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter) => (
                            <button
                                key={letter}
                                className={
                                    "agent_contactbook_character_filter_btn" + (selectedChar === letter ? "_active" : "")
                                }
                                onClick={() => {
                                    const next = selectedChar === letter ? "" : letter;
                                    setSelectedChar(next);
                                    setPage(1);
                                    setOffset(0);
                                }}
                            >
                                {letter}
                            </button>
                        ))}
                        <Button
                            variant="empty"
                            className="agent_contactbook_filter_clear_button"
                            onClick={() => {
                                setSelectedChar("");
                                setSearchString("");
                            }}
                        >
                            Clear all
                        </Button>
                    </div>
                </div>

                <Table
                    columns={columns}
                    data={contactData}
                    loading={isContactLoading}
                    totaldata={contactTotalCount}
                    page={page}
                    serverSide
                    pageSize={pageSize}
                    onPageChange={(pagevalues) => {
                        setTimeout(() => {
                            setPage(pagevalues.currentPage);
                            setpageSize(pagevalues.pageSize);
                            setOffset(pagevalues.pageSize * pagevalues.currentPage - pagevalues.pageSize);
                            setSortField(pagevalues.sortConfig.key);
                            setSortOrder(pagevalues.sortConfig.direction);
                        });
                    }}
                />
            </div>

            {/* Create/Edit Modal */}
            <Modal open={open} width="720px" onClose={() => setOpen(false)}>
                <div className="agent_contactbook_modal_header_container">
                    <p className="agent_contactbook_modal_header">{editId !== "" ? "Edit Contact" : "Create New Contact"}</p>
                    <Button variant="empty" onClick={handleCancel}><Icon name="close" color="#0F172A" size="14" /></Button>
                </div>

                {contactCreationLoading ? (<div style={{ height: 200 }}><Loader /></div>) : (
                    <>
                        {/* FORM: Name → Email → Country Code → Phone → Org → Address */}
                        <form className="agent_contactbook_modal_form" onSubmit={editId !== "" ? handleEditSubmit : handleSubmit}>
                            <div className="agent_contactbook_modal_form_grid">
                                {/* 1) Name */}
                                <div className="agent_contactbook_modal_form_group">
                                    <label className="form_label" htmlFor="name">Name</label>
                                    <Input
                                        id="name"
                                        name="name"
                                        type="text"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Enter name"
                                    />
                                    {errors.name && <FormInputError message={errors.name} />}
                                </div>

                                {/* 2) Email ID */}
                                <div className="agent_contactbook_modal_form_group">
                                    <label className="form_label" htmlFor="email">Email ID</label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Enter email address"
                                    />
                                    {errors.email && <FormInputError message={errors.email} />}
                                </div>

                                {/* 3) Country Code - Using the global component */}
                                <div className="agent_contactbook_modal_form_group">
                                    <label className="form_label" htmlFor="countryCode">Country Code</label>
                                    <CountryCodeDropdown
                                        value={formData.countryCode}
                                        onChange={handleCountryChange}
                                        error={errors.countryCode}
                                    />
                                    {errors.countryCode && <FormInputError message={errors.countryCode} />}
                                </div>

                                {/* 4) Phone Number */}
                                <div className="agent_contactbook_modal_form_group">
                                    <label className="form_label" htmlFor="phone">Phone Number</label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="text"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="Enter phone number"
                                    />
                                    {errors.phone && <FormInputError message={errors.phone} />}
                                </div>

                                {/* 5) Organization Name */}
                                <div className="agent_contactbook_modal_form_group">
                                    <label className="form_label" htmlFor="organization">Organization Name</label>
                                    <Input
                                        id="organization"
                                        name="organization"
                                        type="text"
                                        value={formData.organization}
                                        onChange={handleChange}
                                        placeholder="Enter organization name"
                                    />
                                    {errors.organization && <FormInputError message={errors.organization} />}
                                </div>

                                {/* 6) Address */}
                                <div className="agent_contactbook_modal_form_group agent_contactbook_modal_form_group_address">
                                    <label className="form_label" htmlFor="address">Address</label>
                                    <Input
                                        type="textarea"
                                        id="address"
                                        name="address"
                                        rows={3}
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Enter address"
                                    />
                                    {errors.address && <FormInputError message={errors.address} />}
                                </div>
                            </div>

                            <div className="agent_contactbook_modal_footer">
                                <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                                <Button variant="primary" type="submit">Save</Button>
                            </div>
                        </form>
                    </>
                )}
            </Modal>
            {/* End Create/Edit Modal */}

            {/* View Modal */}
            <Modal open={openViewModal} width="920px" onClose={() => setOpenViewModal(false)}>
                {chatLoading ? (
                    <div style={{ height: "200px" }}>
                        <Loader />
                    </div>
                ) : (
                    <div className="agent_contactbook_modal_container">
                        <div className="agent_contactbook_view_modal_header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div className="agent_contactbook_right_user_info" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div className="agent_contactbook_right_user_avatar">
                                    <p className="agent_contactbook_right_user_avatar_text">
                                        {selectedData ? getAvatarText(selectedData?.name) : ""}
                                    </p>
                                </div>
                                <div className="agent_contactbook_right_user_name">{selectedData?.name || "N/A"}</div>
                            </div>
                            <Button variant="empty" onClick={() => setOpenViewModal(false)}>
                                <Icon name="close" color="#0F172A" size="14" />
                            </Button>
                        </div>

                        <div className="agent_contactbook_split_container">
                            {/* Left - Messages */}
                            <div className="agent_contactbook_conversation_message_container" style={{ width: "100%", height: "500px" }}>
                                {conversationChat &&
                                    Object.entries(conversationChat).map(
                                        ([date, items]) => (
                                            <div key={date}>
                                                <div className="agent_contactbook_conversation_message_chat_date_container">
                                                    <p className="agent_contactbook_conversation_message_chat_date">
                                                        {date}
                                                    </p>
                                                </div>
                                                {items.map((item, idx) => {
                                                    const time = new Date(
                                                        item.activityTimestamp
                                                    ).toLocaleTimeString("en-IN", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    });
                                                    const isSelf =
                                                        item.direction.toLowerCase() ===
                                                        "outbound";
                                                    const sender = isSelf
                                                        ? item?.memberName ?? "Agent"
                                                        : selectedData.name || "Unknown";

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`agent_contactbook_conversation_message_row ${isSelf ? "self" : "other"
                                                                }`}
                                                        >
                                                            <div className="agent_contactbook_conversation_message_avatar_container">
                                                                <div
                                                                    className="agent_contactbook_conversation_message_avatar"
                                                                    style={{
                                                                        backgroundColor: isSelf
                                                                            ? ""
                                                                            : selectedData?.colour,
                                                                    }}
                                                                >
                                                                    {isSelf
                                                                        ? sender.charAt(0)
                                                                        : selectedData
                                                                            ? getAvatarText(selectedData?.name)
                                                                            : ""}
                                                                </div>
                                                            </div>
                                                            <div className="agent_contactbook_conversation_message_wrapper">
                                                                <div className="agent_contactbook_conversation_message_sender_details">
                                                                    <p className="agent_contactbook_conversation_message_sender_name">
                                                                        {sender}
                                                                    </p>
                                                                    <p className="agent_contactbook_conversation_message_sender_time">
                                                                        {time}
                                                                    </p>
                                                                </div>
                                                                <div
                                                                    className="agent_contactbook_conversation_message_card"
                                                                    style={{
                                                                        backgroundColor: isSelf
                                                                            ? ""
                                                                            : "#F4F8FF",
                                                                    }}
                                                                >
                                                                    {item.type === "Call" ? (
                                                                        <div>
                                                                            <div className="agent_contactbook_conversation_message_call_card_title">
                                                                                <div className="agent_contactbook_conversation_conversation_message_call_card_1">
                                                                                    <div className="agent_contactbook_conversation_message_call_card_title_icon">
                                                                                        {item.details
                                                                                            .c_disposition &&
                                                                                            item.details.c_disposition
                                                                                                .toLowerCase()
                                                                                                .startsWith(
                                                                                                    "missed"
                                                                                                ) && (
                                                                                                <Icon
                                                                                                    name="missedcall"
                                                                                                    color="#CE0000"
                                                                                                    size={12}
                                                                                                />
                                                                                            )}
                                                                                        {item.details
                                                                                            .c_disposition &&
                                                                                            item.details.c_disposition
                                                                                                .toLowerCase()
                                                                                                .startsWith(
                                                                                                    "ans"
                                                                                                ) && (
                                                                                                <Icon
                                                                                                    name={
                                                                                                        isSelf
                                                                                                            ? "outgoing"
                                                                                                            : "incoming"
                                                                                                    }
                                                                                                    color="#16A34A"
                                                                                                    size={12}
                                                                                                />
                                                                                            )}
                                                                                        {item.details
                                                                                            .c_disposition &&
                                                                                            item.details.c_disposition
                                                                                                .toLowerCase()
                                                                                                .startsWith(
                                                                                                    "busy"
                                                                                                ) && (
                                                                                                <Icon
                                                                                                    name="outgoing"
                                                                                                    color="#6A6A6A"
                                                                                                    size={12}
                                                                                                />
                                                                                            )}
                                                                                        {item.details
                                                                                            .c_disposition &&
                                                                                            item.details.c_disposition
                                                                                                .toLowerCase()
                                                                                                .startsWith(
                                                                                                    "failed"
                                                                                                ) && (
                                                                                                <Icon
                                                                                                    name={
                                                                                                        isSelf
                                                                                                            ? "outgoing"
                                                                                                            : "incoming"
                                                                                                    }
                                                                                                    color="#CE0000"
                                                                                                    size={12}
                                                                                                />
                                                                                            )}
                                                                                        {item.details
                                                                                            .c_disposition &&
                                                                                            item.details.c_disposition
                                                                                                .toLowerCase()
                                                                                                .startsWith("no") && (
                                                                                                <Icon
                                                                                                    name={
                                                                                                        isSelf
                                                                                                            ? "outgoing"
                                                                                                            : "incoming"
                                                                                                    }
                                                                                                    color="#CE0000"
                                                                                                    size={12}
                                                                                                />
                                                                                            )}
                                                                                    </div>
                                                                                    {item.details
                                                                                        ?.c_disposition || "Call"}
                                                                                </div>

                                                                                {formatSecsToHMS(
                                                                                    item.details?.c_duration
                                                                                )}
                                                                            </div>
                                                                            <div className="agent_contactbook_conversation_message_call_notes_container">
                                                                                <p className="agent_contactbook_conversation_message_call_notes_heading">
                                                                                    Hung up by{" "}
                                                                                    {item.details
                                                                                        ?.c_terminationEnd || ""}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <>{item.content}</>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )
                                    )}
                            </div>

                            {/* Right - Personal Info */}
                            <div className="agent_contactbook_personal_info_container">
                                <h4>Personal Information</h4>
                                <div className="agent_contactbook_personal_info_form">
                                    <div className="agent_contactbook_personal_info_field">
                                        <label>Name</label>
                                        <Input type="text" value={selectedData?.name || ""} disabled />
                                    </div>
                                    <div className="agent_contactbook_personal_info_field">
                                        <label>Email ID</label>
                                        <Input type="email" value={selectedData?.email || ""} disabled />
                                    </div>
                                    <div className="agent_contactbook_personal_info_field">
                                        <label>Country Code</label>
                                        <Input type="text" value={selectedData?.countrycode || ""} disabled />
                                    </div>
                                    <div className="agent_contactbook_personal_info_field">
                                        <label>Contact Number</label>
                                        <Input type="text" value={selectedData?.phone || ""} disabled />
                                    </div>
                                    <div className="agent_contactbook_personal_info_field">
                                        <label>Organization Name</label>
                                        <Input type="text" value={selectedData?.organization || ""} disabled />
                                    </div>
                                    <div className="agent_contactbook_personal_info_field">
                                        <label>Address</label>
                                        <Input type="textarea" value={selectedData?.address || ""} rows={3} disabled />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


            </Modal>
            {/* End View Modal */}
        </div>
    );
};

export default AdminContactbook;
