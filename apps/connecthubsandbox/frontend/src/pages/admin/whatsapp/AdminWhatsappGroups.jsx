import React, { useState, useEffect, useRef } from "react";
import { Button, Table, Input, Modal, Popupconfirm } from "../../../components/Index.jsx";
import Icon from "../../../constants/Icon.jsx";
import { toast } from "../../../store/useToastStore.js";
import { useWhatsappStore } from "../../../store/admin/whatsapp/useWhatsappStore.js";
import "./styles/AdminWhatsappGroups.css";

// Helper to format date
const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const AdminWhatsappGroups = ({ isModalOpen, onClose }) => {
    const {
        groups, totalGroups, getGroupsLoading, getGroups,
        createGroup, createGroupLoading, deleteGroup
    } = useWhatsappStore();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");

    // Modal State
    const [groupName, setGroupName] = useState("");
    const [file, setFile] = useState(null);
    const [duplicates, setDuplicates] = useState([]);
    const [showDuplicates, setShowDuplicates] = useState(false);

    // Delete Confirmation State
    const [deleteGroupId, setDeleteGroupId] = useState(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        const offset = (page - 1) * pageSize;
        getGroups(pageSize, offset, search);
    }, [page, pageSize, search]);

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setDuplicates([]);
        setShowDuplicates(false);

        if (selectedFile.name.endsWith('.csv')) {
            const text = await selectedFile.text();
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length > 1) {
                const seen = new Set();
                const dups = [];
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (seen.has(line)) {
                        dups.push(line);
                    } else {
                        seen.add(line);
                    }
                }
                if (dups.length > 0) {
                    setDuplicates(dups);
                    setShowDuplicates(true);
                }
            }
        }
    };

    // Handle Create Group
    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            toast.error("Please enter a group name");
            return;
        }
        if (!file) {
            toast.error("Please upload a file");
            return;
        }

        let finalFile = file;

        // Auto-remove duplicates for CSV if detected
        if (duplicates.length > 0 && file.name.endsWith('.csv')) {
            try {
                const text = await file.text();
                const lines = text.split(/\r?\n/).filter(l => l.trim());
                if (lines.length > 1) {
                    const uniqueLines = [];
                    const seen = new Set();

                    // Keep header
                    uniqueLines.push(lines[0]);

                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!seen.has(line)) {
                            seen.add(line);
                            uniqueLines.push(line);
                        }
                    }

                    const newContent = uniqueLines.join("\n");
                    finalFile = new File([newContent], file.name, { type: file.type });
                    toast.info(`Removed ${duplicates.length} duplicates before creating group`);
                }
            } catch (error) {
                console.error("Error removing duplicates:", error);
                toast.error("Failed to process duplicates");
                return;
            }
        }

        const formData = new FormData();
        formData.append("groupName", groupName);
        formData.append("file", finalFile);

        const success = await createGroup(formData);
        if (success) {
            onClose();
            setGroupName("");
            setFile(null);
            setDuplicates([]);
            setShowDuplicates(false);
            const offset = (page - 1) * pageSize;
            getGroups(pageSize, offset, search);
        }
    };

    const handleDeleteClick = (groupId) => {
        setDeleteGroupId(groupId);
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (deleteGroupId) {
            const success = await deleteGroup(deleteGroupId);
            if (success) {
                const offset = (page - 1) * pageSize;
                getGroups(pageSize, offset, search);
            }
            setIsDeleteConfirmOpen(false);
            setDeleteGroupId(null);
        }
    };

    const columns = [
        {
            title: "S.no",
            key: "s_no",
            Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
        },
        {
            title: "Group Name",
            key: "groupName",
        },
        {
            title: "Contacts Count",
            key: "totalContacts",
        },
        {
            title: "Created At",
            key: "createdAt",
            Cell: (row) => formatDate(row.createdAt)
        },
        {
            title: "Action",
            key: "action",
            Cell: (row) => (
                <Button variant="empty" onClick={() => handleDeleteClick(row._id)}>
                    <Icon name="deletee" size={16} />
                </Button>
            )
        }
    ];

    return (
        <div className="admin-whatsapp-groups-container">
            {/* Header Actions */}
            <div className="groups-header-actions">
                <div className="groups-search-wrapper">
                    <Input
                        placeholder="Search Groups..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        suffixIcon="search"
                        suffixIconColor="#334155"
                    />
                </div>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                data={groups}
                totaldata={totalGroups}
                page={page}
                pageSize={pageSize}
                onPageChange={(val) => {
                    setPage(val.currentPage);
                    setPageSize(val.pageSize);
                }}
                loading={getGroupsLoading}
            />

            <Modal
                open={isModalOpen}
                onClose={onClose}
                width="500px"
            >
                <div className="group-modal-container">
                    {/* Header */}
                    <div className="group-modal-header">
                        <h3 className="group-modal-title">Create New Group</h3>
                        <Button variant="empty" onClick={onClose} className="group-modal-close-btn-style">
                            <Icon name="close" size={14} />
                        </Button>
                    </div>

                    {/* Body */}
                    <div className="group-modal-body">
                        {/* Group Name */}
                        <div>
                            <label className="group-form-label">Group Name</label>
                            <Input
                                placeholder="Enter Group Name"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                        </div>

                        {/* File Upload */}
                        <div>
                            <label className="group-form-label">Upload Contacts (CSV/Excel)</label>
                            <div
                                className="file-upload-area"
                                onClick={() => fileInputRef.current.click()}
                            >
                                {file ? (
                                    <div className="file-name-display">{file.name}</div>
                                ) : (
                                    <div className="file-upload-placeholder">
                                        <Icon name="upload" size={24} className="upload-icon-style" />
                                        Click to browse or drag file
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: "none" }}
                                    accept=".csv, .xlsx, .xls"
                                    onChange={handleFileChange}
                                />
                            </div>

                            {/* Duplicate Warning */}
                            {showDuplicates && (
                                <div style={{
                                    marginTop: 10,
                                    padding: 10,
                                    backgroundColor: '#fffbeb',
                                    border: '1px solid #fbbf24',
                                    borderRadius: 6
                                }}>
                                    <div style={{ fontWeight: 600, color: '#b45309', marginBottom: 4 }}>
                                        ⚠️ Potential Duplicates Found: {duplicates.length}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#92400e', maxHeight: 60, overflowY: 'auto' }}>
                                        {duplicates.slice(0, 5).map((d, i) => (
                                            <div key={i}>{d}</div>
                                        ))}
                                        {duplicates.length > 5 && <div>...and {duplicates.length - 5} more</div>}
                                    </div>
                                </div>
                            )}

                            <div className="sample-download-wrapper">
                                <a href="#" className="sample-download-link"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        // Basic CSV download logic
                                        const csvContent = "Country Code,Mobile Number\n91,9999999999";
                                        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                                        const link = document.createElement("a");
                                        const url = URL.createObjectURL(blob);
                                        link.setAttribute("href", url);
                                        link.setAttribute("download", "sample_group.csv");
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                >
                                    Download Sample CSV
                                </a>
                            </div>
                        </div>

                        <div className="group-modal-footer">
                            <Button variant="secondary" onClick={onClose}>Cancel</Button>
                            <Button type="primary" onClick={handleCreateGroup} disabled={createGroupLoading}>
                                {createGroupLoading ? "Creating..." : "Create Group"}
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            <Popupconfirm
                isOpen={isDeleteConfirmOpen}
                onConfirm={handleConfirmDelete}
                onCancel={() => {
                    setIsDeleteConfirmOpen(false);
                    setDeleteGroupId(null);
                }}
                title="Delete Group"
                message="Are you sure you want to delete this group? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div >
    );
};

export default AdminWhatsappGroups;
