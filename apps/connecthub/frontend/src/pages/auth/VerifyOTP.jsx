import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import icons from "../../constants/icon";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Loader } from "../../components/Index.jsx";

// shadcn UI components
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { ArrowLeft, ArrowRight } from "lucide-react";

const otpSchema = z.object({
  otp: z.string().length(6, { message: "Please enter the full 6-digit code" }),
});

import AuthLayout from "./AuthLayout";

const VerifyOTP = () => {
  const navigate = useNavigate();
  const { verifyLoginOTP, resendOTP, loginData, isLoggingIn } = useAuthStore();
  const form = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(30);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (!loginData) {
      navigate("/login");
    } else {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [loginData, navigate]);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const maskEmail = (email) => {
    if (!email) return "";
    const [user, domain] = email.split("@");
    return `${user.substring(0, 2)}***@${domain}`;
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const currentOtp = form.getValues("otp").split("");
    const newOtpArr = [...Array(6)].map((_, i) => currentOtp[i] || "");
    newOtpArr[index] = value.substring(value.length - 1);
    const newOtpStr = newOtpArr.join("");

    form.setValue("otp", newOtpStr, { shouldValidate: true });

    if (value && index < 5) {
      const nextInput = document.querySelector(`input[name=otp-${index + 1}]`);
      if (nextInput) nextInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, 6);
    if (!pastedData) return;

    form.setValue("otp", pastedData, { shouldValidate: true });

    // Focus the appropriate input
    const focusIndex = Math.min(pastedData.length - 1, 5);
    const targetInput = document.querySelector(`input[name=otp-${focusIndex}]`);
    if (targetInput) targetInput.focus();
  };

  const handleResend = async () => {
    setResending(true);
    const success = await resendOTP();
    if (success) {
      setTimer(30);
    }
    setResending(false);
  };

  const onSubmit = async (values) => {
    const response = await verifyLoginOTP(values.otp);

    if (response.success) {
      // Success handled by state
    } else {
      form.setError("otp", {
        type: "manual",
        message: response.message || "Invalid verification code",
      });
    }
  };

  if (!loginData) return null;

  return (
    <AuthLayout
      title="Verify Identity"
      description={
        <>
          Verification code sent to <br />
          <span className="font-bold text-foreground">
            {maskEmail(loginData.m_memberMailId)}
          </span>
        </>
      }
    >
      <CardContent className="px-5 sm:px-6 pb-2 2xl:pb-4">
        {isLoggingIn ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              Verifying...
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex justify-between gap-2 sm:gap-3">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <Input
                            key={index}
                            ref={index === 0 ? firstInputRef : null}
                            name={`otp-${index}`}
                            type="text"
                            maxLength="1"
                            className="w-8 sm:w-10 text-center text-lg font-black h-12 rounded-xl"
                            value={field.value[index] || ""}
                            onPaste={handlePaste}
                            onChange={(e) =>
                              handleOtpChange(index, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === "Backspace" &&
                                !field.value[index] &&
                                index > 0
                              ) {
                                const prevInput = document.querySelector(
                                  `input[name=otp-${index - 1}]`,
                                );
                                if (prevInput) prevInput.focus();
                              }
                            }}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage className="text-center animate-bounce" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-10 xl:h-9 2xl:h-11 text-base xl:text-sm 2xl:text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98] mt-2 group"
              >
                Verify Code
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          </Form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col space-y-4 px-5 sm:px-6 pb-5 2xl:pb-8 text-center text-sm">
        <div className="text-muted-foreground">
          {timer > 0 ? (
            <p>
              Resend code in{" "}
              <span className="font-black text-primary tabular-nums">
                {timer}s
              </span>
            </p>
          ) : (
            <p>
              Didn't receive the code?{" "}
              <button
                type="button"
                onClick={!resending ? handleResend : null}
                className={`font-bold text-primary hover:underline underline-offset-4 decoration-2 ${resending ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {resending ? "Resending..." : "Resend code"}
              </button>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="flex items-center justify-center gap-2 font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest text-[10px] w-full"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Login
        </button>
      </CardFooter>
    </AuthLayout>
  );
};

export default VerifyOTP;
