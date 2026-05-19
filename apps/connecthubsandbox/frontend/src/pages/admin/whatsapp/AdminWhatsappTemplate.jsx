import React, { useEffect, useState, useMemo, useCallback } from "react";
import "./styles/AdminWhatsappTemplate.css";
import "../../agent/conversation/styles/ConversationMessageContainer.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useDebounce } from "../../../hooks/useDebounce.js";
import Icon from "../../../constants/Icon.jsx";
import {
    Button,
    Input,
    Table,
    Modal,
    Popupconfirm,
} from "../../../components/Index.jsx";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useWaTemplateStore } from "../../../store/admin/whatsapp/useWaTemplateStore.js";

const AdminWhatsappTemplate = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);

    const { authRole } = useAuthStore();
    const { templates, getTemplates, getTemplatesLoading, deleteTemplate, deleteTemplateLoading } = useWaTemplateStore();

    const [page, setPage] = useState(parseInt(params.get("page")) || 1);
    const [pageSize, setPageSize] = useState(parseInt(params.get("per_page")) || 10);
    const [offset, setOffset] = useState((parseInt(params.get("page")) - 1) * pageSize || 0);
    const [sortField, setSortField] = useState("");
    const [sortOrder, setSortOrder] = useState("");
    const [searchString, setSearchString] = useState("");
    const debouncedSearch = useDebounce(searchString, 500);

    // Preview Modal State
    const [showPreview, setShowPreview] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState(null);

    // Delete Confirmation State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState(null);

    const handlePreview = useCallback((template) => {
        setPreviewTemplate(template);
        setShowPreview(true);
    }, []);

    const closePreview = useCallback(() => {
        setShowPreview(false);
        setPreviewTemplate(null);
    }, []);

    useEffect(() => {
        if (authRole === "TL") {
            navigate(`/tl-whatsapp?tab=Template&page=${page}&per_page=${pageSize}`);
        }
        else if (authRole === "ADMIN") {
            navigate(`/admin-whatsapp?tab=Template&page=${page}&per_page=${pageSize}`);

        }
    }, [page, pageSize, navigate]);

    useEffect(() => {
        getTemplates(pageSize, offset, debouncedSearch, sortField, sortOrder);
    }, [pageSize, offset, debouncedSearch, sortField, sortOrder]);

    const handleEdit = useCallback(
        async (id) => {
            // navigate(`/admin-edit-phonenumber?editId=${id}`);
        },
        []
    );

    const openDeleteConfirm = useCallback((templateName) => {
        if (!templateName) return;
        setTemplateToDelete(templateName);
        setShowDeleteConfirm(true);
    }, []);

    const closeDeleteConfirm = useCallback(() => {
        setShowDeleteConfirm(false);
        setTemplateToDelete(null);
    }, []);

    const handleDelete = useCallback(
        async () => {
            if (!templateToDelete) return;

            try {
                const success = await deleteTemplate(templateToDelete);
                if (success) {
                    // Refresh the template list
                    await getTemplates(pageSize, offset, debouncedSearch, sortField, sortOrder);
                }
            } catch (err) {
                console.error("Delete failed:", err);
            } finally {
                closeDeleteConfirm();
            }
        },
        [templateToDelete, pageSize, offset, debouncedSearch, sortField, sortOrder, deleteTemplate, getTemplates, closeDeleteConfirm]
    );

    const columns = useMemo(() => [
        {
            title: "S.no",
            key: "s_no",
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        },
        { title: "Template Name", key: "templateName" },
        { title: "Template Category", key: "templateCategory" },
        {
            title: "Template Status",
            key: "templateStatus",
            Cell: (record) => {
                const status = record.templateStatus?.toLowerCase();
                let statusClass = "";
                if (status === "approved") statusClass = "status_approved";
                else if (status === "pending") statusClass = "status_pending";
                else if (status === "rejected") statusClass = "status_rejected";
                return <span className={statusClass}>{record.templateStatus || "-"}</span>;
            }
        },
        { title: "Language", key: "templateLanguage" },
        {
            title: "Created On",
            key: "createdOn",
            Cell: (record) => {
                if (!record.createdOn) return "-";
                const date = new Date(record.createdOn);
                return date.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                });
            }
        },
        {
            title: "Preview",
            key: "preview",
            Cell: (record) => (
                <button
                    className="template_preview_btn"
                    onClick={() => handlePreview(record)}
                    title="Preview Template"
                >
                    <Icon name="eye" width={18} height={18} color="#5F6368" />
                </button>
            ),
        },
        {
            title: "Action",
            key: "actions",
            Cell: (record) => (
                <button
                    className="template_delete_btn"
                    onClick={() => openDeleteConfirm(record.templateName)}
                    title="Delete Template"
                    disabled={deleteTemplateLoading}
                >
                    <Icon name="deletee" width={18} height={18} color="#5F6368" />
                </button>
            ),
        },

    ], [page, pageSize, handleEdit, handleDelete, handlePreview, deleteTemplateLoading, openDeleteConfirm]);

    const tlcolumns = columns.filter((col => col.key !== 'actions'));

    return (
        <>
            <div className="admin_whatsapp_template_list_container">
                <div className="admin_whatsapp_template_list_container_table_search">
                    <Input
                        type="text"
                        placeholder="Search by name"
                        width="400px"
                        suffixIcon="search"
                        suffixIconColor="#334155"
                        onChange={(e) => setSearchString(e.target.value)}
                        value={searchString}
                    />
                </div>
                <Table
                    columns={authRole === "TL" ? tlcolumns : columns}
                    data={templates || []}
                    loading={getTemplatesLoading}
                    // totaldata={}
                    page={page}
                    serverSide
                    pageSize={pageSize}
                    onPageChange={(pagevalues) => {
                        setPage(pagevalues.currentPage);
                        setPageSize(pagevalues.pageSize);
                        setOffset(pagevalues.pageSize * (pagevalues.currentPage - 1));
                        setSortField(pagevalues.sortConfig.key);
                        setSortOrder(pagevalues.sortConfig.direction);
                    }}
                />
            </div>

            {/* Template Preview Modal using Modal component */}
            <Modal
                open={showPreview}
                onClose={closePreview}
                width="480px"
            >
                <div className="template_preview_modal_header_container">
                    <p className="template_preview_modal_header">Template Preview</p>
                    <Button variant="empty" onClick={closePreview}>
                        <Icon name="close" color="#0F172A" size={14} />
                    </Button>
                </div>

                {previewTemplate && (
                    <div className="template_preview_modal_content">

                        {/* WhatsApp Style Template Message - Same as ConversationMessageContainer */}
                        <div className="conversation_message_card">
                            <div className="wa-template-message">
                                {previewTemplate.templateStructure?.components?.map((comp, idx) => (
                                    <React.Fragment key={idx}>
                                        {comp.type === "BODY" && <p className="wa-template-body">{comp.text}</p>}
                                        {comp.type === "FOOTER" && <p className="wa-template-footer">{comp.text}</p>}
                                        {comp.type === "BUTTONS" && (
                                            <div className="wa-template-buttons">
                                                {comp.buttons?.map((btn, btnIdx) => (
                                                    btn.type === "url" ? (
                                                        <a
                                                            key={btnIdx}
                                                            href={btn.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="wa-template-btn"
                                                        >
                                                            <Icon name="link" size={16} /> {btn.text}
                                                        </a>
                                                    ) : btn.type === "phone_number" ? (
                                                        <span key={btnIdx} className="wa-template-btn">
                                                            📞 {btn.text}
                                                        </span>
                                                    ) : (
                                                        <span key={btnIdx} className="wa-template-btn">{btn.text}</span>
                                                    )
                                                ))}
                                            </div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation Popup */}
            <Popupconfirm
                isOpen={showDeleteConfirm}
                onConfirm={handleDelete}
                onCancel={closeDeleteConfirm}
                title="Delete Template"
                message={`Are you sure you want to delete template "${templateToDelete}"?`}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </>
    );
};

export default AdminWhatsappTemplate;


