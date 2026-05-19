import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../../components/Index.jsx";
import { ChevronRight, FileBarChart } from "lucide-react";

const SuperAdminReports = () => {
  const navigate = useNavigate();

  const siteItems = useMemo(
    () => [
      {
        text: "CDR Report",
        path: "/superadmin-reports/superadmin-cdrReport",
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <Navbar
        title="Reports"
        breadcrumbs={[
          { label: "Onboard", route: "/superadmin-onboard" },
          { label: "Reports", active: true },
        ]}
      />

      <div className="w-full h-[calc(100%-90px)] overflow-y-auto overflow-x-hidden p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Sites Card */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-primary/5 rounded-lg">
                  <FileBarChart className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-[15px] font-bold text-slate-800">Sites</h3>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {siteItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => navigate(item.path)}
                  className="group w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-primary/5 rounded-lg text-slate-600 hover:text-primary transition-all duration-200 cursor-pointer"
                >
                  <span className="text-[13px] font-medium">{item.text}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminReports;
