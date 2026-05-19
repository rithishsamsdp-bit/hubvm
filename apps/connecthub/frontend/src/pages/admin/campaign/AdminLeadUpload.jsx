import React, { useState, useEffect, useRef } from "react";
import { useLeadUploadStore } from "../../../store/admin/useLeadUploadStore";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileSpreadsheet,
  Download,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AdminLeadUpload = () => {
  const {
    campaigns,
    fetchCampaigns,
    uploadLeads,
    downloadCsvFormat,
    isLoading,
  } = useLeadUploadStore();
  const [selectedCampaign, setSelectedCampaign] = useState(undefined);
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
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith(".csv")) {
        setFile(selectedFile);
      }
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
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv")) {
        setFile(droppedFile);
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
    <div className="flex items-center justify-center w-full h-full p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-slate-100 p-8 flex flex-col gap-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-slate-800">Upload Leads</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Select a campaign and upload your lead CSV file
          </p>
        </div>

        {/* Campaign Select */}
        <div className="flex flex-col gap-2">
          <Label>Select Campaign</Label>
          <Select
            key={selectedCampaign ?? "empty"}
            placeholder="Select a campaign..."
            options={
              campaigns?.map((camp) => ({
                label: camp.campaignName,
                value: String(camp.campaignId),
              })) || []
            }
            value={selectedCampaign}
            onValueChange={(val) => setSelectedCampaign(val)}
            showSearch
            allowClear
            onClear={() => setSelectedCampaign(undefined)}
            contentClassName="max-h-64"
          />
          {selectedCampaign && (
            <button
              type="button"
              className="self-start flex items-center gap-1.5 text-xs text-primary hover:underline"
              onClick={handleDownloadFormat}
            >
              <Download className="w-3.5 h-3.5" />
              Download Sample Format
            </button>
          )}
        </div>

        {/* Unified Drop Zone */}
        <div
          className={cn(
            "group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 py-10 px-6",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : file
                ? "border-emerald-200 bg-emerald-50/30 hover:border-emerald-400"
                : "border-slate-200 bg-slate-50/50 hover:border-primary/50 hover:bg-slate-50",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadBoxClick}
        >
          <div
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
              file
                ? "bg-emerald-100"
                : "bg-white shadow group-hover:bg-primary/10 group-hover:scale-110",
            )}
          >
            {file ? (
              <FileSpreadsheet className="w-7 h-7 text-emerald-500" />
            ) : (
              <Upload
                className={cn(
                  "w-7 h-7 text-slate-400 group-hover:text-primary transition-colors",
                  isDragging && "text-primary animate-bounce",
                )}
              />
            )}
          </div>

          <div className="text-center space-y-1">
            {file ? (
              <>
                <p className="text-sm font-semibold text-slate-700 truncate max-w-[320px]">
                  {file.name}
                </p>
                <p className="text-xs text-emerald-600 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready to upload
                </p>
                <button
                  type="button"
                  className="text-[11px] text-rose-400 hover:text-rose-600 hover:underline flex items-center justify-center gap-1 mx-auto mt-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="w-3 h-3" /> Remove file
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700">
                  <span className="text-primary font-semibold">
                    Click to upload
                  </span>{" "}
                  or drag &amp; drop
                </p>
                <p className="text-xs text-slate-400">
                  CSV files only — Max. 10MB
                </p>
              </>
            )}
          </div>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
          />
        </div>

        {/* Upload Button */}
        <Button
          className="w-full h-11 font-semibold shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-white transition-all active:scale-[0.98]"
          onClick={handleUpload}
          disabled={!selectedCampaign || !file || isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {isLoading ? "Uploading..." : "Upload Leads"}
        </Button>
      </div>
    </div>
  );
};

export default AdminLeadUpload;
