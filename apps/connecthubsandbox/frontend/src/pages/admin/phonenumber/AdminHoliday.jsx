import { useState, useEffect, useMemo } from "react";
import "./styles/AdminHoliday.css";
import Button from "../../../components/Button";
import Icon from "../../../constants/Icon.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { getMonthDays } from "../../../utils/helpers.js";
import {
    Modal,
    FormInputError,
    Input,
    Table,
    Loader,
    DateTimeRangePicker
} from "../../../components/Index.jsx";
import { useQueueStore } from "../../../store/admin/useQueueStore.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

function AdminHoliday({ externalModalOpen, onExternalModalClose }) {
    const {
        queueGroupData,
        queuegroupTotalCount,
        queueGroupLoading,
        allMemberList,
        getAllMember,
        createQueuegroup,
        editQueuegroup,
        deleteQueuegroup,
        createQueueModalLoading
    } = useQueueStore();

    const { authRole } = useAuthStore();

    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const today = new Date();

    const [page, setPage] = useState(parseInt(params.get("page")) || 1);
    const [pageSize, setPageSize] = useState(parseInt(params.get("per_page")) || 10);
    const [offset, setOffset] = useState((parseInt(params.get("page")) - 1) * pageSize || 0);
    const [searchString, setSearchString] = useState("");
    const [sortField, setSortField] = useState("");
    const [sortOrder, setSortOrder] = useState("");
    const [holidayModalOpen, setHolidayModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const debouncedSearchString = useDebounce(searchString, 500);
    const [activeTab, setActiveTab] = useState("list");
    const [calendarMonth, setCalendarMonth] = useState(new Date());


    const initialFormData = {
        name: "",
        memberids: [],
        extension: [],
        strategy: "",
        timeout: "",
    };

    const [formData, setFormData] = useState(initialFormData);
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (authRole === "TL") {
            navigate(`/tl-phonenumber?tab=Holidays&page=${page}&per_page=${pageSize}`);
        } else if (authRole === "ADMIN") {
            navigate(`/admin-phonenumber?tab=Holidays&page=${page}&per_page=${pageSize}`);
        }
    }, [page, pageSize, navigate]);

    useEffect(() => {
        if (externalModalOpen) {
            setHolidayModalOpen(true);
        }
    }, [externalModalOpen]);

    useEffect(() => {
    }, [pageSize, offset, debouncedSearchString, sortField, sortOrder]);

    const holidays = useMemo(() => {
        return queueGroupData.map(q => ({
            name: q.q_queuegroupName,
            date: new Date(q.q_queuegroupStrategy), // assuming strategy is date
            message: q.q_queuegroupTimeout
        }));
    }, [queueGroupData]);

    const changeMonth = (offset) => {
        setCalendarMonth(prev => {
            const newMonth = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
            return newMonth;
        });
    };


    const validateField = (name, value) => {
        switch (name) {
            case "name":
                return value.trim() ? "" : "Queue name is required";
            case "startdate":
                return "Start date is required";
            case "enddate":
                return "End date is required";
            case "message":
                return !value || isNaN(value) || parseInt(value) <= 0 ? "Valid timeout is required" : "";
            default:
                return "";
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setFormErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    };

    const handleMemberChange = (selectedIds) => {
        const selectedMembers = selectedIds.map(id => allMemberList.find(m => m.m_memberId === id)).filter(Boolean);
        const ids = selectedMembers.map((m) => m.m_memberId);
        const extensions = selectedMembers.map((m) => m.m_memberExtensionNo);

        setFormData((prev) => ({ ...prev, memberids: ids, extension: extensions }));
        setFormErrors((prev) => ({ ...prev, memberids: validateField("memberids", ids) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};
        Object.entries(formData).forEach(([key, val]) => {
            const err = validateField(key, val);
            if (err) newErrors[key] = err;
        });
        setFormErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        const payload = { ...formData };
        if (editId) payload.id = editId;

        editId ? await editQueuegroup(payload) : await createQueuegroup(payload);

        handleClose();
    };

    const handleEdit = (id) => {
        const queue = queueGroupData.find((q) => q.q_queuegroupId === id);
        if (queue) {
            setFormData({
                name: queue.q_queuegroupName || "",
                memberids: queue.members.map((m) => m.m_memberId),
                extension: queue.members.map((m) => m.m_memberExtensionNo),
                strategy: queue.q_queuegroupStrategy || "",
                timeout: queue.q_queuegroupTimeout || "",
            });
            setEditId(id);
            setHolidayModalOpen(true);
            getAllMember();
        }
    };

    const handleDelete = async (id) => {
        await deleteQueuegroup(id);
    };

    const handleClose = () => {
        setHolidayModalOpen(false);
        setFormData(initialFormData);
        setEditId(null);
        setFormErrors({});
        onExternalModalClose?.();
    };

    const columns = [
        { title: "S.no", key: "s_no", Cell: (_row, index) => (page - 1) * pageSize + index + 1 },
        { title: "Name", key: "q_queuegroupName", Cell: (row) => row.q_queuegroupName },
        { title: "Dates", key: "q_queuegroupStrategy", Cell: (row) => row.q_queuegroupStrategy },
        { title: "Messgae", key: "q_queuegroupTimeout", Cell: (row) => row.q_queuegroupTimeout },
        {
            title: "Actions",
            key: "actions",
            Cell: (record) => (
                <div className="admin_holiday_action_container">
                    <Button variant="empty" onClick={() => handleEdit(record.q_queuegroupId)}>
                        <Icon name="edit" size={15} color="#5F6368" />
                    </Button>
                    <Button variant="empty" onClick={() => handleDelete(record.q_queuegroupId)}>
                        <Icon name="deletee" size={15} color="#5F6368" />
                    </Button>
                </div>
            ),
        },
    ];

    const tlcolumns = columns.filter((col => col.key !== 'actions'));

    return (
        <>
            <div className="admin_holiday_creation_container">
                <div className="admin_holiday_container_table_search">
                    <div className="admin_holiday_switcher">
                        <div
                            className={`admin_holiday_switcher_tab_item_tab_item ${activeTab === "list" ? "active" : ""
                                }`}
                            onClick={() => setActiveTab("list")}
                        >
                            List
                        </div>
                        <div
                            className={`admin_holiday_switcher_tab_item_tab_item ${activeTab === "calendar" ? "active" : ""
                                }`}
                            onClick={() => setActiveTab("calendar")}
                        >
                            Calendar
                        </div>
                        {/* TODO:Filters */}
                    </div>
                    {activeTab === "list" && (
                        <Input
                            type="text"
                            placeholder="Search by Name"
                            width="400px"
                            suffixIcon="search"
                            suffixIconColor="#334155"
                            onChange={(e) => setSearchString(e.target.value)}
                            value={searchString}
                        />
                    )}

                </div>
                {activeTab === "list" && (
                    <Table
                        columns={authRole === "TL" ? tlcolumns : columns}
                        data={queueGroupData}
                        loading={queueGroupLoading}
                        totalRecords={queuegroupTotalCount}
                        page={page}
                        serverSide
                        pageSize={pageSize}
                        onPageChange={({ currentPage, pageSize, sortConfig }) => {
                            setPage(currentPage);
                            setPageSize(pageSize);
                            setOffset(pageSize * (currentPage - 1));
                            setSortField(sortConfig.key);
                            setSortOrder(sortConfig.direction);
                        }}
                    />
                )}
                {activeTab === "calendar" && (
                    <div className="month-calendar-container">
                        <div className="calendar-header">

                            <h3>{calendarMonth.toLocaleString("default", { month: "long", year: "numeric" })}</h3>
                            <Button onClick={() => changeMonth(-1)}><Icon name="leftarrow" size={12} /></Button>
                            <Button onClick={() => changeMonth(1)}><Icon name="rightarrow" size={12} /></Button>
                        </div>

                        <div className="calendar-grid">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                <div className="calendar-day-header" key={day}>{day}</div>
                            ))}

                            {getMonthDays(calendarMonth.getFullYear(), calendarMonth.getMonth()).map((date, idx) => {
                                const holiday = holidays.find(h => h.date.toDateString() === date?.toDateString());

                                return (
                                    <div
                                        key={idx}
                                        className={`calendar-day 
    ${holiday ? "holiday" : ""}
    ${date?.toDateString() === today.toDateString() ? "today" : ""}
  `}
                                    >                                        <div className="calendar-date-number">{date?.getDate()}</div>
                                        {holiday && (
                                            <div className="holiday-label" title={holiday.message}>
                                                🎉 {holiday.name}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>

            <Modal open={holidayModalOpen} width="720px" onClose={handleClose}>
                <div className="admin_holiday_modal_header_container">
                    <p className="admin_holiday_modal_header">{editId ? "Edit Holiday" : "Create New Holiday"}</p>
                    <Button variant="empty" onClick={handleClose}><Icon name="close" color="#0F172A" size="14" /></Button>
                </div>

                {(createQueueModalLoading) ? (
                    <div style={{ height: "200px" }}><Loader /></div>
                ) : (
                    <form className="admin_holiday_modal_form" onSubmit={handleSubmit}>
                        <div className="admin_holiday_modal_form_grid">
                            <div className="admin_holiday_modal_form_group full-width">
                                <label className="form_label" htmlFor="name">Name</label>
                                <Input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} placeholder="Enter  name" />
                                {formErrors.name && <FormInputError message={formErrors.name} />}
                            </div>
                        </div>
                        <div className="admin_holiday_modal_form_grid">
                            <div className="admin_holiday_modal_form_group">
                                <label className="form_label" htmlFor="strategy">Start date</label>
                                <DateTimeRangePicker
                                    type="single"
                                    showTime={false}
                                    // onChange={}
                                    format="YYYY-MM-DD"
                                />
                                {formErrors.strategy && <FormInputError message={formErrors.strategy} />}
                            </div>
                            <div className="admin_holiday_modal_form_group">
                                <label className="form_label" htmlFor="timeout">End date</label>
                                <DateTimeRangePicker
                                    type="single"
                                    showTime={false}
                                    // onChange={}
                                    format="YYYY-MM-DD"
                                />
                                {formErrors.timeout && <FormInputError message={formErrors.timeout} />}
                            </div>
                        </div>
                        <div className="admin_holiday_modal_form_grid">
                            <div className="admin_holiday_modal_form_group">
                                <label className="form_label" htmlFor="memberids">Message</label>
                                <Input
                                    type="textarea"
                                />
                                {formErrors.memberids && <FormInputError message={formErrors.memberids} />}
                            </div>
                        </div>
                        <div className="admin_holiday_modal_footer">
                            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                            <Button variant="primary" type="submit">Save</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </>
    );
}

export default AdminHoliday;
