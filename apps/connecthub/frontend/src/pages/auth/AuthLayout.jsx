import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import icons from "../../constants/icon";

const { pulselogo } = icons;

const AuthLayout = ({ children, title, description, wide }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <Card className={`w-full shadow-2xl border-border bg-card transition-all duration-300 ${wide ? "max-w-[440px]" : "max-w-[350px] xl:max-w-[340px] 2xl:max-w-[380px]"}`}>
        <CardHeader className="space-y-2 flex flex-col items-center pt-4 pb-1 xl:pt-4 xl:pb-1 2xl:pt-6 2xl:pb-3">
          <div className="w-26 xl:w-24 2xl:w-30 transition-all duration-300">
            <img
              src={pulselogo}
              alt="Pulse Logo"
              className="w-full h-auto object-contain"
            />
          </div>
          <div className="text-center space-y-1">
            <CardTitle className="text-xl xl:text-lg 2xl:text-2xl font-bold tracking-tight text-foreground transition-all">
              {title}
            </CardTitle>
            <CardDescription className="text-xs xl:text-[11px] 2xl:text-sm text-muted-foreground">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
        {children}
      </Card>

      <p className="mt-4 text-center text-[10px] text-muted-foreground uppercase tracking-widest">
        &copy; {new Date().getFullYear()} Pulse Telesystems Pvt. Ltd. All rights
        reserved.
      </p>
    </div>
  );
};

export default AuthLayout;
