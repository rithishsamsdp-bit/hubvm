import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAvatarText, formatSecsToHMS } from "../../utils/helpers.js";
import Navbar from "../../components/Navbar.jsx";
import whatsappaxios from "../../services/whatsappaxios.js";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  MoreVertical,
  MessageCircle,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

// react-hook-form + zod
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

// Stores
import { callStore } from "../../store/useCallStore";
import { useContactStore } from "../../store/agent/useContactStore";
import { useConversationStore } from "../../store/agent/useConversationStore.js";
import { useAuthStore } from "../../store/useAuthStore.js";

// Import the global CountryCodeDropdown
import CountryCodeDropdown, {
  DEFAULT_DIAL,
  DEFAULT_CODE,
  countries,
} from "../../components/CountryCodeDropdown.jsx";
import { parsePhoneNumber, formatPhoneWithCountryCode } from "../../components/countryUtils.js";

// ---------- Zod Schema ----------
const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  countryCode: z.string().min(1, "Country code is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().optional(),
  organization: z.string().min(1, "Organization is required"),
  address: z.string().optional(),
});

/* ---------------- Main Component ---------------- */
const AgentContactbook = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const { makeCall, registrationStatus } = callStore();
  const { authPlan } = useAuthStore();
  const { selectedCampaign, addConversation } = useConversationStore();

  const {
    contactData,
    isContactLoading,
    getContact,
    contactTotalCount,
    createContact,
    editContact,
    deleteContact,
    contactCreationLoading,
    getChatHistory,
    chatLoading,
    conversationChat,
  } = useContactStore();

  const [page, setPage] = useState(parseInt(params.get("page")) || 1);
  const [pageSize, setPageSize] = useState(parseInt(params.get("per_page")) || 10);
  const [offset, setOffset] = useState((parseInt(params.get("page")) - 1) * pageSize || 0);
  const [searchString, setSearchString] = useState("");
  const [selectedChar, setSelectedChar] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [editId, setEditId] = useState("");
  const [open, setOpen] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  const form = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      countryCode: DEFAULT_CODE,
      phone: "",
      email: "",
      organization: "",
      address: "",
    },
  });

  useEffect(() => {
    navigate(`/agent-contactbook?page=${page}&per_page=${pageSize}`);
  }, [contactData, page, pageSize, navigate]);

  useEffect(() => {
    getContact(
      pageSize,
      offset,
      sortField,
      sortOrder,
      searchString,
      selectedChar,
    );
  }, [pageSize, offset, sortField, sortOrder, searchString, selectedChar, getContact]);

  const columns = [
    {
      title: "S.no",
      key: "s_no",
      width: 50,
      Cell: (_row, rowIndex) => (page - 1) * pageSize + rowIndex + 1,
    },
    { title: "Name", key: "c_Name", sort: true },
    { title: "Country Code", key: "c_countryCode" },
    { title: "Phone Number", key: "c_phoneNumber", sort: true },
    { title: "Email Id", key: "c_mailId", sort: true },
    { title: "Organization Name", key: "c_organizationName" },
    { title: "Address", key: "c_address" },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      Cell: (record) => (
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hover:bg-blue-50 hover:text-blue-500"
                  onClick={() => handleView(record)}
                >
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hover:bg-primary/10 hover:text-primary"
                  onClick={() => handleEdit(record.c_id)}
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
                  onClick={() => handleDelete(record.c_id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="hover:bg-slate-100 hover:text-slate-700 data-[state=open]:bg-slate-100"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Communication</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-40 z-[100]">
                <DropdownMenuItem
                  disabled={registrationStatus !== "Registered"}
                  onClick={() => {
                    if (registrationStatus === "Registered") {
                      const cc = record.c_countryCode || (String(record.c_phoneNumber || "").startsWith("+") ? "" : DEFAULT_DIAL);
                      handleCall(record.c_phoneNumber, cc);
                    }
                  }}
                  className={cn("cursor-pointer", registrationStatus !== "Registered" && "opacity-50 cursor-not-allowed")}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  <span>Call</span>
                </DropdownMenuItem>

                {authPlan?.menu?.whatsapp && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => handleWhatsapp(record)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
                    <span>WhatsApp</span>
                  </DropdownMenuItem>
                )}

                {authPlan?.menu?.sms && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => handleSMS(record)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2 text-blue-500" />
                    <span>SMS</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

          </TooltipProvider>
        </div>
      ),
    },
  ];

  /* ---------------- Close / Reset ---------------- */
  const handleCancel = useCallback(() => {
    setOpen(false);
    setEditId("");
    form.reset();
  }, [form]);

  /* ---------------- Submit (Create / Edit) ---------------- */
  const onSubmit = async (values) => {
    try {
      // Convert ISO code back to dial code for backend
      const selectedCountry = countries.find(
        (c) => c.code === values.countryCode,
      );
      const payload = {
        ...values,
        countryCode: selectedCountry?.dial || values.countryCode,
      };

      if (editId) {
        payload.id = editId;
        await editContact(payload);
      } else {
        await createContact(payload);
      }

      handleCancel();
      await getContact(
        pageSize,
        offset,
        sortField,
        sortOrder,
        searchString,
        selectedChar,
      );
    } catch (err) {
      console.error("Submit failed:", err);
      form.setError("root", {
        type: "manual",
        message:
          err?.response?.data?.message || "Failed to save contact.",
      });
    }
  };

  /* ---------------- Edit ---------------- */
  const handleEdit = useCallback(
    (id) => {
      const contact = contactData.find((c) => c.c_id === id);
      if (!contact) return;
      setEditId(id);

      const rawPhone = String(contact.c_phoneNumber || "");
      const parsedPhone = parsePhoneNumber(rawPhone, DEFAULT_DIAL);

      const {
        c_Name: name,
        c_mailId: email,
        c_organizationName: organization,
        c_address: address = "",
      } = contact;

      const mappedCountry = countries.find(
        (c) => c.dial === parsedPhone.countryCode,
      );

      form.reset({
        name,
        countryCode: mappedCountry?.code || parsedPhone.countryCode,
        phone: parsedPhone.localNumber,
        email: email || "",
        organization: organization || "",
        address: address || "",
      });
      setOpen(true);
    },
    [contactData, form],
  );

  /* ---------------- Delete ---------------- */
  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteContact(id);
        await getContact(
          pageSize,
          offset,
          sortField,
          sortOrder,
          searchString,
          selectedChar,
        );
      } catch (err) {
        console.error("Failed to delete contact:", err);
      }
    },
    [
      deleteContact,
      getContact,
      pageSize,
      offset,
      sortField,
      sortOrder,
      searchString,
      selectedChar,
    ],
  );

  /* ---------------- Call ---------------- */
  const handleCall = (phoneNumber, cc) => {
    if (!phoneNumber) {
      alert("Please enter the number");
      return;
    }
    // Resolve ISO code to dial code if necessary
    const country = countries.find(c => c.code === cc);
    const dial = country ? country.dial : cc;

    const fullNumber = formatPhoneWithCountryCode(phoneNumber, dial);
    console.log(fullNumber);
    makeCall(fullNumber.replace('+', ''), navigate, selectedCampaign.value);
  };

  /* ---------------- View ---------------- */
  const handleView = (data) => {
    const contact = contactData.find((c) => c.c_id === data.c_id);
    getChatHistory(data);
    if (contact) {
      setSelectedData({
        name: contact.c_Name,
        countrycode: contact.c_countryCode,
        phone: contact.c_phoneNumber,
        email: contact.c_mailId,
        organization: contact.c_organizationName,
        address: contact.c_address,
        color: "green",
      });
      setTimeout(() => setOpenViewModal(true), 0);
    }
  };

  /* ---------------- WhatsApp ---------------- */
  const handleWhatsapp = async (record) => {
    const cc = record.c_countryCode || (String(record.c_phoneNumber || "").startsWith("+") ? "" : DEFAULT_DIAL);
    const phoneNumber = record.c_phoneNumber;

    // Resolve ISO code to dial code if necessary
    const country = countries.find(c => c.code === cc);
    const dial = country ? country.dial : cc;

    const fullNumber = formatPhoneWithCountryCode(phoneNumber, dial).replace('+', '');

    // Get agent extension from auth store
    const authUser = useAuthStore.getState().authUser;
    const agentExtension = authUser?.m_memberExtensionNo || "";

    // Fetch leadId from API
    let leadId = null;
    try {
      const response = await whatsappaxios.post("/whatsapp/fetchLeadId", {
        phoneNumber: fullNumber,
        agentExtension: agentExtension
      });
      if (response.data?.found && response.data?.LeadId) {
        leadId = response.data.LeadId;
      }
    } catch (error) {
      console.error("Error fetching leadId:", error);
    }

    // Check if conversation with this leadId already exists
    const existingConversations = useConversationStore.getState().conversations;
    const existingConversation = leadId
      ? existingConversations.find(conv => conv.c_leadId === leadId)
      : null;

    // If conversation exists, set pending phone and navigate
    if (existingConversation) {
      useConversationStore.getState().setPendingNotificationPhone(fullNumber);
      navigate("/agent-conversation");
      return;
    }

    // Generate unique conversation ID
    const conversationId = `WA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new WhatsApp conversation object with the fetched LeadId
    const newConversation = {
      c_conversationId: conversationId,
      c_leadId: leadId || "",
      c_conversationPhoneNo: fullNumber,
      c_conversationChannel: "Whatsapp",
      c_conversationType: "Outbound",
      c_conversationOwner: agentExtension,
      c_conversationStatus: "Active",
      c_contactName: record.c_Name || "Unknown",
      c_createdOn: new Date().toISOString(),
      c_updatedOn: new Date().toISOString(),
      colour: "#25D366"
    };

    // Add conversation to store
    addConversation(newConversation);

    // Set pending phone to auto-select the new conversation
    useConversationStore.getState().setPendingNotificationPhone(fullNumber);

    // Navigate to conversation page
    navigate("/agent-conversation");
  };

  /* ---------------- SMS ---------------- */
  const handleSMS = async (record) => {
    const cc = record.c_countryCode || (String(record.c_phoneNumber || "").startsWith("+") ? "" : DEFAULT_DIAL);
    const phoneNumber = record.c_phoneNumber;

    // Resolve ISO code to dial code if necessary
    const country = countries.find(c => c.code === cc);
    const dial = country ? country.dial : cc;

    const fullNumber = formatPhoneWithCountryCode(phoneNumber, dial).replace('+', '');

    const authUser = useAuthStore.getState().authUser;
    const agentExtension = authUser?.m_memberExtensionNo || "";

    // Fetch leadId
    let leadId = null;
    try {
      const response = await whatsappaxios.post("/whatsapp/fetchLeadId", {
        phoneNumber: fullNumber,
        agentExtension: agentExtension
      });
      if (response.data?.found && response.data?.LeadId) {
        leadId = response.data.LeadId;
      }
    } catch (error) {
      console.error("Error fetching leadId for SMS:", error);
    }

    const existingConversations = useConversationStore.getState().conversations;
    const existingConversation = leadId
      ? existingConversations.find(conv => conv.c_leadId === leadId)
      : existingConversations.find(conv =>
          String(conv.c_conversationPhoneNo) === fullNumber &&
          conv.c_conversationChannel === "SMS"
        );

    if (existingConversation) {
      useConversationStore.getState().setPendingNotificationPhone(fullNumber);
      navigate("/agent-conversation");
      return;
    }

    const conversationId = `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newConversation = {
      c_conversationId: conversationId,
      c_leadId: leadId || "",
      c_conversationPhoneNo: fullNumber,
      c_conversationChannel: "SMS",
      c_conversationType: "Outbound",
      c_conversationOwner: agentExtension,
      c_conversationStatus: "Active",
      c_contactName: record.c_Name || "Unknown",
      c_createdOn: new Date().toISOString(),
      c_updatedOn: new Date().toISOString(),
      colour: "#3B82F6"
    };

    addConversation(newConversation);

    // Set pending phone to auto-select the new conversation
    useConversationStore.getState().setPendingNotificationPhone(fullNumber);

    navigate("/agent-conversation");
  };

  /* ---------------- Call disposition icon helper ---------------- */
  const getCallIcon = (disposition, isSelf) => {
    const d = (disposition || "").toLowerCase();
    if (d.startsWith("missed"))
      return <PhoneMissed className="w-3 h-3 text-red-500" />;
    if (d.startsWith("ans"))
      return isSelf ? (
        <PhoneOutgoing className="w-3 h-3 text-green-500" />
      ) : (
        <PhoneIncoming className="w-3 h-3 text-green-500" />
      );
    if (d.startsWith("busy"))
      return <PhoneOutgoing className="w-3 h-3 text-slate-500" />;
    if (d.startsWith("failed") || d.startsWith("no"))
      return isSelf ? (
        <PhoneOff className="w-3 h-3 text-red-500" />
      ) : (
        <PhoneOff className="w-3 h-3 text-red-500" />
      );
    return <Phone className="w-3 h-3 text-slate-400" />;
  };

  const handleCreateNew = () => {
    setEditId("");
    form.reset({
      name: "",
      countryCode: DEFAULT_CODE,
      phone: "",
      email: "",
      organization: "",
      address: "",
    });
    setOpen(true);
  };

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden">
      <Navbar
        title="Contact Book"
        breadcrumbs={[
          { label: "Dashboard", route: "/agent-dashboard" },
          { label: "Contact Book", active: true },
        ]}
      >
        <Button onClick={handleCreateNew}>Create Contact</Button>
      </Navbar>

      {/* Content Area */}
      <div className="flex-1 min-h-0 w-full p-6 overflow-y-auto overflow-x-hidden bg-slate-50">
        <div className="flex flex-col gap-4 w-full h-full">
          {/* Search + Alpha Filter */}
          <div className="space-y-3">
            <div className="relative w-full max-w-[600px] group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              </div>
              <Input
                type="text"
                placeholder="Search by Name, Phone number, Email id"
                className="pl-10 h-10 bg-white shadow-sm border-slate-200"
                onChange={(e) => setSearchString(e.target.value)}
                value={searchString}
              />
            </div>

            {/* Alpha Filter */}
            <div className="flex items-center gap-1 flex-wrap">
              {Array.from({ length: 26 }, (_, i) =>
                String.fromCharCode(65 + i),
              ).map((letter) => (
                <button
                  key={letter}
                  className={cn(
                    "w-7 h-7 rounded-md text-xs font-semibold transition-all cursor-pointer",
                    selectedChar === letter
                      ? "bg-primary text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-primary/30 hover:text-primary",
                  )}
                  onClick={() => {
                    const next = selectedChar === letter ? "" : letter;
                    setSelectedChar(next);
                    setPage(1);
                    setOffset(0);
                  }}
                >
                  {letter}
                </button>
              ))}
              {(selectedChar || searchString) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-500 hover:text-primary ml-1"
                  onClick={() => {
                    setSelectedChar("");
                    setSearchString("");
                  }}
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <DataTable
              columns={columns}
              data={contactData}
              loading={isContactLoading}
              totaldata={contactTotalCount}
              page={page}
              serverSide
              pageSize={pageSize}
              onPageChange={(pagevalues) => {
                setTimeout(() => {
                  setPage(pagevalues.currentPage);
                  setPageSize(pagevalues.pageSize);
                  setOffset(
                    pagevalues.pageSize * pagevalues.currentPage -
                      pagevalues.pageSize,
                  );
                  setSortField(pagevalues.sortConfig.key);
                  setSortOrder(pagevalues.sortConfig.direction);
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
        <DialogContent className="sm:max-w-[720px] p-0 gap-0">
          <DialogHeader>
            <DialogTitle>
              {editId !== "" ? "Edit Contact" : "Create New Contact"}
            </DialogTitle>
          </DialogHeader>

          {contactCreationLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col bg-[#F1F5F9]"
              >
                <div className="px-6 py-5 space-y-4 bg-slate-50/50">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter name"
                              className="bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Email ID</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter email address"
                              className="bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    {/* Phone Number (Country Code + Number merged) */}
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Phone Number</FormLabel>
                          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary transition-all">
                            <div className="shrink-0 border-r border-slate-200">
                              <CountryCodeDropdown
                                value={form.getValues("countryCode")}
                                onChange={(_dial, countryObj) => {
                                  form.setValue("countryCode", countryObj.code);
                                  form.clearErrors("countryCode");
                                }}
                                error={form.formState.errors.countryCode}
                                compact={false}
                              />
                            </div>
                            <input
                              className="flex-1 px-3 py-2 text-[11px] xl:text-xs 2xl:text-sm bg-transparent outline-none placeholder:text-slate-400"
                              placeholder="Enter phone number"
                              value={field.value}
                              onChange={(e) => {
                                if (/^[0-9*#]*$/.test(e.target.value)) {
                                  field.onChange(e.target.value);
                                }
                              }}
                            />
                          </div>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    {/* Organization */}
                    <FormField
                      control={form.control}
                      name="organization"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter organization name"
                              className="bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Address - Full width */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="Enter address"
                            className="bg-white"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="bg-[#F1F5F9] border-t border-slate-300">
                  <Button
                    variant="secondary"
                    onClick={handleCancel}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog
        open={openViewModal}
        onOpenChange={(v) => !v && setOpenViewModal(false)}
      >
        <DialogContent className="sm:max-w-[920px] p-0 gap-0 max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                {selectedData ? getAvatarText(selectedData?.name) : ""}
              </div>
              <DialogTitle>{selectedData?.name || "N/A"}</DialogTitle>
            </div>
          </DialogHeader>

          {chatLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex border-t border-slate-200 overflow-hidden">
              {/* Left - Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[60vh] bg-slate-50/50">
                {conversationChat &&
                  Object.entries(conversationChat).map(([date, items]) => (
                    <div key={date}>
                      {/* Date Separator */}
                      <div className="flex items-center justify-center my-3">
                        <span className="px-3 py-1 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-full shadow-sm">
                          {date}
                        </span>
                      </div>

                      {items.map((item, idx) => {
                        const time = new Date(
                          item.activityTimestamp,
                        ).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const isSelf =
                          item.direction.toLowerCase() === "outbound";
                        const sender = isSelf
                          ? (item?.memberName ?? "Agent")
                          : selectedData.name || "Unknown";

                        return (
                          <div
                            key={idx}
                            className={cn(
                              "flex gap-2 mb-3",
                              isSelf ? "flex-row-reverse" : "flex-row",
                            )}
                          >
                            {/* Avatar */}
                            <div
                              className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                                isSelf
                                  ? "bg-primary"
                                  : "bg-gradient-to-br from-emerald-400 to-emerald-600",
                              )}
                            >
                              {isSelf
                                ? sender.charAt(0)
                                : selectedData
                                  ? getAvatarText(selectedData?.name)
                                  : ""}
                            </div>

                            {/* Message */}
                            <div
                              className={cn(
                                "max-w-[70%]",
                                isSelf ? "text-right" : "text-left",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex items-center gap-2 mb-0.5",
                                  isSelf ? "justify-end" : "justify-start",
                                )}
                              >
                                <span className="text-[11px] font-semibold text-slate-700">
                                  {sender}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {time}
                                </span>
                              </div>

                              <div
                                className={cn(
                                  "rounded-lg px-3 py-2 text-sm",
                                  isSelf
                                    ? "bg-primary/10 text-slate-800"
                                    : "bg-white border border-slate-200 text-slate-700",
                                )}
                              >
                                {item.type === "Call" ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5">
                                        {getCallIcon(
                                          item.details?.c_disposition,
                                          isSelf,
                                        )}
                                        <span className="text-xs font-medium">
                                          {item.details?.c_disposition ||
                                            "Call"}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        {formatSecsToHMS(
                                          item.details?.c_duration,
                                        )}
                                      </span>
                                    </div>
                                    {item.details?.c_terminationEnd && (
                                      <p className="text-[10px] text-slate-400">
                                        Hung up by{" "}
                                        {item.details.c_terminationEnd}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <>{item.content}</>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
              </div>

              {/* Right - Personal Info */}
              <div className="w-[280px] border-l border-slate-200 bg-white p-4 overflow-y-auto max-h-[60vh]">
                <h4 className="text-sm font-bold text-slate-800 mb-4">
                  Personal Information
                </h4>
                <div className="space-y-3">
                  {[
                    { label: "Name", value: selectedData?.name },
                    { label: "Email ID", value: selectedData?.email },
                    { label: "Country Code", value: selectedData?.countrycode },
                    { label: "Contact Number", value: selectedData?.phone },
                    {
                      label: "Organization Name",
                      value: selectedData?.organization,
                    },
                  ].map((field) => (
                    <div key={field.label} className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {field.label}
                      </label>
                      <p className="text-sm text-slate-700 bg-slate-50 rounded-md px-2.5 py-1.5 border border-slate-100">
                        {field.value || "—"}
                      </p>
                    </div>
                  ))}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Address
                    </label>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-md px-2.5 py-1.5 border border-slate-100 min-h-[60px]">
                      {selectedData?.address || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentContactbook;