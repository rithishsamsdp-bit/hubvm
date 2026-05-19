import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const Navbar = ({ title, breadcrumbs = [], children, bottomContent }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full bg-white border-b select-none shrink-0">
      <div
        className={`flex w-full flex-col sm:flex-row items-start sm:items-center justify-between min-h-[90px] py-4 px-4 sm:px-8 gap-4 sm:gap-0 ${bottomContent ? "pb-0 sm:pb-0" : ""}`}
      >
        <div className="flex flex-col justify-center">
          <p className="text-2xl font-bold text-foreground tracking-tight">
            {title}
          </p>
          {breadcrumbs.length > 0 && (
            <div className="flex items-center mt-1 flex-wrap gap-y-1">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <span key={index} className="flex items-center">
                    {!isLast ? (
                      <span
                        className="text-xs font-semibold text-muted-foreground hover:text-primary cursor-pointer transition-colors whitespace-nowrap"
                        onClick={() => {
                          if (crumb.onClick) crumb.onClick();
                          else if (crumb.route) navigate(crumb.route);
                        }}
                      >
                        {crumb.label}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-primary whitespace-nowrap">
                        {crumb.label}
                      </span>
                    )}
                    {!isLast && (
                      <ChevronRight className="w-4 h-4 mx-1.5 text-muted-foreground/60 shrink-0" />
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
            {children}
          </div>
        )}
      </div>
      {bottomContent && (
        <div className="px-4 sm:px-8 w-full sm:mt-1">{bottomContent}</div>
      )}
    </div>
  );
};

export default Navbar;
