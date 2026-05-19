// components/chat/TypingIndicator.jsx
// Animated three-dot typing indicator bubble

const TypingIndicator = ({ userName }) => {
  return (
    <div className="flex items-end gap-2 px-4 py-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase">
        {userName?.[0] || "?"}
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-4 py-3 shadow-sm">
        <span className="text-[10px] text-muted-foreground mr-1 font-medium">{userName} is typing</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
          />
        ))}
      </div>
    </div>
  );
};

export default TypingIndicator;
