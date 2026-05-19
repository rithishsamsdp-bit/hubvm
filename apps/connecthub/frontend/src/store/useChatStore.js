// store/useChatStore.js — Zustand store for the team chat system
import { create } from 'zustand';
import { io }     from 'socket.io-client';
import chataxios  from '../services/chataxios';
import { toast }  from './useToastStore';

const SOCKET_URL = import.meta.env.VITE_CHAT_SOCKET_URL || 'https://connecthub.pulsework360.com';

export const useChatStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  socket:          null,
  isConnected:     false,

  me:              null,            // current user profile from /chat/users/me
  users:           [],              // all users in the tenant

  rooms:           [],              // array of room DTOs
  activeRoomId:    null,
  messages:        {},              // { [roomId]: MessageDTO[] }
  unreadCounts:    {},              // { [roomId]: number }
  typing:          {},              // { [roomId]: { userId, userName, isTyping } }
  pinnedMessages:  {},             // { [roomId]: MessageDTO[] }
  replyingTo:      null,           // MessageDTO being replied to

  isLoadingRooms:  false,
  isLoadingMsgs:   false,
  hasMoreMsgs:     {},             // { [roomId]: boolean }

  // ── Socket connection ──────────────────────────────────────────────────────
  connectChatSocket: () => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(SOCKET_URL + '/chat', {
      path: '/chatsocket',
      transports: ['websocket'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      set({ isConnected: true });
      console.log('[ChatSocket] Connected:', socket.id);
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
      console.log('[ChatSocket] Disconnected');
    });

    // ── Incoming message ────────────────────────────────────────────────────
    socket.on('new_message', (msg) => {
      const { activeRoomId, me } = get();
      set((state) => {
        let roomMsgs = [...(state.messages[msg.roomId] || [])];

        // If this is the sender's own message echoed back, replace the optimistic entry
        if (msg.senderId === me?.userId) {
          const pendingIdx = roomMsgs.findIndex(
            m => m._pending && m.senderId === msg.senderId && m.content === msg.content
          );
          if (pendingIdx !== -1) {
            roomMsgs[pendingIdx] = msg;   // swap temp → real
          } else {
            roomMsgs.push(msg);           // no matching pending, just append
          }
        } else {
          roomMsgs.push(msg);
        }

        return {
          messages: { ...state.messages, [msg.roomId]: roomMsgs },
          unreadCounts: {
            ...state.unreadCounts,
            [msg.roomId]: activeRoomId === msg.roomId
              ? 0
              : (state.unreadCounts[msg.roomId] || 0) + 1,
          },
          rooms: state.rooms
            .map(r => r.roomId === msg.roomId ? { ...r, updatedAt: msg.createdAt } : r)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
        };
      });
    });

    // ── Presence ────────────────────────────────────────────────────────────
    socket.on('user_online', ({ userId }) => {
      set((state) => ({
        users: state.users.map(u =>
          u.userId === userId ? { ...u, status: 'online' } : u
        ),
        rooms: state.rooms.map(r => ({
          ...r,
          members: r.members.map(m =>
            m.userId === userId ? { ...m, status: 'online' } : m
          ),
        })),
      }));
    });

    socket.on('user_offline', ({ userId, lastSeen }) => {
      set((state) => ({
        users: state.users.map(u =>
          u.userId === userId ? { ...u, status: 'offline', lastSeen } : u
        ),
        rooms: state.rooms.map(r => ({
          ...r,
          members: r.members.map(m =>
            m.userId === userId ? { ...m, status: 'offline', lastSeen } : m
          ),
        })),
      }));
    });

    // ── Typing ──────────────────────────────────────────────────────────────
    socket.on('typing', ({ roomId, userId, userName, isTyping }) => {
      set((state) => ({
        typing: {
          ...state.typing,
          [roomId]: isTyping ? { userId, userName } : null,
        },
      }));
      // Auto-clear typing after 3 s as safety net
      if (isTyping) {
        setTimeout(() => {
          set((state) => {
            if (state.typing[roomId]?.userId === userId) {
              return { typing: { ...state.typing, [roomId]: null } };
            }
            return {};
          });
        }, 3000);
      }
    });

    // ── Read receipts ────────────────────────────────────────────────────────
    socket.on('message_read', ({ roomId, msgId, userId }) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [roomId]: (state.messages[roomId] || []).map(m =>
            m.msgId === msgId
              ? { ...m, readBy: [...new Set([...(m.readBy || []), userId])] }
              : m
          ),
        },
      }));
    });

    // ── Room updates ─────────────────────────────────────────────────────────
    socket.on('room_updated', (room) => {
      set((state) => ({
        rooms: state.rooms.map(r => r.roomId === room.roomId ? room : r),
      }));
    });

    socket.on('room_added', (room) => {
      set((state) => {
        // Prevent duplicates
        if (state.rooms.some(r => r.roomId === room.roomId)) return state;
        
        // Auto-join the socket so we start receiving new_message events for it immediately
        socket.emit('join_room', { roomId: room.roomId });
        
        return {
          rooms: [room, ...state.rooms].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
        };
      });
    });

    // ── Message edited ───────────────────────────────────────────────────────
    socket.on('message_edited', (msg) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [msg.roomId]: (state.messages[msg.roomId] || []).map(m =>
            m.msgId === msg.msgId ? { ...m, content: msg.content, isEdited: true, editedAt: msg.editedAt } : m
          ),
        },
      }));
    });

    // ── Error ────────────────────────────────────────────────────────────────
    socket.on('error', ({ message }) => {
      toast.error(message || 'Chat error');
    });

    set({ socket });
  },

  disconnectChatSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  // ── REST: sync current user ────────────────────────────────────────────────
  fetchMe: async () => {
    try {
      const res = await chataxios.get('/chat/users/me');
      set({ me: res.data.data });
      return res.data.data;
    } catch (err) {
      console.error('[Chat] fetchMe error:', err);
    }
  },

  // ── REST: load all users in tenant ────────────────────────────────────────
  fetchUsers: async () => {
    try {
      const res = await chataxios.get('/chat/users/list');
      set({ users: res.data.data || [] });
    } catch (err) {
      console.error('[Chat] fetchUsers error:', err);
    }
  },

  // ── REST: load all rooms ───────────────────────────────────────────────────
  fetchRooms: async () => {
    set({ isLoadingRooms: true });
    try {
      const res = await chataxios.get('/chat/rooms/');
      const rooms = res.data.data || [];
      const counts = {};
      rooms.forEach(r => { counts[r.roomId] = r.unreadCount || 0; });
      set({ rooms, unreadCounts: counts });
    } catch (err) {
      console.error('[Chat] fetchRooms error:', err);
    } finally {
      set({ isLoadingRooms: false });
    }
  },

  // ── REST: start or open a private chat ────────────────────────────────────
  openPrivateChat: async (targetUserId) => {
    try {
      const res = await chataxios.post('/chat/rooms/private', { targetUserId });
      const room = res.data.data;
      set((state) => {
        const exists = state.rooms.find(r => r.roomId === room.roomId);
        return {
          rooms: exists ? state.rooms : [room, ...state.rooms],
          activeRoomId: room.roomId,
        };
      });
      get().joinRoom(room.roomId);
      return room;
    } catch (err) {
      toast.error('Could not open chat');
    }
  },

  // ── REST: create a group (ADMIN only) ─────────────────────────────────────
  createGroup: async ({ groupName, memberIds, avatarUrl }) => {
    try {
      const res = await chataxios.post('/chat/rooms/group', { groupName, memberIds, avatarUrl });
      const room = res.data.data;
      set((state) => ({ rooms: [room, ...state.rooms] }));
      toast.success(`Group "${groupName}" created`);
      return room;
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create group');
    }
  },

  // ── REST: add / remove member (ADMIN) ─────────────────────────────────────
  addMember: async (roomId, userId) => {
    try {
      const res = await chataxios.post(`/chat/rooms/${roomId}/members`, { userId });
      set((state) => ({
        rooms: state.rooms.map(r => r.roomId === roomId ? res.data.data : r),
      }));
    } catch (err) {
      toast.error('Failed to add member');
    }
  },

  removeMember: async (roomId, userId) => {
    try {
      await chataxios.delete(`/chat/rooms/${roomId}/members/${userId}`);
      set((state) => ({
        rooms: state.rooms.map(r =>
          r.roomId === roomId
            ? { ...r, members: r.members.filter(m => m.userId !== userId) }
            : r
        ),
      }));
    } catch (err) {
      toast.error('Failed to remove member');
    }
  },

  // ── REST: delete group (ADMIN) ─────────────────────────────────────────────
  deleteGroup: async (roomId) => {
    try {
      await chataxios.delete(`/chat/rooms/${roomId}`);
      set((state) => ({
        rooms: state.rooms.filter(r => r.roomId !== roomId),
        activeRoomId: state.activeRoomId === roomId ? null : state.activeRoomId,
      }));
      toast.success('Group deleted');
    } catch (err) {
      toast.error('Failed to delete group');
    }
  },

  // ── REST: load messages for a room ────────────────────────────────────────
  fetchMessages: async (roomId, beforeId = null) => {
    set({ isLoadingMsgs: true });
    try {
      const params = { limit: 50 };
      if (beforeId) params.before_id = beforeId;
      const res = await chataxios.get(`/chat/messages/${roomId}`, { params });
      const msgs = res.data.data || [];
      set((state) => {
        const existing = state.messages[roomId] || [];
        return {
          messages: {
            ...state.messages,
            [roomId]: beforeId ? [...msgs, ...existing] : msgs,
          },
          hasMoreMsgs: { ...state.hasMoreMsgs, [roomId]: msgs.length === 50 },
        };
      });
    } catch (err) {
      console.error('[Chat] fetchMessages error:', err);
    } finally {
      set({ isLoadingMsgs: false });
    }
  },

  // ── REST: load pinned messages ─────────────────────────────────────────────
  fetchPinnedMessages: async (roomId) => {
    try {
      const res = await chataxios.get(`/chat/messages/${roomId}/pinned`);
      set((state) => ({
        pinnedMessages: { ...state.pinnedMessages, [roomId]: res.data.data || [] },
      }));
    } catch (err) {
      console.error('[Chat] fetchPinned error:', err);
    }
  },

  // ── REST: search messages ──────────────────────────────────────────────────
  searchMessages: async (roomId, query) => {
    try {
      const res = await chataxios.get(`/chat/messages/${roomId}/search`, { params: { q: query } });
      return res.data.data || [];
    } catch (err) {
      return [];
    }
  },

  // ── REST: pin / unpin message ──────────────────────────────────────────────
  togglePin: async (roomId, msgId, pin) => {
    try {
      await chataxios.patch(`/chat/messages/${msgId}/pin`, { pin });
      set((state) => ({
        messages: {
          ...state.messages,
          [roomId]: (state.messages[roomId] || []).map(m =>
            m.msgId === msgId ? { ...m, isPinned: pin } : m
          ),
        },
      }));
    } catch (err) {
      toast.error('Could not pin message');
    }
  },

  // ── REST: delete message ───────────────────────────────────────────────────
  deleteMessage: async (roomId, msgId) => {
    try {
      await chataxios.delete(`/chat/messages/${msgId}`);
      set((state) => ({
        messages: {
          ...state.messages,
          [roomId]: (state.messages[roomId] || []).map(m =>
            m.msgId === msgId
              ? { ...m, isDeleted: true, content: '[This message was deleted]' }
              : m
          ),
        },
      }));
    } catch (err) {
      toast.error('Could not delete message');
    }
  },

  // ── Socket actions ─────────────────────────────────────────────────────────
  joinRoom: (roomId) => {
    get().socket?.emit('join_room', { roomId });
  },

  // Join ALL rooms so we receive new_message events for every conversation
  joinAllRooms: () => {
    const { rooms, socket } = get();
    if (!socket) return;
    rooms.forEach(r => socket.emit('join_room', { roomId: r.roomId }));
  },

  leaveRoom: (roomId) => {
    get().socket?.emit('leave_room', { roomId });
  },

  sendMessage: (roomId, type, content, fileMeta = null, replyToId = null, mentions = []) => {
    const { me, socket, replyingTo } = get();
    const tempId = `_tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const resolvedReplyToId = replyToId || replyingTo?.msgId || null;
    const optimisticMsg = {
      msgId:      tempId,
      roomId,
      senderId:   me?.userId,
      senderName: me?.displayName || me?.name || 'You',
      type,
      content,
      fileMeta,
      replyTo:    replyingTo ? { msgId: replyingTo.msgId, senderName: replyingTo.senderName, content: replyingTo.content?.slice(0, 120), type: replyingTo.type } : null,
      createdAt:  new Date().toISOString(),
      readBy:     [],
      isPinned:   false,
      isDeleted:  false,
      isEdited:   false,
      _pending:   true,
    };
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: [...(state.messages[roomId] || []), optimisticMsg],
      },
      rooms: state.rooms
        .map(r => r.roomId === roomId ? { ...r, updatedAt: optimisticMsg.createdAt } : r)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
      replyingTo: null,
    }));
    socket?.emit('send_message', { roomId, type, content, fileMeta, replyToId: resolvedReplyToId, mentions });
  },

  setReplyingTo: (msg) => set({ replyingTo: msg }),

  editMessage: async (roomId, msgId, content) => {
    try {
      await chataxios.patch(`/chat/messages/${msgId}/content`, { content });
      // socket broadcasts message_edited; local state updated via listener
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to edit message');
    }
  },

  sendTypingStart: (roomId) => {
    get().socket?.emit('typing_start', { roomId });
  },

  sendTypingStop: (roomId) => {
    get().socket?.emit('typing_stop', { roomId });
  },

  markRead: (roomId, msgId) => {
    get().socket?.emit('mark_read', { roomId, msgId });
  },

  // ── UI helpers ─────────────────────────────────────────────────────────────
  setActiveRoom: (roomId) => {
    if (roomId) {
      // Join the room if not already joined (e.g. newly created room)
      get().joinRoom(roomId);
      get().fetchMessages(roomId);
    }
    set((state) => ({
      activeRoomId: roomId,
      unreadCounts: roomId
        ? { ...state.unreadCounts, [roomId]: 0 }
        : state.unreadCounts,
    }));
  },

  getTotalUnread: () => {
    const counts = get().unreadCounts;
    return Object.values(counts).reduce((sum, n) => sum + n, 0);
  },

  getActiveRoom: () => {
    const { rooms, activeRoomId } = get();
    return rooms.find(r => r.roomId === activeRoomId) || null;
  },
}));
