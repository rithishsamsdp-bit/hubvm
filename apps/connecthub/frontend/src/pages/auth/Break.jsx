import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useConversationStore } from "../../store/agent/useConversationStore";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Play } from "lucide-react";
import AuthLayout from "./AuthLayout";

const Break = () => {
  const navigate = useNavigate();
  const { authName, authRole } = useAuthStore();
  const { breakStatus, breakStartTime, updateBreakStatus } =
    useConversationStore();
  const [elapsedTime, setElapsedTime] = useState("00:00");

  useEffect(() => {
    if (breakStatus === "LOGIN" || !breakStartTime) {
      navigate("/"); // Redirect if not actually on break
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((now - breakStartTime) / 1000);
      const mins = Math.floor(diff / 60)
        .toString()
        .padStart(2, "0");
      const secs = (diff % 60).toString().padStart(2, "0");
      setElapsedTime(`${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [breakStartTime, breakStatus, navigate]);

  const handleReady = async () => {
    await updateBreakStatus("Active");
    navigate("/");
  };

  return (
    <AuthLayout
      title="Break Mode"
      description="You are currently on break. Take your time to recharge."
    >
      <CardContent className="px-6 py-4 space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100 transition-all hover:shadow-md">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl border-2 border-primary/10 ring-4 ring-primary/5">
            {authName?.charAt(0) || "U"}
          </div>
          <div className="flex flex-col">
            <p className="text-lg font-bold text-foreground leading-tight">
              {authName || "Agent Name"}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {authRole || "Agent"} • ON {breakStatus}
              </p>
            </div>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-orange-400/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
          <div className="relative flex flex-col items-center justify-center p-6 bg-card border border-border rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">
                Elapsed Time
              </span>
            </div>
            <p className="text-5xl font-black tracking-tighter text-foreground tabular-nums">
              {elapsedTime}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-6 pb-8">
        <Button
          onClick={handleReady}
          className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98] group rounded-xl"
        >
          <Play className="mr-2 h-5 w-5 fill-current" />
          I'm Ready to Work
        </Button>
      </CardFooter>
    </AuthLayout>
  );
};

export default Break;
