import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../../components/Index.jsx";
import { ChevronRight, FileBarChart, MessageSquare, MessageCircle } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore.js";

const AdminReports = () => {
  const navigate = useNavigate();
  const { authRole, authPlan, authName } = useAuthStore();

  const siteItems = useMemo(() => {
    const items = [
      { text: "CDR Report", path: "/admin-reports/admin-cdrReport" },
      { text: "Performance Report", path: "/admin-reports/admin-performance" },
      { text: "Login Logout Report", path: "/admin-reports/admin-login-logout" },
      { text: "Break Report", path: "/admin-reports/admin-break-report" },
      { text: "Conference Report", path: "/admin-reports/admin-conference-report" },
      { text: "Queue missed calls Report", path: "/admin-reports/admin-queue-missed-calls-report" },
      { text: "Missed Calls Report", path: "/admin-reports/admin-missed-calls-report" },
      { text: "Callback Reminder Report", path: "/admin-reports/admin-callback-reminder" },
    ];

    if (authName && authName.toLowerCase() === "pulsetekh") {
      items.splice(1, 0, { text: "AI Call Audit", path: "/admin-reports/admin-ai-call-audit" });
    }

    return items;
  }, [authName]);

  const whatsappReportItems = useMemo(
    () => [
      { text: "Delivery Response Report", path: "/admin-reports/admin-whatsapp-delivery-response" },
    ],
    []
  );

  const tlWhatsappReportItems = useMemo(
    () => [
      { text: "Delivery Response Report", path: "/tl-reports/tl-whatsapp-delivery-response" },
    ],
    []
  );

  const smsReportItems = useMemo(
    () => [
      { text: "SMS Delivery Response Report", path: "/admin-reports/admin-sms-delivery-response" },
    ],
    []
  );

  const tlSmsReportItems = useMemo(
    () => [
      { text: "SMS Delivery Response Report", path: "/tl-reports/tl-sms-delivery-response" },
    ],
    []
  );

  const tlSiteItems = useMemo(
    () => [
      { text: "CDR Report", path: "/tl-reports/tl-cdrReport" },
      { text: "Performance Report", path: "/tl-reports/tl-performance" },
      { text: "Login Logout Report", path: "/tl-reports/tl-login-logout" },
      { text: "Break Report", path: "/tl-reports/tl-break-report" },
      { text: "Conference Report", path: "/tl-reports/tl-conference-report" },
      { text: "Queue missed calls Report", path: "/tl-reports/tl-queue-missed-calls-report" },
      { text: "Callback Reminder Report", path: "/tl-reports/tl-callback-reminder" },
    ],
    []
  );

  const activeSiteItems = authRole === "TL" ? tlSiteItems : siteItems;
  const activeWhatsappItems = authRole === "TL" ? tlWhatsappReportItems : whatsappReportItems;
  const activeSmsItems = authRole === "TL" ? tlSmsReportItems : smsReportItems;

  const renderSection = (title, icon, items) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary/5 rounded-lg">
              {icon}
            </div>
            <h3 className="text-[15px] font-bold text-slate-800">{title}</h3>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="group w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-primary/5 rounded-lg text-slate-600 hover:text-primary transition-all duration-200 cursor-pointer"
            >
              <span className="text-[13px] font-medium text-left">{item.text}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-slate-50/30">
      <Navbar
        title="Reports"
        breadcrumbs={[
          {
            label: "Dashboard",
            route: authRole === "TL" ? "/tl-dashboard" : "/admin-dashboard",
          },
          { label: "Reports", active: true },
        ]}
      />

      <div className="w-full h-[calc(100%-90px)] overflow-y-auto overflow-x-hidden p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {renderSection("Sites", <FileBarChart className="w-4 h-4 text-primary" />, activeSiteItems)}
          
          {authPlan?.menu?.whatsapp &&
            renderSection(
              "WhatsApp Sites",
              <MessageCircle className="w-4 h-4 text-primary" />,
              activeWhatsappItems
            )}
            
          {authPlan?.menu?.sms &&
            renderSection(
              "SMS Sites",
              <MessageSquare className="w-4 h-4 text-primary" />,
              activeSmsItems
            )}
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
