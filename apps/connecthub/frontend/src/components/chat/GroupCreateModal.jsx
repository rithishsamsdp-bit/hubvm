// components/chat/GroupCreateModal.jsx — ADMIN only group creation modal
import { useState } from "react";
import { useChatStore } from "@/store/useChatStore";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { cn }     from "@/lib/utils";
import { Users, X, Search, Check } from "lucide-react";

const GroupCreateModal = ({ open, onClose }) => {
  const { users, me, createGroup, setActiveRoom } = useChatStore();
  const [groupName,  setGroupName]  = useState("");
  const [selected,   setSelected]   = useState([]);
  const [search,     setSearch]     = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Exclude self from the list
  const filtered = users.filter(u =>
    u.userId !== me?.userId &&
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (userId) => {
    setSelected(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.length === 0) return;
    setIsCreating(true);
    const room = await createGroup({ groupName: groupName.trim(), memberIds: selected });
    setIsCreating(false);
    if (room) {
      setActiveRoom(room.roomId);
      onClose();
      setGroupName(""); setSelected([]); setSearch("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px] gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            Create Group Chat
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Group name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Group Name
            </label>
            <Input
              placeholder="e.g. Sales Team, Daily Standup…"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              maxLength={60}
            />
          </div>

          {/* Member search */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Add Members ({selected.length} selected)
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder="Search by name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-1 max-h-52 overflow-y-auto scrollbar-none pr-1">
              {filtered.length === 0 && (
                <p className="text-sm text-center text-muted-foreground py-4">No users found</p>
              )}
              {filtered.map(u => {
                const isSelected = selected.includes(u.userId);
                return (
                  <button
                    key={u.userId}
                    onClick={() => toggle(u.userId)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-3 py-2 transition-all text-left",
                      isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent",
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold">
                      {u.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{u.role}</p>
                    </div>
                    <div className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
                      isSelected ? "bg-primary border-primary" : "border-border",
                    )}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected tags */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map(id => {
                const u = users.find(u => u.userId === id);
                return (
                  <span key={id} className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                    {u?.name}
                    <button onClick={() => toggle(id)} className="ml-0.5 hover:opacity-70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-5 pt-2 border-t bg-muted/30 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={!groupName.trim() || selected.length === 0 || isCreating}
            className="flex-1"
          >
            {isCreating ? "Creating…" : `Create Group (${selected.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GroupCreateModal;
