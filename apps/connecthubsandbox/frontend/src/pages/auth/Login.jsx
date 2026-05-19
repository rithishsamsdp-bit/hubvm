import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { callStore } from "../../store/useCallStore";
import icons from "../../constants/icon";
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
import { Loader } from "../../components/Index.jsx";

// shadcn UI components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { ArrowRight, Eye, EyeOff } from "lucide-react";

const { pulselogo } = icons;

const loginSchema = z.object({
  companycode: z.string().min(1, { message: "Company code is required" }),
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoggingIn } = useAuthStore();
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
            window.audioInitialized = true; // Mark as initialized anyway
          });
      }
    } catch (error) {
      console.log("Audio initialization on login:", error);
    }

    const response = await login({
      accountcode: values.companycode,
      membername: values.username,
      memberpassword: values.password,
    });

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

  const ssoLogin = () => {
    window.location.href = "https://connecthub.pulsework360.com/auth/saml";
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-[360px] shadow-2xl border-border bg-card">
        <CardHeader className="space-y-3 flex flex-col items-center pt-5 pb-2">
          <div className="w-28 sm:w-30 transition-all duration-300">
            <img
              src={pulselogo}
              alt="Pulse Logo"
              className="w-full h-auto object-contain"
            />
          </div>
          <div className="text-center space-y-1">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Sign in to Pulse
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs sm:text-sm">
              Enter your credentials to access your account
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-5 sm:px-6 pb-4">
          {isLoggingIn ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Loader />
              <p className="text-sm font-medium text-muted-foreground animate-pulse">
                Authenticating...
              </p>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="companycode"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-bold text-foreground/80 ml-1">
                          Company code
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter Company Code"
                            {...field}
                            className={`h-10 bg-slate-50/50 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all ${
                              form.formState.errors.companycode
                                ? "border-destructive ring-destructive/20"
                                : ""
                            }`}
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
                        <FormLabel className="text-sm font-bold text-foreground/80 ml-1">
                          Username
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter Username"
                            {...field}
                            className={`h-10 bg-slate-50/50 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all ${
                              form.formState.errors.username
                                ? "border-destructive ring-destructive/20"
                                : ""
                            }`}
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
                        <FormLabel className="text-sm font-bold text-foreground/80 ml-1">
                          Password
                        </FormLabel>
                        <div className="relative group/pass">
                          <FormControl>
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter Password"
                              {...field}
                              className={`h-10 bg-slate-50/50 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all pr-10 ${
                                form.formState.errors.password
                                  ? "border-destructive ring-destructive/20"
                                  : ""
                              }`}
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
                  className="w-full h-10 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98] mt-2 group"
                >
                  Login
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            </Form>
          )}
        </CardContent>

        {!isLoggingIn && (
          <CardFooter className="flex flex-col space-y-4 px-5 sm:px-6 pb-6">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-4 text-muted-foreground font-semibold tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={ssoLogin}
              className="w-full h-10 font-bold border-2 border-slate-200 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all active:scale-[0.98]"
            >
              SSO Login
            </Button>
          </CardFooter>
        )}
      </Card>

      <p className="mt-4 text-center text-[10px] text-muted-foreground uppercase tracking-widest">
        &copy; {new Date().getFullYear()} Pulse Telesystems Pvt. Ltd. All rights
        reserved.
      </p>
    </div>
  );
};

export default Login;
