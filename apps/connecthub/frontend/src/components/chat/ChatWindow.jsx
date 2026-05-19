// components/chat/ChatWindow.jsx
// Main message area — scrollable messages + input bar

import { useEffect, useRef, useState, useCallback } from "react";
import { cn }                   from "@/lib/utils";
import { Send, Smile, X, CornerUpLeft, AtSign } from "lucide-react";
import { Button }               from "@/components/ui/button";
import EmojiPicker              from "emoji-picker-react";
import { useChatStore }         from "@/store/useChatStore";
import MessageBubble            from "./MessageBubble";
import TypingIndicator          from "./TypingIndicator";
import FileUploadButton         from "./FileUploadButton";
import ChatHeader               from "./ChatHeader";

const TYPING_TIMEOUT = 1500;   // ms after last keystroke before typing_stop fires

const ChatWindow = ({ authRole }) => {
  const {
    activeRoomId, messages, isLoadingMsgs, hasMoreMsgs, me,
    getActiveRoom, fetchMessages, sendMessage,
    sendTypingStart, sendTypingStop, typing, markRead,
    replyingTo, setReplyingTo,
  } = useChatStore();

  const [text,               setText]               = useState("");
  const [showEmoji,          setShowEmoji]          = useState(false);
  const [showSearch,         setShowSearch]         = useState(false);
  const [searchQ,            setSearchQ]            = useState("");
  const [searchRes,          setSearchRes]          = useState([]);
  const [mentionQuery,       setMentionQuery]       = useState("");
  const [mentionStartIdx,    setMentionStartIdx]    = useState(-1);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);

  const scrollRef   = useRef(null);
  const typingTimer = useRef(null);
  const isTyping    = useRef(false);
  const textareaRef = useRef(null);

  const room     = getActiveRoom();
  const msgs     = messages[activeRoomId] || [];
  const whoType  = typing[activeRoomId];
  const canScroll = hasMoreMsgs[activeRoomId];

  /* ── Scroll to bottom on new messages ─────────────────────────────────── */
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (isNearBottom) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  /* ── Load more on scroll to top ───────────────────────────────────────── */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !canScroll || isLoadingMsgs) return;
    if (el.scrollTop < 80) {
      const firstId = msgs[0]?.msgId;
      if (firstId) fetchMessages(activeRoomId, firstId);
    }
  }, [activeRoomId, canScroll, isLoadingMsgs, msgs]);

  /* ── Mark messages as read when window is focused ─────────────────────── */
  useEffect(() => {
    if (!activeRoomId || msgs.length === 0) return;
    const last = msgs[msgs.length - 1];
    if (last && last.senderId !== me?.userId) {
      markRead(activeRoomId, last.msgId);
    }
  }, [activeRoomId, msgs.length]);

  /* ── Typing handlers ───────────────────────────────────────────────────── */
  const handleType = (e) => {
    const value = e.target.value;
    setText(value);

    // @mention detection
    const pos = e.target.selectionStart;
    const before = value.slice(0, pos);
    const mentionMatch = before.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1].toLowerCase());
      setMentionStartIdx(pos - mentionMatch[0].length);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }

    if (!isTyping.current) {
      isTyping.current = true;
      sendTypingStart(activeRoomId);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      sendTypingStop(activeRoomId);
    }, TYPING_TIMEOUT);
  };

  /* ── Mention select ────────────────────────────────────────────────────── */
  const handleMentionSelect = (member) => {
    const before = text.slice(0, mentionStartIdx);
    const after  = text.slice(textareaRef.current?.selectionStart ?? mentionStartIdx);
    setText(before + `@${member.name} ` + after);
    setShowMentionDropdown(false);
    setMentionQuery("");
    textareaRef.current?.focus();
  };

  /* ── Send text message ─────────────────────────────────────────────────── */
  const handleSend = () => {
    const content = text.trim();
    if (!content || !activeRoomId) return;

    // Extract mentioned user IDs from text
    const members = room?.members || [];
    const mentions = members
      .filter(m => content.includes(`@${m.name}`))
      .map(m => m.userId);

    sendMessage(activeRoomId, "text", content, null, null, mentions);
    setText("");
    setShowMentionDropdown(false);
    clearTimeout(typingTimer.current);
    isTyping.current = false;
    sendTypingStop(activeRoomId);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── File uploaded (via FileUploadButton) ─────────────────────────────── */
  const handleUploaded = ({ type, content, fileMeta }) => {
    sendMessage(activeRoomId, type, content, fileMeta);
  };

  /* ── Emoji picker ─────────────────────────────────────────────────────── */
  const handleEmojiClick = (emojiData) => {
    setText(prev => prev + emojiData.emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  /* ── Search ────────────────────────────────────────────────────────────── */
  const { searchMessages } = useChatStore();
  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQ(q);
    if (q.length > 1) {
      const results = await searchMessages(activeRoomId, q);
      setSearchRes(results);
    } else {
      setSearchRes([]);
    }
  };

  /* ── Empty state ───────────────────────────────────────────────────────── */
  if (!activeRoomId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 dark:from-slate-900 dark:via-indigo-950/20 dark:to-violet-950/10">
        {/* Glowing orb */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400/20 to-indigo-500/20 blur-xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/15 to-indigo-600/15 border border-violet-200/40 dark:border-violet-700/30 shadow-inner">
            <svg className="h-9 w-9 text-violet-500/70 dark:text-violet-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-base font-bold text-foreground/80">No conversation selected</p>
          <p className="text-sm text-muted-foreground/60">Pick a chat from the sidebar to start messaging</p>
        </div>
        {/* Decorative dots */}
        <div className="flex gap-2 mt-1">
          {[0,1,2].map(i => (
            <div key={i} className="h-1.5 w-1.5 rounded-full bg-violet-400/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  const totalMembers = room?.members?.length || 1;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <ChatHeader onSearchToggle={() => setShowSearch(v => !v)} showSearch={showSearch} authRole={authRole} />

      {/* Search bar */}
      {showSearch && (
        <div className="border-b px-4 py-2.5 bg-card/60 backdrop-blur-sm">
          <div className="relative">
            <input
              autoFocus
              value={searchQ}
              onChange={handleSearch}
              placeholder="Search messages…"
              className="w-full rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 pr-9 transition-all"
            />
            {searchQ && (
              <button className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors" onClick={() => { setSearchQ(""); setSearchRes([]); }}>
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
          {searchRes.length > 0 && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto scrollbar-none">
              {searchRes.map(m => (
                <div key={m.msgId} className="text-xs rounded-xl bg-card border border-border/40 px-3 py-2 flex gap-2">
                  <span className="font-bold text-primary shrink-0">{m.senderName}:</span>
                  <span className="text-muted-foreground truncate">{m.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Messages area ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          "flex-1 overflow-y-auto py-4 space-y-0.5 scrollbar-none",
          "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))]",
          "from-indigo-50/40 via-transparent to-violet-50/30",
          "dark:from-indigo-950/20 dark:via-transparent dark:to-violet-950/15",
        )}
        style={{
          backgroundImage: "radial-gradient(ellipse at 80% 10%, rgba(99,102,241,0.06) 0%, transparent 60%), radial-gradient(ellipse at 10% 90%, rgba(139,92,246,0.05) 0%, transparent 60%)",
        }}
      >
        {/* Load more indicator */}
        {isLoadingMsgs && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 rounded-full bg-card border border-border/50 px-4 py-2 shadow-sm">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-xs text-muted-foreground font-medium">Loading messages…</span>
            </div>
          </div>
        )}

        {msgs.length === 0 && !isLoadingMsgs && (
          <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground/40 gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-semibold">No messages yet</p>
            <p className="text-xs">Be the first to say hello! 👋</p>
          </div>
        )}

        {msgs.map((msg, idx) => {
          const prevMsg    = msgs[idx - 1];

          // Date grouping logic
          const msgDateStr  = new Date(msg.createdAt).toDateString();
          const prevDateStr = prevMsg ? new Date(prevMsg.createdAt).toDateString() : null;
          const showDateDivider = msgDateStr !== prevDateStr;

          let dateLabel = msgDateStr;
          if (showDateDivider) {
            const today     = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            if (msgDateStr === today) dateLabel = "Today";
            else if (msgDateStr === yesterday) dateLabel = "Yesterday";
            else dateLabel = new Date(msg.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
          }

          const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId || showDateDivider;

          return (
            <div key={msg.msgId || idx} className="flex flex-col">
              {showDateDivider && (
                <div className="flex items-center gap-3 my-5 px-4">
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="bg-card border border-border/50 text-muted-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm select-none">
                    {dateLabel}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
              )}
              <MessageBubble
                msg={msg}
                isMine={msg.senderId === me?.userId}
                totalMembers={totalMembers}
                showAvatar={showAvatar}
                authRole={authRole}
                roomMembers={room?.members || []}
              />
            </div>
          );
        })}

        {/* Typing indicator */}
        {whoType && whoType.userId !== me?.userId && (
          <TypingIndicator userName={whoType.userName} />
        )}
      </div>

      {/* ── Reply preview bar ── */}
      {replyingTo && (
        <div className="shrink-0 border-t bg-primary/5 px-4 py-2 flex items-center gap-2">
          <CornerUpLeft className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="flex-1 overflow-hidden">
            <p className="text-[10px] font-semibold text-primary">{replyingTo.senderName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {replyingTo.type !== "text" ? `[${replyingTo.type}]` : replyingTo.content}
            </p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="shrink-0 border-t bg-card/90 backdrop-blur-md px-4 py-3">
        <div className={cn(
          "flex items-end gap-2 rounded-2xl border border-border/50 bg-muted/30 px-3 py-2",
          "transition-all duration-200",
          "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 focus-within:bg-card/60",
        )}>

          {/* Emoji picker trigger */}
          <div className="relative mb-1">
            <button
              onClick={() => setShowEmoji(v => !v)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                showEmoji
                  ? "bg-primary/15 text-primary"
                  : "hover:bg-primary/10 text-muted-foreground hover:text-primary",
              )}
            >
              <Smile className="h-[18px] w-[18px]" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-10 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-border/40">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  height={380}
                  width={320}
                  searchDisabled={false}
                  skinTonesDisabled
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
          </div>

          {/* File upload */}
          <div className="mb-1">
            <FileUploadButton onUploaded={handleUploaded} />
          </div>

          {/* Text input + @mention dropdown */}
          <div className="relative flex-1">
            {showMentionDropdown && (
              <div className="absolute bottom-full left-0 mb-1 w-56 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                {(room?.members || [])
                  .filter(m => m.userId !== me?.userId && m.name.toLowerCase().startsWith(mentionQuery))
                  .slice(0, 6)
                  .map(m => (
                    <button
                      key={m.userId}
                      onMouseDown={e => { e.preventDefault(); handleMentionSelect(m); }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-sm text-left transition-colors"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-[10px] font-bold">
                        {m.name[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium truncate">{m.name}</span>
                    </button>
                  ))}
                {(room?.members || []).filter(m => m.userId !== me?.userId && m.name.toLowerCase().startsWith(mentionQuery)).length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No members found</p>
                )}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleType}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send)"
              rows={1}
              className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 max-h-32 py-1.5 scrollbar-none leading-relaxed"
              style={{ fieldSizing: "content" }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className={cn(
              "mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200",
              text.trim()
                ? "bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 text-white shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 hover:scale-105 active:scale-95"
                : "bg-muted text-muted-foreground/30 cursor-not-allowed",
            )}
          >
            <Send className="h-4 w-4" style={{ transform: "translateX(1px)" }} />
          </button>
        </div>

        {/* Shift+Enter hint */}
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/35 select-none">
          Press <kbd className="font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
};

export default ChatWindow;
