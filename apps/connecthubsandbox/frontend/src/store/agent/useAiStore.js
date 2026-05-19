import { create } from "zustand";
// import telephonyaxios from "../../services/telephonyaxios.js";
import axios from "axios";
import { toast } from "../useToastStore.js";

export const useAiStore = create((set) => ({
    aiData: null,
    aiDataLoading: false,
    getaidata: async (audioURL) => {
        if (audioURL == '') {
            toast.error('Audio is not found.');
            set({ aiData: null })
            return;
        }
        set({ aiDataLoading: true });
        const API_URL =
            "https://api.deepgram.com/v1/listen?sentiment=true&smart_format=true&summarize=v2&language=en&model=nova";

        const headers = {
            Authorization: "Token 6b4ad2874ac9bcc06ef0ff6c62420554b67a1389",
            "Content-Type": "application/json",
        };

        const data = {
            url: audioURL,
        };
        console.log(data);
        try {
            const res = await axios.post(API_URL, data, { headers });
            console.log(res);
            set({ aiData: res.data });
        } catch (error) {
            set({ aiData: null })
            console.error(" Error:", error.response?.data || error.message);
            toast.error(`${error.response?.data || error.message}`);
        } finally {
            set({ aiDataLoading: false });
        }
    },

    clearaiData: () => {
        set({ aiData: null });
    }
}));
