import { useEffect, useState, useCallback, useMemo } from "react";
import { useCallFlow } from "../../../store/useCallFlow.js";
import { useNavigate, useLocation } from "react-router-dom";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// UI Components
import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Eye, Edit, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Assets
import directLine from "../../../assets/callflow/directline.png";
import businessHours from "../../../assets/callflow/businesshours.png";
import ivrRouting from "../../../assets/callflow/ivrcallrouting.png";
import startFromScratch from "../../../assets/callflow/stratch.png";

const callFlowSchema = z.object({
  callflowName: z.string().min(1, "Call Flow Name is required"),
  template: z.string().min(1, "Please select a template"),
});

const AdminCallFlowList = ({ externalModalOpen, onExternalModalClose }) => {
  const {
    callFlowData,
    callFlowLoading,
    getCallflow,
    callFlowDataTotalCount,
    deleteCallflow,
  } = useCallFlow();

  const { authRole } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  // State
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
  const [callFlowModalOpen, setCallFlowModalOpen] = useState(false);
  const debouncedSearchString = useDebounce(searchString, 500);

  const form = useForm({
    resolver: zodResolver(callFlowSchema),
    defaultValues: {
      callflowName: "",
      template: "",
    },
  });

  // URL Sync
  useEffect(() => {
    const path = authRole === "TL" ? "/tl-phonenumber" : "/admin-phonenumber";
    navigate(`${path}?tab=Call%20Flow&page=${page}&per_page=${pageSize}`);
  }, [page, pageSize, navigate, authRole]);

  // External Modal Sync
  useEffect(() => {
    if (externalModalOpen) setCallFlowModalOpen(true);
  }, [externalModalOpen]);

  // Data Fetching
  useEffect(() => {
    getCallflow(pageSize, offset, debouncedSearchString, sortField, sortOrder);
  }, [
    pageSize,
    offset,
    debouncedSearchString,
    sortField,
    sortOrder,
    getCallflow,
  ]);

  const handleClose = () => {
    setCallFlowModalOpen(false);
    form.reset();
    onExternalModalClose?.();
  };

  const onSubmit = (values) => {
    navigate(
      `/admin-flowmapping?name=${encodeURIComponent(
        values.callflowName,
      )}&template=${values.template}`,
    );
  };

  const handlePageChange = useCallback((pagevalues) => {
    setPage(pagevalues.currentPage);
    setPageSize(pagevalues.pageSize);
    setOffset(pagevalues.pageSize * (pagevalues.currentPage - 1));
    setSortField(pagevalues.sortConfig?.key || "");
    setSortOrder(pagevalues.sortConfig?.direction || "");
  }, []);

  const handleDelete = useCallback(
    async (id, name) => {
      try {
        await deleteCallflow(id, name);
        getCallflow(
          pageSize,
          offset,
          debouncedSearchString,
          sortField,
          sortOrder,
        );
      } catch (err) {
        console.error("Delete failed:", err);
      }
    },
    [
      deleteCallflow,
      getCallflow,
      pageSize,
      offset,
      debouncedSearchString,
      sortField,
      sortOrder,
    ],
  );

  const handleEdit = useCallback(
    (id, name) => {
      navigate(
        `/admin-flowmapping-edit?editid=${id}&name=${encodeURIComponent(name)}`,
      );
    },
    [navigate],
  );

  const handleView = useCallback(
    (id, name) => {
      const prefix = authRole === "TL" ? "/tl" : "/admin";
      navigate(
        `${prefix}-flowmapping-view?viewid=${id}&name=${encodeURIComponent(name)}`,
      );
    },
    [navigate, authRole],
  );

  const columns = useMemo(
    () => [
      {
        title: "S.no",
        key: "s_no",
        width: 50,
        Cell: (_row, index) => (page - 1) * pageSize + index + 1,
      },
      {
        title: "Call flow name",
        key: "c_callflowName",
        sort: true,
      },
      {
        title: "Actions",
        key: "actions",
        width: 120,
        Cell: (record) => (
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-primary/10 hover:text-primary"
                    onClick={() =>
                      handleView(record.c_callflowId, record.c_callflowName)
                    }
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View</TooltipContent>
              </Tooltip>

              {authRole === "ADMIN" && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="hover:bg-blue-50 hover:text-blue-600"
                        onClick={() =>
                          handleEdit(record.c_callflowId, record.c_callflowName)
                        }
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
                        onClick={() =>
                          handleDelete(
                            record.c_callflowId,
                            record.c_callflowName,
                          )
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </>
              )}
            </TooltipProvider>
          </div>
        ),
      },
    ],
    [page, pageSize, authRole, handleView, handleEdit, handleDelete],
  );

  const templates = [
    {
      key: "direct",
      title: "Direct Line",
      img: directLine,
      desc: "Simple direct line setup",
    },
    {
      key: "businesshour",
      title: "Business Hours",
      img: businessHours,
      desc: "Route calls based on working hours",
    },
    {
      key: "callrouting",
      title: "IVR Call Routing",
      img: ivrRouting,
      desc: "Advanced IVR call routing options",
    },
    {
      key: "scratch",
      title: "Start From Scratch",
      img: startFromScratch,
      desc: "Build your IVR flow manually",
    },
  ];

  return (
    <div className="p-6 h-full flex flex-col gap-4 overflow-hidden">
      <div className="w-full flex items-center justify-end">
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
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={callFlowData || []}
          loading={callFlowLoading}
          totaldata={callFlowDataTotalCount}
          pagination={true}
          page={page}
          serverSide
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>

      <Dialog
        open={callFlowModalOpen}
        onOpenChange={(v) => !v && handleClose()}
      >
        <DialogContent className="w-[95vw] max-w-[1100px] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>IVR Builder</DialogTitle>
            <p className="text-xs text-muted-foreground font-medium">
              Name your call flow and choose a template to get started
            </p>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col flex-1 min-h-0 bg-[#F1F5F9]"
            >
              <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
                {/* Flow Name Field */}
                <FormField
                  control={form.control}
                  name="callflowName"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Call Flow Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Main Office IVR"
                          className="bg-white h-11 max-w-lg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                {/* Template Selection */}
                <div className="space-y-3">
                  <FormLabel>Choose Template</FormLabel>
                  <FormField
                    control={form.control}
                    name="template"
                    render={({ field }) => (
                      <>
                        <div className="grid grid-cols-2 lg:grid-cols-2 gap-5">
                          {templates.map((tpl) => {
                            const isSelected = field.value === tpl.key;
                            return (
                              <div
                                key={tpl.key}
                                onClick={() => field.onChange(tpl.key)}
                                className={cn(
                                  "group relative flex flex-col rounded-xl border-2 transition-all duration-200 cursor-pointer overflow-hidden",
                                  isSelected
                                    ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20"
                                    : "border-slate-200 hover:border-slate-300 hover:shadow-lg",
                                )}
                              >
                                {/* Image Area */}
                                <div
                                  className={cn(
                                    "relative w-full h-52 flex items-center justify-center transition-colors",
                                    isSelected
                                      ? "bg-primary/5"
                                      : "bg-slate-50 group-hover:bg-slate-100/80",
                                  )}
                                >
                                  {isSelected && (
                                    <div className="absolute top-3 right-3 z-10">
                                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                      </div>
                                    </div>
                                  )}
                                  <img
                                    src={tpl.img}
                                    alt={tpl.title}
                                    className="max-w-[90%] max-h-[90%] object-scale-down transition-transform duration-200 group-hover:scale-105"
                                  />
                                </div>

                                {/* Text Area */}
                                <div
                                  className={cn(
                                    "px-4 py-4 text-center border-t transition-colors",
                                    isSelected
                                      ? "bg-white border-primary/20"
                                      : "bg-white border-slate-100",
                                  )}
                                >
                                  <h4
                                    className={cn(
                                      "font-bold text-sm tracking-tight transition-colors",
                                      isSelected
                                        ? "text-primary"
                                        : "text-slate-800",
                                    )}
                                  >
                                    {tpl.title}
                                  </h4>
                                  <p className="text-[11px] text-slate-400 font-medium leading-snug mt-1">
                                    {tpl.desc}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <FormMessage className="text-[11px] mt-2" />
                      </>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="bg-[#F1F5F9] border-t border-slate-300">
                <Button type="button" variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="default">
                  Create & Continue
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCallFlowList;
