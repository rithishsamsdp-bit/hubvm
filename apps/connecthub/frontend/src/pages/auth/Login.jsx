import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { callStore } from "../../store/useCallStore";
import dashboardaxios from "../../services/dashboardaxios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader, Icon } from "../../components/Index.jsx";

// shadcn UI components
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { ArrowRight, Eye, EyeOff, AlertTriangle, Monitor, Globe, MapPin, Clock } from "lucide-react";

const loginSchema = z.object({
  companycode: z.string().min(1, { message: "Company code is required" }),
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

import AuthLayout from "./AuthLayout";

const parseUserAgent = (ua) => {
  if (!ua) return "Unknown Device";
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  if (ua.includes("Edg/")) { const m = ua.match(/Edg\/(\d+)/); browser = `Edge ${m ? m[1] : ""}`; }
  else if (ua.includes("OPR/")) { const m = ua.match(/OPR\/(\d+)/); browser = `Opera ${m ? m[1] : ""}`; }
  else if (ua.includes("Chrome/") && !ua.includes("Chromium")) { const m = ua.match(/Chrome\/(\d+)/); browser = `Chrome ${m ? m[1] : ""}`; }
  else if (ua.includes("Firefox/")) { const m = ua.match(/Firefox\/(\d+)/); browser = `Firefox ${m ? m[1] : ""}`; }
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) { const m = ua.match(/Version\/(\d+)/); browser = `Safari ${m ? m[1] : ""}`; }
  if (ua.includes("Windows NT 10")) os = "Windows 10/11";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";
  return `${browser.trim()} · ${os}`;
};

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoggingIn, setSessionId } = useAuthStore();
  const { initUA } = callStore();

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      companycode: "",
      username: "",
      password: "",
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [duplicateSessionInfo, setDuplicateSessionInfo] = useState(null);
  const [pendingLoginValues, setPendingLoginValues] = useState(null);

  const getLocalIP = () => {
    return new Promise((resolve) => {
      const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
      if (!RTCPeerConnection) {
        resolve(undefined);
        return;
      }
      const rtc = new RTCPeerConnection({ iceServers: [] });
      rtc.createDataChannel("");
      rtc.onicecandidate = (event) => {
        if (event.candidate) {
          const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
          const match = ipRegex.exec(event.candidate.candidate);
          if (match) {
            rtc.close();
            resolve(match[1]);
          }
        }
      };
      rtc.createOffer().then(offer => rtc.setLocalDescription(offer)).catch(() => resolve(undefined));
      setTimeout(() => {
        rtc.close();
        resolve(undefined);
      }, 1000);
    });
  };

  const onSubmit = async (values) => {
    // Enable audio after user interaction (login button click)
    try {
      if (!window.audioInitialized) {
        const audio = new Audio();
        audio
          .play()
          .then(() => {
            audio.pause();
            window.audioInitialized = true;
            console.log("✅ Audio system primed after login click");
          })
          .catch(() => {
            window.audioInitialized = true;
          });
      }
    } catch (error) {
      console.log("Audio initialization on login:", error);
    }

    let publicIp = undefined;
    let localIp = undefined;
    let publicLocation = undefined;
    const currentSessionId = crypto.randomUUID();
    setSessionId(currentSessionId);

    try {
      const geoResp = await fetch("https://ipinfo.io/json");
      if (geoResp.ok) {
        const geoData = await geoResp.json();
        publicIp = geoData.ip;
        publicLocation = geoData.city ? `${geoData.city}, ${geoData.region}, ${geoData.country}` : undefined;
      }
    } catch (e) {
      console.log("Failed to fetch public IP/location", e);
    }

    try {
      localIp = await getLocalIP();
    } catch (e) {
      console.log("Failed to fetch local IP", e);
    }

    const response = await login({
      accountcode: values.companycode,
      membername: values.username,
      memberpassword: values.password,
      publicIp,
      localIp,
      publicLocation,
      sessionId: currentSessionId,
    });

    if (response.duplicateSession) {
      setDuplicateSessionInfo(response.sessionData);
      setPendingLoginValues({ 
        ...values, 
        extension: response.userData?.m_memberExtensionNo, 
        memberId: response.userData?.m_memberId,
        publicIp, 
        localIp, 
        publicLocation, 
        sessionId: currentSessionId 
      });
      return;
    }

    if (response.twoFactor) {
      navigate("/verify-otp");
      return;
    }

    if (response.success) {
      try {
        await initUA(values.password);
      } catch (error) {
        console.error("Failed to initialize SIP UA:", error);
      }
    }
  };

  const handleForceLogin = async () => {
    if (!pendingLoginValues) return;
    const memberExtension = pendingLoginValues.extension;
    const pwd = pendingLoginValues.password;

    const response = await login({
      accountcode: pendingLoginValues.companycode,
      membername: pendingLoginValues.username,
      memberpassword: pwd,
      publicIp: pendingLoginValues.publicIp,
      localIp: pendingLoginValues.localIp,
      publicLocation: pendingLoginValues.publicLocation,
      sessionId: pendingLoginValues.sessionId,
      forcelogin: true,
    });

    setDuplicateSessionInfo(null);
    setPendingLoginValues(null);

    if (response.twoFactor) {
      navigate("/verify-otp");
      return;
    }

    if (response.success) {
      try {
        await dashboardaxios.post("/producerone/livemonitor/forcelogout", {
          extention: memberExtension || "0",
          memberId: pendingLoginValues.memberId,
          activeToken: pendingLoginValues.sessionId
        });
      } catch (error) {
        console.error("Force logout notification failed:", error);
      }

      try {
        await initUA(pwd);
      } catch (error) {
        console.error("Failed to initialize SIP UA:", error);
      }
    }
  };

  const ssoLogin = () => {
    window.location.href = "https://connecthub.pulsework360.com/auth/saml";
  };

  return (
    <AuthLayout
      title="Sign in to Pulse"
      description="Enter your credentials to access your account"
      wide={!!duplicateSessionInfo}
    >
      <CardContent className="px-5 sm:px-6 pb-2">
        {isLoggingIn ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              Authenticating...
            </p>
          </div>
        ) : duplicateSessionInfo ? (
          <div className="flex flex-col items-center justify-center space-y-2 text-center animate-in fade-in zoom-in duration-300">
            <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Active Session Detected</h3>
              <p className="text-[11px] text-muted-foreground leading-snug px-2 mt-0.5">
                Your account is currently logged in on another device. Logging in here will disconnect the active session.
              </p>
            </div>
            <div className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 space-y-2 text-left">
              <div className="flex items-center space-x-2.5 text-xs">
                <div className="bg-slate-200/50 p-1 rounded"><Monitor className="h-3.5 w-3.5 text-slate-600" /></div>
                <div className="flex-1 truncate">
                  <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Device / Browser</p>
                  <p className="font-medium text-slate-800 truncate" title={duplicateSessionInfo.device}>{parseUserAgent(duplicateSessionInfo.device)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2.5 text-xs">
                <div className="bg-slate-200/50 p-1 rounded"><Globe className="h-3.5 w-3.5 text-slate-600" /></div>
                <div>
                  <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">IP Address</p>
                  <p className="font-medium text-slate-800">
                    {duplicateSessionInfo.local_ip || "Unknown"}
                    <span className="ml-1.5 text-slate-400">({duplicateSessionInfo.ip || "Unknown"})</span>
                  </p>
                </div>
              </div>
              {duplicateSessionInfo.location && duplicateSessionInfo.location !== "Unknown Location" && (
                <div className="flex items-center space-x-2.5 text-xs">
                  <div className="bg-slate-200/50 p-1 rounded"><MapPin className="h-3.5 w-3.5 text-slate-600" /></div>
                  <div>
                    <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Location</p>
                    <p className="font-medium text-slate-800">{duplicateSessionInfo.location}</p>
                  </div>
                </div>
              )}
              {duplicateSessionInfo.login_time && (() => {
                const loginDate = new Date(duplicateSessionInfo.login_time);
                const diffMins = Math.floor((new Date() - loginDate) / 60000);
                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                return (
                  <div className="flex items-center space-x-2.5 text-xs">
                    <div className="bg-slate-200/50 p-1 rounded"><Clock className="h-3.5 w-3.5 text-slate-600" /></div>
                    <div>
                      <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Logged In Since</p>
                      <p className="font-medium text-slate-800">{loginDate.toLocaleString()} <span className="text-amber-600 font-semibold">({duration})</span></p>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex flex-col w-full space-y-1.5 mt-2">
              <Button onClick={handleForceLogin} className="w-full h-9 bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] text-sm">
                Force Logout & Continue
              </Button>
              <Button variant="ghost" onClick={() => { setDuplicateSessionInfo(null); setPendingLoginValues(null); }} className="w-full h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-semibold text-xs">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="companycode"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Company code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Company Code"
                          {...field}
                          className={cn(
                            "placeholder:text-[11px]",
                            form.formState.errors.companycode &&
                            "border-destructive ring-destructive/20",
                          )}
                        />
                      </FormControl>
                      <FormMessage className="ml-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Username"
                          {...field}
                          className={cn(
                            "placeholder:text-[11px]",
                            form.formState.errors.username &&
                            "border-destructive ring-destructive/20",
                          )}
                        />
                      </FormControl>
                      <FormMessage className="ml-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Password</FormLabel>
                      <div className="relative group/pass">
                        <FormControl>
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter Password"
                            {...field}
                            className={cn(
                              "pr-10 placeholder:text-[11px]",
                              form.formState.errors.password &&
                              "border-destructive ring-destructive/20",
                            )}
                          />
                        </FormControl>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <FormMessage className="ml-1" />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-7 xl:h-9 2xl:h-11 text-base xl:text-sm 2xl:text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98] mt-1 group"
              >
                Login
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          </Form>
        )}
      </CardContent>

      {!isLoggingIn && !duplicateSessionInfo && (
        <CardFooter className="flex flex-col space-y-3 px-5 sm:px-6 pb-5 2xl:pb-8">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] 2xl:text-xs uppercase">
              <span className="bg-card px-4 text-muted-foreground font-semibold tracking-wider">
                Or
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={ssoLogin}
            className="w-full h-7 xl:h-9 2xl:h-11 text-sm xl:text-xs 2xl:text-base font-bold border-2 border-slate-200 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all active:scale-[0.98]"
          >
            <Icon name="microsoft" className="h-4 w-4 mr-2" />
            Sign in with Microsoft
          </Button>
        </CardFooter>
      )}
    </AuthLayout>
  );
};

export default Login;
