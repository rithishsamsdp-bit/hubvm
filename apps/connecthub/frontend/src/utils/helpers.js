// 1. Random light (pastel) HSL color
import { countries } from "../components/CountryCodeDropdown";

export { countries };

export const getRandomHexColor = () => {
  const h = Math.floor(Math.random() * 360);
  const s = 60 + Math.random() * 20;
  const l = 75 + Math.random() * 15;
  return `hsl(${h}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
};

// 2. Pick avatar text: first two letters of name
export const getAvatarText = (input) => {
  const raw = input && typeof input === "object" ? input.leadName : input;
  const name = String(raw ?? "").trim();
  if (!name) return "Un";
  return name.slice(0, 2).toUpperCase();
};

const colors = [
  "#8091A4",
  "#A48180",
  "#80A487",
  "#F46E34",
  "#5856DC",
  "#5A7997",
];

// 3. Pass random color based on text
export const getAvatarColor = (text) => {
  if (!text) return colors[0];

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// 4. Format seconds → HH:MM:SS
export const formatDuration = (ms) => {
  const hours = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const minutes = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const seconds = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

export function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

  return days;
}

export const formatSecsToHMS = (secs) => {
  const s = Number(secs) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  const parts = [];
  if (h) parts.push(`${h}hr`);
  if (m) parts.push(`${m}min`);
  parts.push(`${sec}sec`);

  return parts.join(" ");
};

export const formatTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true, // gives AM/PM
  });
};

export const formatTimer = (secs) => {
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
};

// Get initials from name for avatar display
export const getInitials = (name) => {
  if (!name || name === "Unknown") return "?";
  // Check if name is numeric (phone number)
  if (/^[\d+\-\s()]+$/.test(String(name))) return "?";
  // Convert to string to handle non-string values
  return String(name).slice(0, 2).toUpperCase();
};

// Get contact or agent name for call display
export const getContactOrAgentName = (call, conversations, agentsData) => {
  // Try to match with conversation first
  const matchingConversation = conversations?.find(
    (conv) =>
      conv.c_conversationId === call.activeConversationId ||
      conv.c_conversationPhoneNo === call.dialnumber ||
      conv.c_conversationDetails?.callId === call.id
  );

  // Try to match with agent data
  const matchingAgent = agentsData?.find(
    (agent) => agent.m_memberExtensionNo === call.dialnumber
  );

  return (
    matchingConversation?.c_contactName ||
    matchingAgent?.m_memberName ||
    call.callerName ||
    call.c_contactName ||
    "Unknown"
  );
};
