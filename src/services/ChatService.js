import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Api, { SERVER_URL } from './api';

class ChatService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.connecting = false;
    this.messageListeners = new Set();
    this.presenceListeners = new Set();
    this.countListeners = new Set();
  }

  connect() {
    if (this.connected || this.connecting) return;
    this.connecting = true;


    const token = localStorage.getItem('pos_access_token');
    const socket = new SockJS(`${SERVER_URL}/ws`);
    
    this.client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        'Authorization': `Bearer ${token}`
      },
      debug: (str) => {
        // console.log('STOMP: ' + str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = (frame) => {
      this.connected = true;
      this.connecting = false;
      console.log('>>> [STOMP] Connected: ' + frame);

      const user = JSON.parse(localStorage.getItem('pos_user'));
      if (user) {
        // Subscribe to private message queue (Spring maps /user/queue/messages to the current principal)
        this.client.subscribe('/user/queue/messages', (message) => {
          const msg = JSON.parse(message.body);
          this.messageListeners.forEach(listener => listener(msg));
          this.notifyCountUpdate(); // Automatically trigger count refresh on new message
        });

        // Subscribe to global presence channel
        this.client.subscribe('/topic/presence', (status) => {
          const update = JSON.parse(status.body);
          this.presenceListeners.forEach(listener => listener(update));
        });
      }
    };

    this.client.onStompError = (frame) => {
      console.error('>>> [STOMP] Error: ' + frame.headers['message']);
      this.connected = false;
      this.connecting = false;
    };

    this.client.activate();
  }

  onMessage(callback) {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback); // unsubscribe function
  }

  onPresence(callback) {
    this.presenceListeners.add(callback);
    return () => this.presenceListeners.delete(callback); // unsubscribe function
  }

  onCountUpdate(callback) {
    this.countListeners.add(callback);
    return () => this.countListeners.delete(callback);
  }

  notifyCountUpdate() {
    this.countListeners.forEach(listener => listener());
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.connected = false;
    }
  }

  sendMessage(recipientId, content) {
    if (!this.connected) {
      console.error('>>> [STOMP] Not connected');
      return;
    }

    const user = JSON.parse(localStorage.getItem('pos_user'));
    this.client.publish({
      destination: '/app/chat',
      body: JSON.stringify({
        senderId: user.id,
        recipientId: recipientId,
        content: content
      })
    });
  }

  // API wrappers
  async getChatHistory(recipientId, page = 0, size = 8) {
    const res = await Api._request(`/chat/history/${recipientId}?page=${page}&size=${size}`);
    return res.data;
  }

  async getOnlineUsers() {
    const res = await Api._request('/chat/online');
    return res.data;
  }

  async markAsRead(senderId) {
    await Api._request(`/chat/read/${senderId}`, { method: 'POST' });
  }

  async getTotalUnreadCount() {
    const res = await Api._request('/chat/unread-count');
    return res.data;
  }

  async getUnreadCountsPerUser() {
    const res = await Api._request('/chat/unread-counts');
    return res.data;
  }
}


export default new ChatService();
