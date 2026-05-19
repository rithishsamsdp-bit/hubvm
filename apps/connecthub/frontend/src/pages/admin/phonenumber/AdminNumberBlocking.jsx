import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CountryCodeDropdown, {
  DEFAULT_DIAL,
  DEFAULT_CODE,
  countries,
} from "../../../components/CountryCodeDropdown.jsx";
import { useNumberBlockingStore } from "../../../store/admin/useNumberBlocking.js";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

// shadcn/ui Components
import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Edit, Trash2, Loader2 } from "lucide-react";

function AdminNumberBlocking({ externalModalOpen, onExternalModalClose }) {
  const {
    blacklistData,
    blacklistTotalCount,
    blacklistLoading,
    getBlacklist,
    createBlacklist,
    editBlacklist,
    deleteBlacklist,
    createBlacklistModalLoading,
  } = useNumberBlockingStore();

  const { authRole } = useAuthStore();

  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(
    parseInt(params.get("per_page")) || 10,
  );
  const [offset, setOffset] = useState(
    (parseInt(params.get("page")) - 1) * pageSize || 0,
  );
  const [searchString, setSearchString] = useState("");
  const [sortField, setSortField] = useState("p_blacklistCreatedOn");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [blockingModalOpen, setBlockingModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const debouncedSearchString = useDebounce(searchString, 500);

  const initialFormData = {
    p_blacklistNo: "",
    countryCode: DEFAULT_DIAL,
    countryName: "",
    number: "",
    p_blacklistDescription: "",
    p_blacklistCalltype: "",
    p_blacklistStatus: "Active",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (authRole === "TL") {
      navigate(
        `/tl-phonenumber?tab=Number%20Blocking&page=${page}&per_page=${pageSize}`,
      );
    } else if (authRole === "ADMIN") {
      navigate(
        `/admin-phonenumber?tab=Number%20Blocking&page=${page}&per_page=${pageSize}`,
      );
    }
  }, [page, pageSize, navigate, authRole]);

  useEffect(() => {
    if (externalModalOpen) {
      setFormData(initialFormData);
      setFormErrors({});
      setEditId(null);
      setBlockingModalOpen(true);
    }
  }, [externalModalOpen]);

  useEffect(() => {
    getBlacklist(pageSize, offset, debouncedSearchString, sortField, sortOrder);
  }, [pageSize, offset, debouncedSearchString, sortField, sortOrder]);

  const validateField = (name, value) => {
    switch (name) {
      case "p_blacklistNo":
        // For combined validation, ensure "number" is present and numeric
        // We'll validate `formData.number` here mainly,
        // but `name` passed might be "number" from input
        return "";
      case "number":
        if (!value.trim()) return "Number is required";
        if (!/^\d+$/.test(value)) return "Number must be numeric";
        return "";
      case "countryCode":
        return value ? "" : "Country Code is required";
      case "p_blacklistDescription":
        return value.trim() ? "" : "Description is required";
      case "p_blacklistCalltype":
        return value ? "" : "Call type is required";
      case "p_blacklistStatus":
        return value ? "" : "Status is required";
      default:
        return "";
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleCountryCodeChange = (code, countryObj) => {
    setFormData((prev) => ({
      ...prev,
      countryCode: countryObj.dial,
      countryName: countryObj.name,
    }));
    setFormErrors((prev) => ({ ...prev, countryCode: "" }));
  };

  const handleNumberChange = (e) => {
    const value = e.target.value;
    if (/^[0-9]*$/.test(value)) {
      setFormData((prev) => ({ ...prev, number: value }));
      setFormErrors((prev) => ({
        ...prev,
        number: validateField("number", value),
      }));
    }
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

    if (Object.keys(newErrors).length > 0) return;

    // Combine code and number
    const finalNumber = `${formData.countryCode}${formData.number}`;

    // Create payload without UI-specific fields
    const { countryCode, countryName, number, ...rest } = formData;
    const payload = { ...rest, p_blacklistNo: finalNumber };

    if (editId) payload.p_blacklistId = editId;

    // console.log(payload); // Debugging

    editId ? await editBlacklist(payload) : await createBlacklist(payload);

    handleClose();
    getBlacklist(pageSize, offset, searchString, sortField, sortOrder);
  };

  const handleEdit = (id) => {
    const blacklist = blacklistData.find((b) => b.p_blacklistId === id);
    if (blacklist) {
      setFormData({
        p_blacklistNo: blacklist.p_blacklistNo || "",
        p_blacklistDescription: blacklist.p_blacklistDescription || "",
        p_blacklistCalltype: blacklist.p_blacklistCalltype || "",
        p_blacklistStatus: blacklist.p_blacklistStatus || "Active",
        number: "", // will parse below
        countryCode: "",
        countryName: "",
      });

      // Parse Logic
      const fullNum = String(blacklist.p_blacklistNo || "");
      let foundCountry = null;
      // Sort countries by dial code length desc to match longest prefix first
      const sortedCountries = [...countries].sort(
        (a, b) => b.dial.length - a.dial.length,
      );

      for (const c of sortedCountries) {
        if (fullNum.startsWith(c.dial)) {
          foundCountry = c;
          break;
        }
      }

      setFormData((prev) => ({
        ...prev,
        countryCode: foundCountry ? foundCountry.dial : DEFAULT_DIAL,
        countryName: foundCountry ? foundCountry.name : "",
        number: foundCountry
          ? fullNum.slice(foundCountry.dial.length)
          : fullNum,
      }));

      setEditId(id);
      setBlockingModalOpen(true);
    }
  };

  const handleDelete = async (id) => {
    await deleteBlacklist(id);
    getBlacklist(pageSize, offset, searchString, sortField, sortOrder);
  };

  const handleClose = () => {
    setBlockingModalOpen(false);
    setFormData(initialFormData);
    setEditId(null);
    setFormErrors({});
    onExternalModalClose?.();
  };

  const columns = [
    {
      title: "S.no",
      key: "s_no",
      width: 50,
      Cell: (_row, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: "Phone Number",
      key: "p_blacklistNo",
      sort: true,
      Cell: (row) => row.p_blacklistNo,
    },
    {
      title: "Description",
      key: "p_blacklistDescription",
      sort: true,
      Cell: (row) => row.p_blacklistDescription,
    },
    {
      title: "Call Type",
      key: "p_blacklistCalltype",
      sort: true,
      Cell: (row) => row.p_blacklistCalltype,
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      Cell: (record) => (
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hover:bg-primary/10 hover:text-primary"
                  onClick={() => handleEdit(record.p_blacklistId)}
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hover:bg-rose-50 hover:text-rose-500"
                  onClick={() => handleDelete(record.p_blacklistId)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  const tlcolumns = columns.filter((col) => col.key !== "actions");

  return (
    <div className="p-6 h-full flex flex-col gap-4 overflow-hidden">
      {/* Search Bar */}
      <div className="w-full flex items-center justify-end">
        <div className="relative w-[350px] group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            type="text"
            placeholder="Search by Phone Number"
            className="pl-10 placeholder:text-xs bg-white"
            onChange={(e) => setSearchString(e.target.value)}
            value={searchString}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          columns={authRole === "TL" ? tlcolumns : columns}
          data={blacklistData}
          loading={blacklistLoading}
          totaldata={blacklistTotalCount}
          pagination={true}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={({ currentPage, pageSize, sortConfig }) => {
            setPage(currentPage);
            setPageSize(pageSize);
            setOffset(pageSize * (currentPage - 1));
            setSortField(sortConfig.key || "p_blacklistCreatedOn");
            setSortOrder(sortConfig.direction || "DESC");
          }}
        />
      </div>

      {/* Block Number Modal */}
      <Dialog
        open={blockingModalOpen}
        onOpenChange={(v) => !v && handleClose()}
      >
        <DialogContent className="sm:max-w-[720px] p-0 gap-0">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Number Blocking" : "Create Number Blocking"}
            </DialogTitle>
          </DialogHeader>

          {createBlacklistModalLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col bg-[#F1F5F9]"
            >
              <div className="px-6 py-6 space-y-5 bg-slate-50/50">
                {/* Phone Number Field */}
                <div className="space-y-1.5">
                  <label
                    className="text-xs font-bold text-slate-700"
                    htmlFor="p_blacklistNo"
                  >
                    Phone Number
                  </label>
                  <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary transition-all">
                    <div className="shrink-0 border-r border-slate-200">
                      <CountryCodeDropdown
                        value={
                          countries.find(
                            (c) =>
                              c.dial === formData.countryCode &&
                              c.name === formData.countryName,
                          )?.code ||
                          countries.find((c) => c.dial === formData.countryCode)
                            ?.code ||
                          countries.find((c) => c.code === formData.countryCode)
                            ?.code ||
                          DEFAULT_CODE
                        }
                        onChange={handleCountryCodeChange}
                        error={formErrors.countryCode}
                        placeholder="Country"
                        compact={false}
                        disabled={!!editId}
                      />
                    </div>
                    <input
                      id="number"
                      className="flex-1 px-3 py-2 text-[11px] xl:text-xs 2xl:text-sm bg-transparent outline-none placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter phone number"
                      value={formData.number}
                      onChange={handleNumberChange}
                    />
                  </div>
                  {formErrors.number && (
                    <p className="text-[11px] text-destructive font-medium">
                      {formErrors.number}
                    </p>
                  )}
                </div>

                {/* Call Type & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-bold text-slate-700"
                      htmlFor="p_blacklistCalltype"
                    >
                      Call Type
                    </label>
                    <Select
                      id="p_blacklistCalltype"
                      name="p_blacklistCalltype"
                      value={formData.p_blacklistCalltype}
                      onValueChange={(value) =>
                        handleInputChange({
                          target: { name: "p_blacklistCalltype", value },
                        })
                      }
                      placeholder="Select Call Type"
                      options={[
                        { label: "Incoming", value: "Incoming" },
                        { label: "Outgoing", value: "Outgoing" },
                        { label: "Both", value: "Both" },
                      ]}
                      showSearch={false}
                    />
                    {formErrors.p_blacklistCalltype && (
                      <p className="text-[11px] text-destructive font-medium">
                        {formErrors.p_blacklistCalltype}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-bold text-slate-700"
                      htmlFor="p_blacklistStatus"
                    >
                      Status
                    </label>
                    <Select
                      id="p_blacklistStatus"
                      name="p_blacklistStatus"
                      value={formData.p_blacklistStatus}
                      onValueChange={(value) =>
                        handleInputChange({
                          target: { name: "p_blacklistStatus", value },
                        })
                      }
                      placeholder="Select Status"
                      options={[
                        { label: "Active", value: "Active" },
                        { label: "Inactive", value: "Inactive" },
                      ]}
                      showSearch={false}
                    />
                    {formErrors.p_blacklistStatus && (
                      <p className="text-[11px] text-destructive font-medium">
                        {formErrors.p_blacklistStatus}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label
                    className="text-xs font-bold text-slate-700"
                    htmlFor="p_blacklistDescription"
                  >
                    Description
                  </label>
                  <Input
                    id="p_blacklistDescription"
                    name="p_blacklistDescription"
                    type="text"
                    value={formData.p_blacklistDescription}
                    onChange={handleInputChange}
                    placeholder="Enter Description"
                    className="bg-white"
                  />
                  {formErrors.p_blacklistDescription && (
                    <p className="text-[11px] text-destructive font-medium">
                      {formErrors.p_blacklistDescription}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="bg-[#F1F5F9] border-t border-slate-300">
                <Button type="button" variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="default">
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminNumberBlocking;
