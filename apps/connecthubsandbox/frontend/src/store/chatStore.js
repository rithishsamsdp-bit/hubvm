// chatStore.js
import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';

export const useChatStore = create((set, get) => ({
  messages: [],

  listenToMessages: () => {
    const socket = useAuthStore.getState().socket;
    const selectedUser = useAuthStore.getState().selectedUser;

    if (!socket || !socket.connected) return;

    socket.off('newMessage');
    socket.on('newMessage', (newMessage) => {
      console.log('New message received:', newMessage);

      if (!selectedUser || newMessage.senderId !== selectedUser._id) return;

      set((state) => ({
        messages: [...state.messages, newMessage],
      }));
    });
  },
}));
