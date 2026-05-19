import { create } from "zustand";
import telephonyaxios from "../../services/telephonyaxios.js";
import { toast } from "../../store/useToastStore.js";

export const useWhatsappPeerStore = create((set) => ({
    PeerData: [],
    PeerTotalCount: 0,
    isPeerLoading: false,
    modalLoading: false,
    isProxyLoading: false,
    proxyData: [],

    getPeersfetch: async (pageSize, offset, sortField, sortOrder, searchString) => {
        set({ isPeerLoading: true });

        const allowedSortFields = [
            "p_peerName",
            "p_peerHost",
            "p_peerPrefix",
            "p_peerPort",
            "p_peerType",
            "p_peerStatus",
            "p_peerPilotno",
            "p_peerOutboundPrefix",
            "p_peerInboundPrefix",
            "p_createdOn",
        ];
        const allowedSortOrders = ["ASC", "DESC"];

        const validatedSortField = allowedSortFields.includes(sortField) ? sortField : "p_peerName";
        const validatedSortOrder = allowedSortOrders.includes(sortOrder) ? sortOrder : "ASC";

        const data = {
            limit: pageSize,
            offset: offset,
            sortField: 'p_peerName',
            sortOrder: 'ASC',
            searchString: searchString || "",
        };

        try {
            const res = await telephonyaxios.post("/telephony/peer/whatsapp/fetch", data);
            console.log(res);
            set({
                PeerData: res.data.data.totalRecords || [],
                PeerTotalCount: res.data.data.totalRecordsCount || 0,
            });
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
            set({ isPeerLoading: false });
        }
    },

    getProxy: async () => {
        set({ isProxyLoading: true });
        try {
            const res = await telephonyaxios.get("/telephony/list/proxies");
            set({ proxyData: res.data.data });
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
            set({ isProxyLoading: false });
        }
    },

    createPeerNew: async (formData) => {
        set({ modalLoading: true });

        console.log(formData);

        const data = {
            peername: formData.name,
            peersecret: formData.secret,
            peerhost: formData.host,
            peerport: `${formData.port}`,
            proxyid: formData.proxyId,
            proxyname: formData.proxyName,
            proxyipaddress: formData.proxyIPAddress,
            proxydirectoryname: formData.proxyDirectoryName,
        };

        try {
            const res = await telephonyaxios.post("/telephony/peer/whatsapp/create", data);
            toast.success(res.data.message);
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
            throw error;
        } finally {
            set({ modalLoading: false });
        }
    },

    deletePeer: async (id) => {
        set({ isPeerLoading: true });
        const data = { peerid: `${id}` };
        try {
            const res = await telephonyaxios.post("/telephony/peer/whatsapp/delete", data);
            toast.success(res.data.message);
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
            throw error;
        } finally {
            set({ isPeerLoading: false });
        }
    },
}));