import { useEffect, useState, useCallback, useMemo } from "react";
import { useWhatsappPeerStore } from "../../store/superadmin/useWhatsappPeerStore";
import { useNavigate, useLocation } from "react-router-dom";
import { useDebounce } from "../../hooks/useDebounce.js";
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
import { Search, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// ---------- Zod Schema ----------
const whatsappPeerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  secret: z.string().min(1, "Secret is required"),
  host: z.string().min(1, "Host is required"),
  port: z
    .string()
    .min(1, "Port is required")
    .regex(/^[0-9]+$/, "Port must be numeric")
    .refine(
      (v) => {
        const n = parseInt(v, 10);
        return n >= 1 && n <= 65535;
      },
      { message: "Port must be 1–65535" },
    ),
  proxyId: z.string().min(1, "Proxy is required"),
});

const SuperAdminWhatsappPeer = ({
  externalModalOpen,
  onExternalModalClose,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const {
    PeerData,
    PeerTotalCount,
    isPeerLoading,
    getPeersfetch,
    createPeerNew,
    deletePeer,
    modalLoading,
    getProxy,
    isProxyLoading,
    proxyData,
  } = useWhatsappPeerStore();

  const [page, setPage] = useState(Number(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(
    Number(params.get("per_page")) || 10,
  );
  const [offset, setOffset] = useState((page - 1) * pageSize);
  const [whatsapppeerModalOpen, setWhatsappPeerModalOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [searchString, setSearchString] = useState("");
  const debouncedSearchString = useDebounce(searchString, 500);

  const form = useForm({
    resolver: zodResolver(whatsappPeerSchema),
    defaultValues: {
      name: "",
      secret: "",
      host: "",
      port: "",
      proxyId: "",
    },
  });

  useEffect(() => {
    navigate(
      `/superadmin-peer?tab=Whatsapp%20Peer&page=${page}&per_page=${pageSize}`,
      { replace: true },
    );
  }, [page, pageSize, navigate]);

  useEffect(() => {
    getPeersfetch(
      pageSize,
      offset,
      sortField,
      sortOrder,
      debouncedSearchString,
    );
  }, [
    pageSize,
    offset,
    debouncedSearchString,
    sortField,
    sortOrder,
    getPeersfetch,
  ]);

  useEffect(() => {
    if (externalModalOpen) {
      setWhatsappPeerModalOpen(true);
      loadFormDependencies();
    }
  }, [externalModalOpen]);

  const loadFormDependencies = async () => {
    try {
      await Promise.all([getProxy()]);
    } catch (err) {
      console.error("Failed to load form dependencies:", err);
      setWhatsappPeerModalOpen(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setEditId("");
    setWhatsappPeerModalOpen(false);
    onExternalModalClose?.();
  };

  // ---------- Proxy options ----------
  const proxyOptions = useMemo(
    () =>
      (proxyData || []).map((p) => ({
        label: p.p_proxyDomainName,
        value: String(p.p_proxyId),
      })),
    [proxyData],
  );

  // Build a lookup map for proxy metadata
  const proxyMetaMap = useMemo(() => {
    const map = {};
    (proxyData || []).forEach((p) => {
      map[String(p.p_proxyId)] = {
        name: p.p_proxyDomainName,
        ip: p.p_proxyIPAddress,
        codex: p.p_codexName,
        dir: p.p_proxyDirectoryName,
        domain: p.p_proxyDomainName,
      };
    });
    return map;
  }, [proxyData]);

  // ---------- Submit ----------
  const onSubmit = async (values) => {
    const proxyMeta = proxyMetaMap[values.proxyId] || {};

    const payload = {
      ...values,
      proxyName: proxyMeta.name || "",
      proxyIPAddress: proxyMeta.ip || "",
      proxyCodexName: proxyMeta.codex || "",
      proxyDirectoryName: proxyMeta.dir || "",
    };

    try {
      await createPeerNew(payload);
      handleCancel();
      await getPeersfetch(
        pageSize,
        offset,
        sortField,
        sortOrder,
        debouncedSearchString,
      );
    } catch (err) {
      console.error("Save failed:", err);
      form.setError("root", {
        type: "manual",
        message: err?.response?.data?.message || "Failed to save peer.",
      });
    }
  };

  // ---------- Delete ----------
  const handleDelete = useCallback(
    async (id) => {
      try {
        await deletePeer(id);
        await getPeersfetch(
          pageSize,
          offset,
          sortField,
          sortOrder,
          debouncedSearchString,
        );
      } catch (err) {
        console.error("Delete failed:", err);
      }
    },
    [
      deletePeer,
      getPeersfetch,
      pageSize,
      offset,
      sortField,
      sortOrder,
      debouncedSearchString,
    ],
  );

  // ---------- Field config for dynamic rendering ----------
  const fieldsConfig = [
    { name: "name", label: "Name", placeholder: "Enter name" },
    { name: "secret", label: "Secret", placeholder: "Enter secret" },
    { name: "host", label: "Host", placeholder: "Enter host" },
    { name: "port", label: "Port", placeholder: "Enter port", maxLength: 5 },
    {
      name: "proxyId",
      label: "Proxy Name",
      component: "select",
      placeholder: "Select proxy",
    },
  ];

  // ---------- Table columns ----------
  const columns = useMemo(
    () => [
      {
        title: "S.no",
        key: "s_no",
        Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
      },
      { title: "Name", key: "p_peerName", sort: true },
      { title: "Secret", key: "p_peerSecret" },
      { title: "Host", key: "p_peerHost", sort: true },
      { title: "Port", key: "p_peerPort", sort: true },
      {
        title: "Actions",
        key: "actions",
        Cell: (record) => (
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-rose-50 hover:text-rose-500"
                    onClick={() => handleDelete(record.p_peerId)}
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
    ],
    [page, pageSize, handleDelete],
  );

  return (
    <>
      <div className="w-full h-full flex flex-col gap-4">
        <div className="w-full flex items-center justify-end gap-4">
          <div className="relative w-[350px] group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              type="text"
              placeholder="Search by Name, Pilot number"
              className="pl-10 placeholder:text-[11px] xl:placeholder:text-xs 2xl:placeholder:text-sm"
              onChange={(e) => setSearchString(e.target.value)}
              value={searchString}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={PeerData}
            loading={isPeerLoading}
            totaldata={PeerTotalCount}
            page={page}
            serverSide
            pageSize={pageSize}
            onPageChange={(pagevalues) => {
              const allowedSortFields = [
                "p_peerName",
                "p_peerHost",
                "p_peerPrefix",
                "p_peerPort",
                "p_peerType",
                "p_peerStatus",
                "p_peerPilotno",
                "p_peerOutboundPrefix",
                "p_peerInboundPrefix",
                "p_createdOn",
              ];
              setPage(pagevalues.currentPage);
              setPageSize(pagevalues.pageSize);
              setOffset(pagevalues.pageSize * (pagevalues.currentPage - 1));
              setSortField(
                allowedSortFields.includes(pagevalues?.sortConfig?.key)
                  ? pagevalues.sortConfig.key
                  : "p_peerName",
              );
              setSortOrder(
                ["ASC", "DESC"].includes(pagevalues?.sortConfig?.direction)
                  ? pagevalues.sortConfig.direction
                  : "ASC",
              );
            }}
          />
        </div>
      </div>

      <Dialog
        open={whatsapppeerModalOpen}
        onOpenChange={(v) => !v && handleCancel()}
      >
        <DialogContent className="sm:max-w-[720px] p-0 gap-0">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit WhatsApp Peer" : "Create New WhatsApp Peer"}
            </DialogTitle>
          </DialogHeader>

          {modalLoading || isProxyLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col bg-[#F1F5F9]"
              >
                <div className="px-6 py-5 max-h-[450px] overflow-y-auto bg-slate-50/50">
                  <div className="grid grid-cols-2 gap-4">
                    {fieldsConfig.map(
                      ({ name, label, placeholder, component, maxLength }) => (
                        <FormField
                          key={name}
                          control={form.control}
                          name={name}
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel>{label}</FormLabel>

                              {component === "select" ? (
                                <Select
                                  options={proxyOptions}
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  placeholder={placeholder}
                                  showSearch={false}
                                  triggerClassName="bg-white border-slate-200"
                                />
                              ) : (
                                <FormControl>
                                  <Input
                                    placeholder={placeholder}
                                    className={cn(
                                      "bg-white border-slate-200",
                                      form.formState.errors[name] &&
                                        "border-destructive ring-3 ring-destructive/20 focus-visible:ring-destructive/20",
                                    )}
                                    {...field}
                                    {...(maxLength ? { maxLength } : {})}
                                  />
                                </FormControl>
                              )}

                              <FormMessage className="text-[11px]" />
                            </FormItem>
                          )}
                        />
                      ),
                    )}
                  </div>

                  {form.formState.errors.root && (
                    <div className="text-[13px] text-destructive font-medium text-center mt-4">
                      {form.formState.errors.root.message}
                    </div>
                  )}
                </div>

                <DialogFooter className="bg-[#F1F5F9] border-t border-slate-300">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="default">
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SuperAdminWhatsappPeer;
