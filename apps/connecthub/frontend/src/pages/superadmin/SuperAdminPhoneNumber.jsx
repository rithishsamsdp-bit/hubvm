import React, { useState, useEffect, useRef, useMemo } from "react";
import { Navbar } from "../../components/Index.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import SuperAdminPhoneNumberList from "./SuperAdminPhoneNumberList.jsx";
import { usePhoneNumberStore } from "../../store/superadmin/usePhoneNumberStore.js";
import { toast } from "../../store/useToastStore.js";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, Trash2, Download, Loader2 } from "lucide-react";

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
    getCliNumber,
  } = usePhoneNumberStore();

  const initialTab =
    params.get("tab") && tabs.includes(params.get("tab"))
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
      navigate(
        `/superadmin-phonenumber?tab=${encodeURIComponent("Phone Number")}`,
        { replace: true },
      );
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
    const csvContent =
      "COUNTRYCODE,COUNTRYNAME,NUMBER,TYPE,ACCOUNTCODE\n91,INDIA,72997760329,Tollfree,PTPL";
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
          result.errors.forEach((err) => {
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

  const peerOptions = useMemo(
    () =>
      (allPeerList || []).map((peer) => ({
        label: peer.p_peerName || "",
        value: String(peer.p_peerId),
      })),
    [allPeerList],
  );

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden">
      {/* Top Bar */}
      <Navbar
        title="Phone Number"
        breadcrumbs={[
          { label: "Onboard", route: "/superadmin-onboard" },
          {
            label: "Phone Number",
            onClick: () => {
              navigate(
                `/superadmin-phonenumber?tab=${encodeURIComponent("Phone Number")}`,
                { replace: true },
              );
              setActiveTab("Phone Number");
            },
          },
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
                onClick={() => handleTabChange(tab)}
              >
                {tab}
              </div>
            ))}
          </div>
        }
      >
        <Button variant="secondary" onClick={handleFileUploadClick}>
          <Upload className="w-4 h-4 mr-2" />
          File Upload
        </Button>
        <Button variant="default" onClick={handleCreateButtonClick}>
          {activeTab === "Phone Number" ? "Create Phone Number" : "Action"}
        </Button>
      </Navbar>

      {/* Tab Content */}
      <div className="w-full h-[calc(100%-131px)] p-6 overflow-y-auto overflow-x-hidden">
        {activeTab === "Phone Number" && (
          <SuperAdminPhoneNumberList
            externalModalOpen={phoneNumberModalOpen}
            onExternalModalClose={() => setPhoneNumberModalOpen(false)}
          />
        )}
      </div>

      {/* Batch Upload Dialog */}
      <Dialog
        open={phoneNobatchModalOpen}
        onOpenChange={(v) => !v && handleBatchModalCancel()}
      >
        <DialogContent className="sm:max-w-[720px] p-0 gap-0">
          <DialogHeader>
            <DialogTitle>Batch Upload</DialogTitle>
          </DialogHeader>

          {uploadLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="px-6 py-5 space-y-5 bg-[#F1F5F9]">
                {/* Peer Selection */}
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold text-slate-600">
                    Select Peer <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    options={peerOptions}
                    value={selectedPeerId ? String(selectedPeerId) : ""}
                    onValueChange={(value) => setSelectedPeerId(value)}
                    placeholder="Select a peer"
                    showSearch={true}
                    allowClear={true}
                    onClear={() => setSelectedPeerId(null)}
                    triggerClassName="bg-white border-slate-200"
                  />
                </div>

                {/* File Upload Area */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openFilePicker}
                  onKeyDown={(e) => e.key === "Enter" && openFilePicker()}
                  className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-200 rounded-xl bg-white cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-200 group"
                >
                  <div className="p-3 bg-primary/5 rounded-xl group-hover:bg-primary/10 transition-colors">
                    <Upload className="w-8 h-8 text-primary/60 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-center">
                    {selectedFile ? (
                      <p className="text-sm text-slate-700">
                        Selected:{" "}
                        <strong className="text-slate-900">
                          {selectedFile.name}
                        </strong>{" "}
                        <span className="text-slate-400">
                          ({Math.ceil(selectedFile.size / 1024)} KB)
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">
                        <span className="font-semibold text-primary">
                          Click to upload
                        </span>{" "}
                        or drag and drop here
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">
                      CSV files only
                    </p>
                  </div>
                  <input
                    id="phonenumber_bulk_upload"
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    multiple={false}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                    onClick={clearSelectedFile}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Remove file
                  </Button>
                )}

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-700">
                    <strong>
                      If you do not have a file you can use the template below.
                    </strong>{" "}
                    Please limit data in each file to less than 100 records.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleDownload}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download Sample Template
                  </Button>
                </div>
              </div>

              <DialogFooter className="bg-[#F1F5F9] border-t border-slate-300">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBatchModalCancel}
                  disabled={uploadLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleBatchUpload}
                  disabled={!selectedFile || !selectedPeerId || uploadLoading}
                >
                  {uploadLoading ? "Uploading..." : "Save"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminPhoneNumber;
