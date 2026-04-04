/**
 * useNotifications — Real-time notification hook via STOMP WebSocket
 * Connects to the Spring backend /ws endpoint and subscribes to user queue.
 * Plays a sound (public/sounds/notification.mp3) on each new incoming notification.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Api, { API_BASE } from './api';

const WS_URL = API_BASE.replace('/api/v1', '') + '/ws';

// ─── Sound player ───────────────────────────────────────────────────────────
// Tries mp3 → wav → ogg in order. Silently fails if none found or browser blocks.
const SOUND_CANDIDATES = [
  // '/sounds/notification.mp3',
  '/sounds/Notifications.wav'
  // '/sounds/notification.ogg',
];

let audioCache = null; // lazily resolved

async function resolveAudio() {
  if (audioCache) return audioCache;
  for (const src of SOUND_CANDIDATES) {
    try {
      const res = await fetch(src, { method: 'HEAD' });
      if (res.ok) {
        const audio = new Audio(src);
        audio.volume = 0.6;
        audioCache = audio;
        return audio;
      }
    } catch { /* try next */ }
  }
  return null;
}

async function playNotificationSound() {
  try {
    const audio = await resolveAudio();
    if (!audio) return;
    // Reset to start in case it's still playing
    audio.currentTime = 0;
    await audio.play();
  } catch (e) {
    // Browser may block autoplay — silently ignore
  }
}
// ────────────────────────────────────────────────────────────────────────────

export function useNotifications(options = {}) {
  const { onNewNotification } = options;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const clientRef = useRef(null);

  // Re-compute unread count whenever notifications change
  const updateUnread = (list) => {
    setUnreadCount(list.filter(n => !n.read).length);
  };

  // Load existing notifications from REST API
  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const data = await Api.getNotifications();
      setNotifications(data);
      updateUnread(data);
    } catch (e) {
      // Silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper: add a new incoming notification + play sound
  const addIncoming = useCallback((event) => {
    const newNotif = {
      id: event.id || Date.now(),
      message: event.message,
      title: event.title || '',
      timestamp: event.timestamp || new Date().toISOString(),
      read: false,
      type: event.type || 'INFO',
      actionUrl: event.actionUrl || null,
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      updateUnread(updated);
      return updated;
    });
    playNotificationSound();
    if (onNewNotification) {
      onNewNotification(newNotif);
    }
  }, [onNewNotification]);

  // Mark a notification as read (optimistic update + API call)
  const markRead = useCallback(async (id) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      updateUnread(updated);
      return updated;
    });
    try {
      await Api.markNotificationRead(id);
    } catch (e) {
      // Revert if failed
      setNotifications(prev => {
        const reverted = prev.map(n => n.id === id ? { ...n, read: false } : n);
        updateUnread(reverted);
        return reverted;
      });
    }
  }, []);

  // Mark all as read
  const markAllRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.read);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    for (const n of unread) {
      try { await Api.markNotificationRead(n.id); } catch { /* ignore */ }
    }
  }, [notifications]);

  // Refresh from server
  const refresh = useCallback(async () => {
    await loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const token = localStorage.getItem('pos_access_token');
    if (!token) return;

    // Prefetch audio so first notification plays instantly
    resolveAudio();

    // Load initial state
    loadInitial();

    // Connect WebSocket
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);

        // Subscribe to personal queue
        client.subscribe('/user/queue/notifications', (message) => {
          try {
            addIncoming(JSON.parse(message.body));
          } catch (e) {
            console.warn('Failed to parse notification:', e);
          }
        });

        // Subscribe to role-based topics
        const user = Api._getUser();
        if (user?.roles) {
          user.roles.forEach(role => {
            client.subscribe(`/topic/notifications/${role}`, (message) => {
              try { addIncoming(JSON.parse(message.body)); } catch { /* ignore */ }
            });
          });
        }
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => {
        console.warn('STOMP error:', frame);
        setConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => { client.deactivate(); };
  }, []);

  return { notifications, unreadCount, connected, loading, markRead, markAllRead, refresh };
}
