// components/chat/ChatList.jsx
// Left sidebar — list of conversations (private + groups) with unread badges

import { cn }          from "@/lib/utils";
import { useChatStore } from "@/store/useChatStore";
import { MessageSquare, Users } from "lucide-react";
import { useGender } from "@/hooks/useGender";
import maleAvatar from "@/assets/man.png";
import femaleAvatar from "@/assets/woman.png";

/* ── helpers ─────────────────────────────────────────────────────────────── */
const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

/* ── Gender-aware private avatar (using assets) ─────────────────────────── */
const PrivateAvatar = ({ name, status }) => {
  const gender = useGender(name);
  const initials = name?.[0]?.toUpperCase() || "?";
  const bgClass =
    gender === "male"   ? "from-[#4472a0] to-[#4c7fb2]" :
    gender === "female" ? "from-rose-400 to-pink-500"   :
                          "from-sky-400 to-cyan-500";
  return (
    <div className="relative shrink-0">
      <div className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full text-white font-bold text-sm select-none shadow-sm bg-gradient-to-br overflow-hidden",
        bgClass,
      )}>
        {gender === "male" ? (
          <img src={maleAvatar} alt="Male" className="w-full h-full object-cover" />
        ) : gender === "female" ? (
          <img src={femaleAvatar} alt="Female" className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <span className={cn(
        "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card",
        status === "online" ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-slate-300 dark:bg-slate-600",
      )} />
    </div>
  );
};

const RoomAvatar = ({ room, meId }) => {
  if (room.type === "group") {
    return (
      <div className="relative shrink-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white select-none shadow-sm shadow-violet-500/20">
          <svg className="h-[24px] w-[24px]" viewBox="0 0 24 24" fill="white">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 border-2 border-card px-1">
          <span className="text-[8px] text-white font-bold leading-none">{room.members?.length || 0}</span>
        </span>
      </div>
    );
  }
  const other = room.members?.find(m => m.userId !== meId);
  return <PrivateAvatar name={other?.name} status={other?.status} />;
};

/* ── Preview text ────────────────────────────────────────────────────────── */
const previewIcon = (type) => {
  if (type === "image") return "🖼️ Photo";
  if (type === "audio") return "🎵 Voice message";
  if (type === "file")  return "📎 File";
  return null;
};

/* ── main component ──────────────────────────────────────────────────────── */
const ChatList = ({ filter = "all" }) => {
  const { rooms, activeRoomId, unreadCounts, messages, me, setActiveRoom } = useChatStore();

  const filtered = rooms.filter(r =>
    filter === "all"    ? true :
    filter === "private" ? r.type === "private" :
    filter === "group"   ? r.type === "group" : true
  );

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground/40 gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
          <MessageSquare className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium">No conversations yet</p>
        <p className="text-xs text-muted-foreground/30">Start a new chat above</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 overflow-y-auto scrollbar-none flex-1 h-full">
      {filtered.map((room) => {
        const isActive  = room.roomId === activeRoomId;
        const unread    = unreadCounts[room.roomId] || 0;
        const msgs      = messages[room.roomId] || [];
        const lastMsg   = msgs[msgs.length - 1];
        const other     = room.type === "private"
          ? room.members?.find(m => m.userId !== me?.userId)
          : null;
        const name = room.type === "group" ? room.groupName : (other?.name || "Unknown");

        const preview = lastMsg
          ? lastMsg.isDeleted
            ? "Message deleted"
            : lastMsg.type === "text"
              ? lastMsg.content
              : (previewIcon(lastMsg.type) || `[${lastMsg.type}]`)
          : "No messages yet";

        return (
          <button
            key={room.roomId}
            onClick={() => setActiveRoom(room.roomId)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 text-left group/room",
              isActive
                ? "bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 border border-indigo-200/60 dark:border-indigo-700/30 shadow-sm"
                : "hover:bg-muted/60 border border-transparent",
            )}
          >
            <RoomAvatar room={room} meId={me?.userId} />

            <div className="flex-1 overflow-hidden">
              {/* Name row */}
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className={cn(
                    "truncate text-sm font-semibold",
                    isActive ? "text-indigo-600 dark:text-indigo-400" : "text-foreground",
                    unread > 0 && !isActive && "text-foreground",
                  )}>
                    {name}
                  </span>
                  {room.type === "group" && (
                    <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider leading-none bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                      Group
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] shrink-0 font-medium",
                  unread > 0 ? "text-indigo-500 dark:text-indigo-400" : "text-muted-foreground/60",
                )}>
                  {formatTime(room.updatedAt || lastMsg?.createdAt)}
                </span>
              </div>

              {/* Preview row */}
              <div className="flex items-center justify-between gap-1">
                <span className={cn(
                  "truncate text-xs",
                  unread > 0 ? "text-foreground font-medium" : "text-muted-foreground/70",
                )}>
                  {preview}
                </span>
                {unread > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 px-1.5 text-[10px] font-bold text-white shrink-0 shadow-sm shadow-indigo-500/30">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ChatList;
