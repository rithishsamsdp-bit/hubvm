import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getMonthDays } from "../../../utils/helpers.js";

import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

// shadcn/ui Components
import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import {
  Search,
  Edit,
  Trash2,
  Loader2,
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

function AdminHoliday({ externalModalOpen, onExternalModalClose }) {
  const { authRole } = useAuthStore();

  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const today = new Date();

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(
    parseInt(params.get("per_page")) || 10,
  );
  const [offset, setOffset] = useState(
    (parseInt(params.get("page")) - 1) * pageSize || 0,
  );
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
    startdate: null,
    enddate: null,
    message: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (authRole === "TL") {
      navigate(
        `/tl-phonenumber?tab=Holidays&page=${page}&per_page=${pageSize}`,
      );
    } else if (authRole === "ADMIN") {
      navigate(
        `/admin-phonenumber?tab=Holidays&page=${page}&per_page=${pageSize}`,
      );
    }
  }, [page, pageSize, navigate]);

  useEffect(() => {
    if (externalModalOpen) {
      setFormData(initialFormData);
      setFormErrors({});
      setEditId(null);
      setHolidayModalOpen(true);
    }
  }, [externalModalOpen]);

  useEffect(() => {}, [
    pageSize,
    offset,
    debouncedSearchString,
    sortField,
    sortOrder,
  ]);

  const dummyHolidaysData = useMemo(() => [
    { id: 1, name: "New Year", startdate: new Date(2026, 0, 1), enddate: new Date(2026, 0, 1), message: "Happy New Year!" },
    { id: 2, name: "Pongal", startdate: new Date(2026, 0, 14), enddate: new Date(2026, 0, 15), message: "Happy Pongal!" },
    { id: 3, name: "Republic Day", startdate: new Date(2026, 0, 26), enddate: new Date(2026, 0, 26), message: "Republic Day Holiday" },
    { id: 4, name: "May Day", startdate: new Date(2026, 4, 1), enddate: new Date(2026, 4, 1), message: "Labor Day" },
  ], []);

  const holidays = useMemo(() => {
    return dummyHolidaysData.map((q) => ({
      name: q.name,
      date: q.startdate, 
      message: q.message,
    }));
  }, [dummyHolidaysData]);

  const changeMonth = (offset) => {
    setCalendarMonth((prev) => {
      const newMonth = new Date(
        prev.getFullYear(),
        prev.getMonth() + offset,
        1,
      );
      return newMonth;
    });
  };

  const validateField = (name, value) => {
    switch (name) {
      case "name":
        return value?.trim() ? "" : "Holiday name is required";
      case "startdate":
        return value ? "" : "Start date is required";
      case "enddate":
        return value ? "" : "End date is required";
      case "message":
        return value?.trim() ? "" : "Message is required";
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
    const selectedMembers = selectedIds
      .map((id) => allMemberList.find((m) => m.m_memberId === id))
      .filter(Boolean);
    const ids = selectedMembers.map((m) => m.m_memberId);
    const extensions = selectedMembers.map((m) => m.m_memberExtensionNo);

    setFormData((prev) => ({ ...prev, memberids: ids, extension: extensions }));
    setFormErrors((prev) => ({
      ...prev,
      memberids: validateField("memberids", ids),
    }));
  };

  const handleDateChange = (name, val) => {
    setFormData((prev) => ({ ...prev, [name]: val }));
    setFormErrors((prev) => ({ ...prev, [name]: validateField(name, val) }));
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

    console.log("Holiday Payload Submitted:", payload);

    handleClose();
  };

  const handleEdit = () => {
    console.log("edit");
  };

  const handleDelete = async (id) => {
    console.log("delete", id);
  };

  const handleClose = () => {
    setHolidayModalOpen(false);
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
      title: "Name",
      key: "name",
      sort: true,
      Cell: (row) => row.name,
    },
    {
      title: "Start Date",
      key: "startdate",
      sort: true,
      Cell: (row) => row.startdate?.toLocaleDateString(),
    },
    {
      title: "End Date",
      key: "enddate",
      sort: true,
      Cell: (row) => row.enddate?.toLocaleDateString(),
    },
    {
      title: "Message",
      key: "message",
      sort: true,
      Cell: (row) => row.message,
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
                  onClick={() => handleEdit()}
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
                  onClick={() => handleDelete()}
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
      {/* Header with Switcher and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-4 rounded-md transition-all text-xs font-semibold",
              activeTab === "list"
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500",
            )}
            onClick={() => setActiveTab("list")}
          >
            <List className="w-3.5 h-3.5 mr-2" />
            List View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-4 rounded-md transition-all text-xs font-semibold",
              activeTab === "calendar"
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500",
            )}
            onClick={() => setActiveTab("calendar")}
          >
            <CalendarIcon className="w-3.5 h-3.5 mr-2" />
            Calendar View
          </Button>
        </div>

        {activeTab === "list" && (
          <div className="relative w-[350px] group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              type="text"
              placeholder="Search by Name"
              className="pl-10 placeholder:text-xs bg-white"
              onChange={(e) => setSearchString(e.target.value)}
              value={searchString}
            />
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "list" ? (
          <DataTable
            columns={authRole === "TL" ? tlcolumns : columns}
            data={dummyHolidaysData}
            loading={false}
            totaldata={dummyHolidaysData.length}
            pagination={true}
            page={page}
            serverSide={false}
            pageSize={pageSize}
            onPageChange={({ currentPage, pageSize, sortConfig }) => {
              setPage(currentPage);
              setPageSize(pageSize);
              setOffset(pageSize * (currentPage - 1));
              setSortField(sortConfig.key);
              setSortOrder(sortConfig.direction);
            }}
          />
        ) : (
          <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Calendar Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                {calendarMonth.toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8"
                  onClick={() => changeMonth(-1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px]"
                  onClick={() => setCalendarMonth(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8"
                  onClick={() => changeMonth(1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="bg-slate-50 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200"
                    >
                      {day}
                    </div>
                  ),
                )}

                {getMonthDays(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth(),
                ).map((date, idx) => {
                  if (!date)
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="bg-white min-h-[100px]"
                      />
                    );

                  const holiday = holidays.find(
                    (h) => h.date.toDateString() === date?.toDateString(),
                  );
                  const isToday = date?.toDateString() === today.toDateString();

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "bg-white min-h-[100px] p-2 group relative border-r border-b border-slate-100",
                        isToday && "bg-primary/5",
                      )}
                    >
                      <div
                        className={cn(
                          "text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full",
                          isToday ? "bg-primary text-white" : "text-slate-400",
                        )}
                      >
                        {date?.getDate()}
                      </div>

                      {holiday && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="mt-2 p-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <span className="truncate">{holiday.name}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="bg-slate-900 text-white border-none p-2"
                            >
                              <p className="font-bold text-xs">
                                {holiday.name}
                              </p>
                              <p className="text-[10px] opacity-80 mt-1">
                                {holiday.message}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Holiday Modal */}
      <Dialog open={holidayModalOpen} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent
          className="sm:max-w-[600px] p-0 gap-0"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Holiday" : "Create New Holiday"}
            </DialogTitle>
          </DialogHeader>

          {false ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col bg-[#F1F5F9]"
            >
              <div className="px-6 py-6 space-y-5">
                {/* Name Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter name"
                    className="bg-white"
                  />
                  {formErrors.name && (
                    <p className="text-[11px] text-destructive font-medium">
                      {formErrors.name}
                    </p>
                  )}
                </div>

                {/* Date Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Start date
                    </label>
                    <div className="w-full">
                      <DateTimeRangePicker
                        className="w-full"
                        type="single"
                        showTime={false}
                        initialStart={formData.startdate || new Date()}
                        onChange={(e) => handleDateChange("startdate", e.value)}
                      />
                    </div>
                    {formErrors.startdate && (
                      <p className="text-[11px] text-destructive font-medium">
                        {formErrors.startdate}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      End date
                    </label>
                    <div className="w-full">
                      <DateTimeRangePicker
                        className="w-full"
                        type="single"
                        showTime={false}
                        initialStart={formData.enddate || new Date()}
                        onChange={(e) => handleDateChange("enddate", e.value)}
                      />
                    </div>
                    {formErrors.enddate && (
                      <p className="text-[11px] text-destructive font-medium">
                        {formErrors.enddate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Message Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Message
                  </label>
                  <Textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Enter holiday message"
                    rows={3}
                    className="bg-white"
                  />
                  {formErrors.message && (
                    <p className="text-[11px] text-destructive font-medium">
                      {formErrors.message}
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

export default AdminHoliday;
