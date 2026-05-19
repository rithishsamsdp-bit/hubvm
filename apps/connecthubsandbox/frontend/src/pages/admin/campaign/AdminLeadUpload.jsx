
import React, { useState, useEffect, useRef } from "react";
import "./styles/AdminLeadUpload.css";
import { Button, Select } from "../../../components/Index";
import Icon from "../../../constants/Icon.jsx";
import { useLeadUploadStore } from "../../../store/admin/useLeadUploadStore";

const AdminLeadUpload = () => {
    const { campaigns, fetchCampaigns, uploadLeads, downloadCsvFormat, isLoading } = useLeadUploadStore();
    const [selectedCampaign, setSelectedCampaign] = useState(null); // Changed to null for Select component compatibility
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    const handleDownloadFormat = () => {
        downloadCsvFormat(selectedCampaign);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            // Check file type if necessary, assuming CSV
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.name.endsWith('.csv')) {
                setFile(droppedFile);
            } else {
                // simple alert or toast could be added here
                console.log("Please upload a CSV file");
            }
        }
    };

    const handleUploadBoxClick = () => {
        fileInputRef.current.click();
    };

    const handleUpload = async () => {
        const success = await uploadLeads(selectedCampaign, file);
        if (success) {
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="upload_container">
            <div className="upload_header">Upload Leads</div>

            <div className="form_group">
                <label className="form_label">Select Campaign</label>
                <Select
                    placeholder="Select a campaign..."
                    options={campaigns?.map((camp) => ({
                        label: camp.campaignName,
                        value: camp.campaignId,
                    })) || []}
                    value={selectedCampaign}
                    onChange={(val) => setSelectedCampaign(val)}
                    style={{ width: "100%" }}
                    showSearch
                    allowClear
                />

                {selectedCampaign && (
                    <div className="download_link_container">
                        <span className="download_link" onClick={handleDownloadFormat}>
                            ⬇ Download Sample Lead Format
                        </span>
                    </div>
                )}
            </div>

            <div className="form_group">
                <label className="form_label">Upload File</label>
                <div
                    className={`file_upload_area ${isDragging ? "dragging" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleUploadBoxClick}
                >
                    <Icon name="upload" size={28} color="#f97316" />
                    <p className="file_upload_text">
                        <span className="file_upload_link">Click to upload</span> or drag and drop here
                    </p>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="file_input_hidden"
                        ref={fileInputRef}
                    />
                </div>
                {file && (
                    <div className="selected_file_name">
                        Selected: {file.name}
                    </div>
                )}
            </div>

            <div className="upload_actions">
                <Button
                    type="primary"
                    onClick={handleUpload}
                    loading={isLoading}
                    disabled={!selectedCampaign || !file}
                >
                    Upload Leads
                </Button>
            </div>
        </div>
    );
};

export default AdminLeadUpload;
