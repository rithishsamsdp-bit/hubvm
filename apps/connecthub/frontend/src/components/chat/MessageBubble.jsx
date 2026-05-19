// components/chat/MessageBubble.jsx
// Renders a single chat message: text / image / audio / file

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Pin, Trash2, MoreVertical, Download, Check, CheckCheck,
  Play, Pause, FileText, FileImage, FileArchive, FileCode,
  FileSpreadsheet, Film, Music, ZoomIn, Edit2, CornerUpLeft, X,
} from "lucide-react";
import { Popover } from "@/components/Index.jsx";
import { useChatStore } from "@/store/useChatStore";
import { useGender } from "@/hooks/useGender";
import maleAvatar from "@/assets/man.png";
import femaleAvatar from "@/assets/woman.png";

/* ── helper: format time ─────────────────────────────────────────────────── */
const formatTime = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

/* ── helper: format duration ─────────────────────────────────────────────── */
const formatDuration = (secs) => {
  if (!secs || isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/* ── helper: file icon by extension ─────────────────────────────────────── */
const getFileIcon = (name = "") => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext)) return FileImage;
  if (["mp4","mov","avi","mkv","webm"].includes(ext)) return Film;
  if (["mp3","wav","ogg","aac","flac"].includes(ext)) return Music;
  if (["zip","rar","7z","tar","gz"].includes(ext)) return FileArchive;
  if (["js","ts","jsx","tsx","py","java","cpp","c","go","rs","json","xml"].includes(ext)) return FileCode;
  if (["xls","xlsx","csv"].includes(ext)) return FileSpreadsheet;
  return FileText;
};

/* ── helper: file accent color ──────────────────────────────────────────── */
const getFileAccent = (name = "", isMine) => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext))
    return isMine ? "from-pink-400/30 to-rose-500/20 border-pink-400/30" : "from-pink-50 to-rose-50 border-pink-200 dark:from-pink-900/20 dark:to-rose-900/20 dark:border-pink-700/30";
  if (["mp4","mov","avi","mkv","webm"].includes(ext))
    return isMine ? "from-purple-400/30 to-violet-500/20 border-purple-400/30" : "from-purple-50 to-violet-50 border-purple-200 dark:from-purple-900/20 dark:to-violet-900/20 dark:border-purple-700/30";
  if (["mp3","wav","ogg","aac","flac"].includes(ext))
    return isMine ? "from-teal-400/30 to-cyan-500/20 border-teal-400/30" : "from-teal-50 to-cyan-50 border-teal-200 dark:from-teal-900/20 dark:to-cyan-900/20 dark:border-teal-700/30";
  if (["zip","rar","7z","tar","gz"].includes(ext))
    return isMine ? "from-orange-400/30 to-amber-500/20 border-orange-400/30" : "from-orange-50 to-amber-50 border-orange-200 dark:from-orange-900/20 dark:to-amber-900/20 dark:border-orange-700/30";
  if (["xls","xlsx","csv"].includes(ext))
    return isMine ? "from-green-400/30 to-emerald-500/20 border-green-400/30" : "from-green-50 to-emerald-50 border-green-200 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-700/30";
  if (["js","ts","jsx","tsx","py","java","cpp","c","go","rs"].includes(ext))
    return isMine ? "from-blue-400/30 to-sky-500/20 border-blue-400/30" : "from-blue-50 to-sky-50 border-blue-200 dark:from-blue-900/20 dark:to-sky-900/20 dark:border-blue-700/30";
  return isMine ? "from-slate-400/30 to-slate-500/20 border-slate-400/30" : "from-slate-50 to-slate-100 border-slate-200 dark:from-slate-800/30 dark:to-slate-700/20 dark:border-slate-600/30";
};

const getIconAccentColor = (name = "", isMine) => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext)) return isMine ? "text-pink-200" : "text-pink-500";
  if (["mp4","mov","avi","mkv","webm"].includes(ext)) return isMine ? "text-purple-200" : "text-purple-500";
  if (["mp3","wav","ogg","aac","flac"].includes(ext)) return isMine ? "text-teal-200" : "text-teal-500";
  if (["zip","rar","7z","tar","gz"].includes(ext)) return isMine ? "text-orange-200" : "text-orange-500";
  if (["xls","xlsx","csv"].includes(ext)) return isMine ? "text-green-200" : "text-green-500";
  if (["js","ts","jsx","tsx","py","java","cpp","c","go","rs"].includes(ext)) return isMine ? "text-blue-200" : "text-blue-500";
  return isMine ? "text-slate-200" : "text-slate-500";
};

/* ── Gender-aware Avatar (using assets) ─────────────────────── */
const Avatar = ({ name, size = "sm" }) => {
  const gender = useGender(name);
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";

  // Male → steel blue, Female → rose/pink, loading/unknown → violet
  const bgClass =
    gender === "male"   ? "bg-gradient-to-br from-[#4472a0] to-[#4c7fb2]" :
    gender === "female" ? "bg-gradient-to-br from-rose-400 to-pink-500"   :
                          "bg-gradient-to-br from-violet-500 to-indigo-600";

  return (
    <div
      title={name}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none shadow-sm overflow-hidden",
        bgClass,
        dim,
      )}
    >
      {gender === "male" ? (
        <img src={maleAvatar} alt="Male" className="w-full h-full object-cover" />
      ) : gender === "female" ? (
        <img src={femaleAvatar} alt="Female" className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
};

/* ── Read receipt icons ──────────────────────────────────────────────────── */
const ReadReceipt = ({ readBy, totalMembers }) => {
  if (readBy?.length >= totalMembers - 1) return <CheckCheck className="h-3 w-3 text-sky-400" />;
  if (readBy?.length > 0) return <CheckCheck className="h-3 w-3 text-muted-foreground/60" />;
  return <Check className="h-3 w-3 text-muted-foreground/40" />;
};

/* ── Text content — with @mention highlighting ──────────────────────────── */
const TextContent = ({ content, roomMembers = [] }) => {
  const memberNames = roomMembers.map(m => m.name);
  // Split on @word or @multi word (up to 3 words after @)
  const parts = content.split(/(@\S+(?:\s\S+){0,2})/g);
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const nameWithAt = part.slice(1);
          const matched = memberNames.some(n => n.toLowerCase().startsWith(nameWithAt.toLowerCase().split(" ")[0]));
          if (matched) {
            return (
              <span key={i} className="text-primary font-semibold bg-primary/10 rounded px-0.5">
                {part}
              </span>
            );
          }
        }
        return part;
      })}
    </p>
  );
};

/* ── Image content — premium lightbox style ─────────────────────────────── */
const ImageContent = ({ content, presignedUrl, fileMeta }) => {
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const src = presignedUrl || content;

  return (
    <div
      className="relative overflow-hidden rounded-xl max-w-[280px] cursor-pointer group/img"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => window.open(src, "_blank")}
    >
      {/* Skeleton */}
      {!loaded && (
        <div className="h-44 w-[260px] animate-pulse rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800" />
      )}

      {/* Image */}
      <img
        src={src}
        alt={fileMeta?.name || "Image"}
        className={cn(
          "rounded-xl object-cover max-h-64 w-full transition-all duration-300",
          loaded ? "opacity-100" : "opacity-0",
          hovered && "scale-[1.02] brightness-90",
        )}
        onLoad={() => setLoaded(true)}
      />

      {/* Hover overlay */}
      {loaded && (
        <div className={cn(
          "absolute inset-0 rounded-xl flex items-center justify-center transition-all duration-200",
          "bg-black/0 group-hover/img:bg-black/30",
        )}>
          <div className={cn(
            "flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow-lg transition-all duration-200",
            "opacity-0 group-hover/img:opacity-100 scale-90 group-hover/img:scale-100",
          )}>
            <ZoomIn className="h-3.5 w-3.5 text-slate-700" />
            <span className="text-xs font-semibold text-slate-700">View</span>
          </div>
        </div>
      )}

      {/* File name tag */}
      {fileMeta?.name && loaded && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 rounded-b-xl opacity-0 group-hover/img:opacity-100 transition-opacity duration-200">
          <p className="text-[10px] text-white/90 truncate font-medium">{fileMeta.name}</p>
        </div>
      )}
    </div>
  );
};

/* ── Audio content — custom player ──────────────────────────────────────── */
const AudioContent = ({ content, presignedUrl, isMine }) => {
  const src = presignedUrl || content;
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragging, setDragging] = useState(false);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!dragging) setCurrentTime(audioRef.current?.currentTime || 0);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current?.duration || 0);
  };

  const handleEnded = () => {
    setPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * duration;
    if (audioRef.current) audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Wave bars animation (visual)
  const bars = Array.from({ length: 28 });

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-2xl px-3 py-2.5 min-w-[220px] max-w-[280px]",
      isMine
        ? "bg-white/10 border border-white/10"
        : "bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 dark:from-violet-950/30 dark:to-indigo-950/30 dark:border-violet-800/30",
    )}>
      {/* Hidden native audio */}
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Play / Pause button */}
      <button
        onClick={toggle}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95",
          isMine
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md shadow-violet-500/20",
        )}
      >
        {playing
          ? <Pause className="h-4 w-4" />
          : <Play className="h-4 w-4 ml-0.5" />
        }
      </button>

      <div className="flex-1 flex flex-col gap-1.5">
        {/* Waveform / progress bar */}
        <div
          className="relative h-7 flex items-center gap-[2px] cursor-pointer"
          onClick={handleSeek}
        >
          {bars.map((_, i) => {
            const barProgress = ((i + 1) / bars.length) * 100;
            const isActive = barProgress <= progress;
            // Vary height pseudo-randomly using index
            const heights = [3,5,7,9,11,8,5,3,6,10,12,9,6,4,7,11,9,6,4,8,11,7,5,3,6,9,8,4];
            const h = heights[i % heights.length];
            return (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all duration-150",
                  isMine
                    ? isActive ? "bg-white" : "bg-white/30"
                    : isActive ? "bg-violet-500" : "bg-violet-200 dark:bg-violet-700/40",
                )}
                style={{ width: 2, height: h, minHeight: 3 }}
              />
            );
          })}
        </div>

        {/* Time */}
        <div className={cn(
          "flex items-center justify-between text-[10px] font-medium",
          isMine ? "text-white/60" : "text-muted-foreground",
        )}>
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
    </div>
  );
};

/* ── File content — rich card ────────────────────────────────────────────── */
const FileContent = ({ content, presignedUrl, fileMeta, isMine }) => {
  const name = fileMeta?.name || "Download file";
  const size = fileMeta?.size
    ? fileMeta.size > 1048576
      ? `${(fileMeta.size / 1048576).toFixed(1)} MB`
      : `${(fileMeta.size / 1024).toFixed(0)} KB`
    : "";
  const ext = name.split(".").pop()?.toUpperCase() || "FILE";
  const FileIcon = getFileIcon(name);
  const accentGradient = getFileAccent(name, isMine);
  const iconColor = getIconAccentColor(name, isMine);

  return (
    <a
      href={presignedUrl || content}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group/file flex items-center gap-3 rounded-2xl border bg-gradient-to-br px-3.5 py-3 transition-all max-w-[260px] no-underline",
        "hover:shadow-md active:scale-[0.98]",
        accentGradient,
      )}
    >
      {/* Icon block */}
      <div className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
        isMine ? "bg-white/15" : "bg-white dark:bg-slate-800",
        "shadow-sm",
      )}>
        <FileIcon className={cn("h-5 w-5", iconColor)} />
        {/* EXT badge */}
        <span className={cn(
          "absolute -bottom-1 -right-1 rounded px-1 text-[7px] font-black uppercase tracking-tight leading-tight border",
          isMine
            ? "bg-white/20 text-white border-white/10"
            : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600",
          iconColor,
        )}>
          {ext.slice(0, 4)}
        </span>
      </div>

      {/* Name & size */}
      <div className="flex-1 overflow-hidden">
        <p className={cn(
          "truncate text-sm font-semibold leading-snug",
          isMine ? "text-white" : "text-foreground",
        )}>
          {name}
        </p>
        {size && (
          <p className={cn("text-[11px] mt-0.5", isMine ? "text-white/55" : "text-muted-foreground")}>
            {size}
          </p>
        )}
      </div>

      {/* Download arrow */}
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all",
        "opacity-0 group-hover/file:opacity-100 scale-75 group-hover/file:scale-100",
        isMine ? "bg-white/20 text-white" : "bg-primary/10 text-primary",
      )}>
        <Download className="h-3.5 w-3.5" />
      </div>
    </a>
  );
};

/* ── Main component ──────────────────────────────────────────────────────── */
const MessageBubble = ({ msg, isMine, totalMembers, showAvatar = true, authRole, roomMembers = [] }) => {
  const { togglePin, deleteMessage, activeRoomId, editMessage, setReplyingTo } = useChatStore();
  const [isEditing,  setIsEditing]  = useState(false);
  const [editText,   setEditText]   = useState(msg.content);

  const isDeleted   = msg.isDeleted;
  const canPin      = true;
  const canDelete   = isMine;
  const canEdit     = isMine && !isDeleted && msg.type === "text";
  const isMediaType = ["image", "audio", "file"].includes(msg.type);

  const handleSaveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === msg.content) { setIsEditing(false); return; }
    await editMessage(activeRoomId, msg.msgId, trimmed);
    setIsEditing(false);
  };

  const handleCancelEdit = () => { setEditText(msg.content); setIsEditing(false); };

  const renderContent = () => {
    if (isDeleted) return (
      <p className="text-sm italic text-muted-foreground/70">[This message was deleted]</p>
    );
    if (isEditing) return (
      <div className="flex flex-col gap-1.5 min-w-[180px]">
        <textarea
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } if (e.key === "Escape") handleCancelEdit(); }}
          autoFocus
          rows={2}
          className={cn(
            "resize-none rounded-lg text-sm outline-none px-2 py-1 w-full max-h-32 scrollbar-none leading-relaxed",
            isMine ? "bg-white/15 text-white placeholder:text-white/40" : "bg-muted/60 text-foreground",
          )}
        />
        <div className="flex gap-1.5 justify-end">
          <button onClick={handleCancelEdit} className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors">Cancel</button>
          <button onClick={handleSaveEdit} className="text-[10px] px-2 py-0.5 rounded bg-primary text-white hover:bg-primary/80 transition-colors">Save</button>
        </div>
      </div>
    );
    switch (msg.type) {
      case "image": return <ImageContent content={msg.content} presignedUrl={msg.presignedUrl} fileMeta={msg.fileMeta} />;
      case "audio": return <AudioContent content={msg.content} presignedUrl={msg.presignedUrl} isMine={isMine} />;
      case "file":  return <FileContent  content={msg.content} presignedUrl={msg.presignedUrl} fileMeta={msg.fileMeta} isMine={isMine} />;
      default:      return <TextContent  content={msg.content} roomMembers={roomMembers} />;
    }
  };

  return (
    <div className={cn("group flex items-end gap-2 px-4 py-0.5", isMine ? "flex-row-reverse" : "flex-row")}>

      {/* Avatar — only for others */}
      {!isMine && showAvatar
        ? <Avatar name={msg.senderName} />
        : <div className="w-7 shrink-0" />}

      <div className={cn("flex flex-col gap-0.5 max-w-[70%]", isMine ? "items-end" : "items-start")}>

        {/* Sender name (group chats, not mine) */}
        {!isMine && showAvatar && (
          <span className="ml-1 text-[10px] font-semibold text-muted-foreground">{msg.senderName}</span>
        )}

        {/* Bubble */}
        <div className="relative flex items-end gap-1">
          {/* Actions menu (visible on hover) */}
          {!isDeleted && !isEditing && (
            <div className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity flex items-center mb-1",
              isMine ? "order-first" : "order-last",
            )}>
              <Popover
                mode="click"
                placement={isMine ? "left" : "right"}
                closeOnContentClick={true}
                noStyle={true}
                content={
                  <div className="flex flex-col min-w-[130px] bg-popover text-popover-foreground rounded-md shadow-md border p-1 z-50">
                    <button onClick={() => setReplyingTo(msg)} className="flex items-center w-full px-2 py-1.5 text-sm text-foreground hover:bg-muted rounded-sm transition-colors text-left outline-none">
                      <CornerUpLeft className="h-3.5 w-3.5 mr-2" /> Reply
                    </button>
                    {canEdit && (
                      <button onClick={() => { setEditText(msg.content); setIsEditing(true); }} className="flex items-center w-full px-2 py-1.5 text-sm text-foreground hover:bg-muted rounded-sm transition-colors text-left outline-none">
                        <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit
                      </button>
                    )}
                    {canPin && (
                      <button onClick={() => togglePin(activeRoomId, msg.msgId, !msg.isPinned)} className="flex items-center w-full px-2 py-1.5 text-sm text-foreground hover:bg-muted rounded-sm transition-colors text-left outline-none">
                        <Pin className="h-3.5 w-3.5 mr-2" />
                        {msg.isPinned ? "Unpin" : "Pin"}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="flex items-center w-full px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-sm transition-colors text-left outline-none"
                        onClick={() => deleteMessage(activeRoomId, msg.msgId)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </button>
                    )}
                  </div>
                }
              >
                <button className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted transition-colors">
                  <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </Popover>
            </div>
          )}

          {/* Main bubble */}
          <div className={cn(
            "rounded-2xl shadow-sm",
            isMediaType && !isDeleted && !isEditing ? "p-1" : "px-3.5 py-2.5",
            isDeleted
              ? "bg-muted/50 border border-border/40 px-3.5 py-2.5"
              : isMine
                ? "bg-gradient-to-br from-[#4472a0] to-[#4c7fb2] text-white rounded-br-sm shadow-lg shadow-[#4472a0]/20"
                : "bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/50 rounded-bl-sm shadow-sm",
            msg.isPinned && "ring-2 ring-amber-400/60",
          )}>
            {msg.isPinned && (
              <div className="flex items-center gap-1 mb-1 opacity-70 px-1 pt-1">
                <Pin className="h-2.5 w-2.5" />
                <span className="text-[9px] font-semibold uppercase tracking-wide">Pinned</span>
              </div>
            )}
            {/* Reply-to preview */}
            {msg.replyTo && !isDeleted && (
              <div className={cn(
                "flex items-start gap-1.5 rounded-lg px-2 py-1.5 mb-1.5 border-l-2",
                isMine
                  ? "bg-white/10 border-white/40"
                  : "bg-muted/50 border-primary/40",
              )}>
                <CornerUpLeft className={cn("h-3 w-3 mt-0.5 shrink-0", isMine ? "text-white/50" : "text-primary/50")} />
                <div className="overflow-hidden">
                  <p className={cn("text-[10px] font-semibold truncate", isMine ? "text-white/70" : "text-primary/80")}>
                    {msg.replyTo.senderName}
                  </p>
                  <p className={cn("text-[11px] truncate", isMine ? "text-white/55" : "text-muted-foreground/70")}>
                    {msg.replyTo.type !== "text" ? `[${msg.replyTo.type}]` : msg.replyTo.content}
                  </p>
                </div>
              </div>
            )}
            {renderContent()}
          </div>
        </div>

        {/* Time + edited badge + read receipt */}
        <div className={cn("flex items-center gap-1 px-1", isMine ? "flex-row-reverse" : "flex-row")}>
          <span className="text-[9px] text-muted-foreground/60">{formatTime(msg.createdAt)}</span>
          {msg.isEdited && !isDeleted && (
            <span className="text-[9px] text-muted-foreground/50 italic">(edited)</span>
          )}
          {isMine && !isDeleted && (
            <ReadReceipt readBy={msg.readBy} totalMembers={totalMembers} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
