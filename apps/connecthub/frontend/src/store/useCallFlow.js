import { create } from "zustand";
import telephonyaxios from "../services/telephonyaxios.js";
import { toast } from "./useToastStore.js";
import aiaxios from "../services/aiaxios.js";
export const useCallFlow = create((set) => ({

    Nodes: [],
    Edges: [],
    createCallFlowLoading: false,
    viewCallFlowLoading: false,
    editCallflowLoading: false,
    callFlowData: [],
    callFlowDataTotalCount: 0,
    callFlowLoading: false,

    createCallflow: async (name, nodes, edges) => {
        set({ createCallFlowLoading: true });
        const data = {
            callflowname: name,
            callflowdata: {
                nodes, edges
            }
        };
        try {
            const res = await telephonyaxios.post("/telephony/callflow/create", data);
            toast.success(res.data.message)
            return res;
        } catch (error) {
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
        } finally {
            set({ createCallFlowLoading: false });

        }
    },

    getCallflow: async (pageSize, offset, searchString, sortField, sortOrder) => {
        set({ callFlowLoading: true });
        const data = {
            limit: pageSize,
            offset: offset,
            searchString: searchString,
            sortField: sortField || "c_callflowId",
            sortOrder: sortOrder || "DESC",
        };
        try {
            const res = await telephonyaxios.post("/telephony/callflow/fetch", data);
            set({ callFlowData: res.data.data.totalRecords });
            set({ callFlowDataTotalCount: res.data.data.totalRecordsCount });
        } catch (error) {
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
        } finally {
            set({ callFlowLoading: false });
        }
    },

    deleteCallflow: async (id, name) => {
        set({ callFlowLoading: true });
        const data = {
            callflowid: id,
            callflowname: name
        };
        try {
            const res = await telephonyaxios.post("/telephony/callflow/delete", data);
            toast.success(res.data.message)
            return res;
        } catch (error) {
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
        } finally {
            set({ callFlowLoading: false });
        }
    },

    viewCallflow: async (id) => {
        set({ Nodes: [], Edges: [] });
        set({ ViewCallFlowLoading: true });
        const data = {
            callflowid: id,
        };
        try {
            const res = await telephonyaxios.post("/telephony/callflow/get/callflow", data);
            set({ Nodes: res.data.data[0].c_callflowData.nodes, Edges: res.data.data[0].c_callflowData.edges });


        } catch (error) {
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
        } finally {
            set({ ViewCallFlowLoading: false });
        }
    },

    editCallflow: async (editid, name, nodes, edges) => {
        set({ editCallflowLoading: true });
        const data = {
            callflowid: editid,
            callflowname: name,
            callflowdata: {
                nodes, edges
            }
        };
        try {
            const res = await telephonyaxios.post("/telephony/callflow/update", data);
            toast.success(res.data.message)
            return res;
        } catch (error) {
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
        } finally {
            set({ editCallflowLoading: false });

        }
    },

    agentsLoading: false,
    agentsData: [],

    getAgents: async () => {
        set({ agentsLoading: true });
        try {
            const res = await telephonyaxios.get("/telephony/clinumber/list/members");
            set({ agentsData: res.data.data })
        } catch (error) {
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
        } finally {
            set({ agentsLoading: false });
        }
    },

    getVoice: async (msg) => {
  const data = {
    content: msg,
    voiceid: "Aditi",     // pick a voice
    language: "en-IN",   // language code
    engine: "standard",  // or "neural"
  };

  try {
    // Use POST (with body) instead of GET
    const res = await telephonyaxios.post(
      "/telephony/callflow/preview/voiceresponse",
      data,
      { responseType: "blob" } // important: get binary audio
    );

    // Convert the response blob into a playable URL
    const blob = new Blob([res.data], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    return url;
  } catch (error) {
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
    return null; // make sure caller knows it failed
  }
    },

    uploadAudioFile: async (callflowname, file) => {
        set({ callFlowLoading: true });
        const formData = new FormData();
        formData.append("callflowname", callflowname || "default_callflow");
        formData.append("uploadfile", file);

        try {
            const res = await telephonyaxios.post("/telephony/callflow/uploadfile/create", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            toast.success(res.data.message || "File uploaded successfully");
            return res.data?.data || res.data;
        } catch (error) {
            const status = error?.response?.status;
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Upload failed";

            if (status) {
                toast.error(`Error ${status}: ${message}`);
            } else {
                toast.error(message);
            }
            return null;
        } finally {
            set({ callFlowLoading: false });
        }
    },

    deleteAudioFile: async (filepath) => {
        set({ callFlowLoading: true });
        try {
            const res = await telephonyaxios.post("/telephony/callflow/uploadfile/delete", { filepath });
            toast.success(res.data.message || "File deleted successfully");
            return res.data;
        } catch (error) {
            const status = error?.response?.status;
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Delete failed";

            if (status) {
                toast.error(`Error ${status}: ${message}`);
            } else {
                toast.error(message);
            }
            return null;
        } finally {
            set({ callFlowLoading: false });
        }
    },

    aiBotsLoading: false,
    aiBotsData: [],

    getAiBots: async () => {
        set({ aiBotsLoading: true });
        try {
            const res = await aiaxios.get("/api/ai/bots");
            // If the backend returns a raw list, res.data is the list.
            // If it's wrapped in { data: [...] }, use res.data.data.
            // Based on BotResponse code, it returns a raw list.
            set({ aiBotsData: res.data.data || res.data })
        } catch (error) {
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
        } finally {
            set({ aiBotsLoading: false });
        }
    }
}))