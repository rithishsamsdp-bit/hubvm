import { create } from "zustand";
import whatsappaxios from "../../../services/whatsappaxios.js";
import { toast } from "../../../store/useToastStore.js";
export const useWaTemplateStore = create((set) => ({
    getTemplatesLoading: false,
    templates: [],
    getTemplates: async (pageSize, offset, debouncedSearch, sortField, sortOrder, startDate,
        endDate) => {
        set({ getTemplatesLoading: true });
        let data = {
            limit: pageSize,
            offset: offset,
            searchString: debouncedSearch || "",
            sortField: sortField || "",
            sortOrder: sortOrder || "",
            fromDate: startDate,
            toDate: endDate
        };
        console.log("📤 Sending template report request:", data);
        try {
            const res = await whatsappaxios.post("/whatsapp/fetch_whatsapp_template_report", data);
            console.log(res);
            set({ templates: res.data.data.totalRecords || [] });
        } catch (error) {
            const status = error?.response?.status;
            const message =
                error?.response?.data?.message ||
                "Something went wrong. Please try again later.";
            if (status) {
                toast.error(`Error ${status}: ${message}`);
            }
            else {
                toast.error(message);
            }
        } finally {
            set({ getTemplatesLoading: false });
        }
    },
    createTemplateLoading: false,
    createTemplate: async (templateData) => {
        console.log(templateData);
        set({ createTemplateLoading: true });
        const urlButtons = (templateData?.ctaButtons || []).filter((btn) => btn.action === "url");
        const callButtons = (templateData?.ctaButtons || []).filter(btn => btn.action === "call");
        const mediaType = templateData.mediaType === "image" ? "IMG" : templateData.mediaType === "video" ? "VIDEO" : templateData.mediaType === "document" ? "DOC" : "";
        const BtnType = templateData.buttonType === 'cta' ? 'CTA' : templateData.buttonType === 'quick' ? 'qr' : '';
        const formdata = new FormData();
        formdata.append("tempName", templateData.templateName || "");
        formdata.append("tempCategory", templateData.templateCategory || "");
        formdata.append("selectLan", "en_US");
        formdata.append("headerType", templateData.headerType || "");
        formdata.append("headerValue", templateData.headerTitle || "");
        formdata.append("mediaType", mediaType);
        formdata.append("mediaExtType", "");
        formdata.append("bodyContent", templateData.message || "");
        formdata.append("footerContent", templateData.footerText || "");
        formdata.append("btnType", BtnType);
        formdata.append("btnNameVm", urlButtons?.text || "");
        formdata.append("wUrl", urlButtons?.url || "");
        formdata.append("btnNameCpn", callButtons?.[0]?.text || "");
        formdata.append("phoneNum", callButtons?.[0]?.phones[0]?.number || "");
        formdata.append("Phone_Code", callButtons?.[0]?.phones[0]?.code || "");
        formdata.append("btn1", templateData.quickReplies[0]?.text || "");
        formdata.append("btn2", templateData.quickReplies[1]?.text || "");
        formdata.append("btn3", templateData.quickReplies[2]?.text || "");
        if (templateData?.mediaFile) {
            formdata.append("fileName", templateData.mediaFile.name);
            formdata.append("file", templateData.mediaFile, templateData.mediaFile.name);
        } else {
            formdata.append("fileName", "");
            formdata.append("file", new Blob([], { type: "application/octet-stream" }), "");
        }
        // console.log("📦 FormData values:");
        // for (let [key, value] of formdata.entries()) {
        //     console.log(`${key}:`, value);
        // }
        try {
            const res = await whatsappaxios.post("/whatsapp/create_whatsapp_template", formdata);
            console.log(res);
            toast.success(res.data.data.message || "Template created successfully");
            return res.data;
        } catch (error) {
            console.log(error)
            const status = error?.response?.status;
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Something went wrong";
            if (status) {
                toast.error(`Error ${status}: ${message}`);
            } else {
                toast.error(message);
            }
        }
        finally {
            set({ createTemplateLoading: false });
        }
    },
    checkTemplateNameExists: async (templateName) => {
        if (!templateName?.trim()) return false;
        try {
            const res = await whatsappaxios.post("/whatsapp/fetchWhatsappTemplateList");
            const templates = res.data?.templates || [];
            // Check if any template has exactly the same name (case-insensitive)
            return templates.some((t) =>
                t.templateName?.toLowerCase() === templateName.toLowerCase()
            );
        } catch (error) {
            console.error("Error checking template name:", error);
            return false;
        }
    },
    deleteTemplateLoading: false,
    deleteTemplate: async (templateName) => {
        set({ deleteTemplateLoading: true });
        try {
            const res = await whatsappaxios.delete("/whatsapp/delete_whatsapp_template", {
                data: { templateName }
            });
            console.log(res);
            toast.success(res.data?.message || "Template deleted successfully");
            return true;
        } catch (error) {
            console.log(error);
            const status = error?.response?.status;
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Failed to delete template";
            if (status) {
                toast.error(`Error ${status}: ${message}`);
            } else {
                toast.error(message);
            }
            return false;
        } finally {
            set({ deleteTemplateLoading: false });
        }
    }
}));