import { create } from "zustand";
import apiaxios from "../functions/apiaxios.js";
import { notification } from 'antd';


export const Settings = create((set, get) => ({
    //Carrier

    Carrierdatas: [],

    CarrierTotalDatas: 0,

    CarrierFetch: false,

    GetCarrier: async (limit, offset, searchText) => {

        set({ CarrierFetch: true });
        try {
            let data = {
                "limit": limit,
                "offset": offset,
                "searchString": searchText
            };

            const res = await apiaxios.post("/telephony/carrier/fetch", data);
            console.log(res)
            set({ Carrierdatas: res.data.data.totalRecords });
            set({ CarrierTotalDatas: res.data.data.totalRecordsCount });
        } catch (error) {

            console.log(error);
            notification.error({
                message: 'Error',
                description: 'An error occurred while Fetching the Campaign.',
            });

        } finally {

            set({ CarrierFetch: false });

        }
    },

    CarrierModel: false,

    CarrierLoader: false,

    CarrierModelChange: (newState) => set({ CarrierModel: newState }),

    createCarrier: async (values) => {
        set({ CarrierLoader: true });
        let data;
        if (values.a_prefend != '') {
            data = {
                trunkName: values.a_trunkName,
                secret: values.a_secret,
                host: values.a_host,
                port: values.a_port,
                prefend: values.a_prefend
            }
        } else {
            data = {
                trunkName: values.a_trunkName,
                secret: values.a_secret,
                host: values.a_host,
                port: values.a_port,
            }
        }

        try {
            const res = await apiaxios.post("/telephony/carrier/create", data);
            notification.success({
                message: 'Campaign Added',
                description: 'The Carrier has been successfully added.',
            });
        } catch (error) {
            console.error("API Error:", error);
            notification.error({
                message: 'Error',
                description: error.message || 'An error occurred while adding the Carrier.',
            });
        } finally {
            set({ CarrierLoader: false });
            set({ CarrierModel: false });
        }
    },

    carrierCheck: async (value) => {
        try {
            let data = { trunkName: value }
            const res = await apiaxios.post("/telephony/carrier/check", data);
            return { res }
        } catch (error) {
            console.log(error);
        }
    },

    EditCarrier: async (value) => {
        set({ CarrierLoader: true });
        try {
            const res = await apiaxios.post("/telephony/carrier/update", value);
            notification.success({
                message: 'Campaign Edited',
                description: 'The Campaign has been successfully Edited.',
            });

        } catch (error) {
            console.error("API Error:", error);
            notification.error({
                message: 'Error',
                description: error.message || 'An error occurred while Edit the Campaign.',
            });
        } finally {
            set({ CarrierLoader: false });
            set({ CarrierModel: false });
        }
    },

    DeleteCarrier: async (data) => {
        set({ CarrierFetch: true });
        try {
            const res = await apiaxios.post("/telephony/carrier/delete", data);
            notification.success({
                message: 'Carrier Deleted',
                description: 'The Carrier has been successfully Deleted.',
            });

        } catch (error) {
            console.error("API Error:", error);
            notification.error({
                message: 'Error',
                description: error.message || 'An error occurred while Delete the Carrier.',
            });
        } finally {
            set({ CarrierFetch: false });
        }
    },

}));