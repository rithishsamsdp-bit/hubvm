import { create } from "zustand";
import ivrblastaxios from "../functions/ivrblastaxios.js";
import apiaxios from "../functions/apiaxios.js";
import { notification } from 'antd';


export const IvrBlast = create((set, get) => ({

    Campaigndatas: [],

    CampaignTotalDatas: 0,

    CampaignFetch: false,

    GetCampaign: async (limit, offset, searchText) => {

        set({ CampaignFetch: true });
        try {
            let data = {
                "limit": limit,
                "offset": offset,
                "searchString": searchText
            };

            const res = await ivrblastaxios.post("/ivrBlast/campaign/fetch", data);
            console.log(res)
            set({ Campaigndatas: res.data.data.totalRecords });
            set({ CampaignTotalDatas: res.data.data.totalRecordsCount });
        } catch (error) {

            console.log(error);
            notification.error({
                message: 'Error',
                description: 'An error occurred while Fetching the Campaign.',
            });

        } finally {

            set({ CampaignFetch: false });

        }
    },

    CampaignModel: false,

    IvrCampaignLoader: false,

    CampaignModelChange: (newState) => set({ CampaignModel: newState }),

    getFlowCarrierLoader: true,

    carrierlist: [],

    flowlist: [],

    getFlowCarrier: async () => {
        set({ getFlowCarrierLoader: true })
        try {
            const res1 = await ivrblastaxios.get("/ivrBlast/campaign/list/carrier");
            const res2 = await ivrblastaxios.get("/ivrBlast/campaign/list/flow");
            set({ carrierlist: res1.data.data.totalRecords })
            set({ flowlist: res2.data.data.totalRecords })
            console.log(res1);
            console.log(res2);

            set({ getFlowCarrierLoader: false })
        } catch (error) {
            console.log("Error Fetching the Carrier or flow select");
            notification.error({
                message: 'Error',
                description: 'Error Fetching the Carrier or flow select',
            });
            set({ CampaignModel: false })
        }
    },

    createCampaign: async (values) => {
        set({ IvrCampaignLoader: true });
        console.log(values);
        const formData = new FormData();
        formData.append("campaignname", values.i_campaignName);
        formData.append("campaigndescription", values.i_campaignDescription);
        formData.append("carrierid", values.i_carrierId);
        formData.append("carriername", values.i_carrierName);
        formData.append("flowid", values.i_flowId);
        formData.append("flowname", values.i_flowName);

        if (values.importfile && values.importfile.fileList[0]) {
            const file = values.importfile.fileList[0];
            const fileType = file.type;
            const validFileTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];

            if (validFileTypes.includes(fileType)) {
                formData.append("importfile", file.originFileObj);
            } else {
                set({ IvrCampaignLoader: false });
                set({ CampaignModel: false });
                notification.error({
                    message: 'Error',
                    description: 'Invalid file type. Please upload a CSV, XLS, or XLSX file.',
                });
                return false;
            }
        } else {
            console.log("No file selected or invalid file.");
            set({ IvrCampaignLoader: false });
            set({ CampaignModel: false });
            notification.error({
                message: 'Error',
                description: 'No file selected or invalid file.',
            });
            return false;
        }

        // console.log("FormData contents:");
        // formData.forEach((value, key) => {
        //     console.log(`${key}: ${value}`);
        // });
        try {
            const res = await ivrblastaxios.post("/ivrBlast/campaign/create", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            notification.success({
                message: 'Campaign Added',
                description: 'The Campaign has been successfully added.',
            });
            return true;
        } catch (error) {
            console.error("API Error:", error);
            notification.error({
                message: 'Error',
                description: error.message || 'An error occurred while adding the Campaign.',
            });
            return false;
        } finally {
            set({ IvrCampaignLoader: false });
            set({ CampaignModel: false });
        }
    },

    campaignCheck: async (value) => {
        try {
            let data = { campaignname: value }
            const res = await ivrblastaxios.post("/ivrBlast/campaign/check", data);
            return { res }
        } catch (error) {
            console.log(error);
        }
    },

    EditCampaign: async (value) => {
        set({ IvrCampaignLoader: true });
        console.log(value);
        try {
            const res = await ivrblastaxios.post("/ivrBlast/campaign/update", value);
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
            set({ IvrCampaignLoader: false });
            set({ CampaignModel: false });
        }
    },

    DeleteCampaign: async (data) => {
        set({ CampaignFetch: true });
        try {
            const res = await ivrblastaxios.post("/ivrBlast/campaign/delete", data);
            notification.success({
                message: 'Campaign Deleted',
                description: 'The Campaign has been successfully Deleted.',
            });

        } catch (error) {
            console.error("API Error:", error);
            notification.error({
                message: 'Error',
                description: error.message || 'An error occurred while Delete the Campaign.',
            });
        } finally {
            set({ CampaignFetch: false });
        }
    },


    RunCampaign: async (data) => {
        try {
            const res = await ivrblastaxios.post("/kafkaapi/campaign/ratio-trigger", data);
            console.log(res);
            notification.success({
                message: 'Campaign Started',
                description: 'The Campaign has been successfully Started.',
            });
        } catch (error) {
            notification.error({
                message: 'Error',
                description: error.message || 'An error occurred while Start the Campaign.',
            });
        }
    },

    StopCampaign: async (data) => {
        try {
            const res = await ivrblastaxios.post("/kafkaapi/campaign/stop", data);
            console.log(res);
            notification.success({
                message: 'Campaign Stoped',
                description: 'The Campaign has been successfully Stoped.',
            });
        } catch (error) {
            notification.error({
                message: 'Error',
                description: error.message || 'An error occurred while Pause the Campaign.',
            });
        }
    },

    RestartCampaign: async (data) => {
        try {
            const res = await ivrblastaxios.post("/kafkaapi/campaign/restart", data);
            console.log(res);
            notification.success({
                message: 'Campaign Restarted',
                description: 'The Campaign has been successfully Restarted.',
            });
        } catch (error) {
            notification.error({
                message: 'Error',
                description: error.message || 'An error occurred while Pause the Restarted.',
            });
        }
    },

    ResumeCampaign: async (data) => {
        try {
            const res = await ivrblastaxios.post("/kafkaapi/campaign/resume", data);
            console.log(res);
            notification.success({
                message: 'Campaign Resume',
                description: 'The Campaign has been successfully Resume.',
            });
        } catch (error) {
            notification.error({
                message: 'Error',
                description: error.message || 'An error occurred while Pause the Resume.',
            });
        }
    },





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

            const res = await ivrblastaxios.post("/ivrBlast/carrier/fetch", data);
            // console.log(res)
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

    IvrCarrierLoader: false,

    CarrierModelChange: (newState) => set({ CarrierModel: newState }),

    createCarrier: async (values) => {
        set({ IvrCarrierLoader: true });
        let data;
        if (values.i_carrierPrefix != '') {
            data = {
                carriername: values.i_carrierName,
                carriersecret: values.i_carrierSecret,
                carrierhost: values.i_carrierHost,
                carrierport: values.i_carrierPort,
                carrierprefix: values.i_carrierPrefix
            }
        } else {
            data = {
                carriername: values.i_carrierName,
                carriersecret: values.i_carrierSecret,
                carrierhost: values.i_carrierHost,
                carrierport: values.i_carrierPort,
            }
        }

        try {
            const res = await ivrblastaxios.post("/ivrBlast/carrier/create", data);
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
            set({ IvrCarrierLoader: false });
            set({ CarrierModel: false });
        }
    },

    carrierCheck: async (value) => {
        try {
            let data = { carriername: value }
            const res = await ivrblastaxios.post("/ivrBlast/carrier/check", data);
            return { res }
        } catch (error) {
            console.log(error);
        }
    },

    EditCarrier: async (value) => {
        set({ IvrCarrierLoader: true });
        try {
            const res = await ivrblastaxios.post("/ivrBlast/carrier/update", value);
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
            set({ IvrCarrierLoader: false });
            set({ CarrierModel: false });
        }
    },

    DeleteCarrier: async (data) => {
        set({ CarrierFetch: true });
        try {
            const res = await ivrblastaxios.post("/ivrBlast/carrier/delete", data);
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


    //Ivr flow

    IvrFlowdata: [],

    IvrFlowdataTotalDatas: 0,

    FlowdataFetch: false,

    GetIvrflow: async (searchText) => {
        set({ FlowdataFetch: true });
        let data = {
            "limit": "50",
            "offset": "0",
            "searchString": searchText
        }

        try {
            const res = await ivrblastaxios.post("/ivrBlast/flow/fetch", data);
            set({ IvrFlowdata: res.data.data.totalRecords });
            set({ IvrFlowdataTotalDatas: res.data.data.totalRecordsCount });
        } catch (error) {
            console.log(error);
            notification.error({
                message: 'Error',
                description: 'An error occurred while Fetching the IvrFlow.',
            });
        } finally {
            set({ FlowdataFetch: false });
        }
    },

    selectedIvrFlowData: [],

    selectedFlowdataFetch: false,

    selectedIvrFlow: async (id) => {
        // console.log(id);
        set({ selectedFlowdataFetch: true });
        let data = {
            "limit": "1",
            "offset": "0",
            "searchString": `${id}`
        }
        // console.log(data);
        try {
            const res = await ivrblastaxios.post("/ivrBlast/flow/fetch", data);
            // console.log(res)
            // console.log(res.data.data.totalRecords);
            set({ selectedIvrFlowData: res.data.data.totalRecords });
        } catch (error) {
            console.log(error);
        } finally {
            set({ selectedFlowdataFetch: false });
        }
    },

    IvrFlowCreationLoader: false,

    IvrflowCreate: async (values) => {
        set({ IvrFlowCreationLoader: true });
        try {
            // console.log(values);
            const res = await ivrblastaxios.post("/ivrBlast/flow/create", values);
            // console.log(res);

        } catch (error) {
            console.log(error);
        } finally {
            // set({ IvrFlowCreationLoader: false });
        }
    },

    IvrFlowCheck: async (value) => {
        try {
            let data = { flow_name: value }
            const res = await ivrblastaxios.post("/ivrBlast/flow/check", data);
            // console.log(res);
            return { res }
        } catch (error) {
            console.log(error);
        }
    },

    IvrflowEdit: async (value) => {
        try {
            // console.log(value);
            const res = await ivrblastaxios.post("/ivrBlast/flow/update", value);
            // console.log(res);

        } catch (error) {
            console.log(error);
            notification.error({
                message: 'Error',
                description: 'An error occurred while adding the IvrFlow.',
            });
        } finally {
            // set({ IvrFlowCreationLoader: false });
        }
    },

    DeleteIvrFlow: async (data) => {
        set({ FlowdataFetch: true });
        try {
            const res = await ivrblastaxios.post("ivrBlast/flow/delete", data);
            notification.success({
                message: 'IvrFlow Deleted',
                description: 'The IvrFlow has been successfully Deleted.',
            });

        } catch (error) {
            console.error("API Error:", error);
            notification.error({
                message: 'Error',
                description: error.message || 'An error occurred while Delete the IvrFlow.',
            });
        }
    },


    //Ivr Creation 

    Ivrdata: [],

    IvrdataTotalDatas: 0,

    Ivrdatafetch: false,

    GetIvr: async (limit, offset, searchText) => {
        set({ Ivrdatafetch: true });
        let data = {
            "limit": limit,
            "offset": offset,
            "searchString": searchText
        }

        try {
            const res = await ivrblastaxios.post("ivrBlast/voiceresponse/fetch", data);
            // console.log(res)
            // console.log(res.data.data.totalRecords);
            set({ Ivrdata: res.data.data.totalRecords });
            set({ IvrdataTotalDatas: res.data.data.totalRecordsCount });
        } catch (error) {
            console.log(error);
            notification.error({
                message: 'Error',
                description: 'An error occurred while Fetching the Ivr.',
            });
        } finally {
            set({ Ivrdatafetch: false });
        }
    },

    IvrCreationModel: false,

    IvrCreationLoader: false,

    IvrCreationModelChange: (newState) => set({ IvrCreationModel: newState }),

    createIvrCreation: async (values) => {
        set({ IvrCreationLoader: true });

        const formData = new FormData();
        let url;

        if (values.mediaType == 'message') {
            // console.log(values);
            url = "/ivrBlast/voiceresponse/create/texttospeech";
            formData.append("filename", values.name);
            formData.append("responsecontent", values.message);

        } else if (values.mediaType == 'audio') {
            // console.log(values);
            url = "/ivrBlast/voiceresponse/create/uploadfile";

            if (values.audioType == 'url') {
                formData.append("filename", values.name);
                formData.append("audiolink", values.audioUrl);
            } else {
                formData.append("filename", values.name);
                if (values.audio_name && values.audio_name.fileList[0]) {
                    const file = values.audio_name.fileList[0];
                    const fileType = file.type;

                    const validAudioTypes = [
                        'audio/mpeg',
                        'audio/wav',
                        'audio/ogg',
                        'audio/mp4',
                        'audio/mp3'
                    ];

                    if (validAudioTypes.includes(fileType)) {
                        formData.append("audioimportfile", file.originFileObj);
                    } else {
                        set({ IvrCreationLoader: false });
                        set({ IvrCreationModel: false });
                        notification.error({
                            message: 'Error',
                            description: 'Invalid file type. Please upload an audio file (MP3, WAV).',
                        });
                        return false;
                    }
                } else {
                    console.log("No file selected or invalid file.");
                    set({ IvrCreationLoader: false });
                    set({ IvrCreationModel: false });
                    notification.error({
                        message: 'Error',
                        description: 'No audio file selected or invalid file.',
                    });
                    return false;
                }
            }
        }

        try {
            const res = await ivrblastaxios.post(`${url}`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            // console.log(res);
            notification.success({
                message: 'Ivr Added',
                description: 'The Ivr has been successfully added.',
            });

        } catch (error) {
            console.error("API Error:", error);
            notification.error({
                message: 'Error',
                description: 'An error occurred while adding the Ivr.',
            });
        } finally {
            set({ IvrCreationLoader: false });
            set({ IvrCreationModel: false });
        }
    },

    IvrCreationCheck: async (value) => {
        try {
            let data = { voiceresponsename: value }
            const res = await ivrblastaxios.post("/ivrBlast/voiceresponse/check", data);
            // console.log(res);
            return { res }
        } catch (error) {
            console.log(error);
        }
    },

    DeleteIvrCreation: async (data) => {
        set({ Ivrdatafetch: true });
        try {
            const res = await ivrblastaxios.post("ivrBlast/voiceresponse/delete", data);
            notification.success({
                message: 'Ivr Deleted',
                description: 'The Ivr has been successfully Deleted.',
            });

        } catch (error) {
            console.error("API Error:", error);
            notification.error({
                message: 'Error',
                description: error.message || 'An error occurred while Delete the Ivr.',
            });
        } finally {
            set({ Ivrdatafetch: false });
        }
    },


    //Ivr Report

    Ivrreportdata: [],

    IvrReportTotalDatas: 0,

    IvrCampaignfilterdata: [],

    IvrReportfetch: false,

    GetCampaignFilterfetch: false,

    GetCampaignFilterapi: async () => {
        set({ GetCampaignFilterfetch: true });
        try {
            const campaignfilterres = await ivrblastaxios.get("ivrBlast/report/list/campaign");
            console.log(campaignfilterres.data.data.totalRecords);
            set({ IvrCampaignfilterdata: campaignfilterres.data.data.totalRecords });
        } catch (error) {
            console.log(error);
            notification.error({
                message: 'Error',
                description: 'An error occurred while Fetching the Ivr Report Filter.',
            });
        } finally {
            set({ GetCampaignFilterfetch: false });
        }
    },

    GetIvrreport: async (limit, offset, searchText, startDate, endDate, campaignFilter) => {
        set({ IvrReportfetch: true });
        let start_date_formate = startDate.format('YYYY-MM-DD HH:mm:ss');
        let end_date_formate = endDate.format('YYYY-MM-DD HH:mm:ss');
        console.log(campaignFilter)
        let data = {
            "limit": limit,
            "offset": offset,
            "searchString": searchText,
            "campaignid": `${campaignFilter}`,
            "calldatestart": start_date_formate,
            "calldateend": end_date_formate
        }
        try {

            const res = await ivrblastaxios.post("ivrBlast/report/fetch", data);
            console.log(res)
            console.log(res.data.data.totalRecords);
            set({ Ivrreportdata: res.data.data.totalRecords });
            set({ IvrReportTotalDatas: res.data.data.totalRecordsCount });
        } catch (error) {
            console.log(error);
            notification.error({
                message: 'Error',
                description: 'An error occurred while Fetching the Ivr Report.',
            });
        } finally {
            set({ IvrReportfetch: false });
        }
    },
}));