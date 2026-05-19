import React from "react";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Users,
  Phone,
  MessageSquare,
  Play,
  Square,
  RotateCcw,
  BarChart3,
  Eye,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const AdminEmergencyAlerts = ({
  alerts,
  isLoadingAlerts,
  handleLaunchCampaign,
  handleStopCampaign,
  handleViewReport,
  handlePreviewFlow,
  handleCreateButtonClick,
}) => {
  if (isLoadingAlerts) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-slate-50/50">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-[#ff5200] rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          Loading Alerts...
        </p>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6 bg-slate-50/50">
        <div className="flex flex-col items-center justify-center py-16 px-10 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm max-w-lg w-full text-center transition-all hover:bg-slate-50/50">
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-6 ring-8 ring-orange-50/50">
            <AlertTriangle className="w-8 h-8 text-[#ff5200] animate-bounce" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">
            No Active Emergency Alerts
          </h3>
          <p className="text-sm text-slate-400 font-medium max-w-md mb-8">
            Launch an alert to reach your recipients via Call, WhatsApp, and SMS
            simultaneously or sequentially.
          </p>
          <Button onClick={handleCreateButtonClick} className="bg-[#ff5200] hover:bg-[#e64a00] text-white">
            <Zap className="w-4 h-4 mr-2" /> New Emergency Alert
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50/50 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {alerts.map((alert) => (
        <Card
          key={alert.id}
          className="group overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 bg-white flex flex-col"
        >
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  alert.priority === "HIGH"
                    ? "bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                    : alert.priority === "MEDIUM"
                      ? "bg-amber-500"
                      : "bg-blue-500",
                )}
              />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {alert.priority} PRIORITY
              </span>
            </div>
            <Badge
              className={cn(
                "px-2 py-0.5 text-[9px] font-bold uppercase border-none",
                alert.status === "COMPLETED"
                  ? "bg-emerald-50 text-emerald-600"
                  : alert.status === "EXECUTING"
                    ? "bg-orange-50 text-[#ff5200] animate-pulse"
                    : alert.status === "SCHEDULED"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-slate-100 text-slate-500",
              )}
            >
              {alert.status}
            </Badge>
          </CardHeader>

          <CardContent className="p-5 pt-0 flex-1 space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-800 line-clamp-1 group-hover:text-[#ff5200] transition-colors">
                {alert.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                {alert.scheduledAt ? (
                  <>
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(
                        alert.scheduledAt.includes(" ")
                          ? alert.scheduledAt.replace(" ", "T")
                          : alert.scheduledAt,
                      ).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(alert.launchedAt).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Reach
                  </span>
                </div>
                <span className="text-xs font-black text-slate-800">
                  {alert.stats.reached} / {alert.stats.total}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ff5200] rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${(alert.stats.reached / alert.stats.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-5 pt-0 flex items-center justify-between bg-slate-50/30 border-t border-slate-50 mt-auto">
            <div className="flex items-center gap-1">
              {(alert.channels || []).map((ch) => (
                <div
                  key={ch}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm"
                  title={ch}
                >
                  {ch === "WA" ? (
                    <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                  ) : ch === "CALL" || ch === "IVR" ? (
                    <Phone className="w-3.5 h-3.5 text-[#ff5200]" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-blue-500" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {alert.status === "DRAFT" || alert.status === "SCHEDULED" ? (
                <Button
                  size="sm"
                  className="h-8 px-3 bg-[#ff5200] hover:bg-[#e64a00] text-white font-bold text-[10px] uppercase tracking-wider"
                  onClick={(e) => { e.stopPropagation(); handleLaunchCampaign(alert.id); }}
                >
                  <Play className="w-3 h-3 mr-1.5 fill-current" /> Launch
                </Button>
              ) : alert.status === "EXECUTING" ? (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 px-3 font-bold text-[10px] uppercase tracking-wider bg-rose-500 hover:bg-rose-600"
                  onClick={(e) => { e.stopPropagation(); handleStopCampaign(alert.id); }}
                >
                  <Square className="w-3 h-3 mr-1.5 fill-current" /> Stop
                </Button>
              ) : alert.status === "COMPLETED" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold text-[10px] uppercase tracking-wider"
                  onClick={(e) => { e.stopPropagation(); handleLaunchCampaign(alert.id); }}
                >
                  <RotateCcw className="w-3 h-3 mr-1.5" /> Restart
                </Button>
              ) : null}

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                onClick={(e) => { e.stopPropagation(); handlePreviewFlow(alert.id); }}
                title="Preview Flow"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                onClick={(e) => { e.stopPropagation(); handleViewReport(alert.id); }}
                title="View Analytics"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
      </div>
    </div>
  );
};

export default AdminEmergencyAlerts;
