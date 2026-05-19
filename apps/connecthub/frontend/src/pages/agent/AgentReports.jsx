import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar.jsx";
import { ChevronRight, FileBarChart } from "lucide-react";

const AgentReports = () => {
  const navigate = useNavigate();

  const siteItems = useMemo(
    () => [
      { text: "Cdr Report", path: "/agent-reports/agent-cdrReport" },
      { text: "Voice Mail Report", path: "/agent-reports/agent-voicemail" },
      { text: "Callback Reminder Report", path: "/agent-reports/agent-callback-reminder" },
      { text: "Queue Missed Calls Report", path: "/agent-reports/agent-queue-missed-calls-report" },
      { text: "Missed Calls Report", path: "/agent-reports/agent-missed-calls-report" },
    ],
    []
  );

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
            route: "/agent-dashboard",
          },
          { label: "Reports", active: true },
        ]}
      />

      <div className="w-full h-[calc(100%-90px)] overflow-y-auto overflow-x-hidden p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {renderSection("Sites", <FileBarChart className="w-4 h-4 text-primary" />, siteItems)}
        </div>
      </div>
    </div>
  );
};

export default AgentReports;
