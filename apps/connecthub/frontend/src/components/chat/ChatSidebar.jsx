// components/chat/ChatSidebar.jsx
// Left panel — user search, conversation list, new chat button, group create (admin)

import { useState } from "react";
import { cn }            from "@/lib/utils";
import { Search, Plus, Users, MessageSquare, X, MessagesSquare } from "lucide-react";
import { Button }        from "@/components/ui/button";
import { useChatStore }  from "@/store/useChatStore";
import ChatList          from "./ChatList";
import GroupCreateModal  from "./GroupCreateModal";
import { useGender }     from "@/hooks/useGender";
import maleAvatar from "@/assets/man.png";
import femaleAvatar from "@/assets/woman.png";

const TAB_OPTIONS = [
  { id: "all",     label: "All" },
  { id: "private", label: "Direct" },
  { id: "group",   label: "Groups" },
];

/* ── Gender-aware user avatar (using assets) ───────────────────────────── */
const UserAvatar = ({ name, status }) => {
  const gender = useGender(name);
  const initials = name?.[0]?.toUpperCase() || "?";
  const bgClass =
    gender === "male"   ? "from-[#4472a0] to-[#4c7fb2]" :
    gender === "female" ? "from-rose-400 to-pink-500"   :
                          "from-sky-400 to-cyan-500";
  return (
    <div className="relative shrink-0">
      <div className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-white text-xs font-bold select-none shadow-sm overflow-hidden",
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
        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
        status === "online" ? "bg-emerald-400" : "bg-slate-300 dark:bg-slate-600",
      )} />
    </div>
  );
};

const ChatSidebar = ({ authRole }) => {
  const { users, me, openPrivateChat, getTotalUnread } = useChatStore();

  const [tab,         setTab]         = useState("all");
  const [search,      setSearch]      = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showGroup,   setShowGroup]   = useState(false);

  const isAdmin = ["ADMIN", "SUPERADMIN"].includes(authRole);
  const totalUnread = getTotalUnread();

  // Filter users for new chat search (exclude self)
  const filteredUsers = users.filter(u =>
    u.userId !== me?.userId &&
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="flex flex-col h-full w-[300px] shrink-0 border-r bg-card">

        {/* ── Header ── */}
        <div className="px-4 pt-5 pb-3 shrink-0 border-b border-border/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm shadow-indigo-500/20">
                <MessagesSquare className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-bold tracking-tight">Messages</h2>
                {totalUnread > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-1.5 text-[10px] font-bold text-white shadow-sm shadow-indigo-500/30">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isAdmin && (
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-violet-50 dark:hover:bg-violet-950/40 text-muted-foreground hover:text-violet-600 transition-all"
                  onClick={() => setShowGroup(true)}
                  title="Create Group"
                >
                  <Users className="h-4 w-4" />
                </button>
              )}
              <button
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                  showNewChat
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-primary/10 text-muted-foreground hover:text-primary",
                )}
                onClick={() => setShowNewChat(v => !v)}
                title="New Chat"
              >
                {showNewChat ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New chat search panel */}
          {showNewChat && (
            <div className="mb-3 rounded-xl border border-border/50 bg-muted/30 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/30 bg-muted/20">
                <Search className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search people…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
                />
              </div>
              <div className="max-h-52 overflow-y-auto scrollbar-none py-1">
                {filteredUsers.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground/50 py-4">No users found</p>
                )}
                {filteredUsers.map(u => (
                  <button
                    key={u.userId}
                    onClick={() => { openPrivateChat(u.userId); setShowNewChat(false); setSearch(""); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left group/user"
                  >
                    <UserAvatar name={u.name} status={u.status} />
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-semibold group-hover/user:text-primary transition-colors">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">{u.role}</p>
                    </div>
                    <div className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center transition-all",
                      "opacity-0 group-hover/user:opacity-100",
                      "bg-primary/10 text-primary",
                    )}>
                      <Plus className="h-3 w-3" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-1 rounded-xl bg-muted/60 p-1">
            {TAB_OPTIONS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all duration-200",
                  tab === t.id
                    ? "bg-card text-primary shadow-sm shadow-black/5"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat list ── */}
        <div className="flex-1 overflow-hidden px-2 py-2">
          <ChatList filter={tab} />
        </div>
      </div>

      {/* Group create modal (admin only) */}
      {isAdmin && (
        <GroupCreateModal open={showGroup} onClose={() => setShowGroup(false)} />
      )}
    </>
  );
};

export default ChatSidebar;
