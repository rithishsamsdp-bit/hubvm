import { create } from "zustand";
import dashboardaxios from "../../services/dashboardaxios.js";
import { toast } from "../../store/useToastStore.js";
import { useSocketStore } from "../useSocketStore.js";


export const useDashboardStore = create((set, get) => ({

    userStatusData: [],
    userStatusDataLoading: false,
    MetricsLoading: false,
    tc: 0,
    tin: 0,
    tout: 0,
    tans: 0,
    tunans: 0,
    avgtalktime: 0,

    inboundAnswered: 0,
    outboundAnswered: 0,
    inboundUnanswered: 0,
    outboundUnanswered: 0,

    inboundMissed: 0,
    outboundMissed: 0,
    inboundDuration: 0,
    outboundDuration: 0,
    inboundMaxDuration: 0,
    outboundMaxDuration: 0,
    inboundAvgTalkTime: 0,
    outboundAvgTalkTime: 0,

    // New Metrics
    outboundCallbackRequests: 0,
    inboundRepeatCalls: 0,
    outboundRepeatCalls: 0,
    inboundRepeatCallsPercent: 0,
    outboundRepeatCallsPercent: 0,
    inboundPeakHour: "0",
    outboundPeakHour: "0",

    agentMetricsLoading: false,

    available: 0,
    ringing: 0,
    incall: 0,
    notavailable: 0,
    totalBreak: 0,
    total: 0,

    callsMetrics: [],
    callsMetricsTotal: 0,
    callsMetricsLoading: false,

    // put new row at top
    prependCall: (row) =>
        set((s) => ({
            callsMetrics: [row, ...(s.callsMetrics || [])],
            callsMetricsTotal: (s.callsMetricsTotal || 0) + 1,
        })),

    // update ONLY l_callStatus for a row
    updateCallStatusByUUID: (uuid, newStatus) =>
        set((s) => ({
            callsMetrics: (s.callsMetrics || []).map((r) =>
                r.l_callUUID === uuid ? { ...r, l_callStatus: newStatus } : r
            ),
        })),

    // set arbitrary flags/fields for a row (e.g., barge status)
    patchRowByUUID: (uuid, patch) =>
        set((s) => ({
            callsMetrics: (s.callsMetrics || []).map((r) =>
                r.l_callUUID === uuid ? { ...r, ...patch } : r
            ),
        })),


    getMetricsData: async () => {
        set({ MetricsLoading: true });
        try {
            const res = await dashboardaxios.get("/producerone/livemonitor/mainmetrics");
            // console.log(res);
            let data = res.data[0];
            const tc = data.ml_inboundTotal + data.ml_outboundTotal;
            const tin = data.ml_inboundTotal;
            const tout = data.ml_outboundTotal;
            const tans = data.ml_inboundAnswered + data.ml_outboundAnswered;
            const tunans = data.ml_inboundUnAnswered + data.ml_outboundUnAnswered;
            const avgtalktime = data.ml_avgTalkTime;

            const inboundAnswered = data.ml_inboundAnswered;
            const outboundAnswered = data.ml_outboundAnswered;
            const inboundUnanswered = data.ml_inboundUnAnswered;
            const outboundUnanswered = data.ml_outboundUnAnswered;

            const inboundMissed = data.ml_inboundMissed;
            const outboundMissed = data.ml_outboundMissed;
            const inboundDuration = data.ml_inboundDuration;
            const outboundDuration = data.ml_outboundDuration;
            const inboundMaxDuration = data.ml_inboundMaxDuration;
            const outboundMaxDuration = data.ml_outboundMaxDuration;
            const inboundAvgTalkTime = data.ml_inboundAvgTalkTime;
            const outboundAvgTalkTime = data.ml_outboundAvgTalkTime;

            const outboundCallbackRequests = data.ml_callbackRequests || 0;
            const inboundRepeatCalls = data.ml_inboundRepeatCalls || 0;
            const outboundRepeatCalls = data.ml_outboundRepeatCalls || 0;

            const inboundRepeatCallsPercent = data.ml_inboundRepeatCallsPercent || 0;
            const outboundRepeatCallsPercent = data.ml_outboundRepeatCallsPercent || 0;
            const inboundPeakHour = data.ml_inboundPeakHour || "0";
            const outboundPeakHour = data.ml_outboundPeakHour || "0";

            set({
                tc, tin, tout, tans, tunans, avgtalktime,
                inboundAnswered, outboundAnswered, inboundUnanswered, outboundUnanswered,
                inboundMissed, outboundMissed, inboundDuration, outboundDuration,
                inboundMaxDuration, outboundMaxDuration, inboundAvgTalkTime, outboundAvgTalkTime,
                outboundCallbackRequests, inboundRepeatCalls, outboundRepeatCalls,
                inboundRepeatCallsPercent, outboundRepeatCallsPercent, inboundPeakHour, outboundPeakHour
            });
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
            set({ MetricsLoading: false });
        }
    },

    computeCounts: (list) => {
        const data = Array.isArray(list) ? list : [];
        const counts = data.reduce(
            (acc, item) => {
                const raw = (item?.l_memberStatus || "").toString().trim().toUpperCase();

                const status =
                    raw === "IN-CALL" || raw === "IN CALL" ? "INCALL" : raw;

                if (status.includes("RING")) acc.ringing += 1;
                else if (status === "INCALL") acc.incall += 1;
                else if (status === "AVAILABLE" || status === "READY" || status === "IDLE")
                    acc.available += 1;
                else acc.notavailable += 1;

                acc.total += 1;
                return acc;
            },
            { available: 0, ringing: 0, incall: 0, notavailable: 0, total: 0 }
        );

        set(counts);
    },

    getUserStatusData: async () => {
        set({ userStatusDataLoading: true });
        try {
            const res = await dashboardaxios.get("/producerone/livemonitor/select");
            // console.log(res.data);
            const list = res.data || [];
            set({ userStatusData: list });
            get().computeCounts(list);
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
            set({ userStatusDataLoading: false });
        }
    },

    getCallsDetails: async (pageSize, offset) => {

        set({ callsMetricsLoading: true });
        let data = {
            limit: pageSize,
            offset: offset
        }

        try {
            const res = await dashboardaxios.post('/producerone/livemonitor/livecallmonitoring', data);
            console.log(res);
            set({
                callsMetricsTotal: res.data.totalRecordsCount,
                callsMetrics: res.data.totalRecords
            })

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
            set({ callsMetricsLoading: false });

        }

    },



    // getAgentMetrics: async () => {
    //     set({ agentMetricsLoading: true })
    //     try {
    //         const res = await dashboardaxios.get("/producerone/livemonitor/agentlivemetrics");
    //         console.log(res);
    //         let total = res.data.RINGING_liv + res.data.AVAILABLE_liv + res.data.INCALL_liv + res.data.UNAVAILABLE_liv;
    //         set({
    //             ringing: res.data.RINGING_liv,
    //             available: res.data.AVAILABLE_liv,
    //             incall: res.data.INCALL_liv,
    //             notavailable: res.data.UNAVAILABLE_liv,
    //             totalBreak: res.data.TOTALBREAKS,
    //             total: total

    //         })
    //     } catch (error) {
    //         const status = error?.response?.status;
    //         const message =
    //             error?.response?.data?.message ||
    //             error?.response?.data?.error ||
    //             error?.message ||
    //             "Something went wrong";
    //         if (status) {
    //             toast.error(`Error ${status}: ${message}`);
    //         } else {
    //             toast.error(message);
    //         }
    //     } finally {
    //         set({ agentMetricsLoading: false });
    //     }
    // },

    subscribeTodata: () => {
        const socket = useSocketStore.getState().adminDashboardSocket;
        if (!socket) return;

        const formatDate = (date) => {
            const pad = (n) => n.toString().padStart(2, "0");
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
                date.getDate()
            )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
                date.getSeconds()
            )}`;
        };

        const handleResponse = (data) => {
            const newData = data?.data;
            if (!newData) return;

            const existingData = get().userStatusData || [];

            if (
                newData.type === "CallInsertData" ||
                newData.type === "CallUpdateData" ||
                newData.type === "CallCompletedData"
                
            ) {
                if (newData.type === "CallInsertData") {
                    set((state) => ({
                        callsMetrics: [newData, ...(state.callsMetrics || [])],
                        callsMetricsTotal: (state.callsMetricsTotal || 0) + 1,
                    }));
                } else if (newData.type === "CallUpdateData") {
                    set((state) => {
                        const list = state.callsMetrics || [];
                        const idx = list.findIndex(
                            (item) => item.l_callUUID === newData.l_callUUID
                        );
                        if (idx === -1) return { callsMetrics: list }; // nothing to update

                        const next = list.slice();
                        next[idx] = {
                            ...next[idx],
                            l_callStatus: newData.l_callStatus,
                            l_memberExtention: newData.l_memberExtention,
                        };
                        return { callsMetrics: next };
                    });
                } else if (newData.type === "CallCompletedData") {
                    set((state) => {
                        const prev = state.callsMetrics || [];
                        const next = prev.filter((i) => i.l_callUUID !== newData.l_callUUID);
                        const removed = prev.length - next.length;
                        return {
                            callsMetrics: next,
                            callsMetricsTotal: Math.max(
                                0,
                                (state.callsMetricsTotal || 0) - removed
                            ),
                        };
                    });
                }
            }

            else {
                // console.log("newData", newData);
                // console.log("existingData", existingData);
                const index = existingData.findIndex(
                    (item) => item.l_memberExtention === newData.extension || item.l_memberExtention === newData.agentExt
                );
                


                if (index !== -1) {
                    const currentItem = existingData[index];

                    if (newData.type === "AgentPresence" || newData.type === "AgentBreakAPI") {
                        // console.log("newData", newData);
                        if (currentItem.l_memberStatus !== newData.status) {
                            const updatedItem = {
                                ...currentItem,
                                l_memberStatus: newData.status,
                                l_memberCallDirection: newData.memberCallDirection || "",
                                l_memberLastUpdated: formatDate(new Date()),
                            };
                            const updatedData = [...existingData];
                            updatedData[index] = updatedItem;
                            set({ userStatusData: updatedData });
                            get().computeCounts(updatedData);
                        }
                    } else if (newData.type === "ChangeCampaignAPI") {
                        if (currentItem.l_memberCampaignName !== newData.campaignName) {
                            const updatedItem = {
                                ...currentItem,
                                l_memberCampaignName: newData.campaignName,
                            };
                            const updatedData = [...existingData];
                            updatedData[index] = updatedItem;
                            set({ userStatusData: updatedData });
                            get().computeCounts(updatedData);
                        }
                    } else if (newData.type === "AgentReadyAPI") {
                        if (currentItem.l_readyStatus !== newData.status) {
                            const updatedItem = {
                                ...currentItem,
                                l_readyStatus: newData.status,
                            };
                            const updatedData = [...existingData];
                            updatedData[index] = updatedItem;
                            set({ userStatusData: updatedData });
                            get().computeCounts(updatedData);
                        }
                    } else if (newData.event === "agent:register"){
                         const updatedItem = {
                                ...currentItem,
                                l_memberStatus: newData.liveStatus,
                                l_memberCallDirection: "",
                                l_memberLastUpdated: formatDate(new Date()),
                            };
                            const updatedData = [...existingData];
                            updatedData[index] = updatedItem;
                            set({ userStatusData: updatedData });
                            get().computeCounts(updatedData);
                    } else if (newData.event === "agent:unregister"){
                        const updatedItem = {
                                ...currentItem,
                                l_memberStatus: newData.liveStatus,
                                l_memberCallDirection: "",
                                l_memberLastUpdated: formatDate(new Date()),
                            };
                            const updatedData = [...existingData];
                            updatedData[index] = updatedItem;
                            set({ userStatusData: updatedData });
                            get().computeCounts(updatedData);
                    } else if (newData.event === "call:update"){
                        const updatedItem = {
                                ...currentItem,
                                l_memberStatus: newData.callStatus,
                                l_memberCallDirection: newData.direction,
                                l_memberLastUpdated: formatDate(new Date()),
                            };
                            const updatedData = [...existingData];
                            updatedData[index] = updatedItem;
                            set({ userStatusData: updatedData });
                            get().computeCounts(updatedData);
                    } else if (newData.event === "agent:expire"){
                        const updatedItem = {
                                ...currentItem,
                                l_memberStatus: newData.liveStatus,
                                l_memberCallDirection: "",
                                l_memberLastUpdated: formatDate(new Date()),
                            };
                            const updatedData = [...existingData];
                            updatedData[index] = updatedItem;
                            set({ userStatusData: updatedData });
                            get().computeCounts(updatedData);
                    }
                }
            }




        };

        socket.on("response", handleResponse);
    },


    unsubscribeFromdata: () => {
        const socket = useSocketStore.getState().adminDashboardSocket;
        if (!socket) return;
        socket.off("response");
    },

    forceLogout: async (exten) => {

        if (exten == '') {
            toast.error(`Extension not found`);
            return;
        }

        let data = {
            "extention": exten
        }

        try {
            const res = await dashboardaxios.post("/producerone/livemonitor/forcelogout", data);
            toast.success(res.data.message);

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
        }
    }
}));