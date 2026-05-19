import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUsersStore } from "../../../store/admin/useUsersStore";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { Navbar } from "../../../components/Index.jsx";

import { useForm, useFieldArray } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";

const AdminUsersCreation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialRole = params.get("role") || "USER";

  const { createUser, isuserCreateLoading } = useUsersStore();
  const { authRole, authPlan, authUser } = useAuthStore();

  const isCustomExtension = authPlan?.options?.usercreation?.custom_extension;

  const getUserSchema = () =>
    z.object({
      m_memberName: z.string().min(1, "Name is required"),
      m_memberPassword: z.string().min(1, "Password is required"),
      m_memberExtensionNo: isCustomExtension
        ? z
            .string()
            .regex(/^\d{4}$/, "Must be exactly 4 digits")
            .min(1, "Extension is required")
        : z.string().optional(),
      m_memberMobileNo: z
        .string()
        .min(10, "Must be at least 10 digits")
        .max(10, "Must be at most 10 digits")
        .regex(/^\d+$/, "Must be numbers only"),
      m_memberMailId: z.string().email("Invalid email format"),
      m_memberMode: z.string().min(1, "Mode is required"),
      m_memberPlatformType: z.string().min(1, "Platform Type is required"),
      m_memberRole: z.string().min(1, "Role is required"),
      m_memberCallerIdMode: z.string().default("NO"),
      m_memberCallerId: z.string().default("0"),
    });

  const formSchema = useMemo(
    () =>
      z.object({
        users: z.array(getUserSchema()),
      }),
    [isCustomExtension],
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      users: [
        {
          m_memberName: "",
          m_memberPassword: "",
          m_memberExtensionNo: "",
          m_memberMobileNo: "",
          m_memberMailId: "",
          m_memberMode: "",
          m_memberPlatformType: "",
          m_memberRole: initialRole,
          m_memberCallerIdMode: "NO",
          m_memberCallerId: "0",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "users",
  });

  const onSubmit = async (values) => {
    try {
      await createUser(values.users);
      navigate(-1);
    } catch (error) {
      console.error("Failed to create user:", error);
    }
  };

  const handleCancel = () => {
    navigate("/admin-users?tab=Users&page=1&per_page=10");
  };

  const modeOptions = [
    { label: "Browser", value: "BROWSER" },
    { label: "SoftPhone", value: "SOFTPHONE" },
  ];

  const platformOptions = [
    { label: "Call Center", value: "CALLCENTER" },
    { label: "RCM", value: "RCM" },
  ];

  return (
    <div className="flex flex-col w-full h-full bg-slate-50/50 overflow-hidden">
      <div className="flex-none">
        <Navbar
          title="User Creation"
          breadcrumbs={[
            {
              label: "Dashboard",
              route: authRole === "TL" ? "/tl-dashboard" : "/admin-dashboard",
            },
            {
              label: "Users",
              route: "/admin-users?tab=Users&page=1&per_page=10",
            },
            { label: "User Creation", active: true },
          ]}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col relative">
        <div className="p-6 w-full max-w-6xl mx-auto flex-1">
            <Form {...form}>
              <form
                id="user-creation-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-800">
                        User Details {fields.length > 1 ? `#${index + 1}` : ""}
                      </h3>
                      {initialRole !== "ADMIN" && fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8 w-8"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-5">
                      <FormField
                        control={form.control}
                        name={`users.${index}.m_memberName`}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel>
                              Member Name{" "}
                              <span className="text-rose-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter name"
                                className="bg-white"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`users.${index}.m_memberPassword`}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel>
                              Password <span className="text-rose-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter password"
                                className="bg-white"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />

                      {isCustomExtension && (
                        <FormField
                          control={form.control}
                          name={`users.${index}.m_memberExtensionNo`}
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel>
                                Extension Number{" "}
                                <span className="text-rose-500">*</span>
                              </FormLabel>
                              <FormControl>
                                <div className="flex">
                                  <div className="flex items-center justify-center px-3 border border-r-0 border-slate-200 bg-slate-50 rounded-l-md">
                                    <span className="text-[13px] font-semibold text-slate-500">
                                      {authUser?.m_accountId}
                                    </span>
                                  </div>
                                  <Input
                                    placeholder="4 digits"
                                    maxLength={4}
                                    className="rounded-l-none bg-white"
                                    {...field}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(
                                        /\D/g,
                                        "",
                                      );
                                      field.onChange(val);
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-[11px]" />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name={`users.${index}.m_memberMobileNo`}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel>
                              Mobile Number{" "}
                              <span className="text-rose-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="10 digits"
                                maxLength={10}
                                className="bg-white"
                                {...field}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "");
                                  field.onChange(val);
                                }}
                              />
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`users.${index}.m_memberMailId`}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel>
                              Email ID <span className="text-rose-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="example@email.com"
                                className="bg-white"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`users.${index}.m_memberMode`}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel>
                              Mode <span className="text-rose-500">*</span>
                            </FormLabel>
                            <Select
                              options={modeOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select Mode"
                              showSearch={false}
                              triggerClassName="bg-white"
                            />
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`users.${index}.m_memberPlatformType`}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel>
                              Platform Type{" "}
                              <span className="text-rose-500">*</span>
                            </FormLabel>
                            <Select
                              options={platformOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select Type"
                              showSearch={false}
                              triggerClassName="bg-white"
                            />
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}

                {initialRole !== "ADMIN" && (
                  <div className="flex justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-dashed border-2 border-slate-300 text-slate-600 hover:text-primary hover:border-primary hover:bg-primary/5 font-semibold bg-white"
                      onClick={() =>
                        append({
                          m_memberName: "",
                          m_memberPassword: "",
                          m_memberExtensionNo: "",
                          m_memberMobileNo: "",
                          m_memberMailId: "",
                          m_memberMode: "",
                          m_memberPlatformType: "",
                          m_memberRole: initialRole,
                          m_memberCallerIdMode: "NO",
                          m_memberCallerId: "0",
                        })
                      }
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another User
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </div>

        <div className="p-5 border-t border-slate-200 bg-white sticky bottom-0 z-10 w-full mt-auto">
          <div className="max-w-6xl mx-auto flex justify-end items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={isuserCreateLoading}
            >
              Cancel
            </Button>
            <Button
              form="user-creation-form"
              type="submit"
              variant="default"
              disabled={isuserCreateLoading}
            >
              {isuserCreateLoading && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Users
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersCreation;
