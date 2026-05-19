import icons from "../../constants/icon";


const { agentpanel_whatsapp_icon,
    agentpanel_callback_icon,
    agentpanel_call_icon,
    agentpanel_pause_icon,
    agentpanel_pause_gray_icon,
    agentpanel_active_icon, } = icons;

export const chatData = [
    {
        date: "12th July 2025",
        messages: [
            {
                sender: "John Doe",
                time: "12:44",
                type: "text",
                content: "hi",
                self: false,
            },
            {
                sender: "You",
                time: "12:44",
                type: "text",
                content: "how are you",
                self: true,
            },
        ],
    },
    {
        date: "13th July 2025",
        messages: [
            {
                sender: "John Doe",
                time: "12:44",
                type: "text",
                content: "Lorem ipsum dummy text for the conversation",
                self: false,
            },
            {
                sender: "You",
                time: "12:44",
                type: "text",
                content: "Lorem ipsum dummy text for the conversation",
                self: true,
            },
        ],
    },
    {
        date: "Today",
        messages: [
            {
                sender: "You",
                time: "12:44",
                type: "call",
                callType: "no-answer",
                closedBy: "you",
                notes: "Write about notes lorem ipsum dummy content of the call",
                disposition: "Random disposition dummy content",
                self: true,
            },
            {
                sender: "You",
                time: "12:44",
                type: "call",
                callType: "ongoing",
                self: true,
            },
        ],
    },
];

let daata = [{
    type: "user",
    status: "Outgoing",
    name: "Bunny Doe",
    number: "+91 4896517895",
    statusLabel: "OngoingCall",
    statusInfoLabel: "Whatsapp Call",
}, {
    type: "user",
    status: "Outgoing",
    name: "Allan christopher",
    number: "+91 7010635280",
    statusLabel: "active",
    statusInfoLabel: "Phone Call",
}]

export const cardsData = [
    {
        type: "user",
        status: "ongoing",
        avatarText: "BD",
        avatarColor: "#8091a4",
        name: "Bunny Doe",
        number: "+91-999-99-999",
        time: "07:32",
        statusLabel: "Ongoing Call",
        statusIcon: agentpanel_callback_icon,
        statusInfoLabel: "Whatsapp Call",
        statusInfoIcon: agentpanel_whatsapp_icon,
    },
    {
        type: "user",
        status: "active",
        avatarText: "GP",
        avatarColor: "#a48180",
        name: "Gopala pillai",
        number: "+91-999-99-999",
        time: "07:32",
        statusLabel: "Active",
        statusIcon: agentpanel_active_icon,
        statusInfoLabel: "Whatsapp Message",
        statusInfoIcon: agentpanel_whatsapp_icon,
    },
    {
        type: "user",
        status: "on-hold",
        avatarText: "HG",
        avatarColor: "#80a487",
        name: "Hiroshan G",
        number: "+91-999-99-999",
        time: "07:32",
        statusLabel: "On Hold (02:22)",
        statusIcon: agentpanel_pause_icon,
        statusInfoLabel: "Phone Call",
        statusInfoIcon: agentpanel_call_icon,
    },
    {
        type: "campaign",
        campaignTitle: "Campaign 02",
        campaignCustomers: "16 Customer",
        time: "07:32",
        avatars: [
            { text: "J", color: "#6366f1" },
            { text: "P", color: "#ec4899" },
            { text: "Y", color: "#f97316" },
            { text: "+3", isMore: true },
        ],
        statusLabel: "Yet to Start",
        statusIcon: agentpanel_pause_gray_icon,
        statusInfoLabel: "Phone Call",
        statusInfoIcon: agentpanel_call_icon,
    },
    {
        type: "user",
        status: "Lead",
        avatarText: "YU",
        avatarColor: "#ec4899",
        name: "Yuvan Un",
        number: "+91-999-99-999",
        time: "07:32",
        statusLabel: "Lead",
        statusIcon: agentpanel_pause_gray_icon,
        statusInfoLabel: "Phone Call",
        statusInfoIcon: agentpanel_call_icon,
    },
    {
        type: "user",
        status: "active",
        avatarText: "GP",
        avatarColor: "#6366f1",
        name: "Marsha mellow",
        number: "+91-999-99-999",
        time: "07:32",
        statusLabel: "Active",
        statusIcon: agentpanel_active_icon,
        statusInfoLabel: "Whatsapp Message",
        statusInfoIcon: agentpanel_whatsapp_icon,
    },
];




export const chatData1 = [
    {
        date: "12th July 2025",
        messages: [
            {
                sender: "John Doe",
                time: "12:44",
                type: "text",
                content: "hi",
            },
            {
                sender: "You",
                time: "12:44",
                type: "text",
                content: "how are you",
            },
        ],
    },
    {
        date: "13th July 2025",
        messages: [
            {
                sender: "John Doe",
                time: "12:44",
                type: "text",
                content: "Lorem ipsum dummy text for the conversation",
            },
            {
                sender: "You",
                time: "12:44",
                type: "text",
                content: "Lorem ipsum dummy text for the conversation",
            },
        ],
    },
    {
        date: "Today",
        messages: [
            {
                sender: "You",
                time: "12:44",
                type: "call",
                callType: "no-answer",
                closedBy: "you",
                notes: "Write about notes lorem ipsum dummy content of the call",
                disposition: "Random disposition dummy content",
            },
            {
                sender: "You",
                time: "12:44",
                type: "call",
                callType: "ongoing",
            },
        ],
    },
];