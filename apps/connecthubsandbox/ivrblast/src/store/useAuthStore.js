import { create } from "zustand";
import authaxios from "../functions/authaxios.js";
import { message } from 'antd';

export const useAuthStore = create((set) => ({
    authUser: null,

    authRole: null,

    isLoggingIn: false,

    isCheckingAuth: true,

    login: async (data) => {
        set({ isLoggingIn: true });
        try {
            const res = await authaxios.post('/auth/login', data);
            set({ authUser: res.data.data });
            message.success('Logged in successfully');
        } catch (error) {
            message.error(error.response.data.message);
            console.log(error);
        } finally {
            set({ isLoggingIn: false });
        }

    },

    setAuthRole: (userRole) => set({ authRole: userRole }),

    checkAuth: async () => {
        set({ isCheckingAuth: true });
        try {
            const res = await authaxios.post("/auth/refresh");
            // console.log("check auth", res);
            set({ authUser: res.data.data });
        } catch (error) {
            console.log("Error in checkAuth:", error);
            set({ authUser: null });
        } finally {
            set({ isCheckingAuth: false })
        }
    },

    logout: async () => {
        set({ isCheckingAuth: true });
        try {
            const res = await authaxios.post("/auth/logout");
            console.log("Logout", res);
            set({ authUser: null });
            message.success('Logout successfully');
        } catch (error) {
            console.log("Error in checkAuth:", error);
            message.error(error.response.data.message);
            set({ authUser: null });
        } finally {
            set({ isCheckingAuth: false })
        }
    },

    signup: async (data) => {

    }

    

}));