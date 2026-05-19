import React, { useState, useEffect, useRef } from "react";
import "./styles/SuperAdminPhoneNumber.css";
import { Button, Modal, Loader, Select } from "../../components/Index.jsx";
import Icon from "../../constants/Icon.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import SuperAdminPhoneNumberList from "./SuperAdminPhoneNumberList.jsx";
import { usePhoneNumberStore } from "../../store/superadmin/usePhoneNumberStore.js";
import { toast } from "../../store/useToastStore.js";

const tabs = ["Phone Number"];

const SuperAdminPhoneNumber = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const fileRef = useRef(null);

    const [phoneNobatchModalOpen, setPhoneNobatchModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedPeerId, setSelectedPeerId] = useState(null);

    const {
        uploadFile,
        uploadLoading,
        allPeerList = [],
        getAllPeers,
        getCliNumber
    } = usePhoneNumberStore();

    const initialTab = params.get("tab") && tabs.includes(params.get("tab"))
        ? params.get("tab")
        : "Phone Number";

    const [activeTab, setActiveTab] = useState(initialTab);
    const [phoneNumberModalOpen, setPhoneNumberModalOpen] = useState(false);

    // Fetch peers when component mounts
    useEffect(() => {
        getAllPeers();
    }, [getAllPeers]);

    // Sync tab to URL on tab change
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        navigate(`/superadmin-phonenumber?tab=${encodeURIComponent(tab)}`);
    };

    // Sync state with URL on mount
    useEffect(() => {
        const currentTab = params.get("tab");

        if (!currentTab || !tabs.includes(currentTab)) {
            navigate(`/superadmin-phonenumber?tab=${encodeURIComponent("Phone Number")}`, {
                replace: true,
            });
        } else {
            setActiveTab(currentTab);
        }
    }, [navigate, params]);

    const handleCreateButtonClick = () => {
        if (activeTab === "Phone Number") {
            console.log("Opening modal for Phone Number...");
            setPhoneNumberModalOpen(true);
        } else {
            console.log("Unknown tab action");
        }
    };

    const handleFileUploadClick = () => {
        setPhoneNobatchModalOpen(true);
    };

    const handleBatchModalCancel = () => {
        setPhoneNobatchModalOpen(false);
        setSelectedFile(null);
        setSelectedPeerId(null);
        if (fileRef.current) {
            fileRef.current.value = "";
        }
    };

    const openFilePicker = () => {
        fileRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
                toast.error("Please select a CSV file");
                return;
            }
            setSelectedFile(file);
        }
    };

    const clearSelectedFile = () => {
        setSelectedFile(null);
        if (fileRef.current) {
            fileRef.current.value = "";
        }
    };
 const handleDownload = () => {
        const csvContent = "COUNTRYCODE,COUNTRYNAME,NUMBER,TYPE,ACCOUNTCODE\n91,INDIA,72997760329,Tollfree,PTPL";
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "sample-cli.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    const handleBatchUpload = async () => {
        if (!selectedFile) {
            toast.error("Please select a file");
            return;
        }

        if (!selectedPeerId) {
            toast.error("Please select a peer");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("peerid", selectedPeerId);

            const result = await uploadFile(formData);

            if (result) {
                toast.success(result.message || "File uploaded successfully");
                handleBatchModalCancel();
                if (result.errors && Array.isArray(result.errors)) {
                    result.errors.forEach(err => {
                        toast.error(`Row ${err.row}: ${err.error}`);
                    });
                }

                // Refresh the phone number list instead of full page reload
                getCliNumber(10, 0, "", "c_clinumberName", "DESC");
            }
        } catch (error) {
            toast.error(error.message || "Failed to upload file");
        }
    };

    return (
        <div className="superadmin_phonenumber">
            {/* Top Bar */}
            <div className="superadmin_phonenumber_navbar">
                <div>
                    <p className="superadmin_phonenumber_navbar_heading">Phone Number</p>
                    <span className="superadmin_phonenumber_navbar_breadcrumb">
                        <span
                            className="superadmin_phonenumber-breadcrumb-item"
                            onClick={() => navigate("/superadmin-dashboard")}
                        >
                            Dashboard
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span
                            className="superadmin_phonenumber-breadcrumb-item"
                            onClick={() => {
                                navigate(`/superadmin-phonenumber?tab=${encodeURIComponent("Phone Number")}`, {
                                    replace: true,
                                });
                                setActiveTab("Phone Number");
                            }}
                        >
                            Phone Number
                        </span>
                        <Icon name="rightarrow" size={8} color="#334155" />
                        <span className="superadmin_phonenumber-breadcrumb-item active">
                            {activeTab}
                        </span>
                    </span>

                    {/* Tabs */}
                    <div className="superadmin_phonenumber_tabs">
                        {tabs.map((tab) => (
                            <div
                                key={tab}
                                className={`superadmin_phonenumber_tab_item ${activeTab === tab ? "active" : ""}`}
                                onClick={() => handleTabChange(tab)}
                            >
                                {tab}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="superadmin_phonenumber_navbar_button_container">
                    <Button
                        variant="secondary"
                        onClick={handleFileUploadClick}
                    >
                        File upload
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleCreateButtonClick}
                    >
                        {activeTab === "Phone Number" ? "Create Phone Number" : "Action"}
                    </Button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="superadmin_phonenumber_tab_content">
                {activeTab === "Phone Number" && (
                    <SuperAdminPhoneNumberList
                        externalModalOpen={phoneNumberModalOpen}
                        onExternalModalClose={() => setPhoneNumberModalOpen(false)}
                    />
                )}
            </div>

            {/* Batch Upload Modal */}
            <Modal
                open={phoneNobatchModalOpen}
                width="720px"
                onClose={handleBatchModalCancel}
            >
                <div className="superadmin_phonenumber_modal_header_container">
                    <p className="superadmin_phonenumber_useredit_modal_header">Batch Upload</p>
                    <Button variant="empty" onClick={handleBatchModalCancel}>
                        <Icon name="close" color="#0F172A" size={14} />
                    </Button>
                </div>

                {uploadLoading ? (
                    <div style={{ height: "200px" }}>
                        <Loader />
                    </div>
                ) : (
                    <>
                        <div className="superadmin_phonenumber_file_upload_container">
                            {/* Peer Selection */}
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                                    Select Peer *
                                </label>
                                <Select
                                    mode="single"
                                    width="100%"
                                    placeholder="Select a peer"
                                    value={selectedPeerId}
                                    onChange={(value) => setSelectedPeerId(value)}
                                    options={allPeerList?.map((peer) => ({
                                        label: peer.p_peerName || "",
                                        value: peer.p_peerId
                                    })) || []}
                                    showSearch={true}
                                />
                            </div>

                            {/* File Upload Area */}
                            <div
                                className="batch_file_upload"
                                role="button"
                                tabIndex={0}
                                onClick={openFilePicker}
                                onKeyDown={(e) => e.key === "Enter" && openFilePicker()}
                            >
                                <div className="upload_icon_wrapper">
                                    <Icon name="Upload_primary" size={64} />
                                </div>
                                <p>
                                    {selectedFile ? (
                                        <>
                                            Selected:&nbsp;<strong>{selectedFile.name}</strong>{" "}
                                            ({Math.ceil(selectedFile.size / 1024)} KB)
                                        </>
                                    ) : (
                                        <>
                                            <span className="upload_click_text">Click to upload</span> or
                                            drag and drop here
                                        </>
                                    )}
                                </p>
                                <input
                                    id="phonenumber_bulk_upload"
                                    ref={fileRef}
                                    type="file"
                                    accept=".csv"
                                    multiple={false}
                                    onChange={handleFileChange}
                                    style={{ display: "none" }}
                                />
                            </div>

                            {selectedFile && (
                                <div style={{ marginTop: "8px" }}>
                                    <Button variant="empty" onClick={clearSelectedFile}>
                                        <Icon name="deletee" size={14} /> Remove
                                    </Button>
                                </div>
                            )}

                            <p style={{ margin: "16px 0" }}>
                                <strong>If you do not have a file you can use the template below.</strong>{" "}
                                Please limit data in each file to less than 100 records.
                            </p>

                            <Button
                                variant="secondary"
                                className="user_creation_template_btn"
                                onClick={handleDownload}
                            >
                                <Icon name="Export" />
                                Download Sample Template
                            </Button>
                        </div>

                        <div className="superadmin_phonenumber_batchupload_modal_footer">
                            <Button
                                variant="secondary"
                                onClick={handleBatchModalCancel}
                                className="batch_modal_close"
                                disabled={uploadLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleBatchUpload}
                                disabled={!selectedFile || !selectedPeerId || uploadLoading}
                            >
                                {uploadLoading ? "Uploading..." : "Save"}
                            </Button>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default SuperAdminPhoneNumber;
