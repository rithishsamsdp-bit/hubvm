import { create } from "zustand";
import ivrblastaxios from "../functions/ivrblastaxios.js";

export const IvrBlastCallFlow = create((set) => ({


    Ivr:[],

    GetCampaign: async () => {
        try {
            const res = await ivrblastaxios.post("/ivrblast/campaign/fetch");
            console.log(res);
        } catch (error) {
            console.log(error);
        }
    },



    GetSelectIvr: async () => {
        try {
            const res = await ivrblastaxios.get("http://10.0.0.229:3002/ivrBlast/flow/fetchVR");
            set({ Ivr: res.data.data.totalRecords });
            console.log(res.data.data.totalRecords);
        } catch (error) {
            console.log("Error in checkAuth:", error);
            console.log(error);
        } finally {
            console.log("Finished");
        }
    },




}));