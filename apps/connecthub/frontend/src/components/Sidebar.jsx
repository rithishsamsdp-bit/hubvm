import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import icons from "../constants/icon";
import DialPad from "./Dialpad";
import Usercard from "./Usercard";
import { useAuthStore } from "../store/useAuthStore";
import { useConversationStore } from "../store/agent/useConversationStore";
import { useDashboardStore } from "../store/agent/useDashboardStore";
import { callStore } from "../store/useCallStore";
import Icon from "../constants/Icon.jsx";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";

// shadcn UI components
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronLeft,
  Bell,
  PhoneOff,
  Phone,
  PhoneMissed,
} from "lucide-react";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [activeMenu, setActiveMenu] = useState("");
  const [showDialpad, setShowDialpad] = useState(false);
  const [showUserCard, setShowUserCard] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showQueuePopup, setShowQueuePopup] = useState(false);

  const { callStatus, updateReadyNotReady } = useConversationStore();
  const {
    logout,
    authRole,
    authName,
    authExtension,
    menus,
    notificationData,
    missedCallData,
    authPlan,
    fetchNotifications,
    notificationLoading,
    missedCallLoading,
    updateNotificationStatus,
    clearNotifications,
  } = useAuthStore();
  const { registrationStatus } = callStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { pulselogo, sidebar_avatar_icon } = icons;
  const { getLiveQueueStats, liveQueueStats } = useDashboardStore();

  const unreadNotificationCount = notificationData.filter(
    (n) => !n.isRead,
  ).length;
  const unreadMissedCallCount = missedCallData.filter((n) => !n.isRead).length;

  const usercardContainerRef = useRef(null);

  useEffect(() => {
    getLiveQueueStats();
  }, []);

  useEffect(() => {
    setActiveMenu("");
    const currentPath = location.pathname;
    let value = currentPath.split("/")[1];
    const activeItem = menus.find((item) => {
      const menuSegment = item.route.split("/")[1];
      return value === menuSegment;
    });
    if (activeItem) {
      setActiveMenu(activeItem.id);
    }
  }, [location.pathname, menus]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebarElement = document.getElementById("main-sidebar");
      if (sidebarElement && !sidebarElement.contains(event.target)) {
        setCollapsed(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleClickOutsideDialpad = (event) => {
      const dialpadContainer = document.getElementById(
        "sidebar-dialpad-container",
      );
      const dialpadToggle = document.getElementById("sidebar-dialpad-toggle");

      if (
        showDialpad &&
        dialpadContainer &&
        !dialpadContainer.contains(event.target) &&
        dialpadToggle &&
        !dialpadToggle.contains(event.target)
      ) {
        setShowDialpad(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideDialpad);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideDialpad);
    };
  }, [showDialpad]);

  useEffect(() => {
    const handleClickOutsideUsercard = (event) => {
      const userCardToggle = document.getElementById("sidebar-usercard-toggle");
      if (
        showUserCard &&
        usercardContainerRef.current &&
        !usercardContainerRef.current.contains(event.target) &&
        userCardToggle &&
        !userCardToggle.contains(event.target)
      ) {
        setShowUserCard(false);
      }
    };

    if (showUserCard) {
      document.addEventListener("mousedown", handleClickOutsideUsercard);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideUsercard);
    };
  }, [showUserCard]);

  useEffect(() => {
    const handleClickOutsideQueue = (event) => {
      const queueContainer = document.getElementById("sidebar-queue-container");
      const queueToggle = document.getElementById("sidebar-queue-toggle");
      if (
        showQueuePopup &&
        queueContainer &&
        !queueContainer.contains(event.target) &&
        queueToggle &&
        !queueToggle.contains(event.target)
      ) {
        setShowQueuePopup(false);
      }
    };

    if (showQueuePopup) {
      document.addEventListener("mousedown", handleClickOutsideQueue);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideQueue);
    };
  }, [showQueuePopup]);

  const handleMenuClick = (id, route) => {
    setActiveMenu(id);
    navigate(route);
  };

  const handleToggle = (checked) => {
    updateReadyNotReady(checked);
  };

  const handleRead = (notificationId) => {
    updateNotificationStatus([notificationId], "READ");
  };

  const handleClearAll = () => {
    const items = drawer === "Notification" ? notificationData : missedCallData;
    const allIds = items
      .filter((n) => n.notificationId)
      .map((n) => n.notificationId);
    if (allIds.length > 0) {
      updateNotificationStatus(allIds, "DISMISSED");
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        id="main-sidebar"
        className={cn(
          "fixed left-0 top-0 z-[999] flex h-screen flex-col bg-card shadow-xl transition-all duration-300 ease-in-out border-r overflow-visible select-none",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "absolute -right-3 top-12 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-card border shadow-md hover:bg-accent transition-all duration-300 cursor-pointer",
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-muted-foreground" />
          )}
        </button>

        {/* Header / Logo */}
        <div
          className={cn(
            "flex  items-center  shrink-0",
            collapsed ? "h-17 px-2 justify-center" : "h-17 px-4 justify-start",
          )}
        >
          <img
            src={pulselogo}
            alt="Pulse Logo"
            className={cn(
              "transition-all duration-300 object-contain",
              collapsed
                ? "h-8 w-20"
                : "h-10 w-20 lg:h-12 lg:w-24 2xl:h-14 2xl:w-28",
            )}
          />
        </div>

        {/* Main Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-1 scrollbar-none">
          <nav className="space-y-1">
            {menus.map((item) => {
              const isActive = activeMenu === item.id;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.route}
                      onClick={() => handleMenuClick(item.id, item.route)}
                      className={cn(
                        "group relative flex w-full items-center rounded-xl transition-all hover:bg-primary/5 active:scale-[0.98] cursor-pointer select-none",
                        isActive
                          ? "bg-primary/10"
                          : "text-muted-foreground hover:text-foreground",
                        collapsed
                          ? "justify-center px-0 py-3"
                          : "justify-start px-3 py-3",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center transition-colors",
                          isActive
                            ? "text-primary"
                            : "group-hover:text-primary",
                        )}
                      >
                        <Icon
                          name={item.icon}
                          className="w-4 h-4 2xl:w-5 2xl:h-5 transition-all duration-300"
                          color={isActive ? "hsl(var(--primary))" : "#5F6368"}
                        />
                      </div>
                      {!collapsed && (
                        <span
                          className={cn(
                            "ml-3 truncate text-sm font-medium transition-all duration-300",
                            isActive
                              ? "text-primary font-semibold"
                              : "text-foreground/80 group-hover:text-primary",
                          )}
                        >
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="mt-auto space-y-1 px-3 py-1">
          {(authRole === "USER" ||
            (authRole === "TL" && authPlan?.menu?.calldialing)) && (
              <>
                {/* Notifications */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setDrawer("Notification");
                        clearNotifications("notification");
                        fetchNotifications(authExtension, ["CALLBACK", "INCOMINGSMS"], 20, 0);
                      }}
                      className={cn(
                        "group relative flex w-full items-center rounded-xl px-3 py-3 transition-all hover:bg-primary/5 active:scale-[0.98] cursor-pointer text-muted-foreground hover:text-foreground select-none",
                        collapsed ? "justify-center" : "justify-start",
                      )}
                    >
                      <div className="relative flex h-5 w-5 shrink-0 items-center justify-center transition-colors group-hover:text-primary">
                        <Icon
                          name="notification"
                          className="w-4 h-4 2xl:w-5 2xl:h-5 transition-all"
                          color="#5F6368"
                        />
                        {unreadNotificationCount > 0 && (
                          <span className="absolute -right-2 -top-2 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive px-1 text-[7px] font-bold text-white border border-card shadow-sm">
                            {unreadNotificationCount > 99
                              ? "99+"
                              : unreadNotificationCount}
                          </span>
                        )}
                      </div>
                      {!collapsed && (
                        <span className="ml-3 truncate text-sm font-medium transition-all duration-300 text-foreground/80 group-hover:text-primary">
                          Notifications
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">Notifications</TooltipContent>
                  )}
                </Tooltip>

                {/* Missed Calls */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setDrawer("Missedcalls");
                        clearNotifications("missedcall");
                        fetchNotifications(authExtension, ["MISSEDCALL"], 20, 0);
                      }}
                      className={cn(
                        "group relative flex w-full items-center rounded-xl px-3 py-3 transition-all hover:bg-primary/5 active:scale-[0.98] cursor-pointer text-muted-foreground hover:text-foreground select-none",
                        collapsed ? "justify-center" : "justify-start",
                      )}
                    >
                      <div className="relative flex h-5 w-5 shrink-0 items-center justify-center transition-colors group-hover:text-primary">
                        <Icon
                          name="missedcall"
                          className="w-4 h-4 2xl:w-5 2xl:h-5 transition-all"
                          color="#5F6368"
                        />
                        {unreadMissedCallCount > 0 && (
                          <span className="absolute -right-2 -top-2 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive px-1 text-[7px] font-bold text-white border border-card shadow-sm">
                            {unreadMissedCallCount > 99
                              ? "99+"
                              : unreadMissedCallCount}
                          </span>
                        )}
                      </div>
                      {!collapsed && (
                        <span className="ml-3 truncate text-sm font-medium transition-all duration-300 text-foreground/80 group-hover:text-primary">
                          Missed Calls
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">Missed Calls</TooltipContent>
                  )}
                </Tooltip>

                {/* Call Status Switch */}
                <div
                  onClick={() => handleToggle(!callStatus)}
                  className={cn(
                    "group flex w-full items-center px-3 py-1.5 transition-all duration-300 text-muted-foreground cursor-pointer",
                    collapsed ? "justify-center" : "justify-start",
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Switch
                          checked={callStatus}
                          className="data-[state=checked]:bg-green-500 scale-75 origin-center pointer-events-none"
                        >
                          {callStatus ? (
                            <Phone
                              className="h-3 w-3 text-green-600"
                              fill="currentColor"
                            />
                          ) : (
                            <PhoneOff className="h-3 w-3 text-slate-400" />
                          )}
                        </Switch>
                      </div>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">
                        {callStatus ? "Ready" : "Not Ready"}
                      </TooltipContent>
                    )}
                  </Tooltip>
                  {!collapsed && (
                    <span className="ml-3 truncate text-sm font-medium transition-all duration-300 text-foreground/80">
                      {callStatus ? "Ready" : "Not Ready"}
                    </span>
                  )}
                </div>

                {/* Dialpad */}
                <div className="relative overflow-visible">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        id="sidebar-dialpad-toggle"
                        onClick={() => setShowDialpad(!showDialpad)}
                        className={cn(
                          "group flex w-full items-center px-3 py-1.5 transition-all cursor-pointer text-muted-foreground",
                          collapsed ? "justify-center" : "",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-blue-600 p-[1px] shrink-0",
                            collapsed ? "" : "",
                          )}
                        >
                          <div className="flex h-full w-full items-center justify-center rounded-[7px] bg-card/90">
                            <Icon
                              name="dialpad"
                              className="w-4 h-4 2xl:w-5 2xl:h-5"
                              color="#000000"
                            />
                          </div>
                        </div>
                        {!collapsed && (
                          <span className="ml-3 truncate text-sm font-medium transition-all duration-300 text-foreground/80">
                            Dialpad
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">Dialpad</TooltipContent>
                    )}
                  </Tooltip>

                  {/* Dialpad Popup */}
                  {showDialpad && (
                    <>
                      {/* Backdrop for closing when clicking outside */}
                      <div
                        className="fixed inset-0 z-[999]"
                        onClick={() => setShowDialpad(false)}
                      />
                      <div
                        id="sidebar-dialpad-container"
                        className={cn(
                          "fixed bottom-24 z-[1000] w-auto rounded-2xl border bg-background shadow-2xl overflow-hidden transition-all duration-200 animate-in fade-in zoom-in-95 slide-in-from-bottom-4",
                          collapsed ? "left-19" : "left-65",
                        )}
                      >
                        <DialPad
                          onCallInitiated={() => {
                            setShowDialpad(false);
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Waiting Calls */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      id="sidebar-queue-toggle"
                      onClick={() => setShowQueuePopup(!showQueuePopup)}
                      className={cn(
                        "group flex w-full items-center px-3 py-1.5 transition-all cursor-pointer text-muted-foreground",
                        collapsed ? "justify-center" : "justify-start",
                      )}
                    >
                      <div className="flex h-5 w-10 shrink-0 items-center justify-center rounded bg-destructive text-[11px] font-bold text-white shadow-sm">
                        WC:{liveQueueStats?.total_waiting || 0}
                      </div>
                      {!collapsed && (
                        <span className="ml-3 truncate text-sm font-medium transition-all duration-300 text-foreground/80">
                          Waiting Calls
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">Waiting Calls</TooltipContent>
                  )}
                </Tooltip>
              </>
            )}

          <Separator className="opacity-50" />

          {/* User Profile */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  id="sidebar-usercard-toggle"
                  onClick={() => setShowUserCard(!showUserCard)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl p-2.5 transition-all hover:bg-primary/5 cursor-pointer",
                    collapsed ? "justify-center" : "",
                  )}
                >
                  <div className="relative shrink-0">
                    <img
                      src={sidebar_avatar_icon}
                      alt="User"
                      className="h-9 w-9 rounded-full border-2 border-background object-cover ring-1 ring-border"
                    />
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ring-1 ring-background",
                        registrationStatus === "Registered"
                          ? "bg-green-500"
                          : "bg-destructive",
                      )}
                    />
                  </div>
                  {!collapsed && (
                    <div className="ml-3 flex flex-col items-start overflow-hidden text-left">
                      <span className="truncate text-sm font-semibold">
                        {authName}
                      </span>
                      <span className="truncate text-[10px] text-muted-foreground uppercase">
                        {authRole}
                      </span>
                    </div>
                  )}
                </button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">{authName}</TooltipContent>
              )}
            </Tooltip>

            {showUserCard && (
              <div
                ref={usercardContainerRef}
                className={cn(
                  "absolute bottom-2 z-[1000] w-[230px] transition-all duration-300 animate-in fade-in slide-in-from-left-4",
                  collapsed ? "left-16" : "left-64",
                )}
              >
                <Usercard
                  imgsrc={sidebar_avatar_icon}
                  username={authName}
                  role={authRole}
                  extension={authExtension}
                />
              </div>
            )}
          </div>

          {/* Logout */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogoutClick}
                className={cn(
                  "group relative flex w-full items-center rounded-xl px-3 py-3 transition-all hover:bg-primary/5 active:scale-[0.98] cursor-pointer text-muted-foreground hover:text-foreground",
                  collapsed ? "justify-center" : "justify-start",
                )}
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center transition-colors group-hover:text-primary">
                  <Icon
                    name="logout"
                    className="w-4 h-4 2xl:w-5 2xl:h-5 transition-all"
                    color="#5F6368"
                  />
                </div>
                {!collapsed && (
                  <span className="ml-3 truncate text-sm font-medium transition-all duration-300 text-foreground/80 group-hover:text-primary">
                    Logout
                  </span>
                )}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Logout</TooltipContent>}
          </Tooltip>
        </div>
      </aside>

      {/* Logout Confirmation Popup */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-b from-red-50/50 to-white p-6 sm:p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-5 ring-8 ring-red-50">
              <Icon name="logout" className="w-7 h-7 text-red-600 ml-1" />
            </div>

            <DialogHeader className="p-0 bg-transparent border-0 flex flex-col items-center mb-2 space-y-2">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-800">
                Ready to leave?
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-sm sm:text-[15px] font-medium leading-relaxed max-w-[280px]">
                Are you sure you want to logout?
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex flex-row w-full gap-3 mt-8 sm:justify-center border-t-0 bg-transparent p-0">
              <Button
                variant="outline"
                className="flex-1 h-11 text-[15px] font-semibold text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
                onClick={handleLogoutCancel}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 text-[15px] font-semibold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20"
                onClick={handleLogoutConfirm}
              >
                Logout
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications / Missed Calls Drawer */}
      <Drawer
        open={!!drawer}
        onOpenChange={(open) => !open && setDrawer(false)}
        direction="left"
        showClose={true}
        showBackdrop={true}
      >
        <DrawerContent>
          {/* Header */}
          <div className="flex items-center justify-between px-4 pr-10 py-4 border-b shrink-0 select-none">
            <div className="flex items-center gap-3">
              <Icon
                name={drawer === "Notification" ? "notification" : "missedcall"}
                className="w-5 h-5 text-primary"
              />
              <span className="text-lg font-bold">
                {drawer === "Notification" ? "Notifications" : "Missed Calls"}
              </span>
              {drawer === "Notification" && unreadNotificationCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                  {unreadNotificationCount} New
                </span>
              )}
              {drawer === "Missedcalls" && unreadMissedCallCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-[10px] font-bold">
                  {unreadMissedCallCount} New
                </span>
              )}
            </div>
            {((drawer === "Notification" && notificationData.length > 0) ||
              (drawer === "Missedcalls" && missedCallData.length > 0)) && (
                <button
                  onClick={handleClearAll}
                  className="text-xs font-semibold text-primary hover:text-primary/80 hover:underline transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-none select-none">
            {(drawer === "Notification" ? notificationData : missedCallData)
              .length === 0 &&
              !notificationLoading &&
              !missedCallLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground opacity-50">
                {drawer === "Notification" ? (
                  <>
                    <Bell className="h-12 w-12 mb-2" />
                    <p className="text-sm font-medium">No notifications yet</p>
                  </>
                ) : (
                  <>
                    <PhoneMissed className="h-12 w-12 mb-2" />
                    <p className="text-sm font-medium">No missed calls yet</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3 pb-10">
                {(drawer === "Notification"
                  ? notificationData
                  : missedCallData
                ).map((item, i) => (
                  <div
                    key={item.notificationId || i}
                    className={cn(
                      "group relative flex flex-col gap-3 rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer",
                      !item.isRead
                        ? "bg-primary/5 border-primary/20"
                        : "bg-card",
                    )}
                    onClick={() =>
                      !item.isRead && handleRead(item.notificationId)
                    }
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ring-background shadow-sm",
                          item.action === "CALLBACK"
                            ? "bg-blue-100 text-blue-600"
                            : item.action === "MISSEDCALL"
                              ? "bg-red-100 text-red-600"
                              : "bg-orange-100 text-orange-600",
                        )}
                      >
                        <Icon
                          name={
                            item.action === "CALLBACK"
                              ? "call"
                              : item.action === "INCOMINGSMS"
                                ? "sms"
                                : "missedcall"
                          }
                          className="w-5 h-5 transition-all"
                        />
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-bold text-foreground">
                            {item.action === "CALLBACK"
                              ? "Callback Reminder"
                              : item.action === "INCOMINGSMS"
                                ? "Incoming SMS"
                                : item.action === "MISSEDCALL"
                                  ? "Missed Call"
                                  : item.action}
                          </p>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {item.notificationTime}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">
                          {item.phonenumber ||
                            item.notificationData?.phonenumber ||
                            "Unknown Number"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      {item.action === "INCOMINGSMS" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs font-bold bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!item.isRead) handleRead(item.notificationId);
                            const phone = item.notificationData?.phonenumber;
                            if (phone) {
                              useConversationStore
                                .getState()
                                .setPendingNotificationPhone(phone);
                            }
                            setDrawer(false);
                            navigate("/agent-conversation");
                          }}
                        >
                          View
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs font-bold bg-green-50 text-green-600 border-green-200 hover:bg-green-600 hover:text-white hover:border-green-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            const number =
                              item.phonenumber ||
                              item.notificationData?.phonenumber;
                            const campaignId = parseInt(
                              localStorage.getItem("CampaignId") || "0",
                            );
                            if (number) {
                              if (!item.isRead) handleRead(item.notificationId);
                              callStore
                                .getState()
                                .makeCall(number, navigate, campaignId);
                              setDrawer(false);
                            }
                          }}
                        >
                          <Phone className="h-3 w-3 mr-1" /> Call
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg text-xs font-bold hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateNotificationStatus(
                            [item.notificationId],
                            "DISMISSED",
                          );
                        }}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(notificationLoading || missedCallLoading) && (
              <div className="flex justify-center p-8">
                <Loader />
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Waiting Calls Popup */}
      {showQueuePopup && (
        <div
          id="sidebar-queue-container"
          className={cn(
            "fixed z-[1000] w-72 overflow-hidden rounded-2xl border bg-card shadow-2xl transition-all duration-300 animate-in slide-in-from-left-4 select-none",
            collapsed ? "bottom-24 left-19" : "bottom-24 left-65",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between bg-muted/50 px-4 py-3 border-b">
            <span className="text-sm font-bold">Waiting calls</span>
            <span className="flex h-5 items-center justify-center rounded-full bg-destructive px-2 text-[10px] font-bold text-white">
              {liveQueueStats?.total_waiting || 0}
            </span>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            {liveQueueStats?.queues?.length > 0 ? (
              liveQueueStats.queues.map((q, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{q.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {q.priority || "Standard"}
                    </span>
                  </div>
                  <span className="h-7 w-7 flex items-center justify-center rounded-full bg-muted font-bold text-xs">
                    {q.count}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground italic text-xs">
                No active queues
              </div>
            )}
          </div>
        </div>
      )}
    </TooltipProvider>
  );
};

export default Sidebar;
