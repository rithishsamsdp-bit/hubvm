// pages/chat/ChatPage.jsx
// Main chat page — initializes socket, loads data, renders layout

import { useEffect } from "react";
import { useChatStore }  from "@/store/useChatStore";
import { useAuthStore }  from "@/store/useAuthStore";
import ChatSidebar       from "@/components/chat/ChatSidebar";
import ChatWindow        from "@/components/chat/ChatWindow";
import { Loader }        from "@/components/ui/loader";

const ChatPage = () => {
  const { authUser, authRole } = useAuthStore();
  const {
    connectChatSocket, fetchMe, fetchUsers, fetchRooms,
    isConnected, me, rooms, joinAllRooms,
  } = useChatStore();

  /* ── On mount: connect socket + bootstrap REST data ────────────────────── */
  useEffect(() => {
    const init = async () => {
      // 1. Sync current user into chat_users table, get their chatUserId
      await fetchMe();
      // 2. Load all tenant users (for new chat / group creation)
      await fetchUsers();
      // 3. Load all rooms with unread counts
      await fetchRooms();
    };
    init();
  }, []);

  /* ── Connect socket once authenticated ───────────────────────────────── */
  useEffect(() => {
    if (authUser && !isConnected) {
      connectChatSocket();
    }
  }, [authUser, isConnected]);

  /* ── Join all rooms once socket is connected and rooms are loaded ─────── */
  useEffect(() => {
    if (isConnected && rooms.length > 0) {
      joinAllRooms();
    }
  }, [isConnected, rooms.length]);

  if (!me) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Left sidebar — conversation list */}
      <ChatSidebar authRole={authRole} />

      {/* Right — chat window */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatWindow authRole={authRole} />
      </div>
    </div>
  );
};

export default ChatPage;
