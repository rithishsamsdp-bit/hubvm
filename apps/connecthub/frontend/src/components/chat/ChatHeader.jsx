// components/chat/ChatHeader.jsx
// Top bar showing room info, members, search toggle, pinned messages

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Search, Pin, Users, MoreVertical, Trash2, UserMinus, UserPlus, X } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { Popover } from "@/components/Index.jsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGender } from "@/hooks/useGender";
import maleAvatar from "@/assets/man.png";
import femaleAvatar from "@/assets/woman.png";

/* ── Online dot ──────────────────────────────────────────────────────────── */
const StatusDot = ({ status }) => (
  <span className={cn(
    "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
    status === "online" ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-slate-300 dark:bg-slate-600",
  )} />
);

/* ── Gender-aware private avatar (using assets) ─────────────────────── */
const PrivateHeaderAvatar = ({ name, status }) => {
  const gender = useGender(name);
  const initials = name?.[0]?.toUpperCase() || "?";
  const bgClass =
    gender === "male"   ? "from-[#4472a0] to-[#4c7fb2]" :
    gender === "female" ? "from-rose-400 to-pink-500"   :
                          "from-sky-400 to-cyan-500";
  return (
    <div className="relative shrink-0">
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-white font-bold text-sm select-none shadow-sm overflow-hidden",
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
      <StatusDot status={status || "offline"} />
    </div>
  );
};

/* ── Room avatar (group or private) ─────────────────────────────────────── */
const RoomAvatar = ({ room, onlineCount }) => {
  if (room.type === "group") {
    return (
      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white select-none shadow-sm shadow-violet-500/30">
        <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="white">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
        <span className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-emerald-400 border-2 border-card flex items-center justify-center text-[9px] font-bold text-white shadow-sm shadow-emerald-400/40">
          {onlineCount}
        </span>
      </div>
    );
  }
  // Private chat — gender-aware avatar
  const other = room.members?.find(m => m.userId !== room._meId);
  return <PrivateHeaderAvatar name={other?.name} status={other?.status} />;
};

const ChatHeader = ({ onSearchToggle, showSearch, authRole }) => {
  const { getActiveRoom, me, deleteGroup, pinnedMessages, fetchPinnedMessages, activeRoomId, addMember, removeMember, users } = useChatStore();
  const [showMembers,   setShowMembers]   = useState(false);
  const [showPinned,    setShowPinned]    = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch,  setMemberSearch]  = useState("");

  const room = getActiveRoom();
  if (!room) return null;

  const isGroup   = room.type === "group";
  const isAdmin   = ["ADMIN", "SUPERADMIN"].includes(authRole);
  const onlineCount = room.members?.filter(m => m.status === "online").length || 0;
  const pinned    = pinnedMessages[room.roomId] || [];

  const other = !isGroup
    ? room.members?.find(m => m.userId !== me?.userId)
    : null;

  const memberIds  = new Set(room.members?.map(m => m.userId) || []);
  const nonMembers = users.filter(u => !memberIds.has(u.userId));

  const handleTogglePinned = () => {
    if (!showPinned) fetchPinnedMessages(room.roomId);
    setShowPinned(v => !v);
  };

  return (
    <div className="flex flex-col border-b bg-card/80 backdrop-blur-sm shrink-0">
      {/* Main header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <RoomAvatar room={{ ...room, _meId: me?.userId }} onlineCount={onlineCount} />

        <div className="flex-1 overflow-hidden">
          <p className="truncate font-semibold text-sm">
            {isGroup ? room.groupName : other?.name || "Unknown"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {isGroup
              ? `${room.members?.length || 0} members · ${onlineCount} online`
              : other?.status === "online" ? "Online" : `Last seen ${other?.lastSeen ? new Date(other.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "recently"}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSearchToggle}>
            <Search className={cn("h-4 w-4", showSearch && "text-primary")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleTogglePinned}>
            <Pin className={cn("h-4 w-4", showPinned && "text-amber-500")} />
          </Button>
          {isGroup && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowMembers(v => !v)}>
              <Users className={cn("h-4 w-4", showMembers && "text-primary")} />
            </Button>
          )}
          {isAdmin && isGroup && (
            <Popover
              mode="click"
              placement="left"
              closeOnContentClick={true}
              noStyle={true}
              content={
                <div className="flex flex-col min-w-[150px] bg-popover text-popover-foreground rounded-md shadow-md border p-1 z-50">
                  <button 
                    onClick={() => deleteGroup(room.roomId)}
                    className="flex items-center w-full px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-sm transition-colors font-medium text-left outline-none"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Group
                  </button>
                </div>
              }
            >
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </Popover>
          )}
        </div>
      </div>

      {/* Pinned messages panel */}
      {showPinned && pinned.length > 0 && (
        <div className="border-t px-4 py-2 bg-amber-50/50 dark:bg-amber-900/10">
          <p className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1.5">
            <Pin className="h-3 w-3" /> Pinned Messages
          </p>
          <div className="space-y-1 max-h-28 overflow-y-auto scrollbar-none">
            {pinned.map(p => (
              <div key={p.msgId} className="text-xs text-muted-foreground truncate border-l-2 border-amber-400 pl-2 py-0.5">
                <span className="font-semibold text-foreground">{p.senderName}:</span>{" "}
                {p.type === "text" ? p.content : `[${p.type}]`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members panel */}
      {showMembers && isGroup && (
        <div className="border-t px-4 py-2 bg-muted/30">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Members</p>
            {isAdmin && (
              <button
                onClick={() => { setShowAddMember(v => !v); setMemberSearch(""); }}
                className="flex items-center gap-1 text-[10px] text-primary hover:opacity-70 font-medium"
              >
                <UserPlus className="h-3 w-3" /> Add
              </button>
            )}
          </div>

          {/* Add member inline search */}
          {isAdmin && showAddMember && (
            <div className="mb-2">
              <div className="relative mb-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  className="pl-6 h-7 text-xs"
                  placeholder="Search to add…"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-0.5 max-h-28 overflow-y-auto scrollbar-none">
                {nonMembers.filter(u => u.name.toLowerCase().includes(memberSearch.toLowerCase())).length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-2">No users to add</p>
                ) : (
                  nonMembers
                    .filter(u => u.name.toLowerCase().includes(memberSearch.toLowerCase()))
                    .map(u => (
                      <button
                        key={u.userId}
                        onClick={() => { addMember(room.roomId, u.userId); setShowAddMember(false); setMemberSearch(""); }}
                        className="w-full flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-primary/10 text-left text-xs transition-colors"
                      >
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-[9px] font-bold">
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium truncate flex-1">{u.name}</span>
                        <UserPlus className="h-3 w-3 text-primary shrink-0" />
                      </button>
                    ))
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto scrollbar-none">
            {room.members?.map(m => (
              <div key={m.userId}
                className="flex items-center gap-1.5 rounded-full bg-card border border-border/60 px-2.5 py-1 text-xs">
                <span className={cn("h-1.5 w-1.5 rounded-full", m.status === "online" ? "bg-emerald-500" : "bg-slate-400")} />
                <span className="font-medium">{m.name}</span>
                <span className="text-[9px] text-muted-foreground uppercase">{m.role}</span>
                {isAdmin && m.userId !== me?.userId && (
                  <button
                    onClick={() => removeMember(room.roomId, m.userId)}
                    className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;
